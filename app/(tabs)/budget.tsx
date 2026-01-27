import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { tap } from '@/utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBar } from '@/components/shared/AppBar';
import { TransferBudgetModal } from '@/components/shared/TransferBudgetModal';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { type BudgetGroup, type EnvelopeRow } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import { BudgetBanner } from '@/components/budget/BudgetBanner';
import { MonthStrip } from '@/components/budget/MonthStrip';
import { ColHeader } from '@/components/budget/ColHeader';
import { Group } from '@/components/budget/EnvRow';
import { DraggableGroupList } from '@/components/budget/DraggableGroupList';
import { EditBudgetModal } from '@/components/budget/EditBudgetModal';
import { BalanceMenuModal } from '@/components/budget/BalanceMenuModal';
import {
  GroupActionsModal,
  CategoryActionsModal,
  TextPromptModal,
  MoveGroupModal,
} from '@/components/budget/CategoryManage';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const {
    budgetGroups,
    loading,
    error,
    isOnline,
    pendingCount,
    lastSyncAt,
    syncing,
    sync: syncBudget,
    year,
    month,
    monthLabel,
    setBudgetAmount,
    toggleCarryover,
    transferBudget,
    setLedgerFilters,
    categoryOptions,
    createCategoryGroup,
    renameCategoryGroup,
    deleteCategoryGroup,
    setCategoryGroupHidden,
    createCategory,
    renameCategory,
    deleteCategory,
    setCategoryHidden,
    moveCategoryToGroup,
    reorderCategoryGroups,
    reorderCategories,
    showHiddenCategories,
    setShowHiddenCategories,
  } = useBudget();
  const { r, hp } = useR();

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handleDragStateChange = useCallback((isDragging: boolean) => {
    setScrollEnabled(!isDragging);
  }, []);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const [containerHeight, setContainerHeight] = useState(0);

  const [editingBudget, setEditingBudget] = useState<{
    categoryId: string;
    categoryName: string;
    currentAmount: number;
  } | null>(null);

  const [balanceMenuEnv, setBalanceMenuEnv] = useState<EnvelopeRow | null>(null);

  const [transferMode, setTransferMode] = useState<{
    mode: 'transfer' | 'cover';
    source: { id: string; name: string; balance: number };
  } | null>(null);

  const [activeGroup, setActiveGroup] = useState<BudgetGroup | null>(null);
  const [activeCat, setActiveCat] = useState<{ env: EnvelopeRow; group: BudgetGroup } | null>(null);
  type ManageModal =
    | 'groupActions' | 'catActions'
    | 'renameGroup' | 'addCategory' | 'renameCategory' | 'addGroup'
    | 'moveCategory' | null;
  const [manageModal, setManageModal] = useState<ManageModal>(null);

  const handleEditBudget = useCallback((id: string, name: string, amountCents: number) => {
    setEditingBudget({ categoryId: id, categoryName: name, currentAmount: amountCents });
  }, []);

  // Refs avoid recreating callbacks on month switch
  const yearRef = useRef(year);
  const monthRef = useRef(month);
  const monthLabelRef = useRef(monthLabel);
  yearRef.current = year;
  monthRef.current = month;
  monthLabelRef.current = monthLabel;

  const handleTapActivity = useCallback(
    (categoryId: string, categoryName: string) => {
      const y = yearRef.current;
      const m = monthRef.current;
      const ml = monthLabelRef.current;
      const mStart = y * 10000 + m * 100 + 1;
      const lastDay = new Date(y, m, 0).getDate();
      const mEnd = y * 10000 + m * 100 + lastDay;
      setLedgerFilters([
        { id: 'category', field: 'category', operator: 'is', value: categoryId, label: categoryName },
        { id: 'date', field: 'date', operator: 'between', value: [mStart, mEnd], label: ml },
      ]);
      router.navigate('/(tabs)/ledger');
    },
    [setLedgerFilters, router],
  );

  const handleTapBalance = useCallback((env: EnvelopeRow) => {
    setBalanceMenuEnv(env);
  }, []);

  const handleSaveBudget = useCallback(
    async (amountCents: number) => {
      if (!editingBudget) return;
      tap();
      await setBudgetAmount(editingBudget.categoryId, amountCents);
      setEditingBudget(null);
    },
    [editingBudget, setBudgetAmount],
  );

  const handleLongPressGroup = useCallback((group: BudgetGroup) => {
    setActiveGroup(group);
    setManageModal('groupActions');
  }, []);

  const handleLongPressEnv = useCallback((env: EnvelopeRow, group: BudgetGroup) => {
    setActiveCat({ env, group });
    setManageModal('catActions');
  }, []);

  const handleConfirmAddGroup = useCallback(
    async (name: string) => {
      await createCategoryGroup(name);
      setManageModal(null);
    },
    [createCategoryGroup],
  );

  const handleConfirmRenameGroup = useCallback(
    async (name: string) => {
      if (!activeGroup) return;
      await renameCategoryGroup(activeGroup.id, name);
      setManageModal(null);
      setActiveGroup(null);
    },
    [activeGroup, renameCategoryGroup],
  );

  const handleDeleteGroup = useCallback(
    async (group: BudgetGroup) => {
      await deleteCategoryGroup(group.id);
    },
    [deleteCategoryGroup],
  );

  const handleToggleGroupHidden = useCallback(
    async (group: BudgetGroup) => {
      await setCategoryGroupHidden(group.id, !group.hidden);
    },
    [setCategoryGroupHidden],
  );

  const handleConfirmAddCategory = useCallback(
    async (name: string) => {
      if (!activeGroup) return;
      await createCategory(name, activeGroup.id);
      setManageModal(null);
      setActiveGroup(null);
    },
    [activeGroup, createCategory],
  );

  const handleConfirmRenameCategory = useCallback(
    async (name: string) => {
      if (!activeCat) return;
      await renameCategory(activeCat.env.id, name);
      setManageModal(null);
      setActiveCat(null);
    },
    [activeCat, renameCategory],
  );

  const handleDeleteCategory = useCallback(
    async (env: EnvelopeRow) => {
      await deleteCategory(env.id);
    },
    [deleteCategory],
  );

  const handleToggleCategoryHidden = useCallback(
    async (env: EnvelopeRow) => {
      await setCategoryHidden(env.id, !env.hidden);
    },
    [setCategoryHidden],
  );

  const handleMoveCategory = useCallback(
    async (groupId: string) => {
      if (!activeCat) return;
      await moveCategoryToGroup(activeCat.env.id, groupId);
      setManageModal(null);
      setActiveCat(null);
    },
    [activeCat, moveCategoryToGroup],
  );

  const handleReorderGroups = useCallback(
    (newIds: string[]) => {
      reorderCategoryGroups(newIds);
    },
    [reorderCategoryGroups],
  );

  const handleReorderCategories = useCallback(
    (orderedIds: string[]) => { reorderCategories(orderedIds); },
    [reorderCategories],
  );

  const handleMoveCategoryToGroup = useCallback(
    async (catId: string, newGroupId: string, orderedIds: string[]) => {
      await moveCategoryToGroup(catId, newGroupId);
      await reorderCategories(orderedIds);
    },
    [moveCategoryToGroup, reorderCategories],
  );

  const { children, stickyIndices } = useMemo(() => {
    const expenseGroups = budgetGroups.filter((g) => !g.isIncome);
    const incomeGroups = budgetGroups.filter((g) => g.isIncome);

    const items: React.ReactNode[] = [];

    if (loading && budgetGroups.length === 0) {
      items.push(
        <View key="loading" style={[s.statusNote, { paddingHorizontal: hp, alignItems: 'center' }]}>
          <LottieLoader size={28} />
        </View>,
      );
    }
    if (error) {
      items.push(
        <View key="error" style={[s.statusNote, s.statusNoteError, { paddingHorizontal: hp }]}>
          <Text style={[s.statusNoteText, s.statusNoteTextError, { fontSize: r(9, 11) }]}>
            {error}
          </Text>
        </View>,
      );
    }

    items.push(
      <DraggableGroupList
        key="expense-groups"
        groups={expenseGroups}
        onReorder={handleReorderGroups}
        onReorderCategories={handleReorderCategories}
        onMoveCategoryToGroup={handleMoveCategoryToGroup}
        onEditBudget={handleEditBudget}
        onTapActivity={handleTapActivity}
        onTapBalance={handleTapBalance}
        onLongPressGroup={handleLongPressGroup}
        onLongPressEnv={handleLongPressEnv}
        onDragStateChange={handleDragStateChange}
        scrollRef={scrollRef}
        scrollOffset={scrollOffset}
        containerHeight={containerHeight}
      />,
    );

    items.push(
      <View key="mgmt-toolbar" style={[s.mgmtToolbar, { paddingHorizontal: hp }]}>
        <Pressable
          style={({ pressed }) => [s.mgmtBtn, pressed && s.mgmtBtnPressed]}
          onPress={() => setManageModal('addGroup')}
          hitSlop={8}
        >
          <Text style={[s.mgmtBtnText, { fontSize: r(10, 12) }]}>+ add group</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            s.mgmtBtn,
            showHiddenCategories && s.mgmtBtnActive,
            pressed && s.mgmtBtnPressed,
          ]}
          onPress={() => setShowHiddenCategories(!showHiddenCategories)}
          hitSlop={8}
        >
          <Text
            style={[
              s.mgmtBtnText,
              showHiddenCategories && s.mgmtBtnTextActive,
              { fontSize: r(10, 12) },
            ]}
          >
            {showHiddenCategories ? 'hide hidden' : 'show hidden'}
          </Text>
        </Pressable>
      </View>,
    );

    const indices: number[] = [];
    if (incomeGroups.length > 0) {
      const incomeHeaderIdx = items.length;
      items.push(<ColHeader key="incomehdr" income />);
      indices.push(incomeHeaderIdx);

      for (const g of incomeGroups) {
        items.push(
          <Group
            key={g.id}
            group={g}
            onEditBudget={handleEditBudget}
            onTapActivity={handleTapActivity}
            onTapBalance={handleTapBalance}
            onLongPress={handleLongPressGroup}
            onLongPressEnv={handleLongPressEnv}
          />,
        );
      }
    }

    items.push(<View key="spacer" style={{ height: 24 }} />);

    return { children: items, stickyIndices: indices };
  }, [
    budgetGroups,
    loading,
    error,
    hp,
    r,
    s,
    handleEditBudget,
    handleTapActivity,
    handleTapBalance,
    handleLongPressGroup,
    handleLongPressEnv,
    handleReorderGroups,
    handleReorderCategories,
    handleMoveCategoryToGroup,
    handleDragStateChange,
    showHiddenCategories,
    setShowHiddenCategories,
    setManageModal,
  ]);

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar
        badge="self-hosted"
        showSync
        lastSyncAt={lastSyncAt}
        syncing={syncing}
        onSync={syncBudget}
        isOnline={isOnline}
        pendingCount={pendingCount}
      />
      <MonthStrip />
      <BudgetBanner />
      <ColHeader />

      <Animated.ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        stickyHeaderIndices={stickyIndices}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncBudget} />}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </Animated.ScrollView>

      <EditBudgetModal
        visible={editingBudget !== null}
        categoryName={editingBudget?.categoryName ?? ''}
        currentAmount={editingBudget?.currentAmount ?? 0}
        onSave={handleSaveBudget}
        onClose={() => setEditingBudget(null)}
      />

      <BalanceMenuModal
        visible={balanceMenuEnv !== null}
        env={balanceMenuEnv}
        onTransfer={() => {
          if (balanceMenuEnv) {
            setTransferMode({
              mode: 'transfer',
              source: {
                id: balanceMenuEnv.id,
                name: balanceMenuEnv.name,
                balance: balanceMenuEnv.balance,
              },
            });
          }
        }}
        onCover={() => {
          if (balanceMenuEnv) {
            setTransferMode({
              mode: 'cover',
              source: {
                id: balanceMenuEnv.id,
                name: balanceMenuEnv.name,
                balance: balanceMenuEnv.balance,
              },
            });
          }
        }}
        onToggleRollover={async () => {
          if (balanceMenuEnv) await toggleCarryover(balanceMenuEnv.id);
        }}
        onClose={() => setBalanceMenuEnv(null)}
      />

      <TransferBudgetModal
        visible={transferMode !== null}
        mode={transferMode?.mode ?? 'transfer'}
        sourceCategory={transferMode?.source ?? { id: '', name: '', balance: 0 }}
        categories={categoryOptions}
        onTransfer={transferBudget}
        onClose={() => setTransferMode(null)}
      />

      <GroupActionsModal
        visible={manageModal === 'groupActions'}
        group={activeGroup}
        onRename={(g) => { setActiveGroup(g); setManageModal('renameGroup'); }}
        onAddCategory={(g) => { setActiveGroup(g); setManageModal('addCategory'); }}
        onToggleHidden={handleToggleGroupHidden}
        onDelete={handleDeleteGroup}
        onClose={() => { setManageModal(null); setActiveGroup(null); }}
      />

      <CategoryActionsModal
        visible={manageModal === 'catActions'}
        category={activeCat?.env ?? null}
        groupName={activeCat?.group.name}
        onRename={(env) => { setActiveCat((prev) => prev ? { ...prev, env } : null); setManageModal('renameCategory'); }}
        onToggleHidden={handleToggleCategoryHidden}
        onMove={(env) => { setActiveCat((prev) => prev ? { ...prev, env } : null); setManageModal('moveCategory'); }}
        onDelete={handleDeleteCategory}
        onClose={() => { setManageModal(null); setActiveCat(null); }}
      />

      <TextPromptModal
        visible={manageModal === 'addGroup'}
        title="New group"
        placeholder="Group name"
        confirmLabel="Create"
        onConfirm={handleConfirmAddGroup}
        onClose={() => setManageModal(null)}
      />

      <TextPromptModal
        visible={manageModal === 'renameGroup'}
        title="Rename group"
        initialValue={activeGroup?.name ?? ''}
        placeholder="Group name"
        confirmLabel="Rename"
        onConfirm={handleConfirmRenameGroup}
        onClose={() => { setManageModal(null); setActiveGroup(null); }}
      />

      <TextPromptModal
        visible={manageModal === 'addCategory'}
        title="New category"
        subtitle={activeGroup?.name}
        placeholder="Category name"
        confirmLabel="Create"
        onConfirm={handleConfirmAddCategory}
        onClose={() => { setManageModal(null); setActiveGroup(null); }}
      />

      <TextPromptModal
        visible={manageModal === 'renameCategory'}
        title="Rename category"
        initialValue={activeCat?.env.name ?? ''}
        placeholder="Category name"
        confirmLabel="Rename"
        onConfirm={handleConfirmRenameCategory}
        onClose={() => { setManageModal(null); setActiveCat(null); }}
      />

      <MoveGroupModal
        visible={manageModal === 'moveCategory'}
        categoryName={activeCat?.env.name ?? ''}
        groups={budgetGroups}
        currentGroupId={activeCat?.group.id ?? ''}
        onMove={handleMoveCategory}
        onClose={() => { setManageModal(null); setActiveCat(null); }}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    statusNote: {
      paddingVertical: 12,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    statusNoteError: { backgroundColor: C.redBg },
    statusNoteText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
    statusNoteTextError: { color: C.redL },

    mgmtToolbar: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.b0,
    },
    mgmtBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.b1,
      backgroundColor: C.s1,
    },
    mgmtBtnActive: { backgroundColor: C.amberBg, borderColor: C.amberBorder },
    mgmtBtnPressed: { opacity: 0.7 },
    mgmtBtnText: { fontFamily: 'OverpassMono_600SemiBold', color: C.t2 },
    mgmtBtnTextActive: { color: C.amber },
  });
}
