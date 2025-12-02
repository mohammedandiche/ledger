import * as SQLite from 'expo-sqlite';
import type { Account } from '@/constants/types';
import { mapAccountType } from '@/utils/dbMappers';

export async function queryAccounts(db: SQLite.SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: string;
    offbudget: number;
    balance: number;
  }>(
    // Split parent rows (isParent=1) store the total and are excluded to avoid double-counting
    `SELECT a.id,
            a.name,
            a.type,
            a.offbudget,
            COALESCE((
              SELECT SUM(t.amount)
              FROM   transactions t
              WHERE  t.acct     = a.id
                AND  t.tombstone = 0
                AND  t.isParent  = 0
            ), 0) AS balance
     FROM   accounts a
     WHERE  a.tombstone = 0
       AND  a.closed    = 0
     ORDER BY a.sort_order`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    balance: r.balance / 100,
    type: mapAccountType(r.type),
    onBudget: r.offbudget === 0,
  }));
}

export async function queryClosedAccounts(db: SQLite.SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: string;
    offbudget: number;
    balance: number;
  }>(
    `SELECT a.id,
            a.name,
            a.type,
            a.offbudget,
            COALESCE((
              SELECT SUM(t.amount)
              FROM   transactions t
              WHERE  t.acct     = a.id
                AND  t.tombstone = 0
                AND  t.isParent  = 0
            ), 0) AS balance
     FROM   accounts a
     WHERE  a.tombstone = 0
       AND  a.closed    = 1
     ORDER BY a.name COLLATE NOCASE`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    balance: r.balance / 100,
    type: mapAccountType(r.type),
    onBudget: r.offbudget === 0,
    closed: true,
  }));
}

export type NetWorthRawData = { monthInt: number; monthlySum: number }[];

export async function fetchNetWorthRawData(db: SQLite.SQLiteDatabase): Promise<NetWorthRawData> {
  return db.getAllAsync<{ monthInt: number; monthlySum: number }>(
    `SELECT CAST(t.date / 100 AS INTEGER) AS monthInt,
            SUM(t.amount)                 AS monthlySum
     FROM   transactions t
     JOIN   accounts a ON a.id = t.acct
     WHERE  t.tombstone = 0
       AND  t.isParent  = 0
       AND  a.tombstone = 0
       AND  a.closed    = 0
     GROUP BY monthInt
     ORDER BY monthInt`,
  );
}

export function computeNetWorthHistory(raw: NetWorthRawData, year: number, month: number): number[] {
  const cutoffs: number[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < 12; i++) {
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    cutoffs.unshift(ny * 10000 + nm * 100 + 1);
    m--;
    if (m === 0) { m = 12; y--; }
  }

  let running = 0;
  let rowIdx = 0;
  return cutoffs.map((cutoff) => {
    const cutoffMonthInt = Math.floor(cutoff / 100);
    while (rowIdx < raw.length && raw[rowIdx].monthInt < cutoffMonthInt) {
      running += raw[rowIdx].monthlySum;
      rowIdx++;
    }
    return running / 100;
  });
}

export async function queryNetWorthHistory(
  db: SQLite.SQLiteDatabase,
  year: number,
  month: number,
): Promise<number[]> {
  const raw = await fetchNetWorthRawData(db);
  return computeNetWorthHistory(raw, year, month);
}

export async function queryClearedBalance(
  db: SQLite.SQLiteDatabase,
  accountId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM   transactions
     WHERE  acct      = ?
       AND  cleared   = 1
       AND  isParent  = 0
       AND  tombstone = 0`,
    [accountId],
  );
  return (row?.total ?? 0) / 100;
}

export async function queryTransactionsToLock(
  db: SQLite.SQLiteDatabase,
  accountId: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions
     WHERE  acct       = ?
       AND  cleared    = 1
       AND  reconciled = 0
       AND  tombstone  = 0`,
    [accountId],
  );
  return rows.map((r) => r.id);
}
