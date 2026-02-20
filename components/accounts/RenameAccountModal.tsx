import { View, Text, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useMemo, useState } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import type { Account } from '@/constants/types';

export type RenameAccountModalProps = {
  account: Account | null;
  onDismiss: () => void;
  onSave: (newName: string) => void;
};

export function RenameAccountModal({ account, onDismiss, onSave }: RenameAccountModalProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState(account?.name ?? '');

  if (!account) return null;
  const unchanged = name.trim() === account.name.trim();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={s.card}>
          <Text style={[s.title, { fontSize: r(13, 15) }]}>
            Rename Account
          </Text>
          <TextInput
            style={[s.input, { fontSize: r(14, 16) }]}
            value={name}
            onChangeText={setName}
            autoFocus
            selectTextOnFocus
            placeholderTextColor={colors.t3}
            returnKeyType="done"
            onSubmitEditing={() => { if (!unchanged) onSave(name); }}
          />
          <View style={s.actions}>
            <Pressable style={s.btn} onPress={onDismiss}>
              <Text style={[s.btnLabel, { fontSize: r(13, 15), color: colors.t2 }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                s.btn,
                s.btnPrimary,
                { backgroundColor: colors.amber },
                unchanged && s.btnDisabled,
              ]}
              onPress={() => { if (!unchanged) onSave(name); }}
              disabled={unchanged}
            >
              <Text style={[s.btnLabel, { fontSize: r(13, 15), color: colors.bg }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1 },
    card: {
      margin: 28,
      borderRadius: Radius.xl,
      padding: 20,
      backgroundColor: C.s1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    title: { fontFamily: 'NunitoSans_700Bold', marginBottom: 14, color: C.t0 },
    input: {
      fontFamily: 'NunitoSans_600SemiBold',
      borderWidth: 1,
      borderRadius: 10,
      borderColor: C.b1,
      color: C.t0,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 16,
    },
    actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    btnPrimary: {},
    btnDisabled: { opacity: 0.4 },
    btnLabel: { fontFamily: 'NunitoSans_700Bold' },
  });
}
