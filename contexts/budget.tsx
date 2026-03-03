import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as SQLite from 'expo-sqlite';
import { useAuth } from './auth';
import {
  hasCachedDb,
  hasStaleDb,
  downloadBudgetDb,
  openBudgetDb,
  isTrackingBudget,
  queryAccounts,
  queryClosedAccounts,
  fetchBudgetRawData,
  computeBudgetForMonth,
  buildAllMonthResults,
  fetchNetWorthRawData,
  computeNetWorthHistory,
  queryTransactions,
  queryPayees,
  queryUnusedPayeeIds,
  queryCategoryOptions,
  TX_PAGE_SIZE,
} from '@/constants/db';
import type { BudgetRawData, BudgetResult, NetWorthRawData } from '@/constants/db';
import { applySyncMessages } from '@/constants/sync';
import { useToast } from './toast';
import { logger } from '@/utils/logger';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ensurePendingTable } from '@/services/offlineQueue';
import { validateBudgetSchema } from '@/services/dbValidate';
import type { Account, ActiveFilter, BudgetGroup, Payee, CategoryOption } from '@/constants/types';
import {
  MONTH_NAMES,
  monthToInt,
} from '@/utils/monthHelpers';
import { BudgetCtxValue, BUDGET_CTX_DEFAULT } from './budget/types';
import { useBudgetMutations } from './budget/useBudgetMutations';
import { usePaywall } from './paywall';
import { useBudgetSync } from './budget/useBudgetSync';
import { useTxPagination } from './budget/useTxPagination';
import { BudgetRefCtx } from './budget/budgetDataContext';
export { useBudgetReferenceData } from './budget/budgetDataContext';

const BudgetCtx = createContext<BudgetCtxValue>(BUDGET_CTX_DEFAULT);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { state: auth, isConnected, dispatch: authDispatch } = useAuth();
  const { addToast, removeToastById } = useToast();
  const { isOnline } = useNetworkStatus();

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [closedAccounts, setClosedAccounts] = useState<Account[]>([]);
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>([]);
  const [toBudget, setToBudget] = useState(0);
  const [toBudgetBreakdown, setToBudgetBreakdown] = useState({
    availableFunds: 0,
    overspentPrevMonth: 0,
    forNextMonth: 0,
  });
  const [ledgerFilters, setLedgerFilters] = useState<ActiveFilter[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<number[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [unusedPayeeIds, setUnusedPayeeIds] = useState<Set<string>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [showHiddenCategories, setShowHiddenCategoriesState] = useState(false);
  const showHiddenCategoriesRef = useRef(false);

  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const fileIdRef = useRef<string | null>(null);
  const loadEpochRef = useRef(0);

  // Raw data caches — avoid re-running full SQL scans on month switch
  const budgetRawRef = useRef<BudgetRawData | null>(null);
  const budgetResultCacheRef = useRef<Map<number, BudgetResult>>(new Map());
  const nwRawRef = useRef<NetWorthRawData | null>(null);

  // Ref tracks current account ID so stale closures use correct cache key
  const activeAccountIdRef = useRef<string | null>(null);

  const {
    transactions,
    setTransactions,
    loadingMore,
    setLoadingMore,
    hasMoreTx,
    setHasMoreTx,
    txOffsetRef,
    txBalRef,
    txLastDateRef,
    isLoadingMoreRef,
    hasMoreTxRef,
    txCacheRef,
    resetTxCursors,
    applyTxPage,
  } = useTxPagination(activeAccountIdRef);

  useEffect(() => {
    return () => {
      dbRef.current?.closeAsync().catch(() => {});
      dbRef.current = null;
    };
  }, []);

  function applyBudgetResult(result: BudgetResult) {
    setBudgetGroups(result.groups);
    setToBudget(result.toBudget);
    setToBudgetBreakdown({
      availableFunds: result.availableFunds,
      overspentPrevMonth: result.lastMonthOverspent,
      forNextMonth: result.forNextMonth,
    });
  }

  const setShowHiddenCategories = useCallback(
    (v: boolean) => {
      showHiddenCategoriesRef.current = v;
      setShowHiddenCategoriesState(v);
      const raw = budgetRawRef.current;
      if (!raw) return;
      const mInt = monthToInt(year, month);
      if (v) {
        const result = computeBudgetForMonth(raw, mInt, true);
        applyBudgetResult(result);
      } else {
        const cached = budgetResultCacheRef.current.get(mInt);
        if (cached) applyBudgetResult(cached);
        else {
          const result = computeBudgetForMonth(raw, mInt, false);
          budgetResultCacheRef.current.set(mInt, result);
          applyBudgetResult(result);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month],
  );

  async function loadAll(
    db: SQLite.SQLiteDatabase,
    y: number,
    m: number,
    acctId: string | null,
    epoch: number,
  ) {
    const mInt = monthToInt(y, m);

    resetTxCursors();

    const [accts, closedAccts, rawData, firstPage, nwRaw, pys, unusedIds, cats] = await Promise.all([
      queryAccounts(db),
      queryClosedAccounts(db),
      fetchBudgetRawData(db),
      queryTransactions(db, { accountId: acctId }, TX_PAGE_SIZE, 0),
      fetchNetWorthRawData(db),
      queryPayees(db),
      queryUnusedPayeeIds(db),
      queryCategoryOptions(db),
    ]);

    if (epoch !== loadEpochRef.current) return;

    budgetRawRef.current = rawData;
    nwRawRef.current = nwRaw;

    // Pre-compute ALL months in one pass — makes month switching O(1)
    const allMonthResults = buildAllMonthResults(rawData);
    budgetResultCacheRef.current = allMonthResults;

    setAccounts(accts);
    setClosedAccounts(closedAccts);
    setNetWorthHistory(computeNetWorthHistory(nwRaw, y, m));

    const budgetResult = showHiddenCategoriesRef.current
      ? computeBudgetForMonth(rawData, mInt, true)
      : (allMonthResults.get(mInt) ?? computeBudgetForMonth(rawData, mInt, false));
    applyBudgetResult(budgetResult);
    setPayees(pys);
    setUnusedPayeeIds(unusedIds);
    setCategoryOptions(cats);
    applyTxPage(firstPage, false);
  }

  async function loadMonth(
    db: SQLite.SQLiteDatabase,
    y: number,
    m: number,
    epoch: number,
  ) {
    const mInt = monthToInt(y, m);

    const applyNwFromCache = () => {
      if (nwRawRef.current) {
        setNetWorthHistory(computeNetWorthHistory(nwRawRef.current, y, m));
      }
    };

    const cached = budgetResultCacheRef.current.get(mInt);
    if (cached) {
      if (epoch !== loadEpochRef.current) return;
      applyBudgetResult(cached);
      applyNwFromCache();
      return;
    }

    const raw = budgetRawRef.current;
    if (raw) {
      const result = computeBudgetForMonth(raw, mInt);
      budgetResultCacheRef.current.set(mInt, result);
      if (epoch !== loadEpochRef.current) return;
      applyBudgetResult(result);
      applyNwFromCache();
      return;
    }

    // Fallback — raw cache miss (e.g. after DB swap)
    const [rawData, nwRaw] = await Promise.all([
      fetchBudgetRawData(db),
      fetchNetWorthRawData(db),
    ]);
    if (epoch !== loadEpochRef.current) return;
    budgetRawRef.current = rawData;
    budgetResultCacheRef.current.clear();
    nwRawRef.current = nwRaw;
    const result = computeBudgetForMonth(rawData, mInt);
    budgetResultCacheRef.current.set(mInt, result);
    applyBudgetResult(result);
    setNetWorthHistory(computeNetWorthHistory(nwRaw, y, m));
  }

  // Uses activeAccountIdRef.current (not state) so mutations like deleteAccount
  // can synchronously clear the ref before calling afterMutation
  const reloadAllRef = useRef<() => Promise<void>>(async () => {});
  reloadAllRef.current = async () => {
    const db = dbRef.current;
    if (!db) return;
    const epoch = ++loadEpochRef.current;
    await loadAll(db, year, month, activeAccountIdRef.current, epoch);
  };

  async function ensureDbAndLoad(
    url: string,
    token: string,
    fileId: string,
    groupId: string,
    y: number,
    m: number,
    acctId: string | null,
    forceDownload = false,
  ) {
    const epoch = ++loadEpochRef.current;

    setLoading(true);
    setError(null);

    const activeFile = auth.files.find((f) => f.fileId === fileId);
    if (activeFile?.encryptKeyId) {
      setError(
        'This budget is encrypted. Encrypted budgets are not supported. Disable encryption in Actual Budget settings to use this budget.',
      );
      setLoading(false);
      return;
    }

    try {
      if (forceDownload || fileIdRef.current !== fileId || !dbRef.current) {
        if (dbRef.current) {
          await dbRef.current.closeAsync().catch(() => {});
          dbRef.current = null;
        }

        const isFresh = !forceDownload && (await hasCachedDb(fileId));

        if (!isFresh && !forceDownload && (await hasStaleDb(fileId))) {
          // Stale cache: show it immediately, then re-download in background
          const staleDb = await openBudgetDb();
          try {
            await validateBudgetSchema(staleDb);
          } catch (schemaErr) {
            await staleDb.closeAsync().catch(() => {});
            throw schemaErr;
          }
          if (await isTrackingBudget(staleDb)) {
            await staleDb.closeAsync().catch(() => {});
            setError(
              'This is a tracking budget. Only envelope budgets are supported. Select an envelope budget file instead.',
            );
            setLoading(false);
            return;
          }
          await ensurePendingTable(staleDb);
          dbRef.current = staleDb;
          fileIdRef.current = fileId;

          if (epoch !== loadEpochRef.current) return;
          await loadAll(staleDb, y, m, acctId, epoch);
          setLoading(false);

          // Skip background refresh when offline — stale data shown, sync on reconnect
          if (isOnline) {
            setSyncingState(true);
            try {
              await staleDb.closeAsync().catch(() => {});
              dbRef.current = null;
              await downloadBudgetDb(url, token, fileId);
              if (epoch !== loadEpochRef.current) return;
              const freshDb = await openBudgetDb();
              try {
                await validateBudgetSchema(freshDb);
              } catch (schemaErr) {
                await freshDb.closeAsync().catch(() => {});
                throw schemaErr;
              }
              await ensurePendingTable(freshDb);
              dbRef.current = freshDb;
              await applySyncMessages(freshDb, url, token, fileId, groupId);
              syncSetLastSyncAt(Date.now());
              if (epoch !== loadEpochRef.current) return;
              await loadAll(freshDb, y, m, acctId, epoch);
            } catch (e) {
              logger.error('BudgetCtx', 'Background refresh failed', e);
            } finally {
              setSyncingState(false);
            }
          }
          return;
        }

        if (!isFresh && !isOnline) {
          setError('No internet connection. Connect to download your budget.');
          setLoading(false);
          return;
        }

        if (!isFresh) await downloadBudgetDb(url, token, fileId);
        if (epoch !== loadEpochRef.current) return;

        const db = await openBudgetDb();
        try {
          await validateBudgetSchema(db);
        } catch (schemaErr) {
          await db.closeAsync().catch(() => {});
          throw schemaErr;
        }
        if (await isTrackingBudget(db)) {
          await db.closeAsync().catch(() => {});
          setError(
            'This is a tracking budget. Only envelope budgets are supported. Select an envelope budget file instead.',
          );
          setLoading(false);
          return;
        }
        await ensurePendingTable(db);
        dbRef.current = db;
        fileIdRef.current = fileId;
      }

      if (isOnline) {
        await applySyncMessages(dbRef.current!, url, token, fileId, groupId);
        syncSetLastSyncAt(Date.now());
      }

      if (epoch !== loadEpochRef.current) return;
      await loadAll(dbRef.current!, y, m, acctId, epoch);
    } catch (e: unknown) {
      if (epoch === loadEpochRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to load budget data');
      }
    } finally {
      if (epoch === loadEpochRef.current) setLoading(false);
    }
  }

  const reloadFullRef = useRef<(forceDownload?: boolean) => Promise<void>>(async () => {});
  reloadFullRef.current = async (forceDownload = false) => {
    if (!isConnected || !auth.activeFileId) return;
    const groupId = getActiveGroupId();
    await ensureDbAndLoad(
      auth.url,
      auth.token ?? '',
      auth.activeFileId,
      groupId,
      year,
      month,
      activeAccountId,
      forceDownload,
    );
  };

  function getActiveGroupId(): string {
    return auth.files.find((f) => f.fileId === auth.activeFileId)?.groupId ?? '';
  }

  useEffect(() => {
    if (!isConnected || !auth.activeFileId) {
      setAccounts([]);
      setClosedAccounts([]);
      setBudgetGroups([]);
      setTransactions([]);
      setToBudget(0);
      setToBudgetBreakdown({ availableFunds: 0, overspentPrevMonth: 0, forNextMonth: 0 });
      setError(null);
      txCacheRef.current.clear();
      return;
    }
    ensureDbAndLoad(
      auth.url,
      auth.token ?? '',
      auth.activeFileId,
      getActiveGroupId(),
      year,
      month,
      activeAccountId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, auth.activeFileId]);

  const switchAccount = useCallback((id: string | null) => {
    activeAccountIdRef.current = id;
    const key = id ?? '__all';
    const cached = txCacheRef.current.get(key);

    if (cached) {
      setTransactions(cached.items);
      setHasMoreTx(cached.hasMore);
      hasMoreTxRef.current = cached.hasMore;
      txOffsetRef.current = cached.offset;
      txBalRef.current = cached.bal;
      txLastDateRef.current = cached.lastDate;
    } else {
      setTransactions([]);
      setHasMoreTx(false);
      hasMoreTxRef.current = false;
      resetTxCursors();
    }

    setActiveAccountId(id);

    const epoch = ++loadEpochRef.current;
    const db = dbRef.current;
    if (db) {
      queryTransactions(db, { accountId: id }, TX_PAGE_SIZE, 0)
        .then((page) => {
          if (epoch === loadEpochRef.current) applyTxPage(page, false);
        })
        .catch((e) => {
          if (epoch === loadEpochRef.current) setError(e?.message ?? 'Query failed');
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreTransactions = useCallback(() => {
    const db = dbRef.current;
    if (!db || isLoadingMoreRef.current || !hasMoreTxRef.current) return;

    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    queryTransactions(
      db,
      { accountId: activeAccountId },
      TX_PAGE_SIZE,
      txOffsetRef.current,
      txBalRef.current,
      txLastDateRef.current,
    )
      .then((page) => applyTxPage(page, true))
      .catch((e) => setError(e?.message ?? 'Load more failed'))
      .finally(() => {
        isLoadingMoreRef.current = false;
        setLoadingMore(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId]);

  // Month switch: computes budget + net worth synchronously from cache
  // so React batches everything into one render (typically O(1) Map.get())
  function switchToMonth(newY: number, newM: number) {
    setYear(newY);
    setMonth(newM);

    const mInt = monthToInt(newY, newM);

    let result = budgetResultCacheRef.current.get(mInt);

    // Month beyond pre-computed range — compute on-demand
    if (!result && budgetRawRef.current) {
      result = computeBudgetForMonth(budgetRawRef.current, mInt);
      budgetResultCacheRef.current.set(mInt, result);
    }

    if (result) {
      applyBudgetResult(result);
    }
    if (nwRawRef.current) {
      setNetWorthHistory(computeNetWorthHistory(nwRawRef.current, newY, newM));
    }

    // Fallback — cache miss and no raw data (rare: DB swap before loadAll completes)
    if (!result) {
      const db = dbRef.current;
      if (db) {
        const epoch = ++loadEpochRef.current;
        loadMonth(db, newY, newM, epoch).catch((e) => {
          if (epoch === loadEpochRef.current) setError(e?.message ?? 'Query failed');
        });
      }
    }
  }

  function prevMonth() {
    const newY = month === 1 ? year - 1 : year;
    const newM = month === 1 ? 12 : month - 1;
    switchToMonth(newY, newM);
  }
  function nextMonth() {
    const newY = month === 12 ? year + 1 : year;
    const newM = month === 12 ? 1 : month + 1;
    switchToMonth(newY, newM);
  }
  function goToMonth(y: number, m: number) {
    switchToMonth(y, m);
  }

  // Bridge refs: useBudgetSync owns its own state, but ensureDbAndLoad also
  // needs to update it during the stale-cache background refresh path
  const setSyncingStateRef = useRef<(v: boolean) => void>(() => {});
  const syncSetLastSyncAtRef = useRef<(ts: number) => void>(() => {});
  function setSyncingState(v: boolean) {
    setSyncingStateRef.current(v);
  }
  function syncSetLastSyncAt(ts: number) {
    syncSetLastSyncAtRef.current(ts);
  }

  const { lastSyncAt, syncing, sync, refresh, resetSync, setLastSyncAt, scheduleSync } = useBudgetSync({
    dbRef,
    fileIdRef,
    txCacheRef: txCacheRef as React.RefObject<Map<string, unknown>>,
    reloadAllRef,
    reloadFullRef,
    getGroupId: getActiveGroupId,
    auth,
    isConnected,
    isOnline,
    setPendingCount,
    onSignOut: () => authDispatch({ type: 'LOGOUT' }),
    addToast,
    removeToastById,
  });

  useEffect(() => {
    setSyncingStateRef.current = (v) => {
      void v;
    };
    syncSetLastSyncAtRef.current = setLastSyncAt;
  }, [setLastSyncAt]);

  const { canWriteRef, recordWrite, showPaywall } = usePaywall();

  const mutations = useBudgetMutations({
    dbRef,
    reloadAllRef,
    getGroupId: getActiveGroupId,
    auth,
    isConnected,
    payees,
    setPayees,
    setLastSyncAt,
    setPendingCount,
    addToast,
    year,
    month,
    scheduleSync,
    activeAccountIdRef,
    setActiveAccountId,
    canWriteRef,
    recordWrite,
    showPaywall,
  });

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const totalAssets = useMemo(
    () => accounts.reduce((s, a) => s + Math.max(0, a.balance), 0),
    [accounts],
  );
  const totalLiabilities = useMemo(
    () => accounts.reduce((s, a) => s + Math.min(0, a.balance), 0),
    [accounts],
  );
  const netWorth = totalAssets + totalLiabilities;
  const budgeted = useMemo(
    () => budgetGroups.reduce((s, g) => s + (g.envelopes ?? []).reduce((ss, e) => ss + e.budgeted, 0), 0),
    [budgetGroups],
  );
  const activity = useMemo(
    () => budgetGroups.reduce((s, g) => s + (g.envelopes ?? []).reduce((ss, e) => ss + e.activity, 0), 0),
    [budgetGroups],
  );

  const budgetSummary = useMemo(
    () => ({ budgeted, activity, toBudget, ...toBudgetBreakdown }),
    [budgeted, activity, toBudget, toBudgetBreakdown],
  );

  const ctxValue = useMemo<BudgetCtxValue>(
    () => ({
      loading,
      error,
      year,
      month,
      monthLabel,
      prevMonth,
      nextMonth,
      goToMonth,
      accounts,
      closedAccounts,
      budgetGroups,
      toBudget,
      transactions,
      loadingMore,
      hasMoreTx,
      loadMoreTransactions,
      netWorth,
      totalAssets,
      totalLiabilities,
      netWorthHistory,
      budgetSummary,
      activeAccountId,
      setActiveAccountId: switchAccount,
      payees,
      unusedPayeeIds,
      categoryOptions,
      isOnline,
      pendingCount,
      lastSyncAt,
      syncing,
      sync,
      refresh,
      resetSync,
      ledgerFilters,
      setLedgerFilters,
      showHiddenCategories,
      setShowHiddenCategories,
      ...mutations,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loading, error, year, month, monthLabel,
      accounts, closedAccounts, budgetGroups, toBudget, transactions,
      loadingMore, hasMoreTx, loadMoreTransactions,
      netWorth, totalAssets, totalLiabilities, netWorthHistory,
      budgetSummary, activeAccountId, switchAccount,
      payees, unusedPayeeIds, categoryOptions,
      showHiddenCategories, setShowHiddenCategories,
      isOnline, pendingCount, lastSyncAt, syncing,
      sync, refresh, resetSync,
      ledgerFilters, setLedgerFilters, mutations,
    ],
  );

  const refCtxValue = useMemo(
    () => ({ accounts, payees, categoryOptions, unusedPayeeIds }),
    [accounts, payees, categoryOptions, unusedPayeeIds],
  );

  return (
    <BudgetCtx.Provider value={ctxValue}>
      <BudgetRefCtx.Provider value={refCtxValue}>
        {children}
      </BudgetRefCtx.Provider>
    </BudgetCtx.Provider>
  );
}

export function useBudget() {
  return useContext(BudgetCtx);
}
