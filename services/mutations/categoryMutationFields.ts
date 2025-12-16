import type { CrdtField } from '@/constants/sync';
import { SORT_GAP } from '@/constants/config';

export function buildCreateCategoryGroupFields(
  id: string,
  name: string,
  isIncome: boolean,
  sortOrder: number,
): CrdtField[] {
  return [
    { dataset: 'category_groups', row: id, column: 'name', value: name },
    { dataset: 'category_groups', row: id, column: 'is_income', value: isIncome ? 1 : 0 },
    { dataset: 'category_groups', row: id, column: 'sort_order', value: sortOrder },
    { dataset: 'category_groups', row: id, column: 'hidden', value: 0 },
    { dataset: 'category_groups', row: id, column: 'tombstone', value: 0 },
  ];
}

export function buildUpdateCategoryGroupNameFields(id: string, name: string): CrdtField[] {
  return [{ dataset: 'category_groups', row: id, column: 'name', value: name }];
}

export function buildDeleteCategoryGroupFields(
  groupId: string,
  children: { catId: string; fallbackId: string | null }[],
): CrdtField[] {
  const fields: CrdtField[] = [
    { dataset: 'category_groups', row: groupId, column: 'tombstone', value: 1 },
  ];
  for (const { catId, fallbackId } of children) {
    fields.push({ dataset: 'categories', row: catId, column: 'tombstone', value: 1 });
    fields.push({
      dataset: 'category_mapping',
      row: catId,
      column: 'transferId',
      value: fallbackId,
    });
  }
  return fields;
}

export function buildSetCategoryGroupHiddenFields(id: string, hidden: boolean): CrdtField[] {
  return [{ dataset: 'category_groups', row: id, column: 'hidden', value: hidden ? 1 : 0 }];
}

export function buildCreateCategoryFields(
  id: string,
  name: string,
  groupId: string,
  isIncome: boolean,
  sortOrder: number,
): CrdtField[] {
  return [
    { dataset: 'categories', row: id, column: 'name', value: name },
    { dataset: 'categories', row: id, column: 'cat_group', value: groupId },
    { dataset: 'categories', row: id, column: 'is_income', value: isIncome ? 1 : 0 },
    { dataset: 'categories', row: id, column: 'sort_order', value: sortOrder },
    { dataset: 'categories', row: id, column: 'hidden', value: 0 },
    { dataset: 'categories', row: id, column: 'tombstone', value: 0 },
    // Self-reference in category_mapping (required by Actual Budget's sync protocol)
    { dataset: 'category_mapping', row: id, column: 'transferId', value: id },
  ];
}

export function buildUpdateCategoryNameFields(id: string, name: string): CrdtField[] {
  return [{ dataset: 'categories', row: id, column: 'name', value: name }];
}

export function buildDeleteCategoryFields(id: string, transferId: string | null): CrdtField[] {
  return [
    { dataset: 'categories', row: id, column: 'tombstone', value: 1 },
    { dataset: 'category_mapping', row: id, column: 'transferId', value: transferId },
  ];
}

export function buildSetCategoryHiddenFields(id: string, hidden: boolean): CrdtField[] {
  return [{ dataset: 'categories', row: id, column: 'hidden', value: hidden ? 1 : 0 }];
}

export function buildMoveCategoryToGroupFields(
  id: string,
  groupId: string,
  sortOrder: number,
): CrdtField[] {
  return [
    { dataset: 'categories', row: id, column: 'cat_group', value: groupId },
    { dataset: 'categories', row: id, column: 'sort_order', value: sortOrder },
  ];
}

export function buildReorderCategoryGroupsFields(orderedIds: string[]): CrdtField[] {
  return orderedIds.map((id, i) => ({
    dataset: 'category_groups',
    row: id,
    column: 'sort_order',
    value: (i + 1) * SORT_GAP,
  }));
}

export function buildReorderCategoriesFields(orderedIds: string[]): CrdtField[] {
  return orderedIds.map((id, i) => ({
    dataset: 'categories',
    row: id,
    column: 'sort_order',
    value: (i + 1) * SORT_GAP,
  }));
}
