import React, { useMemo, memo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { tap } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { fmt, type ClearedStatus } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import type { ThemeColors } from '@/constants/tokens';
import { ClearedDot } from './ClearedDot';
import { LottieLoader } from '@/components/shared/LottieLoader';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    // Search bar
    searchBar: {
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b1,
      paddingVertical: 6,
    },
    searchInput: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t0,
      height: 28,
    },

    // Account strip
    acctStrip: { borderBottomWidth: 1, borderBottomColor: C.b0 },
    acctStripInner: { paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
    acctPill: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.bw,
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    acctPillOn: { backgroundColor: C.amberBg2, borderColor: C.b2 },
    acctPillText: {
      fontFamily: 'OverpassMono_600SemiBold',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.t3,
    },
    acctPillTextOn: { color: C.amberL },

    // Uncat banner
    importRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: C.blueBg,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(88,128,160,0.12)',
      borderLeftWidth: 2,
      borderLeftColor: C.blue,
      gap: 8,
    },
    importText: { fontFamily: 'OverpassMono_400Regular', color: C.blue, flex: 1 },
    importBadge: {
      backgroundColor: C.blueBg,
      borderWidth: 1,
      borderColor: 'rgba(88,128,160,0.25)',
      borderRadius: 3,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    importBadgeText: { fontFamily: 'OverpassMono_700Bold', color: C.blue },
    uncatBannerActive: { backgroundColor: C.redBg, borderLeftColor: C.red },
    uncatBadgeActive: { backgroundColor: C.redBg, borderColor: C.redBorder },

    // Ledger column headers
    ledgerCols: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    lc: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t2,
    },

    // Legend
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      backgroundColor: C.s1,
      borderTopWidth: 1,
      borderTopColor: C.b0,
      gap: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendLabel: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
    scheduledSwatch: { backgroundColor: C.blue, opacity: 0.6 },

    // Load-more footer
    loadMoreFooter: { paddingVertical: 14, alignItems: 'center' },
  });
}

export function AccountStrip({
  onScrollToTop,
  onSwitchAccount,
}: {
  onScrollToTop: () => void;
  onSwitchAccount: (id: string | null) => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { accounts, activeAccountId } = useBudget();

  const pills = useMemo(
    () => [
      { id: null, label: 'all accounts' },
      ...accounts.map((a) => ({ id: a.id, label: `${a.name}  ${fmt(a.balance)}` })),
    ],
    [accounts],
  );

  return (
    <View style={[s.acctStrip, { height: r(42, 52) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.acctStripInner, { paddingHorizontal: hp }]}
      >
        {pills.map((p) => {
          const on = p.id === activeAccountId;
          return (
            <Pressable
              key={p.id ?? '__all'}
              onPress={() => {
                tap();
                if (on) onScrollToTop();
                else onSwitchAccount(p.id);
              }}
              style={({ pressed }) => [
                s.acctPill,
                on && s.acctPillOn,
                pressed && { opacity: 0.72 },
              ]}
            >
              <Text style={[s.acctPillText, on && s.acctPillTextOn, { fontSize: r(9, 11) }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.searchBar, { paddingHorizontal: hp }]}>
      <TextInput
        style={[s.searchInput, { fontSize: r(12, 14) }]}
        value={query}
        onChangeText={onChange}
        placeholder="search payee or category…"
        placeholderTextColor={colors.t3}
        returnKeyType="search"
        clearButtonMode="while-editing"
        selectionColor={colors.amber}
      />
    </View>
  );
}

export function UncatBanner({
  count,
  active,
  onPress,
}: {
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  if (count <= 0) return null;
  return (
    <Pressable
      style={[s.importRow, active && s.uncatBannerActive, { paddingHorizontal: hp }]}
      onPress={onPress}
    >
      <Text style={[s.importText, { fontSize: r(9, 11) }]}>
        {count} uncategorised transaction{count !== 1 ? 's' : ''}
      </Text>
      <View style={[s.importBadge, active && s.uncatBadgeActive]}>
        <Text style={[s.importBadgeText, { fontSize: r(9, 10) }]}>
          {active ? 'show all' : `${count}`}
        </Text>
      </View>
    </Pressable>
  );
}

export function LedgerCols() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const amtW = r(70, 88);
  const runW = r(76, 94);
  return (
    <View style={[s.ledgerCols, { paddingHorizontal: hp }]}>
      <View style={{ width: r(16, 18) }} />
      <Text style={[s.lc, { flex: 1, paddingLeft: 8, textAlign: 'left', fontSize: r(9, 11) }]}>
        payee · category
      </Text>
      <Text style={[s.lc, { width: amtW, textAlign: 'right', fontSize: r(9, 11) }]}>amount</Text>
      <Text style={[s.lc, { width: runW, textAlign: 'right', fontSize: r(9, 11) }]}>balance</Text>
    </View>
  );
}

export const ClearedLegend = memo(function ClearedLegend() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.legend, { paddingHorizontal: hp }]}>
      {[
        { status: 'cleared' as ClearedStatus, label: 'cleared' },
        { status: 'uncleared' as ClearedStatus, label: 'uncleared' },
        { status: 'reconciled' as ClearedStatus, label: 'reconciled' },
      ].map(({ status, label }) => (
        <View key={status} style={s.legendItem}>
          <ClearedDot status={status} />
          <Text style={[s.legendLabel, { fontSize: r(8, 10) }]}>{label}</Text>
        </View>
      ))}
      <View style={[s.legendItem, { marginLeft: 'auto' }]}>
        <View style={[s.scheduledSwatch, { width: r(8, 10), height: r(8, 10) }]} />
        <Text style={[s.legendLabel, { fontSize: r(8, 10) }]}>scheduled</Text>
      </View>
    </View>
  );
});

export const LoadMoreFooter = memo(function LoadMoreFooter({ loading }: { loading: boolean }) {
  const { hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  if (!loading) return <View style={{ height: 24 }} />;
  return (
    <View style={[s.loadMoreFooter, { paddingHorizontal: hp }]}>
      <LottieLoader size={28} />
    </View>
  );
});
