import * as SQLite from 'expo-sqlite';
import { DB_NAME, DB_DIR } from './dbCache';

export function openBudgetDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DB_NAME, undefined, DB_DIR);
}

export async function isTrackingBudget(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const row = await db.getFirstAsync<{ value: string | null }>(
      `SELECT value FROM zero_kv WHERE key = 'budgetType'`,
    );
    if (!row?.value) return false;
    const v = row.value.trim().toLowerCase();
    return v === '1' || v === 'tracking' || v === 'report';
  } catch {
    return false;
  }
}
