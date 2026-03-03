import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { tap } from '@/utils/haptics';
import { AppBar } from '@/components/shared/AppBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';
import type { ThemePref } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { useAuth } from '@/contexts/auth';
import { ServerSetup } from '@/components/settings/ServerSetup';
import { ConnectedStatus } from '@/components/settings/ConnectedStatus';
import { usePaywall } from '@/contexts/paywall';
import { FREE_WRITES_PER_MONTH } from '@/constants/config';

const THEME_OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'system', label: 'system', icon: '🌗' },
  { value: 'dark', label: 'dark', icon: '🌙' },
  { value: 'light', label: 'light', icon: '☀️' },
];

function AppearanceSection() {
  const { r, hp } = useR();
  const { colors, themePref, setThemePref } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <>
      <SectionHeader title="appearance" />
      <View style={[s.themeRow, { paddingHorizontal: hp }]}>
        {THEME_OPTIONS.map((opt) => {
          const active = themePref === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [s.themeChip, active && s.themeChipActive, pressed && { opacity: 0.75 }]}
              onPress={() => {
                tap();
                setThemePref(opt.value);
              }}
            >
              <Text style={{ fontSize: r(14, 17) }}>{opt.icon}</Text>
              <Text
                style={[s.themeChipLabel, { fontSize: r(8, 10) }, active && s.themeChipLabelActive]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function UpgradeSection() {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { isPro, writesRemaining, price, showPaywall, restorePurchases, presentCustomerCenter } = usePaywall();
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <SectionHeader title="upgrade" />
      <View style={[s.upgradeRow, { paddingHorizontal: hp }]}>
        {isPro ? (
          <>
            <View style={s.proBadge}>
              <Text style={[s.proBadgeText, { fontSize: r(10, 12) }]}>pro unlocked</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.restoreBtn, pressed && { opacity: 0.75 }]}
              onPress={() => {
                tap();
                presentCustomerCenter();
              }}
            >
              <Text style={[s.restoreBtnText, { fontSize: r(10, 12) }]}>manage purchase</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[s.upgradeInfo, { fontSize: r(11, 13) }]}>
              {writesRemaining} / {FREE_WRITES_PER_MONTH} free writes remaining this month
            </Text>

            <Pressable
              style={({ pressed }) => [s.upgradeBtn, pressed && { opacity: 0.75 }]}
              onPress={() => {
                tap();
                showPaywall();
              }}
            >
              <Text style={[s.upgradeBtnText, { fontSize: r(11, 13) }]}>
                unlock forever{price ? ` — ${price}` : ''}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.restoreBtn, pressed && { opacity: 0.75 }]}
              onPress={() => {
                tap();
                handleRestore();
              }}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.t3} />
              ) : (
                <Text style={[s.restoreBtnText, { fontSize: r(10, 12) }]}>restore purchase</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { isConnected, state } = useAuth();
  const { iapEnabled } = usePaywall();

  const badge = isConnected ? (state.activeFileName ?? 'connected') : undefined;

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar title="settings" badge={badge} />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isConnected ? <ConnectedStatus /> : <ServerSetup />}
        {iapEnabled && <UpgradeSection />}
        <AppearanceSection />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    themeRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 12,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    themeChip: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.sm,
      backgroundColor: C.s2,
    },
    themeChipActive: {
      backgroundColor: C.amberBg2,
      borderColor: C.b2,
    },
    themeChipLabel: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.t3,
    },
    themeChipLabelActive: {
      color: C.amber,
    },

    upgradeRow: {
      paddingVertical: 16,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      alignItems: 'center',
      gap: 12,
    },
    upgradeInfo: {
      fontFamily: Typography.sans,
      color: C.t2,
      textAlign: 'center',
    },
    upgradeBtn: {
      width: '100%',
      borderWidth: 1,
      borderRadius: Radius.lg,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      backgroundColor: C.amberBg,
      borderColor: C.amberBorder,
    },
    upgradeBtnText: {
      fontFamily: Typography.sansBB,
      color: C.amber,
    },
    restoreBtn: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      minHeight: 28,
      justifyContent: 'center',
    },
    restoreBtnText: {
      fontFamily: Typography.sansB,
      color: C.t3,
    },
    proBadge: {
      backgroundColor: C.amberBg2,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: Radius.sm,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    proBadgeText: {
      fontFamily: Typography.monoSB,
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
