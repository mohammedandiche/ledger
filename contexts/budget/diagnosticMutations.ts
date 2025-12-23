import { queryDiagnostics } from '@/constants/db';
import type { DiagnosticIssueRaw } from '@/constants/db';
import type { CrdtField } from '@/constants/sync';
import type { MutationCtx } from './mutationContext';

export async function runDiagnostics(ctx: MutationCtx): Promise<DiagnosticIssueRaw[]> {
  const db = ctx.dbRef.current;
  if (!db) return [];
  return queryDiagnostics(db);
}

export async function applyDiagnosticFix(
  ctx: MutationCtx,
  issue: DiagnosticIssueRaw,
): Promise<void> {
  if (!issue.canAutoFix) return;
  const db = ctx.requireDb();
  let fields: CrdtField[] = [];

  if (issue.kind === 'orphan-child') {
    fields = issue.ids.map((id) => ({
      dataset: 'transactions',
      row: id,
      column: 'tombstone',
      value: 1,
    }));
  } else if (issue.kind === 'blank-payee') {
    for (const childId of issue.ids) {
      const row = await db.getFirstAsync<{ parent_desc: string }>(
        `SELECT p.description AS parent_desc FROM transactions c
         JOIN transactions p ON p.id = c.parent_id WHERE c.id = ?`,
        [childId],
      );
      if (row?.parent_desc) {
        fields.push({
          dataset: 'transactions',
          row: childId,
          column: 'description',
          value: row.parent_desc,
        });
      }
    }
  } else if (issue.kind === 'cleared-mismatch') {
    for (const childId of issue.ids) {
      const row = await db.getFirstAsync<{ parent_cleared: number }>(
        `SELECT p.cleared AS parent_cleared FROM transactions c
         JOIN transactions p ON p.id = c.parent_id WHERE c.id = ?`,
        [childId],
      );
      if (row != null) {
        fields.push({
          dataset: 'transactions',
          row: childId,
          column: 'cleared',
          value: row.parent_cleared,
        });
      }
    }
  } else if (issue.kind === 'parent-has-category') {
    fields = issue.ids.map((id) => ({
      dataset: 'transactions',
      row: id,
      column: 'category',
      value: null,
    }));
  } else if (issue.kind === 'reconciled-not-cleared') {
    fields = issue.ids.map((id) => ({
      dataset: 'transactions',
      row: id,
      column: 'cleared',
      value: 1,
    }));
  } else if (issue.kind === 'null-cleared-reconciled') {
    for (const id of issue.ids) {
      const row = await db.getFirstAsync<{ cleared: number | null; reconciled: number | null }>(
        `SELECT cleared, reconciled FROM transactions WHERE id = ?`,
        [id],
      );
      if (row?.cleared === null) {
        fields.push({ dataset: 'transactions', row: id, column: 'cleared', value: 0 });
      }
      if (row?.reconciled === null) {
        fields.push({ dataset: 'transactions', row: id, column: 'reconciled', value: 0 });
      }
    }
  }

  if (fields.length === 0) return;
  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
}
