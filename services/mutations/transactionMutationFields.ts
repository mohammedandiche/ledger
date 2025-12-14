import type { CrdtField } from '@/constants/sync';
import { uuid } from '@/constants/sync';

export function buildAddTransactionFields(
  txId: string,
  tx: {
    accountId: string;
    date: number;
    amount: number;
    categoryId: string | null;
    notes: string;
    cleared: boolean;
  },
  payeeId: string | null,
): CrdtField[] {
  return [
    { dataset: 'transactions', row: txId, column: 'acct', value: tx.accountId },
    { dataset: 'transactions', row: txId, column: 'date', value: tx.date },
    { dataset: 'transactions', row: txId, column: 'amount', value: tx.amount },
    { dataset: 'transactions', row: txId, column: 'description', value: payeeId },
    { dataset: 'transactions', row: txId, column: 'category', value: tx.categoryId },
    { dataset: 'transactions', row: txId, column: 'notes', value: tx.notes || null },
    { dataset: 'transactions', row: txId, column: 'cleared', value: tx.cleared ? 1 : 0 },
    { dataset: 'transactions', row: txId, column: 'reconciled', value: 0 },
    { dataset: 'transactions', row: txId, column: 'tombstone', value: 0 },
    { dataset: 'transactions', row: txId, column: 'isParent', value: 0 },
    { dataset: 'transactions', row: txId, column: 'isChild', value: 0 },
    { dataset: 'transactions', row: txId, column: 'sort_order', value: Date.now() },
  ];
}

export function buildAddSplitTransactionFields(
  parent: {
    accountId: string;
    date: number;
    amount: number;
    notes: string;
    cleared: boolean;
  },
  parentPayeeId: string | null,
  children: {
    amount: number;
    categoryId: string | null;
    notes: string;
  }[],
  childPayeeIds: (string | null)[],
): { parentId: string; childIds: string[]; fields: CrdtField[] } {
  const parentId = uuid();
  const now = Date.now();

  const fields: CrdtField[] = [
    { dataset: 'transactions', row: parentId, column: 'acct', value: parent.accountId },
    { dataset: 'transactions', row: parentId, column: 'date', value: parent.date },
    { dataset: 'transactions', row: parentId, column: 'amount', value: parent.amount },
    { dataset: 'transactions', row: parentId, column: 'description', value: parentPayeeId },
    { dataset: 'transactions', row: parentId, column: 'category', value: null },
    { dataset: 'transactions', row: parentId, column: 'notes', value: parent.notes || null },
    { dataset: 'transactions', row: parentId, column: 'cleared', value: parent.cleared ? 1 : 0 },
    { dataset: 'transactions', row: parentId, column: 'reconciled', value: 0 },
    { dataset: 'transactions', row: parentId, column: 'tombstone', value: 0 },
    { dataset: 'transactions', row: parentId, column: 'isParent', value: 1 },
    { dataset: 'transactions', row: parentId, column: 'isChild', value: 0 },
    { dataset: 'transactions', row: parentId, column: 'sort_order', value: now },
  ];

  const childIds: string[] = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const childId = uuid();
    childIds.push(childId);
    fields.push(
      { dataset: 'transactions', row: childId, column: 'acct', value: parent.accountId },
      { dataset: 'transactions', row: childId, column: 'date', value: parent.date },
      { dataset: 'transactions', row: childId, column: 'amount', value: c.amount },
      { dataset: 'transactions', row: childId, column: 'description', value: childPayeeIds[i] },
      { dataset: 'transactions', row: childId, column: 'category', value: c.categoryId },
      { dataset: 'transactions', row: childId, column: 'notes', value: c.notes || null },
      { dataset: 'transactions', row: childId, column: 'cleared', value: parent.cleared ? 1 : 0 },
      { dataset: 'transactions', row: childId, column: 'reconciled', value: 0 },
      { dataset: 'transactions', row: childId, column: 'tombstone', value: 0 },
      { dataset: 'transactions', row: childId, column: 'isParent', value: 0 },
      { dataset: 'transactions', row: childId, column: 'isChild', value: 1 },
      { dataset: 'transactions', row: childId, column: 'parent_id', value: parentId },
      { dataset: 'transactions', row: childId, column: 'sort_order', value: now + i + 1 },
    );
  }

  return { parentId, childIds, fields };
}

export function buildAddSplitChildFields(
  parentId: string,
  child: {
    accountId: string;
    date: number;
    amount: number;
    categoryId: string | null;
    notes: string;
    cleared: boolean;
  },
  payeeId: string | null,
): { childId: string; fields: CrdtField[] } {
  const childId = uuid();
  return {
    childId,
    fields: [
      { dataset: 'transactions', row: parentId, column: 'isParent', value: 1 },
      { dataset: 'transactions', row: childId, column: 'acct', value: child.accountId },
      { dataset: 'transactions', row: childId, column: 'date', value: child.date },
      { dataset: 'transactions', row: childId, column: 'amount', value: child.amount },
      { dataset: 'transactions', row: childId, column: 'description', value: payeeId },
      { dataset: 'transactions', row: childId, column: 'category', value: child.categoryId },
      { dataset: 'transactions', row: childId, column: 'notes', value: child.notes || null },
      { dataset: 'transactions', row: childId, column: 'cleared', value: child.cleared ? 1 : 0 },
      { dataset: 'transactions', row: childId, column: 'reconciled', value: 0 },
      { dataset: 'transactions', row: childId, column: 'tombstone', value: 0 },
      { dataset: 'transactions', row: childId, column: 'isParent', value: 0 },
      { dataset: 'transactions', row: childId, column: 'isChild', value: 1 },
      { dataset: 'transactions', row: childId, column: 'parent_id', value: parentId },
      { dataset: 'transactions', row: childId, column: 'sort_order', value: Date.now() },
    ],
  };
}

export function buildUpdateTransactionFields(
  tx: {
    id: string;
    accountId: string;
    date: number;
    amount: number;
    categoryId: string | null;
    notes: string;
    cleared: boolean;
  },
  payeeId: string | null,
): CrdtField[] {
  return [
    { dataset: 'transactions', row: tx.id, column: 'acct', value: tx.accountId },
    { dataset: 'transactions', row: tx.id, column: 'date', value: tx.date },
    { dataset: 'transactions', row: tx.id, column: 'amount', value: tx.amount },
    { dataset: 'transactions', row: tx.id, column: 'description', value: payeeId },
    { dataset: 'transactions', row: tx.id, column: 'category', value: tx.categoryId },
    { dataset: 'transactions', row: tx.id, column: 'notes', value: tx.notes || null },
    { dataset: 'transactions', row: tx.id, column: 'cleared', value: tx.cleared ? 1 : 0 },
  ];
}

export function buildToggleClearedField(id: string, newValue: 0 | 1): CrdtField[] {
  return [{ dataset: 'transactions', row: id, column: 'cleared', value: newValue }];
}

export function buildDeleteTransactionField(id: string): CrdtField[] {
  return [{ dataset: 'transactions', row: id, column: 'tombstone', value: 1 }];
}

export function buildUnreconcileField(id: string): CrdtField[] {
  return [{ dataset: 'transactions', row: id, column: 'reconciled', value: 0 }];
}

export function buildLockReconciledFields(ids: string[]): CrdtField[] {
  return ids.map((id) => ({ dataset: 'transactions', row: id, column: 'reconciled', value: 1 }));
}
