import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius, Overlay } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

export type EditBudgetModalProps = {
  visible: boolean;
  categoryName: string;
  currentAmount: number; // cents
  onSave: (amountCents: number) => void;
  onClose: () => void;
};

export function EditBudgetModal({
  visible,
  categoryName,
  currentAmount,
  onSave,
  onClose,
}: EditBudgetModalProps) {
  const { r } = useR();
  const { colors, resolvedTheme } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [value, setValue] = useState('');
  const [isNegative, setIsNegative] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsNegative(currentAmount < 0);
      setValue(currentAmount !== 0 ? (Math.abs(currentAmount) / 100).toFixed(2) : '');
    }
  }, [visible, currentAmount]);

  const handleSave = useCallback(() => {
    const abs = Math.round(parseFloat(value || '0') * 100);
    onSave(isNegative ? -abs : abs);
  }, [value, isNegative, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.overlay}>
          <BlurView
            tint={resolvedTheme === 'light' ? 'light' : 'dark'}
            intensity={22}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Overlay.medium }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View style={s.card} onStartShouldSetResponder={() => true}>
            <Text style={[s.title, { fontSize: r(13, 15) }]}>edit budget</Text>
            <Text style={[s.subtitle, { fontSize: r(10, 12) }]}>{categoryName}</Text>

            <View style={s.inputRow}>
              <Pressable
                style={[s.signToggle, isNegative ? s.signNeg : s.signPos]}
                onPress={() => setIsNegative((n) => !n)}
                hitSlop={8}
              >
                <Text style={[s.signText, { fontSize: r(16, 20) }]}>
                  {isNegative ? '−' : '+'}
                </Text>
              </Pressable>
              <TextInput
                style={[s.input, { fontSize: r(20, 24) }]}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.t4}
                selectTextOnFocus
                selectionColor={colors.amber}
                onSubmitEditing={handleSave}
              />
            </View>

            <Pressable
              style={({ pressed }) => [s.saveBtn, pressed && s.btnPressed]}
              onPress={handleSave}
            >
              <Text style={[s.saveBtnText, { fontSize: r(12, 14) }]}>save</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && s.btnPressed]}
              onPress={onClose}
            >
              <Text style={[s.cancelText, { fontSize: r(11, 13) }]}>cancel</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
    },
    title: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.amber,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      textAlign: 'center',
      marginBottom: 20,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 8,
      marginBottom: 20,
    },
    signToggle: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signPos: { backgroundColor: C.greenBg, borderColor: C.greenBorder },
    signNeg: { backgroundColor: C.redBg, borderColor: C.redBorder },
    signText: { fontFamily: 'OverpassMono_700Bold', color: C.t1 },
    input: {
      flex: 1,
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t1,
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlign: 'center',
    },
    saveBtn: {
      width: '100%',
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      minHeight: 48,
    },
    saveBtnText: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.amber,
    },
    cancelBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 16 },
    cancelText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    btnPressed: { opacity: 0.7 },
  });
}
