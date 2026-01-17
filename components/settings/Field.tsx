import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

export function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: any;
  editable?: boolean;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.field, { paddingHorizontal: hp }]}>
      <Text style={[s.fieldLabel, { fontSize: r(8, 10) }]}>{label}</Text>
      <TextInput
        style={[s.fieldInput, { fontSize: r(11, 13) }, !editable && s.fieldInputDim]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.t4}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.amber}
        editable={editable}
      />
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    field: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.s1,
    },
    fieldLabel: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 6,
    },
    fieldInput: {
      fontFamily: Typography.mono,
      color: C.t0,
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    fieldInputDim: {
      color: C.t3,
      backgroundColor: C.s0,
      borderColor: C.b0,
    },
  });
}
