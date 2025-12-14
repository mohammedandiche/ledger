import type { CrdtField } from '@/constants/sync';

export function buildNewPayeeFields(payeeId: string, name: string): CrdtField[] {
  return [
    { dataset: 'payees', row: payeeId, column: 'name', value: name },
    { dataset: 'payees', row: payeeId, column: 'tombstone', value: 0 },
    { dataset: 'payee_mapping', row: payeeId, column: 'targetId', value: payeeId },
  ];
}

export function buildRenamePayeeFields(payeeId: string, newName: string): CrdtField[] {
  return [{ dataset: 'payees', row: payeeId, column: 'name', value: newName }];
}

export function buildMergePayeesFields(
  targetId: string,
  sources: { id: string; txIds: string[] }[],
): CrdtField[] {
  const fields: CrdtField[] = [];
  for (const src of sources) {
    fields.push({ dataset: 'payees', row: src.id, column: 'tombstone', value: 1 });
    fields.push({ dataset: 'payee_mapping', row: src.id, column: 'targetId', value: targetId });
    for (const txId of src.txIds) {
      fields.push({ dataset: 'transactions', row: txId, column: 'description', value: targetId });
    }
  }
  return fields;
}

export function buildDeleteManyPayeesFields(
  payees: { id: string; txIds: string[] }[],
): CrdtField[] {
  const fields: CrdtField[] = [];
  for (const p of payees) {
    fields.push({ dataset: 'payees', row: p.id, column: 'tombstone', value: 1 });
    for (const txId of p.txIds) {
      fields.push({ dataset: 'transactions', row: txId, column: 'description', value: null });
    }
  }
  return fields;
}
