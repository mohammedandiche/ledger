import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap, select } from '@/utils/haptics';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import Animated, {
  useAnimatedRef,
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  cancelAnimation,
  scrollTo as reanimatedScrollTo,
} from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { AppBar } from '@/components/shared/AppBar';
import { EditTransactionModal } from '@/components/shared/EditTransactionModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import type { ActiveFilter, Transaction } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import { DateSeparator } from '@/components/ledger/DateSeparator';
import { TransactionRow } from '@/components/ledger/TransactionRow';
import {
  AccountStrip,
  SearchBar,
  UncatBanner,
  LedgerCols,
  ClearedLegend,
  LoadMoreFooter,
} from '@/components/ledger/LedgerChrome';
import { ReconcileBar, ReconcileSetupModal } from '@/components/ledger/ReconcileBar';
import { FilterBar } from '@/components/ledger/FilterBar';
import { useReconcileState } from '@/hooks/useReconcileState';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';

type TxItem = Transaction | { dateSeparator: string };

export default function LedgerScreen() {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { bottom: safeBottom } = useSafeAreaInsets();
  const {
    transactions,
    loading,
    error,
    loadingMore,
    hasMoreTx,
    loadMoreTransactions,
    activeAccountId,
    setActiveAccountId,
    accounts,
    payees,
    categoryOptions,
    createPayee,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSplitChild,
    getClearedBalance,
    lockReconciled,
    unreconcileTransaction,
    ledgerFilters,
    setLedgerFilters,
    queryWithFilters,
    getUncatCount,
    sync,
    syncing,
  } = useBudget();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { filteredResults, filterLoading, isFiltered } = useFilteredTransactions({
    ledgerFilters,
    activeAccountId,
    query,
    queryWithFilters,
  });

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingSplitChildren, setEditingSplitChildren] = useState<Transaction[]>([]);
  const [pendingDeleteTx, setPendingDeleteTx] = useState<Transaction | null>(null);

  const addFilter = useCallback(
    (filter: ActiveFilter) => {
      select();
      const withoutSameField = ledgerFilters.filter((f) => f.field !== filter.field);
      setLedgerFilters([...withoutSameField, filter]);
    },
    [ledgerFilters, setLedgerFilters],
  );

  const removeFilter = useCallback(
    (id: string) => {
      select();
      setLedgerFilters(ledgerFilters.filter((f) => f.id !== id));
    },
    [ledgerFilters, setLedgerFilters],
  );

  const clearFilters = useCallback(() => {
    setLedgerFilters([]);
  }, [setLedgerFilters]);

  const {
    reconcileMode,
    reconcileTarget,
    reconcileCleared,
    showReconcileSetup,
    setShowReconcileSetup,
    handleReconcilePress,
    handleStartReconcile,
    handleLock,
    handleExitReconcile,
    handleAddAdjustment,
  } = useReconcileState({
    activeAccountId,
    transactions,
    getClearedBalance,
    lockReconciled,
    addTransaction,
  });

  const listRef = useRef<FlashListRef<TxItem>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollOffsetRef = useRef(0);
  const showScrollTopRef = useRef(false);

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const scrollTargetY = useSharedValue(-1); // -1 = inactive

  useAnimatedReaction(
    () => scrollTargetY.value,
    (y) => {
      if (y >= 0) reanimatedScrollTo(scrollViewRef, 0, y, false);
    },
  );

  // Inject Animated.ScrollView so we can drive scrollTo from UI thread
  const ScrollComponent = useMemo(
    () =>
      React.forwardRef<any, any>(function AnimatedScroll(props, ref) {
        return (
          <Animated.ScrollView
            {...props}
            ref={(node: any) => {
              scrollViewRef(node);
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as any).current = node;
            }}
          />
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Runs entirely on UI thread to avoid JS bridge stutter
  const scrollToTop = useCallback(() => {
    const start = scrollOffsetRef.current;
    if (start <= 0) return;
    cancelAnimation(scrollTargetY);
    scrollTargetY.value = start;
    scrollTargetY.value = withTiming(0, { duration: Math.min(1200, Math.max(400, start * 0.4)) }, (finished) => {
      'worklet';
      if (finished) scrollTargetY.value = -1;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proxy ref so useScrollToTop (tab press) uses our smooth scroll
  const scrollProxyRef = useRef<any>({ scrollToTop: () => {} });
  scrollProxyRef.current.scrollToTop = scrollToTop;
  useScrollToTop(scrollProxyRef);

  const handleSwitchAccount = useCallback(
    (id: string | null) => {
      if (ledgerFilters.length > 0) setLedgerFilters([]);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollOffsetRef.current = 0;
      setActiveAccountId(id);
    },
    [setActiveAccountId, ledgerFilters, setLedgerFilters],
  );

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = y;
    const shouldShow = y > 300;
    if (shouldShow !== showScrollTopRef.current) {
      showScrollTopRef.current = shouldShow;
      setShowScrollTop(shouldShow);
    }
  }, []);

  const handlePressTx = useCallback(
    (tx: Transaction) => {
      if (tx.isParent || tx.isChild) {
        const parentId = tx.isParent ? tx.id : tx.parentId;
        if (!parentId) {
          setEditingTx(tx);
          setEditingSplitChildren([]);
          return;
        }

        let parent: Transaction | null = null;
        const children: Transaction[] = [];
        for (const item of transactions) {
          if ('dateSeparator' in item) continue;
          if (item.id === parentId) parent = item;
          else if (item.isChild && item.parentId === parentId) children.push(item);
        }
        setEditingTx(parent ?? tx);
        setEditingSplitChildren(children);
      } else {
        setEditingTx(tx);
        setEditingSplitChildren([]);
      }
    },
    [transactions],
  );

  const handleSwipeDelete = useCallback((tx: Transaction) => {
    setPendingDeleteTx(tx);
  }, []);

  // DB-backed count reflects ALL transactions, not just the loaded page
  const [uncatCount, setUncatCount] = useState(0);
  React.useEffect(() => {
    getUncatCount(activeAccountId).then(setUncatCount).catch(() => {});
  }, [transactions, activeAccountId, getUncatCount]);

  const filteredItems = useMemo<TxItem[]>(() => {
    if (isFiltered) return filteredResults;

    return transactions;
  }, [isFiltered, filteredResults, transactions]);


  // Prefix keys with active account so FlashList sees new items on account switch,
  // preventing scroll-anchor logic from fighting our explicit scrollToOffset call
  const acctPrefix = activeAccountId ?? '__all';
  const keyExtractor = useCallback(
    (item: TxItem) =>
      'dateSeparator' in item
        ? `${acctPrefix}-sep-${item.dateSeparator}`
        : `${acctPrefix}-${item.id}`,
    [acctPrefix],
  );

  const getItemType = useCallback(
    (item: TxItem) => ('dateSeparator' in item ? 'separator' : 'transaction'),
    [],
  );

  const showAccount = activeAccountId === null;
  const renderItem = useCallback(
    ({ item }: { item: TxItem }) =>
      'dateSeparator' in item ? (
        <DateSeparator label={item.dateSeparator} />
      ) : (
        <TransactionRow
          tx={item}
          showAccount={showAccount}
          onPress={handlePressTx}
          onDelete={handleSwipeDelete}
        />
      ),
    [showAccount, handlePressTx, handleSwipeDelete],
  );

  const listHeader = useMemo(
    () => (
      <>
        {loading && transactions.length === 0 && (
          <View style={s.emptyState}>
            <LottieLoader size={28} />
          </View>
        )}
        {!!error && (
          <View style={[s.emptyState, s.emptyStateError]}>
            <Text style={[s.emptyText, s.emptyTextError]}>{error}</Text>
          </View>
        )}
      </>
    ),
    [loading, transactions.length, error, s],
  );

  const listFooter = useMemo(() => <LoadMoreFooter loading={loadingMore} />, [loadingMore]);

  const handleEndReached = useCallback(() => {
    if (hasMoreTx && !isFiltered) loadMoreTransactions();
  }, [hasMoreTx, isFiltered, loadMoreTransactions]);

  const listEmpty = useMemo(() => {
    if (loading || filterLoading || error) return null;
    if (isFiltered && filteredResults.length === 0) {
      const filterLabel = ledgerFilters.map((f) => f.label).join(', ');
      const searchLabel = query.trim() ? `"${query.trim()}"` : '';
      const parts = [filterLabel, searchLabel].filter(Boolean).join(' · ');
      return (
        <View style={s.emptyState}>
          <LottieLoader animation="empty" size={48} loop={false} />
          <Text style={s.emptyText}>no transactions match {parts}</Text>
        </View>
      );
    }
    return null;
  }, [loading, filterLoading, error, isFiltered, filteredResults, ledgerFilters, query, s]);

  const rightButtons = useMemo(
    () => (
      <Pressable
        style={[s.iconBtn, searchOpen && s.iconBtnActive]}
        onPress={() => {
          tap();
          setSearchOpen((prev) => !prev);
          if (searchOpen) setQuery('');
          if (!searchOpen && ledgerFilters.length > 0) setLedgerFilters([]);
        }}
      >
        <Text style={[s.iconBtnText, { fontSize: r(9, 11) }]}>🔍</Text>
      </Pressable>
    ),
    [s, r, searchOpen, ledgerFilters.length, setLedgerFilters],
  );

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar right={rightButtons} />
      <AnimatePresence>
        {searchOpen && (
          <MotiView
            key="search"
            from={{ opacity: 0, translateY: -12 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -12 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <SearchBar query={query} onChange={setQuery} />
          </MotiView>
        )}
      </AnimatePresence>
      <AccountStrip onScrollToTop={scrollToTop} onSwitchAccount={handleSwitchAccount} />
      <ReconcileBar
        reconcileMode={reconcileMode}
        reconcileTarget={reconcileTarget}
        reconcileCleared={reconcileCleared}
        onReconcilePress={handleReconcilePress}
        onLock={handleLock}
        onExit={handleExitReconcile}
        onAddAdjustment={handleAddAdjustment}
      />
      <FilterBar
        filters={ledgerFilters}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onClearAll={clearFilters}
      />
      {!isFiltered && (
        <UncatBanner
          count={uncatCount}
          active={false}
          onPress={() => {
            addFilter({
              id: 'uncategorized',
              field: 'uncategorized',
              operator: 'is',
              value: true,
              label: 'Uncategorized',
            });
          }}
        />
      )}
      <LedgerCols />

      <FlashList<TxItem>
        ref={listRef}
        style={s.scroll}
        data={filteredItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderScrollComponent={ScrollComponent}
        getItemType={getItemType}
        drawDistance={500}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} />}
      />

      <AnimatePresence>
        {showScrollTop && (
          <MotiView
            key="fab"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={[s.fab, { bottom: Math.max(safeBottom + 12, 48) }]}
          >
            <Pressable
              style={s.fabPress}
              onPress={() => { tap(); scrollToTop(); }}
              hitSlop={8}
            >
              <Text style={[s.fabText, { fontSize: r(14, 16) }]}>↑</Text>
            </Pressable>
          </MotiView>
        )}
      </AnimatePresence>

      <ClearedLegend />

      <EditTransactionModal
        visible={editingTx !== null}
        transaction={editingTx}
        splitChildren={editingSplitChildren}
        onClose={() => {
          setEditingTx(null);
          setEditingSplitChildren([]);
        }}
        onSave={updateTransaction}
        onDelete={deleteTransaction}
        onAddSplitChild={addSplitChild}
        onUnreconcile={async (id) => {
          await unreconcileTransaction(id);
        }}
        accounts={accounts}
        payees={payees}
        categoryOptions={categoryOptions}
        onCreatePayee={createPayee}
      />

      <ReconcileSetupModal
        visible={showReconcileSetup}
        accountName={accounts.find((a) => a.id === activeAccountId)?.name ?? ''}
        accountBalance={accounts.find((a) => a.id === activeAccountId)?.balance ?? 0}
        onStart={handleStartReconcile}
        onClose={() => setShowReconcileSetup(false)}
      />

      <ConfirmModal
        visible={pendingDeleteTx !== null}
        title="Delete transaction"
        message={
          pendingDeleteTx
            ? `Delete "${pendingDeleteTx.payee}" (${pendingDeleteTx.amount < 0 ? '-' : '+'}${Math.abs(pendingDeleteTx.amount).toFixed(2)})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (pendingDeleteTx) deleteTransaction(pendingDeleteTx.id);
          setPendingDeleteTx(null);
        }}
        onCancel={() => setPendingDeleteTx(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    emptyState: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyStateError: {
      backgroundColor: C.redBg,
    },
    emptyText: {
      fontFamily: 'OverpassMono_400Regular',
      fontSize: 10,
      color: C.t3,
    },
    emptyTextError: {
      color: C.redL,
    },

    iconBtn: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.bw,
      borderRadius: 3,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      backgroundColor: C.amberBg,
      borderColor: C.b2,
    },
    iconBtnText: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
    },

    fab: {
      position: 'absolute',
      bottom: 48,
      right: 16,
    },
    fabPress: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 6,
    },
    fabText: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.t1,
    },
  });
}
