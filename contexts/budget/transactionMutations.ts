import type * as SQLite from 'expo-sqlite';
import { uuid } from '@/constants/sync';
import type { CrdtField } from '@/constants/sync';
import {
  buildAddTransactionFields,
  buildAddSplitChildFields,
  buildAddSplitTransactionFields,
  buildUpdateTransactionFields,
  buildToggleClearedField,
  buildDeleteTransactionField,
} from '@/services/mutations';
import type { MutationCtx } from './mutationContext';

async function resolveTransferCounterpart(
  db: SQLite.SQLiteDatabase,
  payeeId: string | null,
  sourceAccountId: string,
): Promise<{ destAccountId: string; counterpartPayeeId: string | null } | null> {
  if (!payeeId) return null;
  const row = await db.getFirstAsync<{ transfer_acct: string }>(
    `SELECT transfer_acct FROM payees WHERE id = ? AND transfer_acct IS NOT NULL AND tombstone = 0`,
    [payeeId],
  );
  if (!row) return null;
  const srcPayee = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
    [sourceAccountId],
  );
  return { destAccountId: row.transfer_acct, counterpartPayeeId: srcPayee?.id ?? null };
}

export async function addTransaction(
  ctx: MutationCtx,
  tx: {
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
    transferAccountId?: string | null;
  },
): Promise<void> {
  const db = ctx.requireDb();

  if (tx.transferAccountId) {
    const [destPayeeRow, srcPayeeRow] = await Promise.all([
      db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [tx.transferAccountId],
      ),
      db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [tx.accountId],
      ),
    ]);
    // Source side uses tx.categoryId so off-budget accounts can carry a category.
    // Counterpart (destination side) always has null category.
    const fields = [
      ...buildAddTransactionFields(
        uuid(),
        { accountId: tx.accountId, date: tx.date, categoryId: tx.categoryId, amount: tx.amount, notes: tx.notes, cleared: tx.cleared },
        destPayeeRow?.id ?? null,
      ),
      ...buildAddTransactionFields(
        uuid(),
        { accountId: tx.transferAccountId, date: tx.date, categoryId: null, amount: -tx.amount, notes: tx.notes, cleared: tx.cleared },
        srcPayeeRow?.id ?? null,
      ),
    ];
    const result = await ctx.send(db, fields);
    await ctx.afterMutation(result, db);
    return;
  }

  const { id: payeeId, newFields } = await ctx.resolve(tx.payeeName);
  const mainFields = buildAddTransactionFields(uuid(), tx, payeeId);

  // Fallback: detect transfer via payee's transfer_acct
  // (handles manual typing of "Transfer: X")
  const counterpart = await resolveTransferCounterpart(db, payeeId, tx.accountId);
  const counterpartFields = counterpart
    ? buildAddTransactionFields(
        uuid(),
        { accountId: counterpart.destAccountId, date: tx.date, categoryId: null, amount: -tx.amount, notes: tx.notes, cleared: tx.cleared },
        counterpart.counterpartPayeeId,
      )
    : [];

  const result = await ctx.send(db, [...newFields, ...mainFields, ...counterpartFields]);
  await ctx.afterMutation(result, db);
}

export async function updateTransaction(
  ctx: MutationCtx,
  tx: {
    id: string;
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
    transferAccountId?: string | null;
  },
): Promise<void> {
  const db = ctx.requireDb();

  const currentTxRow = await db.getFirstAsync<{ amount: number; isChild: number; parent_id: string | null; description: string | null }>(
    `SELECT amount, isChild, parent_id, description FROM transactions WHERE id = ? AND tombstone = 0`,
    [tx.id],
  );

  let parentSyncFields: CrdtField[] = [];
  if (currentTxRow?.isChild === 1 && currentTxRow.parent_id) {
    const parentRow = await db.getFirstAsync<{ amount: number }>(
      `SELECT amount FROM transactions WHERE id = ? AND tombstone = 0`,
      [currentTxRow.parent_id]
    );
    if (parentRow) {
      const diff = tx.amount - currentTxRow.amount;
      if (diff !== 0) {
        parentSyncFields.push({
          dataset: 'transactions',
          row: currentTxRow.parent_id,
          column: 'amount',
          value: parentRow.amount + diff,
        });
      }
    }
  }

  if (tx.transferAccountId) {
    let oldDestAccountId: string | null = null;
    if (currentTxRow?.description) {
      const oldDestPayee = await db.getFirstAsync<{ transfer_acct: string }>(
        `SELECT transfer_acct FROM payees WHERE id = ? AND transfer_acct IS NOT NULL AND tombstone = 0`,
        [currentTxRow.description],
      );
      oldDestAccountId = oldDestPayee?.transfer_acct ?? null;
    }
    const destinationChanged = !!oldDestAccountId && oldDestAccountId !== tx.transferAccountId;

    const [newDestPayeeRow, srcPayeeRow] = await Promise.all([
      db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [tx.transferAccountId],
      ),
      db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [tx.accountId],
      ),
    ]);

    const allFields: CrdtField[] = [
      ...buildUpdateTransactionFields(
        { id: tx.id, accountId: tx.accountId, date: tx.date, categoryId: tx.categoryId, amount: tx.amount, notes: tx.notes, cleared: tx.cleared },
        newDestPayeeRow?.id ?? null,
      ),
    ];

    if (destinationChanged) {
      if (srcPayeeRow) {
        const oldCounterpart = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM transactions
           WHERE  acct = ? AND description = ? AND tombstone = 0
           ORDER  BY date DESC, sort_order DESC LIMIT 1`,
          [oldDestAccountId, srcPayeeRow.id],
        );
        if (oldCounterpart) allFields.push(...buildDeleteTransactionField(oldCounterpart.id));
        allFields.push(
          ...buildAddTransactionFields(uuid(), {
            accountId: tx.transferAccountId, date: tx.date, categoryId: null,
            amount: -tx.amount, notes: tx.notes, cleared: tx.cleared,
          }, srcPayeeRow.id),
        );
      }
    } else if (srcPayeeRow) {
      const counterpartRow = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM transactions
         WHERE  acct = ? AND description = ? AND tombstone = 0
         ORDER  BY date DESC, sort_order DESC LIMIT 1`,
        [tx.transferAccountId, srcPayeeRow.id],
      );
      if (counterpartRow) {
        allFields.push(
          ...buildUpdateTransactionFields(
            { id: counterpartRow.id, accountId: tx.transferAccountId, date: tx.date, categoryId: null, amount: -tx.amount, notes: tx.notes, cleared: tx.cleared },
            srcPayeeRow.id,
          ),
        );
      }
    }

    const result = await ctx.send(db, [...allFields, ...parentSyncFields]);
    await ctx.afterMutation(result, db);
    return;
  }

  const { id: payeeId, newFields } = await ctx.resolve(tx.payeeName);
  const mainFields = buildUpdateTransactionFields(tx, payeeId);

  const counterpart = await resolveTransferCounterpart(db, payeeId, tx.accountId);
  let counterpartUpdateFields: CrdtField[] = [];
  if (counterpart) {
    const counterpartRow = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM transactions
       WHERE  acct = ? AND description = ? AND tombstone = 0
       ORDER  BY date DESC, sort_order DESC LIMIT 1`,
      [counterpart.destAccountId, counterpart.counterpartPayeeId ?? ''],
    );
    if (counterpartRow) {
      counterpartUpdateFields = buildUpdateTransactionFields(
        {
          id: counterpartRow.id,
          accountId: counterpart.destAccountId,
          date: tx.date,
          categoryId: null,
          amount: -tx.amount,
          notes: tx.notes,
          cleared: tx.cleared,
        },
        counterpart.counterpartPayeeId,
      );
    }
  }

  const result = await ctx.send(db, [...newFields, ...mainFields, ...parentSyncFields, ...counterpartUpdateFields]);
  await ctx.afterMutation(result, db);
}

export async function toggleCleared(
  ctx: MutationCtx,
  id: string,
  current: 'cleared' | 'uncleared' | 'reconciled',
): Promise<void> {
  if (current === 'reconciled') return;
  const db = ctx.requireDb();
  const newValue = current === 'cleared' ? 0 : 1;
  const fields: CrdtField[] = [...buildToggleClearedField(id, newValue as 0 | 1)];

  // Sync cleared state on the transfer counterpart too
  const txRow = await db.getFirstAsync<{ acct: string; description: string | null }>(
    `SELECT acct, description FROM transactions WHERE id = ? AND tombstone = 0`,
    [id],
  );
  if (txRow?.description) {
    const payeeRow = await db.getFirstAsync<{ transfer_acct: string }>(
      `SELECT transfer_acct FROM payees WHERE id = ? AND transfer_acct IS NOT NULL AND tombstone = 0`,
      [txRow.description],
    );
    if (payeeRow) {
      const srcPayeeRow = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [txRow.acct],
      );
      if (srcPayeeRow) {
        const counterpartRow = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM transactions
           WHERE  acct = ? AND description = ? AND tombstone = 0
           ORDER  BY date DESC, sort_order DESC LIMIT 1`,
          [payeeRow.transfer_acct, srcPayeeRow.id],
        );
        if (counterpartRow) {
          fields.push(...buildToggleClearedField(counterpartRow.id, newValue as 0 | 1));
        }
      }
    }
  }

  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
}

export async function deleteTransaction(ctx: MutationCtx, id: string): Promise<void> {
  const db = ctx.requireDb();

  const txRow = await db.getFirstAsync<{ amount: number; isChild: number; parent_id: string | null; acct: string; description: string | null }>(
    `SELECT amount, isChild, parent_id, acct, description FROM transactions WHERE id = ? AND tombstone = 0`,
    [id],
  );
  const fields: CrdtField[] = [...buildDeleteTransactionField(id)];

  // Subtract deleted child's amount from parent
  if (txRow?.isChild === 1 && txRow.parent_id) {
    const parentRow = await db.getFirstAsync<{ amount: number }>(
      `SELECT amount FROM transactions WHERE id = ? AND tombstone = 0`,
      [txRow.parent_id]
    );
    if (parentRow) {
      fields.push({
        dataset: 'transactions',
        row: txRow.parent_id,
        column: 'amount',
        value: parentRow.amount - txRow.amount,
      });
    }
  }

  // If the payee is a transfer payee, tombstone the counterpart too
  if (txRow?.description) {
    const payeeRow = await db.getFirstAsync<{ transfer_acct: string }>(
      `SELECT transfer_acct FROM payees WHERE id = ? AND transfer_acct IS NOT NULL AND tombstone = 0`,
      [txRow.description],
    );
    if (payeeRow) {
      const srcPayeeRow = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0`,
        [txRow.acct],
      );
      if (srcPayeeRow) {
        const counterpartRow = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM transactions
           WHERE  acct = ? AND description = ? AND tombstone = 0
           ORDER  BY date DESC, sort_order DESC LIMIT 1`,
          [payeeRow.transfer_acct, srcPayeeRow.id],
        );
        if (counterpartRow) {
          fields.push(...buildDeleteTransactionField(counterpartRow.id));
        }
      }
    }
  }

  const result = await ctx.send(db, fields);
  await ctx.afterMutation(result, db);
}

export async function addSplitChild(
  ctx: MutationCtx,
  parentId: string,
  child: {
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
  },
): Promise<string> {
  const db = ctx.requireDb();
  const { id: payeeId, newFields } = await ctx.resolve(child.payeeName);
  const { childId, fields } = buildAddSplitChildFields(parentId, child, payeeId);
  const allFields = [...newFields, ...fields];

  const parentRow = await db.getFirstAsync<{ amount: number }>(
    `SELECT amount FROM transactions WHERE id = ? AND tombstone = 0`,
    [parentId]
  );
  if (parentRow) {
    allFields.push({
      dataset: 'transactions',
      row: parentId,
      column: 'amount',
      value: parentRow.amount + child.amount,
    });
  }

  const result = await ctx.send(db, allFields);
  await ctx.afterMutation(result, db);
  return childId;
}

export async function addSplitTransaction(
  ctx: MutationCtx,
  parent: {
    accountId: string;
    date: number;
    payeeName: string;
    amount: number;
    notes: string;
    cleared: boolean;
  },
  children: { payeeName: string; categoryId: string | null; amount: number; notes: string }[],
): Promise<void> {
  const db = ctx.requireDb();
  const allNames = [parent.payeeName, ...children.map((c) => c.payeeName)];
  const resolvedAll = await Promise.all(allNames.map((name) => ctx.resolve(name)));
  const [parentResolved, ...childResolved] = resolvedAll;
  const allNewFields = resolvedAll.flatMap((r) => r.newFields);
  const { fields } = buildAddSplitTransactionFields(
    parent,
    parentResolved.id,
    children,
    childResolved.map((r) => r.id),
  );
  const result = await ctx.send(db, [...allNewFields, ...fields]);
  await ctx.afterMutation(result, db);
}
