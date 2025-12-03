import * as SQLite from 'expo-sqlite';
import type { Transaction, ActiveFilter } from '@/constants/types';
import { TX_PAGE_SIZE, mapCleared, formatDateInt, formatDateSep } from '@/utils/dbMappers';
import type { TxPage } from '@/utils/dbMappers';

export { TX_PAGE_SIZE };
export type { TxPage };

export interface TransactionFilters {
  accountId?: string | null;
  categoryId?: string | null;
  dateStart?: number | null;
  dateEnd?: number | null;
  searchQuery?: string | null;
  payeeContains?: string | null;
  notesContains?: string | null;
  clearedOnly?: boolean;
  reconciledOnly?: boolean;
  transferOnly?: boolean;
  uncategorizedOnly?: boolean;
  amountOp?: 'gt' | 'lt' | 'eq' | null;
  amountValue?: number | null;
}

function nextDay(yyyymmdd: number): number {
  const y = Math.floor(yyyymmdd / 10000);
  const m = Math.floor((yyyymmdd % 10000) / 100);
  const d = yyyymmdd % 100;
  const date = new Date(y, m - 1, d + 1);
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function filtersFromActiveFilters(
  filters: ActiveFilter[],
  accountId?: string | null,
): TransactionFilters {
  const result: TransactionFilters = {};
  if (accountId) result.accountId = accountId;

  for (const f of filters) {
    switch (f.field) {
      case 'account':
        result.accountId = f.value as string;
        break;
      case 'amount':
        result.amountOp = f.operator as 'gt' | 'lt' | 'eq';
        result.amountValue = f.value as number;
        break;
      case 'category':
        result.categoryId = (f.value as string | null) ?? undefined;
        break;
      case 'cleared':
        result.clearedOnly = true;
        break;
      case 'date': {
        const [from, to] = f.value as [number, number];
        result.dateStart = from;
        result.dateEnd = nextDay(to);
        break;
      }
      case 'notes':
        result.notesContains = f.value as string;
        break;
      case 'payee':
        result.payeeContains = f.value as string;
        break;
      case 'reconciled':
        result.reconciledOnly = true;
        break;
      case 'transfer':
        result.transferOnly = true;
        break;
      case 'uncategorized':
        result.uncategorizedOnly = true;
        break;
    }
  }

  return result;
}

export async function queryTransactions(
  db: SQLite.SQLiteDatabase,
  filters: TransactionFilters = {},
  limit = TX_PAGE_SIZE,
  offset = 0,
  startingBalance: number | null = null,
  prevLastDate = -1,
): Promise<TxPage> {
  const {
    accountId,
    categoryId,
    dateStart,
    dateEnd,
    searchQuery,
    payeeContains,
    notesContains,
    clearedOnly,
    reconciledOnly,
    transferOnly,
    uncategorizedOnly,
    amountOp,
    amountValue,
  } = filters;

  const hasCategory = !!categoryId;
  const hasDateRange = !!(dateStart && dateEnd);
  const hasSearch = !!searchQuery?.trim();
  const hasPayee = !!payeeContains?.trim();
  const hasNotes = !!notesContains?.trim();
  const hasAmount = !!amountOp && amountValue != null;
  const isFiltered =
    hasCategory ||
    hasDateRange ||
    hasSearch ||
    hasPayee ||
    hasNotes ||
    !!clearedOnly ||
    !!reconciledOnly ||
    !!transferOnly ||
    !!uncategorizedOnly ||
    hasAmount;

  let accountBalance = startingBalance;
  if (accountBalance === null) {
    const acctWhere = accountId ? 'AND acct = ?' : '';
    const balRow = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM   transactions
       WHERE  tombstone = 0 AND isParent = 0 ${acctWhere}`,
      accountId ? [accountId] : [],
    );
    accountBalance = (balRow?.total ?? 0) / 100;
  }

  const acctFilter = accountId ? 'AND acct = ?' : '';

  const catFilter = hasCategory
    ? `AND (
         COALESCE((SELECT transferId FROM category_mapping WHERE id = transactions.category), transactions.category) = ?
         OR (isParent = 1 AND EXISTS (
           SELECT 1 FROM transactions c
           WHERE c.parent_id = transactions.id AND c.tombstone = 0
           AND COALESCE((SELECT transferId FROM category_mapping WHERE id = c.category), c.category) = ?
         ))
       )`
    : '';

  const dateFilter = hasDateRange ? 'AND date >= ? AND date < ?' : '';

  const searchFilter = hasSearch
    ? `AND (
        EXISTS (SELECT 1 FROM payees sp WHERE sp.id = transactions.description AND sp.name LIKE ?)
        OR EXISTS (
          SELECT 1 FROM categories sc
          LEFT JOIN category_mapping cm ON transactions.category = cm.id
          WHERE sc.id = COALESCE(cm.transferId, transactions.category) AND sc.name LIKE ?
        )
        OR transactions.notes LIKE ?
        OR EXISTS (
          SELECT 1 FROM transactions ch
          LEFT JOIN payees chp ON chp.id = ch.description
          LEFT JOIN category_mapping cm ON ch.category = cm.id
          LEFT JOIN categories chc ON chc.id = COALESCE(cm.transferId, ch.category)
          WHERE ch.parent_id = transactions.id AND ch.tombstone = 0
            AND (chp.name LIKE ? OR chc.name LIKE ? OR ch.notes LIKE ?)
        )
      )`
    : '';

  const payeeFilter = hasPayee
    ? `AND EXISTS (SELECT 1 FROM payees pf WHERE pf.id = transactions.description AND pf.name LIKE ?)`
    : '';

  const notesFilter = hasNotes ? 'AND transactions.notes LIKE ?' : '';

  const clearedFilter = clearedOnly
    ? 'AND cleared = 1 AND (reconciled IS NULL OR reconciled = 0)'
    : '';

  const reconciledFilter = reconciledOnly ? 'AND reconciled = 1' : '';

  const transferFilter = transferOnly
    ? 'AND EXISTS (SELECT 1 FROM payees tf WHERE tf.id = transactions.description AND tf.transfer_acct IS NOT NULL)'
    : '';

  const uncategorizedFilter = uncategorizedOnly
    ? `AND isParent = 0
       AND COALESCE(starting_balance_flag, 0) = 0
       AND (transactions.category IS NULL OR EXISTS (SELECT 1 FROM category_mapping cm WHERE cm.id = transactions.category AND cm.transferId IS NULL))
       AND (SELECT COALESCE(offbudget, 0) FROM accounts WHERE id = transactions.acct) = 0
       AND NOT EXISTS (
         SELECT 1 FROM payees p
         LEFT JOIN accounts ta ON ta.id = p.transfer_acct
         WHERE p.id = transactions.description
           AND p.transfer_acct IS NOT NULL
           AND COALESCE(ta.offbudget, 0) = 0
       )`
    : '';

  const amountFilterSql = hasAmount
    ? `AND ABS(amount) ${amountOp === 'gt' ? '>' : amountOp === 'lt' ? '<' : '='} ?`
    : '';

  const cteParams: (string | number)[] = [];
  if (accountId) cteParams.push(accountId);
  if (hasCategory) cteParams.push(categoryId!, categoryId!);
  if (hasDateRange) cteParams.push(dateStart!, dateEnd!);
  if (hasSearch) {
    const pattern = `%${searchQuery!.trim()}%`;
    cteParams.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (hasPayee) cteParams.push(`%${payeeContains!.trim()}%`);
  if (hasNotes) cteParams.push(`%${notesContains!.trim()}%`);
  if (hasAmount) cteParams.push(Math.round(amountValue! * 100));
  cteParams.push(limit + 1, offset);

  const rows = await db.getAllAsync<{
    id: string;
    date: number;
    amount: number;
    cleared: number;
    reconciled: number;
    is_parent: number;
    is_child: number;
    is_starting_balance: number;
    parent_id: string | null;
    payee_name: string | null;
    transfer_acct: string | null;
    transfer_acct_name: string | null;
    transfer_acct_offbudget: number;
    notes: string | null;
    cat_id: string | null;
    cat_name: string | null;
    acct_name: string | null;
    acct_id: string;
    acct_offbudget: number;
    payee_id: string | null;
  }>(
    `WITH paged AS (
       SELECT id FROM transactions
       WHERE  tombstone = 0
         AND  isChild   = 0
         ${acctFilter}
         ${catFilter}
         ${dateFilter}
         ${searchFilter}
         ${payeeFilter}
         ${notesFilter}
         ${clearedFilter}
         ${reconciledFilter}
         ${transferFilter}
         ${uncategorizedFilter}
         ${amountFilterSql}
       ORDER BY date DESC, sort_order DESC, id DESC
       LIMIT ? OFFSET ?
     )
     SELECT t.id,
            t.date,
            t.amount,
            t.cleared,
            t.reconciled,
            t.isParent                        AS is_parent,
            t.isChild                         AS is_child,
            COALESCE(t.starting_balance_flag, 0) AS is_starting_balance,
            t.parent_id,
            p.name                            AS payee_name,
            p.transfer_acct,
            ta.name                           AS transfer_acct_name,
            COALESCE(ta.offbudget, 0)         AS transfer_acct_offbudget,
            t.notes,
            COALESCE(cm.transferId, t.category) AS cat_id,
            c.name                            AS cat_name,
            a.name                            AS acct_name,
            t.acct                            AS acct_id,
            COALESCE(a.offbudget, 0)          AS acct_offbudget,
            t.description                     AS payee_id
     FROM   transactions t
     LEFT JOIN payees     p  ON t.description = p.id
     LEFT JOIN accounts   ta ON ta.id         = p.transfer_acct
     LEFT JOIN category_mapping cm ON t.category = cm.id
     LEFT JOIN categories c  ON COALESCE(cm.transferId, t.category) = c.id
     LEFT JOIN accounts   a  ON a.id          = t.acct
     WHERE  t.tombstone = 0
       AND  (
              t.id IN (SELECT id FROM paged)
              OR (t.isChild = 1 AND t.parent_id IN (SELECT id FROM paged))
            )
     ORDER BY t.date DESC, t.sort_order DESC, t.id DESC`,
    cteParams,
  );

  const parentRows = rows.filter((r) => !r.is_child);
  const hasMore = parentRows.length > limit;
  let validRows = rows;
  if (hasMore) {
    const extraId = parentRows[limit].id;
    validRows = rows.filter((r) => r.id !== extraId && r.parent_id !== extraId);
  }

  const runMap = new Map<string, number>();
  let nextStartingBalance: number;

  if (isFiltered) {
    // Filtered results are non-contiguous — use correlated subquery for running balance
    const parentIds = validRows.filter((r) => !r.is_child).map((r) => r.id);
    if (parentIds.length > 0) {
      const placeholders = parentIds.map(() => '?').join(',');
      const subAcctFilter = accountId ? 'AND s.acct = ?' : '';
      const rbParams: (string | number)[] = [];
      if (accountId) rbParams.push(accountId);
      rbParams.push(...parentIds);

      const rbRows = await db.getAllAsync<{ id: string; newer_sum: number }>(
        `SELECT r.id,
           COALESCE((
             SELECT SUM(s.amount)
             FROM   transactions s
             WHERE  s.tombstone = 0 AND s.isChild = 0
               ${subAcctFilter}
               AND  (
                      s.date > r.date
                      OR (s.date = r.date AND s.sort_order > r.sort_order)
                      OR (s.date = r.date AND s.sort_order = r.sort_order AND s.id > r.id)
                    )
           ), 0) AS newer_sum
         FROM transactions r
         WHERE r.id IN (${placeholders})`,
        rbParams,
      );

      const totalBal = accountBalance ?? 0;
      for (const rb of rbRows) {
        runMap.set(rb.id, totalBal - rb.newer_sum / 100);
      }
    }
    nextStartingBalance = 0;
  } else {
    let running = accountBalance ?? 0;
    for (const tx of validRows) {
      if (tx.is_child) continue;
      runMap.set(tx.id, running);
      running -= tx.amount / 100;
    }
    nextStartingBalance = running;
  }

  const childrenByParent = new Map<string, typeof validRows>();
  for (const row of validRows) {
    if (row.is_child && row.parent_id) {
      if (!childrenByParent.has(row.parent_id)) childrenByParent.set(row.parent_id, []);
      childrenByParent.get(row.parent_id)!.push(row);
    }
  }

  const result: (Transaction | { dateSeparator: string })[] = [];
  let lastDate = prevLastDate;

  for (const tx of validRows) {
    if (tx.is_child) continue;

    if (tx.date !== lastDate) {
      result.push({ dateSeparator: formatDateSep(tx.date) });
      lastDate = tx.date;
    }

    const payee = tx.transfer_acct
      ? tx.amount < 0
        ? `→ ${tx.transfer_acct_name ?? 'Transfer'}`
        : `← ${tx.transfer_acct_name ?? 'Transfer'}`
      : (tx.payee_name ?? tx.notes ?? 'Unknown');
    const children = childrenByParent.get(tx.id) ?? [];

    let categoryType: Transaction['categoryType'];
    let categoryLabel: string;

    if (tx.acct_offbudget === 1) {
      categoryType = 'offbudget';
      categoryLabel = 'Off budget';
    } else if (tx.is_parent === 1) {
      categoryType = 'split';
      categoryLabel = `split · ${children.length} categories`;
    } else if (tx.is_starting_balance === 1 && tx.cat_id === null) {
      categoryType = 'normal';
      categoryLabel = 'Starting Balances';
    } else if (tx.transfer_acct && tx.transfer_acct_offbudget === 0) {
      // on-budget → on-budget transfer: category is meaningless
      categoryType = 'transfer';
      categoryLabel = 'transfer';
    } else if (tx.cat_id === null) {
      categoryType = 'uncategorised';
      categoryLabel = 'uncategorised';
    } else {
      categoryType = 'normal';
      categoryLabel = tx.cat_name ?? 'uncategorised';
    }

    result.push({
      id: tx.id,
      date: formatDateInt(tx.date),
      payee,
      category: categoryLabel,
      categoryType,
      amount: tx.amount / 100,
      runningBalance: runMap.get(tx.id) ?? 0,
      cleared: mapCleared(tx.cleared, tx.reconciled),
      accountName: tx.acct_name ?? undefined,
      dateInt: tx.date,
      accountId: tx.acct_id,
      payeeId: tx.payee_id,
      payeeName: tx.payee_name,
      categoryId: tx.cat_id,
      notes: tx.notes,
      isParent: tx.is_parent === 1,
      transferAccountId: tx.transfer_acct,
    });

    for (const child of children) {
      const childCatType: Transaction['categoryType'] =
        child.acct_offbudget === 1 ? 'offbudget' : child.cat_id ? 'normal' : 'uncategorised';
      const childCatLabel =
        child.acct_offbudget === 1 ? 'Off budget' : (child.cat_name ?? 'uncategorised');

      result.push({
        id: child.id,
        date: formatDateInt(child.date),
        payee: child.transfer_acct
          ? child.amount < 0
            ? `→ ${child.transfer_acct_name ?? 'Transfer'}`
            : `← ${child.transfer_acct_name ?? 'Transfer'}`
          : (child.payee_name ?? child.notes ?? ''),
        category: childCatLabel,
        categoryType: childCatType,
        amount: child.amount / 100,
        runningBalance: 0,
        cleared: mapCleared(child.cleared, child.reconciled),
        isChild: true,
        parentId: child.parent_id ?? undefined,
        dateInt: child.date,
        accountId: child.acct_id,
        payeeId: child.payee_id,
        payeeName: child.payee_name,
        categoryId: child.cat_id,
        notes: child.notes,
        isParent: false,
        transferAccountId: child.transfer_acct,
      });
    }
  }

  return { items: result, hasMore, nextStartingBalance, lastDate };
}

// Counts on-budget transactions needing categorization. Excludes off-budget,
// starting balances, on-budget→on-budget transfers, split parents, and children.
export async function queryUncatCount(
  db: SQLite.SQLiteDatabase,
  accountId: string | null,
): Promise<number> {
  const acctFilter = accountId ? 'AND t.acct = ?' : '';
  const params: (string | number)[] = accountId ? [accountId] : [];

  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM   transactions t
     LEFT JOIN accounts  a  ON a.id  = t.acct
     LEFT JOIN payees    p  ON p.id  = t.description
     LEFT JOIN accounts  ta ON ta.id = p.transfer_acct
     LEFT JOIN category_mapping cm ON t.category = cm.id
     WHERE  t.tombstone = 0
       AND  t.isChild   = 0
       AND  t.isParent  = 0
       AND  COALESCE(a.offbudget, 0) = 0
       AND  COALESCE(t.starting_balance_flag, 0) = 0
       AND  (t.category IS NULL OR (cm.id IS NOT NULL AND cm.transferId IS NULL))
       AND  NOT (p.transfer_acct IS NOT NULL AND COALESCE(ta.offbudget, 0) = 0)
       ${acctFilter}`,
    params,
  );

  return row?.cnt ?? 0;
}
