import * as SQLite from 'expo-sqlite';
import type { BudgetGroup, EnvelopeRow } from '@/constants/types';
import { nextMonthInt, prevMonthInt } from '@/utils/monthHelpers';
import { SORT_GAP } from '@/constants/config';

type CatRow = {
  group_id: string;
  group_name: string;
  g_order: number;
  is_income: number;
  cat_id: string | null;
  cat_name: string | null;
  c_order: number | null;
  g_hidden: number;
  c_hidden: number;
};

export interface BudgetRawData {
  allCats: CatRow[];
  allBudgetRows: { month: number; category: string; amount: number; carryover: number }[];
  allActivityRows: { month: number; category: string; activity: number }[];
  allBufferedRows: { id: string; buffered: number }[];
  // Uncategorized transfers from on-budget to off-budget — excluded from toBudget, rolled as overspent
  allOffBudgetTransferRows: { month: number; activity: number }[];
}

export interface BudgetResult {
  groups: BudgetGroup[];
  toBudget: number;
  availableFunds: number;
  lastMonthOverspent: number;
  totalBudgeted: number;
  forNextMonth: number;
}

export async function fetchBudgetRawData(db: SQLite.SQLiteDatabase): Promise<BudgetRawData> {
  const [allCats, allBudgetRows, allActivityRows, allOffBudgetTransferRows, allBufferedRows] = await Promise.all([
    db.getAllAsync<CatRow>(
      `SELECT g.id         AS group_id,
              g.name       AS group_name,
              g.sort_order AS g_order,
              g.is_income  AS is_income,
              c.id         AS cat_id,
              c.name       AS cat_name,
              c.sort_order AS c_order,
              COALESCE(g.hidden, 0) AS g_hidden,
              COALESCE(c.hidden, 0) AS c_hidden
       FROM   category_groups g
       LEFT JOIN categories c ON c.cat_group = g.id AND c.tombstone = 0
       WHERE  g.tombstone = 0
       ORDER BY g.is_income ASC, g.sort_order, c.sort_order`,
    ),

    db.getAllAsync<{ month: number; category: string; amount: number; carryover: number }>(
      `SELECT month,
              category,
              COALESCE(amount, 0)    AS amount,
              COALESCE(carryover, 0) AS carryover
       FROM   zero_budgets`,
    ),

    // Exclude uncategorized transfers to off-budget accounts — tracked separately
    // and rolled as overspent. Starting-balance transactions are exempt (must flow into income).
    db.getAllAsync<{ month: number; category: string; activity: number }>(
      `SELECT CAST(t.date / 100 AS INTEGER) AS month,
              CASE
                WHEN t.category IS NULL AND COALESCE(t.starting_balance_flag, 0) = 1 THEN '__starting_balance__'
                WHEN t.category IS NULL THEN '__uncategorized__'
                WHEN cm.id IS NOT NULL AND cm.transferId IS NULL THEN '__uncategorized__'
                WHEN cm.transferId IS NOT NULL THEN cm.transferId
                ELSE t.category
              END AS category,
              SUM(t.amount)                  AS activity
       FROM   transactions t
       JOIN   accounts a ON a.id = t.acct
       LEFT JOIN category_mapping cm ON cm.id = t.category
       WHERE  t.tombstone = 0
         AND  t.isParent  = 0
         AND  a.offbudget = 0
         AND  NOT (
                t.category IS NULL
                AND COALESCE(t.starting_balance_flag, 0) = 0
                AND EXISTS (
                      SELECT 1
                      FROM   payees   p2
                      JOIN   accounts a2 ON a2.id = p2.transfer_acct
                      WHERE  p2.id = t.description
                        AND  a2.offbudget = 1
                    )
              )
       GROUP BY month, category`,
    ),

    db.getAllAsync<{ month: number; activity: number }>(
      `SELECT CAST(t.date / 100 AS INTEGER) AS month,
              SUM(t.amount)                  AS activity
       FROM   transactions t
       JOIN   accounts a  ON a.id  = t.acct
       JOIN   payees   p  ON p.id  = t.description
       JOIN   accounts a2 ON a2.id = p.transfer_acct
       WHERE  t.tombstone = 0
         AND  t.isParent  = 0
         AND  a.offbudget = 0
         AND  t.category  IS NULL
         AND  COALESCE(t.starting_balance_flag, 0) = 0
         AND  a2.offbudget = 1
       GROUP BY month`,
    ),

    db
      .getAllAsync<{ id: string; buffered: number }>(
        `SELECT id, COALESCE(buffered, 0) AS buffered
       FROM   zero_budget_months`,
      )
      .catch(() => [] as { id: string; buffered: number }[]),
  ]);

  return { allCats, allBudgetRows, allActivityRows, allOffBudgetTransferRows, allBufferedRows };
}

function monthIntToStr(mi: number): string {
  const yy = Math.floor(mi / 100);
  const mm = mi % 100;
  return `${yy}-${String(mm).padStart(2, '0')}`;
}

type FilledCatRow = CatRow & { cat_id: string; cat_name: string; c_order: number };

interface LookupMaps {
  incomeCatIds: Set<string>;
  expenseCatIds: string[];
  visibleCats: FilledCatRow[];
  allGroupRows: { group_id: string; group_name: string; is_income: number; g_order: number; g_hidden: number }[];
  budgetByMonth: Map<number, Map<string, number>>;
  carryoverByMonth: Map<number, Map<string, boolean>>;
  activityByMonth: Map<number, Map<string, number>>;
  manualBuffered: Map<string, number>;
}

// Virtual expense category for uncategorized off-budget transfers — never shown in UI
const OFF_BUDGET_XFER_CAT = '__offbudget_xfer__';

function buildLookupMaps(raw: BudgetRawData, showHidden = false): LookupMaps {
  const { allCats, allBudgetRows, allActivityRows, allOffBudgetTransferRows, allBufferedRows } = raw;

  const filledCats = allCats.filter((c): c is FilledCatRow => c.cat_id !== null);

  // All categories participate in budget math regardless of hidden status
  const incomeCatIds = new Set(filledCats.filter((c) => c.is_income === 1).map((c) => c.cat_id));
  incomeCatIds.add('__starting_balance__');

  const expenseCatIds = filledCats.filter((c) => c.is_income === 0).map((c) => c.cat_id);
  expenseCatIds.push(OFF_BUDGET_XFER_CAT);
  expenseCatIds.push('__uncategorized__');

  const visibleCats = showHidden
    ? filledCats
    : filledCats.filter((c) => c.g_hidden === 0 && c.c_hidden === 0);

  const seenGroups = new Set<string>();
  const allGroupRows: LookupMaps['allGroupRows'] = [];
  for (const row of allCats) {
    if (!seenGroups.has(row.group_id)) {
      seenGroups.add(row.group_id);
      allGroupRows.push({
        group_id: row.group_id,
        group_name: row.group_name,
        is_income: row.is_income,
        g_order: row.g_order,
        g_hidden: row.g_hidden,
      });
    }
  }

  const budgetByMonth = new Map<number, Map<string, number>>();
  const carryoverByMonth = new Map<number, Map<string, boolean>>();
  for (const r of allBudgetRows) {
    if (!budgetByMonth.has(r.month)) budgetByMonth.set(r.month, new Map());
    budgetByMonth.get(r.month)!.set(r.category, r.amount);
    if (!carryoverByMonth.has(r.month)) carryoverByMonth.set(r.month, new Map());
    carryoverByMonth.get(r.month)!.set(r.category, r.carryover === 1);
  }

  const activityByMonth = new Map<number, Map<string, number>>();
  for (const r of allActivityRows) {
    if (!activityByMonth.has(r.month)) activityByMonth.set(r.month, new Map());
    activityByMonth.get(r.month)!.set(r.category, r.activity);
  }

  for (const r of allOffBudgetTransferRows) {
    if (!activityByMonth.has(r.month)) activityByMonth.set(r.month, new Map());
    activityByMonth.get(r.month)!.set(OFF_BUDGET_XFER_CAT, r.activity);
  }

  const manualBuffered = new Map(allBufferedRows.map((r) => [r.id, r.buffered]));

  return { incomeCatIds, expenseCatIds, visibleCats, allGroupRows, budgetByMonth, carryoverByMonth, activityByMonth, manualBuffered };
}

function buildMonthGroups(
  mi: number,
  prevLeftover: Map<string, number>,
  toBudget: number,
  availFunds: number,
  lastMonthOver: number,
  expBudgets: number,
  bufferedSel: number,
  maps: LookupMaps,
): BudgetResult {
  const { visibleCats, allGroupRows, budgetByMonth, carryoverByMonth, activityByMonth } = maps;
  const curBudgets = budgetByMonth.get(mi) ?? new Map<string, number>();
  const curActivities = activityByMonth.get(mi) ?? new Map<string, number>();
  const prevCO = carryoverByMonth.get(prevMonthInt(mi)) ?? new Map<string, boolean>();
  const curCarryovers = carryoverByMonth.get(mi) ?? new Map<string, boolean>();

  const groupMap = new Map<string, BudgetGroup>();
  for (const g of allGroupRows) {
    groupMap.set(g.group_id, {
      id: g.group_id,
      name: g.group_name.toLowerCase(),
      isIncome: g.is_income === 1,
      envelopes: [],
      hidden: g.g_hidden === 1,
      sortOrder: g.g_order,
    });
  }

  for (const cat of visibleCats) {
    const isIncome = cat.is_income === 1;

    const budgeted = (curBudgets.get(cat.cat_id) ?? 0) / 100;
    const activity = (curActivities.get(cat.cat_id) ?? 0) / 100;

    let balance: number;
    let prevBalance = 0;
    if (isIncome) {
      balance = activity;
    } else {
      const hasCO = prevCO.get(cat.cat_id) ?? false;
      const rawPrev = (prevLeftover.get(cat.cat_id) ?? 0) / 100;
      prevBalance = hasCO ? rawPrev : Math.max(0, rawPrev);
      balance = budgeted + activity + prevBalance;
    }

    let status: EnvelopeRow['status'] = 'ok';
    if (!isIncome) {
      if (balance < 0) status = 'over';
      else if (budgeted > 0 && balance < budgeted * 0.1) status = 'low';
    }

    const hasRollover = !isIncome && (curCarryovers.get(cat.cat_id) ?? false);
    const hidden = cat.g_hidden === 1 || cat.c_hidden === 1;

    groupMap.get(cat.group_id)?.envelopes.push({
      id: cat.cat_id,
      name: cat.cat_name,
      budgeted,
      activity,
      balance,
      status,
      prevBalance,
      hasRollover,
      hidden,
    });
  }

  return {
    groups: Array.from(groupMap.values()),
    toBudget: toBudget / 100,
    availableFunds: availFunds / 100,
    lastMonthOverspent: lastMonthOver / 100,
    totalBudgeted: expBudgets / 100,
    forNextMonth: bufferedSel / 100,
  };
}

function iterateMonth(
  mi: number,
  prevLeftover: Map<string, number>,
  prevTba: number,
  prevBufferedSel: number,
  maps: LookupMaps,
) {
  const { incomeCatIds, expenseCatIds, budgetByMonth, carryoverByMonth, activityByMonth, manualBuffered } = maps;
  const budgets = budgetByMonth.get(mi) ?? new Map<string, number>();
  const activities = activityByMonth.get(mi) ?? new Map<string, number>();
  const carryovers = carryoverByMonth.get(mi) ?? new Map<string, boolean>();
  const prevCarryovers = carryoverByMonth.get(prevMonthInt(mi)) ?? new Map<string, boolean>();

  let lastMonthOver = 0;
  for (const catId of expenseCatIds) {
    if (prevCarryovers.get(catId) ?? false) continue;
    lastMonthOver += Math.min(0, prevLeftover.get(catId) ?? 0);
  }

  let income = activities.get('__starting_balance__') ?? 0;
  for (const catId of incomeCatIds) income += activities.get(catId) ?? 0;

  const availFunds = income + prevTba + prevBufferedSel;

  let expBudgets = 0;
  for (const catId of expenseCatIds) expBudgets += budgets.get(catId) ?? 0;

  let bufferedAuto = 0;
  for (const catId of incomeCatIds) {
    if (carryovers.get(catId) ?? false) bufferedAuto += activities.get(catId) ?? 0;
  }
  const manualBuf = manualBuffered.get(monthIntToStr(mi)) ?? 0;
  const bufferedSel = manualBuf !== 0 ? manualBuf : bufferedAuto;

  const toBudget = availFunds + lastMonthOver - expBudgets - bufferedSel;

  const currentLeftover = new Map<string, number>();
  for (const catId of expenseCatIds) {
    const bgt = budgets.get(catId) ?? 0;
    const act = activities.get(catId) ?? 0;
    const prevCO = prevCarryovers.get(catId) ?? false;
    const prevLeft = prevLeftover.get(catId) ?? 0;
    const carry = prevCO ? prevLeft : Math.max(0, prevLeft);
    currentLeftover.set(catId, bgt + act + carry);
  }

  return { toBudget, availFunds, lastMonthOver, expBudgets, bufferedSel, currentLeftover };
}

export function buildAllMonthResults(
  raw: BudgetRawData,
  futureMonths = 6,
): Map<number, BudgetResult> {
  const maps = buildLookupMaps(raw);
  const { budgetByMonth, activityByMonth } = maps;

  const monthSet = new Set<number>();
  for (const m of budgetByMonth.keys()) monthSet.add(m);
  for (const m of activityByMonth.keys()) monthSet.add(m);
  const sortedMonths = Array.from(monthSet).sort((a, b) => a - b);

  if (sortedMonths.length > 0) {
    let futureMi = sortedMonths[sortedMonths.length - 1];
    for (let i = 0; i < futureMonths; i++) {
      futureMi = nextMonthInt(futureMi);
      sortedMonths.push(futureMi);
    }
  }

  let prevLeftover = new Map<string, number>();
  let prevToBudget = 0;
  let prevBufferedSel = 0;

  const results = new Map<number, BudgetResult>();

  for (const mi of sortedMonths) {
    const step = iterateMonth(mi, prevLeftover, prevToBudget, prevBufferedSel, maps);

    results.set(
      mi,
      buildMonthGroups(mi, prevLeftover, step.toBudget, step.availFunds, step.lastMonthOver, step.expBudgets, step.bufferedSel, maps),
    );

    prevLeftover = step.currentLeftover;
    prevToBudget = step.toBudget;
    prevBufferedSel = step.bufferedSel;
  }

  return results;
}

export function computeBudgetForMonth(raw: BudgetRawData, monthInt: number, showHidden = false): BudgetResult {
  const maps = buildLookupMaps(raw, showHidden);
  const { budgetByMonth, activityByMonth } = maps;

  const monthSet = new Set<number>();
  for (const m of budgetByMonth.keys()) monthSet.add(m);
  for (const m of activityByMonth.keys()) monthSet.add(m);
  monthSet.add(monthInt);
  const allMonths = Array.from(monthSet).sort((a, b) => a - b);

  let prevLeftover = new Map<string, number>();
  let prevToBudget = 0;
  let prevBufferedSel = 0;

  for (const mi of allMonths) {
    const step = iterateMonth(mi, prevLeftover, prevToBudget, prevBufferedSel, maps);

    if (mi === monthInt) {
      return buildMonthGroups(mi, prevLeftover, step.toBudget, step.availFunds, step.lastMonthOver, step.expBudgets, step.bufferedSel, maps);
    }

    prevLeftover = step.currentLeftover;
    prevToBudget = step.toBudget;
    prevBufferedSel = step.bufferedSel;
  }

  const step = iterateMonth(monthInt, prevLeftover, prevToBudget, prevBufferedSel, maps);
  return buildMonthGroups(monthInt, prevLeftover, step.toBudget, step.availFunds, step.lastMonthOver, step.expBudgets, step.bufferedSel, maps);
}

// Uses MAX(sort_order) + SORT_GAP matching Actual Budget's gap spacing
export async function queryNextGroupSortOrder(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM category_groups WHERE tombstone = 0`,
  );
  return (row?.max ?? 0) + SORT_GAP;
}

export async function queryNextCategorySortOrder(
  db: SQLite.SQLiteDatabase,
  groupId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM categories WHERE cat_group = ? AND tombstone = 0`,
    [groupId],
  );
  return (row?.max ?? 0) + SORT_GAP;
}

