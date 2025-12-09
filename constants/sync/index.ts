import * as SQLite from 'expo-sqlite';
import * as ExpoCrypto from 'expo-crypto';
import { readMeta, writeMeta } from '../db';
import { MAX_SYNC_ATTEMPTS } from '../config';
import {
  encodeSyncRequest,
  encodeBytesField,
  encodeMessageContent,
  encodeMessageEnvelope,
  encodeCrdtValue,
  encodeStringField,
  parseProto,
  pbStr,
  pbBool,
  pbAllBytes,
  decodeCrdtValue,
} from './protobuf';
import { SyncError, parseServerErrorKind } from './errors';
import {
  enqueueMessages,
  getPendingMessages,
  clearPendingMessages,
} from '@/services/offlineQueue';

async function readSyncBody(res: Response): Promise<Uint8Array> {
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const json = await res.json();
    const reason: string = json?.reason ?? json?.error ?? 'unexpected JSON response';
    throw new SyncError('server', reason);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export { SyncError } from './errors';
export type { SyncErrorKind } from './errors';

// Validate before interpolating into SQL to prevent injection via crafted sync messages
const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

function isSafeIdent(s: string): boolean {
  return SAFE_IDENT.test(s);
}

const PROTECTED = new Set([
  'prefs',
  'v_transactions',
  'v_transactions_layer1',
  'v_transactions_layer2',
  'v_categories',
  'messages_crdt',
  'messages_binary',
  'messages_merkles',
  '__meta__',
]);

interface SyncMsg {
  timestamp: string;
  dataset: string;
  row: string;
  column: string;
  value: string | number | null;
}

function parseSyncResponse(bytes: Uint8Array): SyncMsg[] {
  if (bytes.length === 0) return [];

  const resp = parseProto(bytes);
  const envelopes = pbAllBytes(resp, 1);
  const msgs: SyncMsg[] = [];

  for (const envBytes of envelopes) {
    const env = parseProto(envBytes);

    // Skip encrypted messages we can't decrypt
    if (pbBool(env, 2)) continue;

    const contentBytes = env.get(3)?.[0];
    if (!(contentBytes instanceof Uint8Array)) continue;

    const msg = parseProto(contentBytes);
    const dataset = pbStr(msg, 1);
    const row = pbStr(msg, 2);
    const column = pbStr(msg, 3);
    const value = decodeCrdtValue(pbStr(msg, 4));
    const ts = pbStr(env, 1);

    if (!dataset || !row || !column) continue;
    if (!isSafeIdent(dataset)) continue;
    if (!isSafeIdent(column)) continue;
    if (PROTECTED.has(dataset)) continue;

    msgs.push({ timestamp: ts, dataset, row, column, value });
  }

  msgs.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));

  return msgs;
}

// MAX(timestamp) from messages_crdt is our baseline after a fresh download
async function deriveSinceFromSnapshot(db: SQLite.SQLiteDatabase): Promise<string> {
  try {
    const row = await db.getFirstAsync<{ ts: string | null }>(
      `SELECT MAX(timestamp) AS ts FROM messages_crdt`,
    );
    return row?.ts ?? '0';
  } catch {
    return '0';
  }
}

// HLC format: YYYY-MM-DDTHH:MM:SS.mmmZ-NNNN-CCCCCCCCCCCCCCCC
let hlcCounter = 0;
let hlcLastMs = 0;
const hlcClientId = Array.from(ExpoCrypto.getRandomValues(new Uint8Array(8)), (b) =>
  b.toString(16).padStart(2, '0'),
).join('');

function makeTimestamp(): string {
  const now = Date.now();
  if (now === hlcLastMs) {
    hlcCounter++;
  } else {
    hlcLastMs = now;
    hlcCounter = 0;
  }
  const counter = String(hlcCounter).padStart(4, '0');
  return `${new Date(now).toISOString()}-${counter}-${hlcClientId}`;
}

export function uuid(): string {
  return ExpoCrypto.randomUUID();
}

async function applyMessagesToDb(
  db: SQLite.SQLiteDatabase,
  msgs: { dataset: string; row: string; column: string; value: string | number | null }[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const msg of msgs) {
      try {
        const r = await db.runAsync(
          `UPDATE "${msg.dataset}" SET "${msg.column}" = ? WHERE id = ?`,
          [msg.value, msg.row],
        );
        if (r.changes === 0) {
          await db.runAsync(
            `INSERT OR IGNORE INTO "${msg.dataset}" (id, "${msg.column}") VALUES (?, ?)`,
            [msg.row, msg.value],
          );
        }
      } catch {
        // Skip: view, unknown column, constraint — continue with next message
      }
    }
  });
}

export interface CrdtField {
  dataset: string;
  row: string;
  column: string;
  value: string | number | null;
}

export interface SendResult {
  queued: boolean;
}

// On network error: queues messages for later flush instead of throwing,
// so offline mutations still succeed locally.
export async function sendCrdtMessages(
  db: SQLite.SQLiteDatabase,
  serverUrl: string,
  token: string,
  fileId: string,
  groupId: string,
  fields: CrdtField[],
): Promise<SendResult> {
  await applyMessagesToDb(db, fields);

  const outgoingTimestamps: string[] = [];
  const envelopes: Uint8Array[] = fields.map((f) => {
    const ts = makeTimestamp();
    outgoingTimestamps.push(ts);
    const content = encodeMessageContent(f.dataset, f.row, f.column, encodeCrdtValue(f.value));
    return encodeMessageEnvelope(ts, content);
  });

  const meta = await readMeta();
  let since = meta?.fileId === fileId ? (meta.lastSyncTs ?? '') : '';
  if (!since) since = await deriveSinceFromSnapshot(db);

  const parts: number[] = [];
  for (const env of envelopes) {
    parts.push(...encodeBytesField(1, env));
  }
  const body = new Uint8Array([
    ...parts,
    ...encodeStringField(2, fileId),
    ...encodeStringField(3, groupId),
    ...encodeStringField(5, ''),
    ...encodeStringField(6, since),
  ]);

  const base = serverUrl.trim().replace(/\/$/, '');
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${base}/sync/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/actual-sync',
        'X-ACTUAL-TOKEN': token,
        'x-actual-file-id': fileId,
      },
      body: body.buffer as ArrayBuffer,
      signal: ctrl.signal,
    });
  } catch {
    await enqueueMessages(db, fields, outgoingTimestamps);
    return { queued: true };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new SyncError(await parseServerErrorKind(res));

  const incoming = parseSyncResponse(await readSyncBody(res));
  if (incoming.length > 0) {
    await applyMessagesToDb(db, incoming);
  }

  // Track max timestamp across outgoing + incoming so next sync doesn't re-fetch
  let maxTs = since;
  for (const ts of outgoingTimestamps) {
    if (ts > maxTs) maxTs = ts;
  }
  for (const m of incoming) {
    if (m.timestamp > maxTs) maxTs = m.timestamp;
  }
  if (maxTs && meta) {
    await writeMeta({ ...meta, lastSyncTs: maxTs });
  }

  return { queued: false };
}

export async function flushPendingMessages(
  db: SQLite.SQLiteDatabase,
  serverUrl: string,
  token: string,
  fileId: string,
  groupId: string,
): Promise<number> {
  const pending = await getPendingMessages(db);
  if (pending.length === 0) return 0;

  const envelopes: Uint8Array[] = pending.map((m) => {
    const content = encodeMessageContent(m.dataset, m.row_id, m.col, encodeCrdtValue(m.value));
    return encodeMessageEnvelope(m.timestamp, content);
  });

  const meta = await readMeta();
  let since = meta?.fileId === fileId ? (meta.lastSyncTs ?? '') : '';
  if (!since) since = await deriveSinceFromSnapshot(db);

  const parts: number[] = [];
  for (const env of envelopes) {
    parts.push(...encodeBytesField(1, env));
  }
  const body = new Uint8Array([
    ...parts,
    ...encodeStringField(2, fileId),
    ...encodeStringField(3, groupId),
    ...encodeStringField(5, ''),
    ...encodeStringField(6, since),
  ]);

  const base = serverUrl.trim().replace(/\/$/, '');
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${base}/sync/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/actual-sync',
        'X-ACTUAL-TOKEN': token,
        'x-actual-file-id': fileId,
      },
      body: body.buffer as ArrayBuffer,
      signal: ctrl.signal,
    });
  } catch {
    throw new SyncError('network');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new SyncError(await parseServerErrorKind(res));

  // Clear queue first — if app crashes before writeMeta, CRDTs are idempotent
  await clearPendingMessages(
    db,
    pending.map((m) => m.id),
  );

  const incoming = parseSyncResponse(await readSyncBody(res));
  if (incoming.length > 0) {
    await applyMessagesToDb(db, incoming);
  }

  let maxTs = since;
  for (const m of pending) {
    if (m.timestamp > maxTs) maxTs = m.timestamp;
  }
  for (const m of incoming) {
    if (m.timestamp > maxTs) maxTs = m.timestamp;
  }
  if (maxTs && meta) {
    await writeMeta({ ...meta, lastSyncTs: maxTs });
  }

  return pending.length;
}

// The server rejects since = '' with HTTP 422, so we derive from snapshot on fresh downloads
export async function applySyncMessages(
  db: SQLite.SQLiteDatabase,
  serverUrl: string,
  token: string,
  fileId: string,
  groupId: string,
): Promise<void> {
  const meta = await readMeta();

  let since = meta?.fileId === fileId ? (meta.lastSyncTs ?? '') : '';
  if (!since) {
    since = await deriveSinceFromSnapshot(db);
  }

  const base = serverUrl.trim().replace(/\/$/, '');

  // Loop until convergence or safety ceiling
  for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${base}/sync/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/actual-sync',
          'X-ACTUAL-TOKEN': token,
          'x-actual-file-id': fileId,
        },
        body: encodeSyncRequest(fileId, groupId, since).buffer as ArrayBuffer,
      });
    } catch {
      throw new SyncError('network');
    }

    if (!res.ok) throw new SyncError(await parseServerErrorKind(res));

    const msgs = parseSyncResponse(await readSyncBody(res));
    if (msgs.length === 0) break;

    await applyMessagesToDb(db, msgs);

    const maxTs = msgs.reduce((max, m) => (m.timestamp > max ? m.timestamp : max), since);
    if (maxTs && meta) {
      await writeMeta({ ...meta, lastSyncTs: maxTs });
    }
    since = maxTs;
  }
}
