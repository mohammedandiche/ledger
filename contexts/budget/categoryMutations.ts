import {
  buildCreateCategoryGroupFields,
  buildUpdateCategoryGroupNameFields,
  buildDeleteCategoryGroupFields,
  buildSetCategoryGroupHiddenFields,
  buildCreateCategoryFields,
  buildUpdateCategoryNameFields,
  buildDeleteCategoryFields,
  buildSetCategoryHiddenFields,
  buildMoveCategoryToGroupFields,
  buildReorderCategoryGroupsFields,
  buildReorderCategoriesFields,
} from '@/services/mutations';
import {
  queryNextGroupSortOrder,
  queryNextCategorySortOrder,
} from '@/constants/db';
import { uuid } from '@/constants/sync';
import type { MutationCtx } from './mutationContext';

export async function createCategoryGroup(
  ctx: MutationCtx,
  name: string,
  isIncome = false,
): Promise<string> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Group name is required');
  const id = uuid();
  const sortOrder = await queryNextGroupSortOrder(db);
  const result = await ctx.send(db, buildCreateCategoryGroupFields(id, trimmed, isIncome, sortOrder));
  await ctx.afterMutation(result, db);
  return id;
}

export async function renameCategoryGroup(
  ctx: MutationCtx,
  id: string,
  name: string,
): Promise<void> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) return;
  const result = await ctx.send(db, buildUpdateCategoryGroupNameFields(id, trimmed));
  await ctx.afterMutation(result, db);
}

export async function deleteCategoryGroup(ctx: MutationCtx, groupId: string): Promise<void> {
  const db = ctx.requireDb();
  const catRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0`,
    [groupId],
  );
  const children = catRows.map((r) => ({ catId: r.id, fallbackId: null as string | null }));
  const result = await ctx.send(db, buildDeleteCategoryGroupFields(groupId, children));
  await ctx.afterMutation(result, db);
}

export async function setCategoryGroupHidden(
  ctx: MutationCtx,
  id: string,
  hidden: boolean,
): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildSetCategoryGroupHiddenFields(id, hidden));
  await ctx.afterMutation(result, db);
}

export async function createCategory(
  ctx: MutationCtx,
  name: string,
  groupId: string,
): Promise<string> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required');
  // Inherit is_income from the parent group
  const groupRow = await db.getFirstAsync<{ is_income: number }>(
    `SELECT COALESCE(is_income, 0) AS is_income FROM category_groups WHERE id = ? AND tombstone = 0`,
    [groupId],
  );
  const isIncome = (groupRow?.is_income ?? 0) === 1;
  const id = uuid();
  const sortOrder = await queryNextCategorySortOrder(db, groupId);
  const result = await ctx.send(db, buildCreateCategoryFields(id, trimmed, groupId, isIncome, sortOrder));
  await ctx.afterMutation(result, db);
  return id;
}

export async function renameCategory(ctx: MutationCtx, id: string, name: string): Promise<void> {
  const db = ctx.requireDb();
  const trimmed = name.trim();
  if (!trimmed) return;
  const result = await ctx.send(db, buildUpdateCategoryNameFields(id, trimmed));
  await ctx.afterMutation(result, db);
}

export async function deleteCategory(
  ctx: MutationCtx,
  id: string,
  transferId: string | null = null,
): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildDeleteCategoryFields(id, transferId));
  await ctx.afterMutation(result, db);
}

export async function setCategoryHidden(
  ctx: MutationCtx,
  id: string,
  hidden: boolean,
): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildSetCategoryHiddenFields(id, hidden));
  await ctx.afterMutation(result, db);
}

export async function moveCategoryToGroup(
  ctx: MutationCtx,
  id: string,
  groupId: string,
): Promise<void> {
  const db = ctx.requireDb();
  const sortOrder = await queryNextCategorySortOrder(db, groupId);
  const result = await ctx.send(db, buildMoveCategoryToGroupFields(id, groupId, sortOrder));
  await ctx.afterMutation(result, db);
}

export async function reorderCategoryGroups(
  ctx: MutationCtx,
  orderedIds: string[],
): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildReorderCategoryGroupsFields(orderedIds));
  await ctx.afterMutation(result, db);
}

export async function reorderCategories(ctx: MutationCtx, orderedIds: string[]): Promise<void> {
  const db = ctx.requireDb();
  const result = await ctx.send(db, buildReorderCategoriesFields(orderedIds));
  await ctx.afterMutation(result, db);
}
