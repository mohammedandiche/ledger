import { View, Text, TextInput, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { select } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { Account } from '@/constants/types';
import { BottomSheetModal } from '@/components/shared/BottomSheetModal';

type AccountType = Account['type'];

const ACCOUNT_TYPES: { type: AccountType; icon: string; label: string }[] = [
  { type: 'checking', icon: '🏦', label: 'Checking' },
  { type: 'savings', icon: '💰', label: 'Savings' },
  { type: 'cash', icon: '💵', label: 'Cash' },
  { type: 'credit', icon: '💳', label: 'Credit' },
  { type: 'investment', icon: '📈', label: 'Investment' },
];

export type CreateAccountSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onCreate: (name: string, type: AccountType, onBudget: boolean, startingBalanceCents: number) => void;
};

export function CreateAccountSheet({ visible, onDismiss, onCreate }: CreateAccountSheetProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = styles;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [onBudget, setOnBudget] = useState(true);
  const [balanceStr, setBalanceStr] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setType('checking');
    setOnBudget(true);
    setBalanceStr('');
  }, []);

  const handleDismiss = useCallback(() => {
    resetForm();
    onDismiss();
  }, [resetForm, onDismiss]);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const dollars = parseFloat(balanceStr) || 0;
    const cents = Math.round(dollars * 100);
    onCreate(trimmed, type, onBudget, cents);
    resetForm();
  }, [name, type, onBudget, balanceStr, onCreate, resetForm]);

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={handleDismiss}
      keyboardAvoiding
      sheetStyle={s.sheetOverrides}
    >
      <Text style={[s.title, { fontSize: r(15, 17), color: colors.t0, marginBottom: 16 }]}>
        New Account
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.label, { fontSize: r(9, 11), color: colors.t3 }]}>ACCOUNT NAME</Text>
        <TextInput
          style={[s.input, { fontSize: r(14, 16), color: colors.t0, borderColor: colors.b1 }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chase Checking"
          placeholderTextColor={colors.t3}
          autoFocus
          returnKeyType="next"
        />

        <Text style={[s.label, { fontSize: r(9, 11), color: colors.t3, marginTop: 14 }]}>TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ACCOUNT_TYPES.map((t) => {
              const active = type === t.type;
              return (
                <Pressable
                  key={t.type}
                  style={({ pressed }) => [
                    s.typeChip,
                    {
                      borderColor: active ? colors.amber : colors.b1,
                      backgroundColor: active ? colors.amberBg2 : colors.s2,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => { select(); setType(t.type); }}
                >
                  <Text style={{ fontSize: r(15, 17) }}>{t.icon}</Text>
                  <Text style={[s.typeChipLabel, { fontSize: r(10, 12), color: active ? colors.amber : colors.t2 }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[s.label, { fontSize: r(9, 11), color: colors.t3, marginTop: 14 }]}>BUDGET</Text>
        <View style={[s.budgetToggle, { marginTop: 6 }]}>
          <Pressable
            style={({ pressed }) => [
              s.budgetOption,
              {
                borderColor: onBudget ? colors.amber : colors.b1,
                backgroundColor: onBudget ? colors.amberBg2 : colors.s2,
              },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => { select(); setOnBudget(true); }}
          >
            <Text style={[s.budgetOptionLabel, { fontSize: r(12, 14), color: onBudget ? colors.amber : colors.t2 }]}>
              On Budget
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              s.budgetOption,
              {
                borderColor: !onBudget ? colors.amber : colors.b1,
                backgroundColor: !onBudget ? colors.amberBg2 : colors.s2,
              },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => { select(); setOnBudget(false); }}
          >
            <Text style={[s.budgetOptionLabel, { fontSize: r(12, 14), color: !onBudget ? colors.amber : colors.t2 }]}>
              Off Budget
            </Text>
          </Pressable>
        </View>

        <Text style={[s.label, { fontSize: r(9, 11), color: colors.t3, marginTop: 14 }]}>
          OPENING BALANCE (optional)
        </Text>
        <View style={[s.balanceRow, { borderColor: colors.b1, marginTop: 6 }]}>
          <Text style={[s.balanceCurrency, { fontSize: r(14, 16), color: colors.t3 }]}>$</Text>
          <TextInput
            style={[s.balanceInput, { fontSize: r(14, 16), color: colors.t0 }]}
            value={balanceStr}
            onChangeText={setBalanceStr}
            placeholder="0.00"
            placeholderTextColor={colors.t3}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        <Pressable
          style={[
            s.createBtn,
            { backgroundColor: name.trim() ? colors.amber : colors.s2, marginTop: 20 },
          ]}
          onPress={handleCreate}
          disabled={!name.trim()}
        >
          <Text style={[s.createBtnLabel, { fontSize: r(14, 16), color: name.trim() ? colors.bg : colors.t3 }]}>
            Create Account
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
    sheetOverrides: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    title: { fontFamily: 'OverpassMono_400Regular', letterSpacing: 0.5, textAlign: 'center' },
    label: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    input: {
      fontFamily: 'NunitoSans_600SemiBold',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginTop: 6,
    },
    typeChip: {
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
    },
    typeChipLabel: { fontFamily: 'NunitoSans_600SemiBold' },
    budgetToggle: { flexDirection: 'row', gap: 8 },
    budgetOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
    },
    budgetOptionLabel: { fontFamily: 'NunitoSans_700Bold' },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    balanceCurrency: { fontFamily: 'NunitoSans_600SemiBold', marginRight: 4 },
    balanceInput: { fontFamily: 'NunitoSans_600SemiBold', flex: 1 },
    createBtn: { alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
    createBtnLabel: { fontFamily: 'NunitoSans_800ExtraBold' },
});
