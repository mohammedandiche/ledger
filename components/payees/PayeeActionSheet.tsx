import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { BottomSheetModal } from '@/components/shared/BottomSheetModal';

export type PayeeActionSheetProps = {
  visible: boolean;
  name: string;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function PayeeActionSheet({ visible, name, onRename, onDelete, onClose }: PayeeActionSheetProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <BottomSheetModal visible={visible} onDismiss={onClose} statusBarTranslucent>
      <Text style={[s.name, { fontSize: r(13, 15) }]} numberOfLines={2}>
        {name}
      </Text>

      <View style={s.divider} />

      <Pressable
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
        onPress={onRename}
      >
        <View style={[s.icon, { backgroundColor: colors.amberBg }]}>
          <Ionicons name="pencil-outline" size={r(15, 17)} color={colors.amber} />
        </View>
        <Text style={[s.rowText, { fontSize: r(13, 15) }]}>Rename</Text>
      </Pressable>

      <View style={s.divider} />

      <Pressable
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
        onPress={onDelete}
      >
        <View style={[s.icon, { backgroundColor: colors.redBg }]}>
          <Ionicons name="trash-outline" size={r(15, 17)} color={colors.redL} />
        </View>
        <Text style={[s.rowText, s.rowRed, { fontSize: r(13, 15) }]}>Delete payee</Text>
      </Pressable>

      <View style={s.divider} />

      <Pressable
        style={({ pressed }) => [s.cancelRow, pressed && s.rowPressed]}
        onPress={onClose}
      >
        <Text style={[s.cancelText, { fontSize: r(13, 15) }]}>Cancel</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    name: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t0,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    divider: { height: 1, backgroundColor: C.b0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 14,
    },
    rowPressed: { backgroundColor: C.s2 },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    rowText: { fontFamily: 'NunitoSans_600SemiBold', color: C.t0 },
    rowRed: { color: C.redL },
    cancelRow: { alignItems: 'center', paddingVertical: 16 },
    cancelText: { fontFamily: 'NunitoSans_600SemiBold', color: C.t3 },
  });
}
