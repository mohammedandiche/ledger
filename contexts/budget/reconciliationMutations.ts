import { queryClearedBalance, queryTransactionsToLock } from '@/constants/db';
import { buildUnreconcileField, buildLockReconciledFields } from '@/services/mutations';
import type { MutationCtx } from './mutationContext';

export async function getClearedBalance(ctx: MutationCtx, accountId: string): Promise<number> {
  const db = ctx.dbRef.current;
  if (!db) return 0;
  return queryClearedBalance(db, accountId);
}

export async function unreconcileTransaction(ctx: MutationCtx, id: string): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildUnreconcileField(id));
  await ctx.afterMutation(result, db);
}

export async function lockReconciled(ctx: MutationCtx, accountId: string): Promise<void> {
  const db = ctx.requireDb();
  const ids = await queryTransactionsToLock(db, accountId);
  if (ids.length === 0) return;
  const result = await ctx.send(db, buildLockReconciledFields(ids));
  await ctx.afterMutation(result, db);
}
