import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

const EXPENSE_COLS = ['budgeted', 'activity', 'balance'] as const;
const INCOME_COLS = ['received'] as const;

interface Props {
  income?: boolean;
}

export function ColHeader({ income = false }: Props) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const colW = r(72, 90);
  const cols = income ? INCOME_COLS : EXPENSE_COLS;

  return (
    <View style={[s.colHeader, { paddingHorizontal: hp }]}>
      <Text style={[s.ch, { flex: 1, textAlign: 'left', fontSize: r(8, 10) }]}>category</Text>
      {cols.map((col) => (
        <Text key={col} style={[s.ch, { width: colW, fontSize: r(8, 10) }]}>
          {col}
        </Text>
      ))}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    colHeader: {
      flexDirection: 'row',
      paddingVertical: 7,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    ch: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: C.t2,
      textAlign: 'right',
    },
  });
}
