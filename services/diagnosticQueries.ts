import * as SQLite from 'expo-sqlite';
import { formatDateInt } from '@/utils/dbMappers';

export type DiagnosticKind =
  | 'blank-payee'
  | 'cleared-mismatch'
  | 'orphan-child'
  | 'split-amount-mismatch'
  | 'parent-has-category'
  | 'reconciled-not-cleared'
  | 'null-cleared-reconciled';

export interface DiagnosticIssueRaw {
  kind: DiagnosticKind;
  canAutoFix: boolean;
  ids: string[];
  description: string;
  fixDescription: string;
  rows: { label: string; value: string }[];
}

async function findBlankChildPayees(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{ id: string; date: number; parent_id: string }>(
    `SELECT t.id, t.date, t.parent_id
     FROM   transactions t
     JOIN   transactions p ON p.id = t.parent_id
     WHERE  t.isChild    = 1
       AND  t.tombstone  = 0
       AND  p.tombstone  = 0
       AND  t.description IS NULL
       AND  p.description IS NOT NULL`,
  );
  if (rows.length === 0) return [];
  return [
    {
      kind: 'blank-payee',
      canAutoFix: true,
      ids: rows.map((r) => r.id),
      description: `${rows.length} split child${rows.length > 1 ? 'ren' : ''} missing a payee`,
      fixDescription: `Copy payee from parent to ${rows.length} child${rows.length > 1 ? 'ren' : ''}.`,
      rows: rows.slice(0, 5).map((r) => ({ label: formatDateInt(r.date), value: 'missing payee' })),
    },
  ];
}

async function findClearedMismatches(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{
    id: string;
    date: number;
    child_cleared: number;
    parent_cleared: number;
  }>(
    `SELECT t.id, t.date, t.cleared AS child_cleared, p.cleared AS parent_cleared
     FROM   transactions t
     JOIN   transactions p ON p.id = t.parent_id
     WHERE  t.isChild   = 1
       AND  t.tombstone = 0
       AND  p.tombstone = 0
       AND  t.cleared  != p.cleared`,
  );
  if (rows.length === 0) return [];
  return [
    {
      kind: 'cleared-mismatch',
      canAutoFix: true,
      ids: rows.map((r) => r.id),
      description: `${rows.length} split child${rows.length > 1 ? 'ren' : ''} with mismatched cleared status`,
      fixDescription: `Match cleared status to parent on ${rows.length} child${rows.length > 1 ? 'ren' : ''}.`,
      rows: rows.slice(0, 5).map((r) => ({
        label: formatDateInt(r.date),
        value: `child ${r.child_cleared ? 'cleared' : 'uncleared'} / parent ${r.parent_cleared ? 'cleared' : 'uncleared'}`,
      })),
    },
  ];
}

async function findOrphanedChildren(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{ id: string; amount: number; date: number }>(
    `SELECT t.id, t.amount, t.date
     FROM   transactions t
     WHERE  t.isChild   = 1
       AND  t.tombstone = 0
       AND  NOT EXISTS (
         SELECT 1 FROM transactions p
         WHERE  p.id = t.parent_id AND p.tombstone = 0
       )`,
  );
  if (rows.length === 0) return [];
  return [
    {
      kind: 'orphan-child',
      canAutoFix: true,
      ids: rows.map((r) => r.id),
      description: `${rows.length} orphaned split child${rows.length > 1 ? 'ren' : ''}`,
      fixDescription: `Delete ${rows.length} child${rows.length > 1 ? 'ren' : ''} whose parent no longer exists.`,
      rows: rows
        .slice(0, 5)
        .map((r) => ({ label: formatDateInt(r.date), value: (r.amount / 100).toFixed(2) })),
    },
  ];
}

async function findSplitAmountMismatches(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{
    parent_id: string;
    parent_amount: number;
    children_sum: number;
    date: number;
  }>(
    `SELECT p.id AS parent_id, p.amount AS parent_amount,
            SUM(c.amount) AS children_sum, p.date
     FROM   transactions p
     JOIN   transactions c ON c.parent_id = p.id AND c.tombstone = 0
     WHERE  p.isParent  = 1
       AND  p.tombstone = 0
     GROUP  BY p.id
     HAVING p.amount != SUM(c.amount)`,
  );
  return rows.map((r) => ({
    kind: 'split-amount-mismatch' as const,
    canAutoFix: false,
    ids: [r.parent_id],
    description: `Split amounts don't add up (${(r.parent_amount / 100).toFixed(2)} vs ${(r.children_sum / 100).toFixed(2)})`,
    fixDescription: `Edit this split in the ledger to correct the amounts.`,
    rows: [
      { label: 'date', value: formatDateInt(r.date) },
      { label: 'parent', value: (r.parent_amount / 100).toFixed(2) },
      { label: 'children', value: (r.children_sum / 100).toFixed(2) },
      { label: 'diff', value: ((r.parent_amount - r.children_sum) / 100).toFixed(2) },
    ],
  }));
}

async function findParentsWithCategory(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{ id: string; date: number }>(
    `SELECT id, date FROM transactions
     WHERE  isParent  = 1
       AND  tombstone = 0
       AND  category IS NOT NULL`,
  );
  if (rows.length === 0) return [];
  return [
    {
      kind: 'parent-has-category',
      canAutoFix: true,
      ids: rows.map((r) => r.id),
      description: `${rows.length} split parent${rows.length > 1 ? 's' : ''} with a category set`,
      fixDescription: `Clear category on ${rows.length} parent${rows.length > 1 ? 's' : ''} (only children should have categories).`,
      rows: rows.slice(0, 5).map((r) => ({ label: formatDateInt(r.date), value: 'has category' })),
    },
  ];
}

async function findReconciledNotCleared(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{
    id: string;
    date: number;
    amount: number;
    acct_name: string;
  }>(
    `SELECT t.id, t.date, t.amount, a.name AS acct_name
     FROM   transactions t
     JOIN   accounts a ON a.id = t.acct
     WHERE  t.reconciled = 1
       AND  (t.cleared IS NULL OR t.cleared = 0)
       AND  t.tombstone  = 0
       AND  t.isParent   = 0`,
  );
  if (rows.length === 0) return [];
  return [
    {
      kind: 'reconciled-not-cleared',
      canAutoFix: true,
      ids: rows.map((r) => r.id),
      description: `${rows.length} reconciled transaction${rows.length > 1 ? 's' : ''} not marked as cleared`,
      fixDescription: `Set cleared on ${rows.length} reconciled transaction${rows.length > 1 ? 's' : ''} so they count toward the cleared balance.`,
      rows: rows.slice(0, 5).map((r) => ({
        label: `${formatDateInt(r.date)} (${r.acct_name})`,
        value: (r.amount / 100).toFixed(2),
      })),
    },
  ];
}

async function findNullClearedReconciled(
  db: SQLite.SQLiteDatabase,
): Promise<DiagnosticIssueRaw[]> {
  const rows = await db.getAllAsync<{ id: string; date: number; null_field: string }>(
    `SELECT id, date, 'cleared' AS null_field
     FROM   transactions
     WHERE  cleared IS NULL AND tombstone = 0
     UNION ALL
     SELECT id, date, 'reconciled' AS null_field
     FROM   transactions
     WHERE  reconciled IS NULL AND tombstone = 0`,
  );
  if (rows.length === 0) return [];
  const clearedCount = rows.filter((r) => r.null_field === 'cleared').length;
  const reconciledCount = rows.filter((r) => r.null_field === 'reconciled').length;
  const uniqueIds = [...new Set(rows.map((r) => r.id))];
  const parts: string[] = [];
  if (clearedCount > 0) parts.push(`${clearedCount} with NULL cleared`);
  if (reconciledCount > 0) parts.push(`${reconciledCount} with NULL reconciled`);
  return [
    {
      kind: 'null-cleared-reconciled',
      canAutoFix: true,
      ids: uniqueIds,
      description: `${uniqueIds.length} transaction${uniqueIds.length > 1 ? 's' : ''} with NULL cleared/reconciled values`,
      fixDescription: `Normalise to 0 on ${uniqueIds.length} transaction${uniqueIds.length > 1 ? 's' : ''} so reconciliation works correctly.`,
      rows: rows.slice(0, 5).map((r) => ({
        label: formatDateInt(r.date),
        value: `${r.null_field} is NULL`,
      })),
    },
  ];
}

export async function queryDiagnostics(db: SQLite.SQLiteDatabase): Promise<DiagnosticIssueRaw[]> {
  const [blanks, cleared, orphans, amounts, parentsWithCat, reconciledNotCleared, nullValues] =
    await Promise.all([
      findBlankChildPayees(db),
      findClearedMismatches(db),
      findOrphanedChildren(db),
      findSplitAmountMismatches(db),
      findParentsWithCategory(db),
      findReconciledNotCleared(db),
      findNullClearedReconciled(db),
    ]);
  return [
    ...blanks,
    ...cleared,
    ...orphans,
    ...amounts,
    ...parentsWithCat,
    ...reconciledNotCleared,
    ...nullValues,
  ];
}
