import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

export type SelectToolbarProps = {
  count: number;
  total: number;
  canMerge: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMerge: () => void;
};

export function SelectToolbar({ count, total, canMerge, onSelectAll, onDeselectAll, onDelete, onMerge }: SelectToolbarProps) {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const allSelected = count === total && total > 0;

  return (
    <View style={[s.toolbar, { paddingBottom: insets.bottom + 10, paddingHorizontal: hp }]}>
      <View style={s.left}>
        <Pressable
          style={({ pressed }) => [
            s.pill,
            allSelected && s.pillActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={allSelected ? onDeselectAll : onSelectAll}
          hitSlop={8}
        >
          <Ionicons
            name={allSelected ? 'checkmark-done' : 'checkmark-done-outline'}
            size={r(13, 14)}
            color={allSelected ? colors.amber : colors.t3}
          />
          <Text style={[s.pillText, { fontSize: r(10, 12) }, allSelected && s.pillTextActive]}>
            {count} / {total}
          </Text>
        </Pressable>
      </View>

      <View style={s.right}>
        {canMerge && (
          <Pressable
            style={({ pressed }) => [s.actionBtn, s.actionBtnAmber, pressed && { opacity: 0.7 }]}
            onPress={onMerge}
            hitSlop={6}
          >
            <Ionicons name="git-merge-outline" size={r(14, 16)} color={colors.amber} />
            <Text style={[s.actionText, { fontSize: r(10, 12), color: colors.amber }]}>Merge</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [s.actionBtn, s.actionBtnRed, pressed && { opacity: 0.7 }]}
          onPress={onDelete}
          hitSlop={6}
        >
          <Ionicons name="trash-outline" size={r(14, 16)} color={colors.redL} />
          <Text style={[s.actionText, { fontSize: r(10, 12), color: colors.redL }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    toolbar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      backgroundColor: C.bg,
      borderTopWidth: 1,
      borderTopColor: C.b1,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: C.b1,
      backgroundColor: C.s1,
    },
    pillActive: { backgroundColor: C.amberBg, borderColor: C.amber },
    pillText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
    pillTextActive: { color: C.amber },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    actionBtnAmber: { backgroundColor: C.amberBg, borderColor: C.amberBorder },
    actionBtnRed: { backgroundColor: C.redBg, borderColor: C.redBorder },
    actionText: { fontFamily: 'OverpassMono_600SemiBold' },
  });
}
