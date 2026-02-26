import { View, Text, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useMemo, useRef } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius, Overlay } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

export type RenamePayeeModalProps = {
  visible: boolean;
  currentName: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function RenamePayeeModal({ visible, currentName, value, onChange, onSave, onCancel }: RenamePayeeModalProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== currentName.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
      onShow={() => setTimeout(() => inputRef.current?.focus(), 60)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
          <View style={s.card} onStartShouldSetResponder={() => true}>
            <Text style={[s.title, { fontSize: r(11, 13), color: colors.amber }]}>
              RENAME PAYEE
            </Text>

            <TextInput
              ref={inputRef}
              style={[s.input, { fontSize: r(14, 16) }]}
              value={value}
              onChangeText={onChange}
              onSubmitEditing={canSave ? onSave : onCancel}
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              selectTextOnFocus
            />

            <Pressable
              style={({ pressed }) => [
                s.saveBtn,
                {
                  backgroundColor: canSave ? colors.amberBg : colors.s2,
                  borderColor: canSave ? colors.amberBorder : colors.b1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={canSave ? onSave : undefined}
            >
              <Text style={[s.saveBtnText, { fontSize: r(12, 14), color: canSave ? colors.amber : colors.t3 }]}>
                Save
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.6 }]}
              onPress={onCancel}
              hitSlop={8}
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
      backgroundColor: Overlay.heavy,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 28,
    },
    card: {
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.xl,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 20,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 32,
      elevation: 24,
    },
    title: {
      fontFamily: 'OverpassMono_600SemiBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    input: {
      width: '100%',
      fontFamily: 'NunitoSans_600SemiBold',
      color: C.t0,
      backgroundColor: C.s0,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 14,
    },
    saveBtn: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      minHeight: 48,
    },
    saveBtnText: { fontFamily: 'NunitoSans_700Bold', letterSpacing: 0.3 },
    cancelBtn: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 16 },
    cancelText: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
