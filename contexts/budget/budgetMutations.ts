import {
  buildSetBudgetAmountFields,
  buildToggleCarryover12Fields,
  buildTransferBudgetFields,
} from '@/services/mutations';
import { queryTransactions, filtersFromActiveFilters, queryUncatCount } from '@/constants/db';
import { FILTERED_TX_LIMIT } from '@/constants/config';
import { monthToInt } from '@/utils/monthHelpers';
import type { ActiveFilter, Transaction } from '@/constants/types';
import type { MutationCtx } from './mutationContext';

export async function setBudgetAmount(
  ctx: MutationCtx,
  categoryId: string,
  amountCents: number,
): Promise<void> {
  const db = ctx.requireDb();
  const mi = monthToInt(ctx.year, ctx.month);
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM zero_budgets WHERE month = ? AND category = ?`,
    [mi, categoryId],
  );
  const result = await ctx.send(
    db,
    buildSetBudgetAmountFields(existing?.id ?? null, mi, categoryId, amountCents),
  );
  await ctx.afterMutation(result, db);
}

export async function toggleCarryover(ctx: MutationCtx, categoryId: string): Promise<void> {
  const db = ctx.requireDb();
  const startMi = monthToInt(ctx.year, ctx.month);

  const rows = await db.getAllAsync<{ id: string; month: number; carryover: number }>(
    `SELECT id, month, COALESCE(carryover, 0) AS carryover
     FROM   zero_budgets
     WHERE  category = ? AND month >= ? AND month <= ?`,
    [categoryId, startMi, startMi + 100],
  );
  const existingMap = new Map(rows.map((r) => [r.month, { id: r.id, carryover: r.carryover }]));

  const fields = buildToggleCarryover12Fields(existingMap, startMi, categoryId);
  if (fields.length === 0) return;
  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
}

export async function transferBudget(
  ctx: MutationCtx,
  fromCategoryId: string,
  toCategoryId: string,
  amountCents: number,
): Promise<void> {
  const db = ctx.requireDb();
  const mi = monthToInt(ctx.year, ctx.month);
  const [fromRow, toRow] = await Promise.all([
    db.getFirstAsync<{ id: string; amount: number }>(
      `SELECT id, COALESCE(amount,0) AS amount FROM zero_budgets WHERE month = ? AND category = ?`,
      [mi, fromCategoryId],
    ),
    db.getFirstAsync<{ id: string; amount: number }>(
      `SELECT id, COALESCE(amount,0) AS amount FROM zero_budgets WHERE month = ? AND category = ?`,
      [mi, toCategoryId],
    ),
  ]);
  const result = await ctx.send(
    db,
    buildTransferBudgetFields(mi, fromCategoryId, toCategoryId, amountCents, fromRow ?? null, toRow ?? null),
  );
  await ctx.afterMutation(result, db);
}

export async function queryWithFilters(
  ctx: MutationCtx,
  filters: ActiveFilter[],
  accountId?: string | null,
  searchQuery?: string | null,
): Promise<(Transaction | { dateSeparator: string })[]> {
  const db = ctx.dbRef.current;
  if (!db) return [];
  const txFilters = filtersFromActiveFilters(filters, accountId);
  if (searchQuery?.trim()) txFilters.searchQuery = searchQuery.trim();
  const result = await queryTransactions(db, txFilters, FILTERED_TX_LIMIT);
  return result.items;
}

export async function getUncatCount(
  ctx: MutationCtx,
  accountId: string | null,
): Promise<number> {
  const db = ctx.dbRef.current;
  if (!db) return 0;
  return queryUncatCount(db, accountId);
}
