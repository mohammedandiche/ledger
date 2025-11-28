import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { DB_DIR, DB_PATH, writeMeta } from './dbCache';
import { base } from '@/constants/server';

// Processes in 8 KB chunks to avoid RangeError on files > ~500 KB
function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  const CHUNK = 0x2000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

async function fetchBudgetBase64(
  serverUrl: string,
  token: string,
  fileId: string,
): Promise<string> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${base(serverUrl)}/sync/download-user-file`, {
      headers: {
        'X-ACTUAL-TOKEN': token,
        'x-actual-file-id': fileId,
      },
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('timeout')) {
      throw new Error('Download timed out — check your connection and try again.');
    }
    throw new Error(`Cannot reach server: ${msg || 'network error'}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const json = JSON.parse(await res.clone().text());
      detail = json?.reason ?? json?.error ?? '';
    } catch {}
    throw new Error(
      detail
        ? `Download failed: ${detail} (HTTP ${res.status})`
        : `Download failed (HTTP ${res.status})`,
    );
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new Error('Server returned an empty file. The budget may not exist or may require re-upload.');
  }
  return bufToBase64(buf);
}

export async function downloadBudgetDb(
  serverUrl: string,
  token: string,
  fileId: string,
): Promise<void> {
  const b64 = await fetchBudgetBase64(serverUrl, token, fileId);
  const zip = await JSZip.loadAsync(b64, { base64: true });

  let dbEntry: JSZip.JSZipObject | null = zip.file('db.sqlite');
  if (!dbEntry) {
    zip.forEach((path, entry) => {
      if (!dbEntry && !entry.dir && path.endsWith('db.sqlite')) dbEntry = entry;
    });
  }
  if (!dbEntry) throw new Error('db.sqlite not found in the downloaded archive');

  if (!(await FileSystem.getInfoAsync(DB_DIR)).exists) {
    await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
  }

  await FileSystem.writeAsStringAsync(DB_PATH, await dbEntry.async('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });

  const walEntry = zip.file('db.sqlite-wal');
  if (walEntry) {
    await FileSystem.writeAsStringAsync(`${DB_PATH}-wal`, await walEntry.async('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  await writeMeta({ fileId, downloadedAt: Date.now(), lastSyncTs: '' });
}
