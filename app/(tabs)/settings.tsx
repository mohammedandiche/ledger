import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
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

export default function SettingsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { isConnected, state } = useAuth();

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
  });
}
