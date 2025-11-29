import type * as SQLite from 'expo-sqlite';
import type { CrdtField } from '@/constants/sync';

export interface PendingMessage {
  id: number;
  timestamp: string;
  dataset: string;
  row_id: string;
  col: string;
  value: string | number | null;
  created_at: number;
}

export async function ensurePendingTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_sync (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp  TEXT    NOT NULL,
      dataset    TEXT    NOT NULL,
      row_id     TEXT    NOT NULL,
      col        TEXT    NOT NULL,
      value      TEXT,
      created_at INTEGER NOT NULL
    )
  `);
}

export async function enqueueMessages(
  db: SQLite.SQLiteDatabase,
  fields: CrdtField[],
  timestamps: string[],
): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const ts = timestamps[i];
      await db.runAsync(
        `INSERT INTO pending_sync (timestamp, dataset, row_id, col, value, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ts, f.dataset, f.row, f.column, f.value === null ? null : JSON.stringify(f.value), now],
      );
    }
  });
}

export async function getPendingMessages(db: SQLite.SQLiteDatabase): Promise<PendingMessage[]> {
  const rows = await db.getAllAsync<{
    id: number;
    timestamp: string;
    dataset: string;
    row_id: string;
    col: string;
    value: string | null;
    created_at: number;
  }>(`SELECT id, timestamp, dataset, row_id, col, value, created_at
      FROM pending_sync ORDER BY created_at ASC, timestamp ASC`);

  return rows.map((r) => ({
    ...r,
    value: r.value === null ? null : (JSON.parse(r.value) as string | number | null),
  }));
}

export async function getPendingCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM pending_sync`,
  );
  return row?.cnt ?? 0;
}

export async function clearPendingMessages(
  db: SQLite.SQLiteDatabase,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;

  // SQLite has a 999-variable limit
  const BATCH = 500;
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const placeholders = batch.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM pending_sync WHERE id IN (${placeholders})`,
        batch,
      );
    }
  });
}
