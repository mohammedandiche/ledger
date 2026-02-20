import { View, Text, StyleSheet, Pressable } from 'react-native';
import { memo, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { fmt, type Account } from '@/constants/types';

type AccountType = Account['type'];

const ACCOUNT_ICONS: Record<AccountType, string> = {
  checking: '🏦',
  savings: '💰',
  cash: '💵',
  credit: '💳',
  investment: '📈',
};

const ICON_BG: Record<AccountType, keyof ThemeColors> = {
  checking: 'greenBg',
  savings: 'amberBg',
  cash: 'blueBg',
  credit: 'redBg',
  investment: 'blueBg',
};

export type AccountRowProps = {
  acct: Account;
  onPress: () => void;
  onMenu: () => void;
  dimmed?: boolean;
};

export const AccountRow = memo(function AccountRow({ acct, onPress, onMenu, dimmed }: AccountRowProps) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const icon = ACCOUNT_ICONS[acct.type];
  const isNeg = acct.balance < 0;
  const isDirty = acct.reconcileDirty;
  const iconBg = colors[ICON_BG[acct.type]];

  const pressScale = useSharedValue(1);
  const pressAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  return (
    <Animated.View style={[pressAnimStyle, dimmed && { opacity: 0.5 }]}>
      <Pressable
        style={({ pressed }) => [
          s.row,
          { paddingHorizontal: hp },
          pressed && { backgroundColor: colors.s2 },
        ]}
        onPress={onPress}
        onPressIn={() => { pressScale.value = withSpring(0.975, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { pressScale.value = withSpring(1, { damping: 20, stiffness: 280 }); }}
      >
        <View style={[s.icon, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: r(15, 18) }}>{icon}</Text>
        </View>

        <View style={s.info}>
          <Text style={[s.name, { fontSize: r(12, 14) }]}>{acct.name}</Text>
          <Text style={[s.meta, { fontSize: r(8, 10) }]}>
            {acct.last4 && <Text style={s.last4}>•••• {acct.last4}</Text>}
            {acct.last4 && '  ·  '}
            {acct.importNote ??
              (acct.importType === 'auto'
                ? 'auto-import'
                : acct.importType === 'manual'
                  ? 'manual · no import'
                  : '')}
          </Text>
        </View>

        <View style={s.right}>
          <Text style={[s.balance, { fontSize: r(13, 15) }, isNeg ? s.neg : s.pos]}>
            {fmt(acct.balance)}
          </Text>
          {acct.reconcileNote && (
            <Text style={[s.rec, { fontSize: r(8, 10) }, isDirty && s.recDirty]}>
              {acct.reconcileNote}
            </Text>
          )}
        </View>

        <Pressable
          style={s.menuBtn}
          onPress={(e) => { e.stopPropagation(); onMenu(); }}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Ionicons name="ellipsis-horizontal" size={r(16, 18)} color={colors.t3} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.bw2,
      gap: 10,
    },
    icon: {
      width: 30,
      height: 30,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    info: { flex: 1, minWidth: 0 },
    name: { fontFamily: 'NunitoSans_700Bold', color: C.t0 },
    meta: { fontFamily: 'OverpassMono_400Regular', color: C.t3, marginTop: 1 },
    last4: { color: C.t2 },
    right: { alignItems: 'flex-end', flexShrink: 0 },
    balance: { fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: -0.3 },
    pos: { color: C.t0 },
    neg: { color: C.redL },
    rec: { fontFamily: 'OverpassMono_400Regular', color: C.t3, marginTop: 1 },
    recDirty: { color: C.amberD },
    menuBtn: { paddingHorizontal: 4, paddingVertical: 4, flexShrink: 0 },
  });
}
