import * as SQLite from 'expo-sqlite';
import type { Payee, CategoryOption } from '@/constants/types';

export async function queryPayees(db: SQLite.SQLiteDatabase): Promise<Payee[]> {
  const rows = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM payees
     WHERE  tombstone = 0
       AND  transfer_acct IS NULL
       AND  name IS NOT NULL
       AND  name != ''
     ORDER BY name COLLATE NOCASE`,
  );
  return rows;
}

export async function queryUnusedPayeeIds(db: SQLite.SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT p.id FROM payees p
     WHERE  p.tombstone = 0
       AND  p.transfer_acct IS NULL
       AND  p.name IS NOT NULL
       AND  p.name != ''
       AND  NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE  t.description = p.id AND t.tombstone = 0
       )`,
  );
  return new Set(rows.map((r) => r.id));
}

export async function queryCategoryOptions(db: SQLite.SQLiteDatabase): Promise<CategoryOption[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    group_name: string;
    is_income: number;
  }>(
    `SELECT c.id,
            c.name,
            g.name AS group_name,
            g.is_income
     FROM   categories c
     JOIN   category_groups g ON c.cat_group = g.id
     WHERE  c.tombstone = 0
       AND  g.tombstone = 0
       AND  COALESCE(c.hidden, 0) = 0
       AND  COALESCE(g.hidden, 0) = 0
     ORDER BY g.is_income ASC, g.sort_order, c.sort_order`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    groupName: r.group_name,
    isIncome: r.is_income === 1,
  }));
}
