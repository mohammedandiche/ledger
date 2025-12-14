import type { CrdtField } from '@/constants/sync';

type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment';

function toDbAccountType(type: AccountType): string {
  return type === 'credit' ? 'creditCard' : type;
}

export function buildCreateAccountFields(
  accountId: string,
  transferPayeeId: string,
  name: string,
  type: AccountType,
  onBudget: boolean,
  sortOrder: number,
): CrdtField[] {
  return [
    { dataset: 'accounts', row: accountId, column: 'name', value: name },
    { dataset: 'accounts', row: accountId, column: 'type', value: toDbAccountType(type) },
    { dataset: 'accounts', row: accountId, column: 'offbudget', value: onBudget ? 0 : 1 },
    { dataset: 'accounts', row: accountId, column: 'closed', value: 0 },
    { dataset: 'accounts', row: accountId, column: 'tombstone', value: 0 },
    { dataset: 'accounts', row: accountId, column: 'sort_order', value: sortOrder },
    // Transfer payee — required for "Transfer: AccountName" in the payee picker
    { dataset: 'payees', row: transferPayeeId, column: 'name', value: `Transfer: ${name}` },
    { dataset: 'payees', row: transferPayeeId, column: 'transfer_acct', value: accountId },
    { dataset: 'payees', row: transferPayeeId, column: 'tombstone', value: 0 },
    { dataset: 'payee_mapping', row: transferPayeeId, column: 'targetId', value: transferPayeeId },
  ];
}

export function buildStartingBalanceFields(
  txId: string,
  accountId: string,
  amountCents: number,
  dateInt: number,
): CrdtField[] {
  return [
    { dataset: 'transactions', row: txId, column: 'acct', value: accountId },
    { dataset: 'transactions', row: txId, column: 'date', value: dateInt },
    { dataset: 'transactions', row: txId, column: 'amount', value: amountCents },
    { dataset: 'transactions', row: txId, column: 'description', value: null },
    { dataset: 'transactions', row: txId, column: 'category', value: null },
    { dataset: 'transactions', row: txId, column: 'notes', value: 'Starting Balance' },
    { dataset: 'transactions', row: txId, column: 'cleared', value: 1 },
    { dataset: 'transactions', row: txId, column: 'reconciled', value: 0 },
    { dataset: 'transactions', row: txId, column: 'tombstone', value: 0 },
    { dataset: 'transactions', row: txId, column: 'isParent', value: 0 },
    { dataset: 'transactions', row: txId, column: 'isChild', value: 0 },
    { dataset: 'transactions', row: txId, column: 'starting_balance_flag', value: 1 },
    { dataset: 'transactions', row: txId, column: 'sort_order', value: Date.now() },
  ];
}

export function buildRenameAccountFields(accountId: string, newName: string): CrdtField[] {
  return [{ dataset: 'accounts', row: accountId, column: 'name', value: newName }];
}

export function buildCloseAccountFields(accountId: string): CrdtField[] {
  return [{ dataset: 'accounts', row: accountId, column: 'closed', value: 1 }];
}

export function buildReopenAccountFields(accountId: string): CrdtField[] {
  return [{ dataset: 'accounts', row: accountId, column: 'closed', value: 0 }];
}

export function buildDeleteAccountFields(
  accountId: string,
  transferPayeeIds: string[],
  ownTxIds: string[],
  counterpartTxIds: string[],
): CrdtField[] {
  const fields: CrdtField[] = [
    { dataset: 'accounts', row: accountId, column: 'tombstone', value: 1 },
  ];
  for (const payeeId of transferPayeeIds) {
    fields.push({ dataset: 'payees', row: payeeId, column: 'tombstone', value: 1 });
  }
  for (const txId of ownTxIds) {
    fields.push({ dataset: 'transactions', row: txId, column: 'tombstone', value: 1 });
  }
  for (const txId of counterpartTxIds) {
    fields.push({ dataset: 'transactions', row: txId, column: 'tombstone', value: 1 });
  }
  return fields;
}
