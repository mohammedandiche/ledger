import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius, Overlay } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

interface Props {
  visible: boolean;
  icon?: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.xl,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 22,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 24,
    },
    icon: {
      marginBottom: 12,
    },
    title: {
      fontFamily: 'NunitoSans_700Bold',
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      fontFamily: 'NunitoSans_400Regular',
      color: C.t2,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    confirmBtn: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    confirmText: {
      fontFamily: 'NunitoSans_700Bold',
    },
    cancelBtn: {
      marginTop: 14,
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    cancelText: {
      fontFamily: 'NunitoSans_600SemiBold',
      color: C.t3,
    },
    btnPressed: {
      opacity: 0.7,
    },
  });
}

export function ConfirmModal({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel,
}: Props) {
  const { r } = useR();
  const { colors, resolvedTheme } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const isDestructive = variant === 'destructive';
  const accentColor = isDestructive ? colors.redL : colors.amber;
  const accentBg = isDestructive ? colors.redBg : colors.amberBg;
  const accentBorder = isDestructive ? colors.redBorder : colors.amberBorder;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <BlurView
          tint={resolvedTheme === 'light' ? 'light' : 'dark'}
          intensity={22}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Overlay.medium }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={s.card} onStartShouldSetResponder={() => true}>
          {icon && <Text style={[s.icon, { fontSize: r(28, 34) }]}>{icon}</Text>}

          <Text style={[s.title, { fontSize: r(13, 15), color: accentColor }]}>{title}</Text>

          <Text style={[s.message, { fontSize: r(12, 14) }]}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              s.confirmBtn,
              { backgroundColor: accentBg, borderColor: accentBorder },
              pressed && s.btnPressed,
            ]}
            onPress={onConfirm}
          >
            <Text style={[s.confirmText, { fontSize: r(12, 14), color: accentColor }]}>
              {confirmLabel}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.cancelBtn, pressed && s.btnPressed]}
            onPress={onCancel}
            hitSlop={8}
          >
            <Text style={[s.cancelText, { fontSize: r(11, 13) }]}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
