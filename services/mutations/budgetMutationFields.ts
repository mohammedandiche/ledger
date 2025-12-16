import type { CrdtField } from '@/constants/sync';
import { uuid } from '@/constants/sync';
import { nextMonthInt } from '@/utils/monthHelpers';

export function buildSetBudgetAmountFields(
  existingId: string | null,
  monthInt: number,
  categoryId: string,
  amountCents: number,
): CrdtField[] {
  if (existingId) {
    return [{ dataset: 'zero_budgets', row: existingId, column: 'amount', value: amountCents }];
  }
  const newId = uuid();
  return [
    { dataset: 'zero_budgets', row: newId, column: 'month', value: monthInt },
    { dataset: 'zero_budgets', row: newId, column: 'category', value: categoryId },
    { dataset: 'zero_budgets', row: newId, column: 'amount', value: amountCents },
    { dataset: 'zero_budgets', row: newId, column: 'carryover', value: 0 },
  ];
}

export function buildToggleCarryoverFields(
  existing: { id: string; carryover: number } | null,
  monthInt: number,
  categoryId: string,
): CrdtField[] {
  if (existing) {
    return [
      {
        dataset: 'zero_budgets',
        row: existing.id,
        column: 'carryover',
        value: existing.carryover === 1 ? 0 : 1,
      },
    ];
  }
  const newId = uuid();
  return [
    { dataset: 'zero_budgets', row: newId, column: 'month', value: monthInt },
    { dataset: 'zero_budgets', row: newId, column: 'category', value: categoryId },
    { dataset: 'zero_budgets', row: newId, column: 'amount', value: 0 },
    { dataset: 'zero_budgets', row: newId, column: 'carryover', value: 1 },
  ];
}

export function buildToggleCarryover12Fields(
  existingRows: Map<number, { id: string; carryover: number }>,
  startMonthInt: number,
  categoryId: string,
): CrdtField[] {
  const first = existingRows.get(startMonthInt);
  const targetValue = first ? (first.carryover === 1 ? 0 : 1) : 1;

  const fields: CrdtField[] = [];
  let mi = startMonthInt;
  for (let i = 0; i < 12; i++) {
    const existing = existingRows.get(mi);
    if (existing) {
      if (existing.carryover !== targetValue) {
        fields.push({
          dataset: 'zero_budgets',
          row: existing.id,
          column: 'carryover',
          value: targetValue,
        });
      }
    } else if (targetValue === 1) {
      const newId = uuid();
      fields.push(
        { dataset: 'zero_budgets', row: newId, column: 'month', value: mi },
        { dataset: 'zero_budgets', row: newId, column: 'category', value: categoryId },
        { dataset: 'zero_budgets', row: newId, column: 'amount', value: 0 },
        { dataset: 'zero_budgets', row: newId, column: 'carryover', value: 1 },
      );
    }
    mi = nextMonthInt(mi);
  }
  return fields;
}

export function buildTransferBudgetFields(
  monthInt: number,
  fromCategoryId: string,
  toCategoryId: string,
  amountCents: number,
  fromRow: { id: string; amount: number } | null,
  toRow: { id: string; amount: number } | null,
): CrdtField[] {
  const fields: CrdtField[] = [];

  if (fromRow) {
    fields.push({
      dataset: 'zero_budgets',
      row: fromRow.id,
      column: 'amount',
      value: fromRow.amount - amountCents,
    });
  } else {
    const newId = uuid();
    fields.push(
      { dataset: 'zero_budgets', row: newId, column: 'month', value: monthInt },
      { dataset: 'zero_budgets', row: newId, column: 'category', value: fromCategoryId },
      { dataset: 'zero_budgets', row: newId, column: 'amount', value: -amountCents },
      { dataset: 'zero_budgets', row: newId, column: 'carryover', value: 0 },
    );
  }

  if (toRow) {
    fields.push({
      dataset: 'zero_budgets',
      row: toRow.id,
      column: 'amount',
      value: toRow.amount + amountCents,
    });
  } else {
    const newId = uuid();
    fields.push(
      { dataset: 'zero_budgets', row: newId, column: 'month', value: monthInt },
      { dataset: 'zero_budgets', row: newId, column: 'category', value: toCategoryId },
      { dataset: 'zero_budgets', row: newId, column: 'amount', value: amountCents },
      { dataset: 'zero_budgets', row: newId, column: 'carryover', value: 0 },
    );
  }

  return fields;
}
