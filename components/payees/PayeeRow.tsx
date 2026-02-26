import { View, Text, StyleSheet, Pressable } from 'react-native';
import { memo, useMemo } from 'react';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { tapMedium } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { ANIM_PAYEE_ENTER, ANIM_PAYEE_STAGGER, ANIM_STAGGER_CAP } from '@/constants/animations';

export type PayeeRowProps = {
  id: string;
  name: string;
  unused: boolean;
  index: number;
  selectMode: boolean;
  selected: boolean;
  onLongPress: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpenMenu: (id: string, name: string) => void;
};

export const PayeeRow = memo(function PayeeRow({
  id,
  name,
  unused,
  index,
  selectMode,
  selected,
  onLongPress,
  onToggleSelect,
  onOpenMenu,
}: PayeeRowProps) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const initials = name.trim().slice(0, 2).toUpperCase();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        delay: Math.min(index * ANIM_PAYEE_STAGGER, ANIM_STAGGER_CAP),
        duration: ANIM_PAYEE_ENTER,
      }}
    >
      <Pressable
        style={({ pressed }) => [
          s.row,
          { paddingHorizontal: hp },
          selected && s.rowSelected,
          pressed && !selectMode && s.rowPressed,
        ]}
        onPress={() => { if (selectMode) onToggleSelect(id); }}
        onLongPress={() => {
          if (!selectMode) {
            tapMedium();
            onLongPress(id);
          }
        }}
        delayLongPress={380}
      >
        {selectMode ? (
          <View style={[s.checkbox, selected && s.checkboxChecked]}>
            {selected && <Ionicons name="checkmark" size={r(12, 14)} color={colors.amber} />}
          </View>
        ) : (
          <View style={[s.avatar, unused && s.avatarUnused]}>
            <Text style={[s.avatarText, { fontSize: r(10, 12) }, unused && s.avatarTextUnused]}>
              {initials}
            </Text>
          </View>
        )}

        <View style={s.body}>
          <Text style={[s.name, { fontSize: r(13, 15) }]} numberOfLines={1}>
            {name}
          </Text>
          {unused && (
            <Text style={[s.unusedBadge, { fontSize: r(8, 9) }]}>unused</Text>
          )}
        </View>

        {!selectMode && (
          <Pressable
            style={({ pressed }) => [s.menuBtn, pressed && s.menuBtnPressed]}
            onPress={() => onOpenMenu(id, name)}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={r(16, 18)} color={colors.t3} />
          </Pressable>
        )}
      </Pressable>
    </MotiView>
  );
});

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: C.bw2,
      gap: 12,
    },
    rowSelected: { backgroundColor: C.amberBg },
    rowPressed: { backgroundColor: C.s1 },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: C.amberBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarUnused: { backgroundColor: C.s1 },
    avatarText: { fontFamily: 'NunitoSans_700Bold', color: C.amber },
    avatarTextUnused: { color: C.t3 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: C.b1,
      backgroundColor: C.s1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkboxChecked: { backgroundColor: C.amberBg, borderColor: C.amber },
    body: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontFamily: 'NunitoSans_600SemiBold', color: C.t0 },
    unusedBadge: { fontFamily: 'OverpassMono_400Regular', color: C.t3, letterSpacing: 0.3 },
    menuBtn: { padding: 4, borderRadius: 6, flexShrink: 0 },
    menuBtnPressed: { backgroundColor: C.s2 },
  });
}
