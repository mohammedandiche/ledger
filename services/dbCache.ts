import * as FileSystem from 'expo-file-system/legacy';

export const DB_NAME = 'budget.sqlite';
const DOC_DIR = FileSystem.documentDirectory!;
export const DB_DIR = `${DOC_DIR}SQLite/`;
export const DB_PATH = `${DB_DIR}${DB_NAME}`;
export const META_PATH = `${DOC_DIR}budget_meta.json`;

// Re-download base snapshot every hour; sync messages keep it current between downloads
export const CACHE_TTL_MS = 60 * 60 * 1000;

export interface DbMeta {
  fileId: string;
  downloadedAt: number;
  lastSyncTs: string;
}

export async function readMeta(): Promise<DbMeta | null> {
  try {
    const raw = await FileSystem.readAsStringAsync(META_PATH);
    return JSON.parse(raw) as DbMeta;
  } catch {
    return null;
  }
}

export async function writeMeta(meta: DbMeta): Promise<void> {
  await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(meta));
}

export async function deleteCachedDb(): Promise<void> {
  await Promise.all([
    FileSystem.deleteAsync(DB_PATH, { idempotent: true }).catch(() => {}),
    FileSystem.deleteAsync(META_PATH, { idempotent: true }).catch(() => {}),
    FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {}),
    FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {}),
  ]);
}

export async function hasStaleDb(fileId: string): Promise<boolean> {
  try {
    const [info, meta] = await Promise.all([FileSystem.getInfoAsync(DB_PATH), readMeta()]);
    return info.exists && meta?.fileId === fileId;
  } catch {
    return false;
  }
}

export async function hasCachedDb(fileId: string): Promise<boolean> {
  try {
    const [info, meta] = await Promise.all([FileSystem.getInfoAsync(DB_PATH), readMeta()]);
    return (
      info.exists &&
      meta?.fileId === fileId &&
      typeof meta.downloadedAt === 'number' &&
      Date.now() - meta.downloadedAt < CACHE_TTL_MS
    );
  } catch {
    return false;
  }
}
