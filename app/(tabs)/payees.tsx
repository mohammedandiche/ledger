import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppBar } from '@/components/shared/AppBar';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useBudget } from '@/contexts/budget';
import { PayeeActionSheet } from '@/components/payees/PayeeActionSheet';
import { RenamePayeeModal } from '@/components/payees/RenamePayeeModal';
import { MergePayeesModal } from '@/components/payees/MergePayeesModal';
import { PayeeRow } from '@/components/payees/PayeeRow';
import { SelectToolbar } from '@/components/payees/SelectToolbar';

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.searchWrap, { marginHorizontal: r(12, 16) }]}>
      <Ionicons name="search" size={r(13, 15)} color={colors.t3} style={s.searchIcon} />
      <TextInput
        style={[s.searchInput, { fontSize: r(12, 14) }]}
        placeholder="filter payees…"
        placeholderTextColor={colors.t3}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

function SectionLetter({ letter }: { letter: string }) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.sectionRow}>
      <Text style={[s.sectionLetter, { fontSize: r(8, 10) }]}>{letter}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

export default function PayeesScreen() {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const {
    payees,
    unusedPayeeIds,
    loading,
    syncing,
    sync: syncPayees,
    deletePayee,
    renamePayee,
    mergePayees,
    deleteManyPayees,
  } = useBudget();

  const [query, setQuery] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);

  const [menuTarget, setMenuTarget] = useState<{ id: string; name: string } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameText, setRenameText] = useState('');

  const [mergeVisible, setMergeVisible] = useState(false);
  const [mergeWinnerId, setMergeWinnerId] = useState<string | null>(null);

  const unusedCount = unusedPayeeIds.size;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = unusedOnly ? payees.filter((p) => unusedPayeeIds.has(p.id)) : payees;
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [payees, unusedPayeeIds, query, unusedOnly]);

  const sections = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const letter = p.name[0]?.toUpperCase() ?? '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const mergeCandidates = useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id)),
    [filtered, selectedIds],
  );

  const enterSelectMode = useCallback((id: string) => {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const openMenu = useCallback((id: string, name: string) => {
    setMenuTarget({ id, name });
  }, []);

  const closeMenu = useCallback(() => setMenuTarget(null), []);

  const startRename = useCallback(() => {
    if (!menuTarget) return;
    const target = menuTarget;
    closeMenu();
    setTimeout(() => {
      setRenameTarget(target);
      setRenameText(target.name);
    }, 250);
  }, [menuTarget, closeMenu]);

  const cancelRename = useCallback(() => {
    setRenameTarget(null);
    setRenameText('');
  }, []);

  const commitRename = useCallback(async () => {
    if (!renameTarget) return;
    const trimmed = renameText.trim();
    if (!trimmed || trimmed === renameTarget.name.trim()) {
      cancelRename();
      return;
    }
    try {
      await renamePayee(renameTarget.id, trimmed);
    } catch {
      Alert.alert('Error', 'Could not rename payee. Check your connection.');
    }
    setRenameTarget(null);
    setRenameText('');
  }, [renameTarget, renameText, renamePayee, cancelRename]);

  const handleMenuDelete = useCallback(() => {
    if (!menuTarget) return;
    const { id, name } = menuTarget;
    closeMenu();
    setTimeout(() => {
      const isUsed = !unusedPayeeIds.has(id);
      const msg = isUsed
        ? `"${name}" is used in transactions.\nThose transactions will have their payee cleared.`
        : `Delete "${name}"?`;
      Alert.alert('Delete payee', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await deletePayee(id); }
            catch { Alert.alert('Error', 'Could not delete payee.'); }
          },
        },
      ]);
    }, 250);
  }, [menuTarget, closeMenu, unusedPayeeIds, deletePayee]);

  const handleBulkDelete = useCallback(() => {
    const ids = [...selectedIds];
    const usedCount = ids.filter((id) => !unusedPayeeIds.has(id)).length;
    const n = ids.length;
    const msg = usedCount > 0
      ? `Delete ${n} payee${n !== 1 ? 's' : ''}?\n${usedCount} ${usedCount !== 1 ? 'are' : 'is'} used in transactions — those payees will be cleared.`
      : `Delete ${n} payee${n !== 1 ? 's' : ''}?`;
    Alert.alert('Delete payees', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await deleteManyPayees(ids); exitSelectMode(); }
          catch { Alert.alert('Error', 'Could not delete payees.'); }
        },
      },
    ]);
  }, [selectedIds, unusedPayeeIds, deleteManyPayees, exitSelectMode]);

  const openMerge = useCallback(() => {
    if (mergeCandidates.length < 2) return;
    setMergeWinnerId(mergeCandidates[0].id);
    setMergeVisible(true);
  }, [mergeCandidates]);

  const commitMerge = useCallback(async () => {
    if (!mergeWinnerId) return;
    const sourceIds = [...selectedIds].filter((id) => id !== mergeWinnerId);
    try {
      await mergePayees(mergeWinnerId, sourceIds);
      setMergeVisible(false);
      exitSelectMode();
    } catch {
      Alert.alert('Error', 'Could not merge payees. Check your connection.');
    }
  }, [mergeWinnerId, selectedIds, mergePayees, exitSelectMode]);

  let rowIndex = 0;

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar
        badge={selectMode ? undefined : 'payees'}
        title={selectMode ? `${selectedIds.size} selected` : 'ledger'}
        right={
          selectMode ? (
            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={exitSelectMode}
              hitSlop={8}
            >
              <Text style={[s.cancelBtnText, { fontSize: r(10, 12) }]}>Cancel</Text>
            </Pressable>
          ) : undefined
        }
      />

      {!selectMode && (
        <View style={[s.filterRow, { paddingHorizontal: r(12, 16) }]}>
          <SearchBar value={query} onChange={setQuery} />
          {(unusedOnly || unusedCount > 0) && (
            <Pressable
              style={[s.unusedBtn, unusedOnly && s.unusedBtnActive]}
              onPress={() => setUnusedOnly((v) => !v)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[s.unusedBtnText, { fontSize: r(9, 11) }, unusedOnly && s.unusedBtnTextActive]}>
                {unusedOnly ? 'show all' : `${unusedCount} unused`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {selectMode && (
        <View style={s.selectHint}>
          <Text style={[s.selectHintText, { fontSize: r(9, 11) }]}>
            Tap rows to select · long-press a row to start
          </Text>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: selectMode ? 96 : 0 }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncPayees} />}
      >
        {loading && filtered.length === 0 && (
          <View style={s.empty}>
            <LottieLoader size={28} />
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={s.empty}>
            <LottieLoader animation="empty" size={48} loop={false} />
            <Text style={[s.emptyText, { fontSize: r(10, 12), marginTop: 10 }]}>
              {query ? 'no matches' : unusedOnly ? 'no unused payees' : 'no payees'}
            </Text>
          </View>
        )}

        {sections.map(([letter, items]) => (
          <View key={letter}>
            <SectionLetter letter={letter} />
            {items.map((p) => {
              const idx = rowIndex++;
              return (
                <PayeeRow
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  unused={unusedPayeeIds.has(p.id)}
                  index={idx}
                  selectMode={selectMode}
                  selected={selectedIds.has(p.id)}
                  onLongPress={enterSelectMode}
                  onToggleSelect={toggleSelect}
                  onOpenMenu={openMenu}
                />
              );
            })}
          </View>
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      {selectMode && selectedIds.size > 0 && (
        <SelectToolbar
          count={selectedIds.size}
          total={filtered.length}
          canMerge={selectedIds.size >= 2}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDelete={handleBulkDelete}
          onMerge={openMerge}
        />
      )}

      <PayeeActionSheet
        visible={menuTarget !== null}
        name={menuTarget?.name ?? ''}
        onRename={startRename}
        onDelete={handleMenuDelete}
        onClose={closeMenu}
      />

      <RenamePayeeModal
        visible={renameTarget !== null}
        currentName={renameTarget?.name ?? ''}
        value={renameText}
        onChange={setRenameText}
        onSave={commitRename}
        onCancel={cancelRename}
      />

      <MergePayeesModal
        visible={mergeVisible}
        candidates={mergeCandidates}
        winnerId={mergeWinnerId}
        onPickWinner={setMergeWinnerId}
        onMerge={commitMerge}
        onCancel={() => setMergeVisible(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 6,
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.s1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.b1,
      paddingHorizontal: 8,
      height: 34,
    },
    searchIcon: { marginRight: 5 },
    searchInput: {
      flex: 1,
      fontFamily: 'OverpassMono_400Regular',
      color: C.t0,
      height: '100%',
    },
    unusedBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.b1,
      backgroundColor: C.s1,
      flexShrink: 0,
    },
    unusedBtnActive: { backgroundColor: C.amberBg, borderColor: C.amber },
    unusedBtnText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
    unusedBtnTextActive: { color: C.amber },

    selectHint: { paddingHorizontal: 16, paddingBottom: 6, paddingTop: 2 },
    selectHintText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },

    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
      backgroundColor: C.s0,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      gap: 6,
    },
    sectionLetter: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: C.t3,
      minWidth: 10,
    },
    sectionLine: { flex: 1, height: 1, backgroundColor: C.b0 },

    cancelBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.b1,
      backgroundColor: C.s1,
    },
    cancelBtnText: { fontFamily: 'OverpassMono_400Regular', color: C.t2 },

    empty: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
  });
}
