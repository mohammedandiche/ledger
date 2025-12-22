import { queryPayees } from '@/constants/db';
import { uuid } from '@/constants/sync';
import type { CrdtField } from '@/constants/sync';
import {
  buildRenamePayeeFields,
  buildMergePayeesFields,
  buildDeleteManyPayeesFields,
} from '@/services/mutations';
import { getPendingCount } from '@/services/offlineQueue';
import type { MutationCtx } from './mutationContext';

export async function createPayee(ctx: MutationCtx, name: string): Promise<void> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) return;
  if (ctx.payees.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
  const payeeId = uuid();
  const result = await ctx.send(db, [
    { dataset: 'payees', row: payeeId, column: 'name', value: trimmed },
    { dataset: 'payees', row: payeeId, column: 'tombstone', value: 0 },
    { dataset: 'payee_mapping', row: payeeId, column: 'targetId', value: payeeId },
  ]);
  ctx.setPayees(await queryPayees(db));
  if (result.queued) {
    ctx.setPendingCount(await getPendingCount(db));
  }
}

export async function deletePayee(ctx: MutationCtx, payeeId: string): Promise<void> {
  const db = ctx.requireDb();
  const txRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions WHERE description = ? AND tombstone = 0`,
    [payeeId],
  );
  const fields: CrdtField[] = [
    { dataset: 'payees', row: payeeId, column: 'tombstone', value: 1 },
    ...txRows.map((r) => ({
      dataset: 'transactions',
      row: r.id,
      column: 'description',
      value: null,
    })),
  ];
  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
}

export async function renamePayee(
  ctx: MutationCtx,
  payeeId: string,
  newName: string,
): Promise<void> {
  const db = ctx.requireDb();
  const trimmed = newName.trim();
  if (!trimmed) return;
  const duplicate = ctx.payees.find(
    (p) => p.id !== payeeId && p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) {
    ctx.addToast(`"${duplicate.name}" already exists`, 'warning');
    return;
  }
  const result = await ctx.send(db, buildRenamePayeeFields(payeeId, trimmed));
  await ctx.afterMutation(result, db);
}

export async function mergePayees(
  ctx: MutationCtx,
  targetId: string,
  sourceIds: string[],
): Promise<void> {
  const db = ctx.requireDb();
  const sources = await Promise.all(
    sourceIds.map(async (id) => {
      const rows = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM transactions WHERE description = ? AND tombstone = 0`,
        [id],
      );
      return { id, txIds: rows.map((r) => r.id) };
    }),
  );
  const result = await ctx.send(db, buildMergePayeesFields(targetId, sources));
  await ctx.afterMutation(result, db);
}

export async function deleteManyPayees(ctx: MutationCtx, ids: string[]): Promise<void> {
  const db = ctx.requireDb();
  const payeeData = await Promise.all(
    ids.map(async (id) => {
      const rows = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM transactions WHERE description = ? AND tombstone = 0`,
        [id],
      );
      return { id, txIds: rows.map((r) => r.id) };
    }),
  );
  const result = await ctx.send(db, buildDeleteManyPayeesFields(payeeData));
  await ctx.afterMutation(result, db);
}
