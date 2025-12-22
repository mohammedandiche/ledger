import type { Account } from '@/constants/types';
import {
  buildCreateAccountFields,
  buildStartingBalanceFields,
  buildRenameAccountFields,
  buildCloseAccountFields,
  buildReopenAccountFields,
  buildDeleteAccountFields,
} from '@/services/mutations';
import { uuid } from '@/constants/sync';
import { todayInt } from '@/utils/dbMappers';
import type { MutationCtx } from './mutationContext';

export async function createAccount(
  ctx: MutationCtx,
  name: string,
  type: Account['type'],
  onBudget: boolean,
  startingBalanceCents: number,
): Promise<string> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Account name is required');

  const sortRow = await db.getFirstAsync<{ maxSort: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM accounts WHERE tombstone = 0`,
  );
  const sortOrder = (sortRow?.maxSort ?? 0) + 1;

  const accountId = uuid();
  const transferPayeeId = uuid();
  const fields = buildCreateAccountFields(accountId, transferPayeeId, trimmed, type, onBudget, sortOrder);

  if (startingBalanceCents !== 0) {
    fields.push(...buildStartingBalanceFields(uuid(), accountId, startingBalanceCents, todayInt()));
  }

  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
  return accountId;
}

export async function renameAccount(
  ctx: MutationCtx,
  accountId: string,
  newName: string,
): Promise<void> {
  const db = ctx.requireDb();
  const trimmed = newName.trim();
  if (!trimmed) return;
  const result = await ctx.send(db, buildRenameAccountFields(accountId, trimmed));
  await ctx.afterMutation(result, db);
}

export async function closeAccount(ctx: MutationCtx, accountId: string): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildCloseAccountFields(accountId));
  if (ctx.activeAccountIdRef.current === accountId) {
    ctx.activeAccountIdRef.current = null;
    ctx.setActiveAccountId(null);
  }
  await ctx.afterMutation(result, db);
}

export async function reopenAccount(ctx: MutationCtx, accountId: string): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildReopenAccountFields(accountId));
  await ctx.afterMutation(result, db);
}

export async function deleteAccount(ctx: MutationCtx, accountId: string): Promise<void> {
  const db = ctx.requireDb();

  const transferPayeeRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
    [accountId],
  );
  const transferPayeeIds = transferPayeeRows.map((r) => r.id);

  const ownTxRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions WHERE acct = ? AND tombstone = 0`,
    [accountId],
  );
  const ownTxIds = ownTxRows.map((r) => r.id);

  // Counterpart transfer transactions in OTHER accounts must also be deleted
  let counterpartTxIds: string[] = [];
  if (transferPayeeIds.length > 0) {
    const placeholders = transferPayeeIds.map(() => '?').join(',');
    const counterpartRows = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM transactions WHERE description IN (${placeholders}) AND acct != ? AND tombstone = 0`,
      [...transferPayeeIds, accountId],
    );
    counterpartTxIds = counterpartRows.map((r) => r.id);
  }

  // Clear active-account before afterMutation so reloadAllRef uses acctId=null
  if (ctx.activeAccountIdRef.current === accountId) {
    ctx.activeAccountIdRef.current = null;
    ctx.setActiveAccountId(null);
  }

  const result = await ctx.send(
    db,
    buildDeleteAccountFields(accountId, transferPayeeIds, ownTxIds, counterpartTxIds),
  );
  await ctx.afterMutation(result, db);
}
