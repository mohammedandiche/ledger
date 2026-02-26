import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { BottomSheetModal, BottomSheetScrollView } from '@/components/shared/BottomSheetModal';

export type MergePayeesModalProps = {
  visible: boolean;
  candidates: { id: string; name: string }[];
  winnerId: string | null;
  onPickWinner: (id: string) => void;
  onMerge: () => void;
  onCancel: () => void;
};

export function MergePayeesModal({ visible, candidates, winnerId, onPickWinner, onMerge, onCancel }: MergePayeesModalProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <BottomSheetModal visible={visible} onDismiss={onCancel} statusBarTranslucent>
      <Text style={[s.title, { fontSize: r(13, 15) }]}>Merge payees</Text>
      <Text style={[s.subtitle, { fontSize: r(11, 13) }]}>Which name should be kept?</Text>

      <View style={s.divider} />

      <BottomSheetScrollView>
        {candidates.map((c) => {
          const active = c.id === winnerId;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                s.option,
                active && s.optionActive,
                pressed && s.rowPressed,
              ]}
              onPress={() => onPickWinner(c.id)}
            >
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={r(17, 19)}
                color={active ? colors.amber : colors.t3}
              />
              <Text
                style={[s.optionText, { fontSize: r(13, 15), color: active ? colors.t0 : colors.t2 }]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>

      <View style={s.divider} />

      <Pressable
        style={({ pressed }) => [s.mergeBtn, pressed && { opacity: 0.7 }]}
        onPress={onMerge}
      >
        <Ionicons name="git-merge-outline" size={r(15, 17)} color={colors.amber} />
        <Text style={[s.mergeBtnText, { fontSize: r(13, 15) }]}>
          Merge {candidates.length} payees
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.cancelRow, pressed && { opacity: 0.6 }]}
        onPress={onCancel}
        hitSlop={8}
      >
        <Text style={[s.cancelText, { fontSize: r(13, 15) }]}>Cancel</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    title: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t0,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    subtitle: {
      fontFamily: 'NunitoSans_400Regular',
      color: C.t3,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    divider: { height: 1, backgroundColor: C.b0 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 13,
    },
    optionActive: { backgroundColor: C.amberBg },
    optionText: { fontFamily: 'NunitoSans_600SemiBold', flex: 1 },
    rowPressed: { backgroundColor: C.s2 },
    mergeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
    },
    mergeBtnText: { fontFamily: 'NunitoSans_700Bold', color: C.amber },
    cancelRow: { alignItems: 'center', paddingVertical: 16 },
    cancelText: { fontFamily: 'NunitoSans_600SemiBold', color: C.t3 },
  });
}
