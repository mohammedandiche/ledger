import { View, Text, StyleSheet, Pressable } from 'react-native';
import { memo, useState, useEffect, useMemo, type ReactNode } from 'react';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tap, tapMedium } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { fmt, type BudgetGroup, type EnvelopeRow } from '@/constants/types';
import { signColor } from '@/utils/amountHelpers';

export interface EnvRowProps {
  env: EnvelopeRow;
  isIncome?: boolean;
  onEditBudget: (id: string, name: string, amountCents: number) => void;
  onTapActivity: (id: string, name: string) => void;
  onTapBalance: (env: EnvelopeRow) => void;
  onLongPress?: (env: EnvelopeRow) => void;
  dragHandle?: ReactNode;
}

export const EnvRow = memo(function EnvRow({
  env,
  isIncome,
  onEditBudget,
  onTapActivity,
  onTapBalance,
  onLongPress,
  dragHandle,
}: EnvRowProps) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const colW = r(72, 90);
  const isOver = env.status === 'over';
  const isLow = env.status === 'low';

  const fillColor = isOver ? colors.red : isLow ? colors.amber : colors.green;
  const balanceColor = isOver ? colors.redL : isLow ? colors.amber : colors.green;

  // When a drag handle is present, render it OUTSIDE the Pressable so that
  // the Pan gesture doesn't bubble up to the Pressable's onLongPress/onPress.
  const rowContent = (
    <>
      {/* Left accent bar — always rendered so all rows stay aligned */}
      <View
        style={[
          s.envAccent,
          { backgroundColor: isOver || isLow ? fillColor : 'transparent', marginLeft: dragHandle ? 2 : hp },
        ]}
      />

      <View style={[s.envContent, { paddingRight: hp }]}>
        <View style={s.envRowTop}>
          {/* Name col */}
          <View style={{ flex: 1 }}>
            <Text style={[s.envName, { fontSize: r(13, 15) }]}>{env.name}</Text>
            {env.subtitle && <Text style={[s.envSub, { fontSize: r(9, 11) }]}>{env.subtitle}</Text>}
          </View>

          {isIncome ? (
            /* Income: single column aligned with income header */
            <Text
              style={[
                s.envCell,
                {
                  color: signColor(env.activity, colors),
                  width: colW,
                  fontSize: r(12, 14),
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {env.activity !== 0 ? fmt(env.activity) : '—'}
            </Text>
          ) : (
            <>
              {/* Budgeted — tappable */}
              <Pressable
                style={({ pressed }) => [s.envCellPressable, { width: colW }, pressed && { opacity: 0.55 }]}
                onPress={() => {
                  tap();
                  onEditBudget(env.id, env.name, Math.round(env.budgeted * 100));
                }}
              >
                <Text
                  style={[s.envCell, s.envBudgeted, { fontSize: r(12, 14) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {env.budgeted !== 0 ? fmt(env.budgeted) : '—'}
                </Text>
              </Pressable>

              {/* Activity — tappable, navigates to ledger */}
              <Pressable
                style={({ pressed }) => [s.envCellPressable, { width: colW }, pressed && env.activity !== 0 && { opacity: 0.55 }]}
                onPress={() => {
                  if (env.activity !== 0) {
                    tap();
                    onTapActivity(env.id, env.name);
                  }
                }}
              >
                <Text
                  style={[
                    s.envCell,
                    env.activity === 0
                      ? s.envActivityNeutral
                      : env.activity > 0
                      ? s.envActivityPos
                      : s.envActivity,
                    { fontSize: r(12, 14) },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {env.activity !== 0 ? fmt(env.activity) : '—'}
                </Text>
              </Pressable>

              {/* Balance + rollover arrow — tappable */}
              <Pressable
                style={({ pressed }) => [pressed && { opacity: 0.55 }]}
                onPress={() => {
                  tap();
                  onTapBalance(env);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={{ width: colW, overflow: 'visible' }}>
                  <Text
                    style={[s.envCell, { color: balanceColor, fontSize: r(12, 14) }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {fmt(env.balance)}
                  </Text>
                  {env.hasRollover && (
                    <Text style={[s.rolloverArrow, { color: balanceColor, fontSize: r(10, 12) }]}>
                      →
                    </Text>
                  )}
                </View>
              </Pressable>
            </>
          )}
        </View>

      </View>
    </>
  );

  const handleLongPress = onLongPress ? () => { tapMedium(); onLongPress(env); } : undefined;
  const rowStyle = [s.envRow, isOver && s.envRowOver, isLow && s.envRowLow, env.hidden && s.envRowHidden];

  if (dragHandle) {
    // Drag handle is a sibling, not a child, of the Pressable —
    // prevents the Pan gesture from triggering the row's onLongPress.
    return (
      <View style={rowStyle}>
        {dragHandle}
        <Pressable style={s.envRowPress} onLongPress={handleLongPress} delayLongPress={400}>
          {rowContent}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={rowStyle} onLongPress={handleLongPress} delayLongPress={400}>
      {rowContent}
    </Pressable>
  );
});

export interface GroupProps {
  group: BudgetGroup;
  onEditBudget: (id: string, name: string, amountCents: number) => void;
  onTapActivity: (id: string, name: string) => void;
  onTapBalance: (env: EnvelopeRow) => void;
  onLongPress?: (group: BudgetGroup) => void;
  onLongPressEnv?: (env: EnvelopeRow, group: BudgetGroup) => void;
  dragHandle?: ReactNode;
  renderEnvelopes?: (envelopes: EnvelopeRow[], collapsed: boolean) => ReactNode;
  forceCollapsed?: boolean;
  onMeasureHeader?: (height: number) => void;
}

export const Group = memo(function Group({
  group,
  onEditBudget,
  onTapActivity,
  onTapBalance,
  onLongPress,
  onLongPressEnv,
  dragHandle,
  renderEnvelopes,
  forceCollapsed,
  onMeasureHeader,
}: GroupProps) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const colW = r(72, 90);
  const [collapsed, setCollapsed] = useState(false);

  // Animated chevron rotation: 0° = expanded, -90° = collapsed
  const chevronRotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const chevronTiming = { duration: 200, easing: Easing.out(Easing.cubic) };

  // When parent forces collapse (e.g. during group drag), animate chevron
  useEffect(() => {
    if (forceCollapsed) {
      chevronRotation.value = withTiming(-90, chevronTiming);
    } else {
      chevronRotation.value = withTiming(collapsed ? -90 : 0, chevronTiming);
    }
  }, [forceCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveCollapsed = forceCollapsed || collapsed;

  const { totalBudgeted, totalActivity, totalBalance } = group.envelopes.reduce(
    (acc, e) => {
      acc.totalBudgeted += e.budgeted;
      acc.totalActivity += e.activity;
      acc.totalBalance += e.balance;
      return acc;
    },
    { totalBudgeted: 0, totalActivity: 0, totalBalance: 0 },
  );

  return (
    <View style={[s.group, group.hidden && s.groupHidden]}>
      <View
        style={[s.groupHeader, { paddingHorizontal: dragHandle ? 0 : hp, paddingLeft: hp }]}
        onLayout={onMeasureHeader ? (e) => onMeasureHeader(e.nativeEvent.layout.height) : undefined}
      >
        <Pressable
          style={({ pressed }) => [s.groupHeaderPress, pressed && { backgroundColor: colors.s3 }]}
          onPress={() => {
            tap();
            const next = !collapsed;
            setCollapsed(next);
            chevronRotation.value = withTiming(next ? -90 : 0, chevronTiming);
          }}
          onLongPress={onLongPress ? () => { tapMedium(); onLongPress(group); } : undefined}
          delayLongPress={400}
        >
          <View style={s.groupNameRow}>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={r(12, 14)} color={colors.t3} />
            </Animated.View>
            <Text style={[s.groupName, { fontSize: r(10, 12) }]}>{group.name}</Text>
          </View>
          <View style={[s.groupTotals, !dragHandle && { paddingRight: hp }]}>
            {group.isIncome ? (
              <Text
                style={[
                  s.groupTotal,
                  {
                    color: totalActivity > 0 ? colors.green : colors.t2,
                    width: colW,
                    fontSize: r(10, 12),
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {fmt(totalActivity)}
              </Text>
            ) : (
              <>
                <Text
                  style={[s.groupTotal, { width: colW, fontSize: r(10, 12) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {fmt(totalBudgeted)}
                </Text>
                <Text
                  style={[s.groupTotal, {
                    color: signColor(totalActivity, colors),
                    width: colW,
                    fontSize: r(10, 12),
                  }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {totalActivity !== 0 ? fmt(totalActivity) : '—'}
                </Text>
                <Text
                  style={[s.groupTotal, { color: colors.green, width: colW, fontSize: r(10, 12) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {fmt(totalBalance)}
                </Text>
              </>
            )}
          </View>
        </Pressable>
        {dragHandle}
      </View>

      {renderEnvelopes
        ? renderEnvelopes(group.envelopes, effectiveCollapsed)
        : !effectiveCollapsed &&
          group.envelopes.map((env) => (
            <EnvRow
              key={env.id}
              env={env}
              isIncome={group.isIncome}
              onEditBudget={onEditBudget}
              onTapActivity={onTapActivity}
              onTapBalance={onTapBalance}
              onLongPress={onLongPressEnv ? (e) => onLongPressEnv(e, group) : undefined}
            />
          ))}
    </View>
  );
});

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    // Group
    group: {
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    groupHidden: {
      opacity: 0.45,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      backgroundColor: C.s2,
    },
    groupHeaderPress: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    groupNameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      flex: 1,
    },
    groupName: {
      fontFamily: 'OverpassMono_700Bold',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: C.t1,
      flex: 1,
    },
    groupTotals: {
      flexDirection: 'row',
    },
    groupTotal: {
      fontFamily: 'OverpassMono_600SemiBold',
      textAlign: 'right',
      color: C.t2,
    },

    // Envelope row
    envRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: C.bw2,
    },
    envRowPress: {
      flex: 1,
      flexDirection: 'row',
    },
    envRowOver: {},
    envRowLow: {},
    envRowHidden: {
      opacity: 0.4,
    },
    envAccent: {
      width: 2,
      marginVertical: 5,
      borderRadius: 1,
    },
    envContent: {
      flex: 1,
      paddingLeft: 10,
      paddingVertical: 8,
    },
    envRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    envName: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t1,
    },
    envSub: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      marginTop: 1,
    },
    envCellPressable: {
      alignSelf: 'stretch',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    envCell: {
      fontFamily: 'OverpassMono_500Medium',
      textAlign: 'right',
    },
    envBudgeted: { color: C.t2 },
    envActivity: { color: C.redL },
    envActivityPos: { color: C.green },
    envActivityNeutral: { color: C.t3 },
    rolloverArrow: {
      position: 'absolute' as const,
      right: -14,
      top: 0,
      bottom: 0,
      textAlignVertical: 'center',
    },
  });
}
