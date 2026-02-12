import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { ThemeColors } from '@/constants/tokens';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    dateSep: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 7,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.bw2,
    },
    dateSepLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.t4,
    },
    dateSepText: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: C.t2,
      flexShrink: 0,
    },
  });
}

export const DateSeparator = memo(function DateSeparator({ label }: { label: string }) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.dateSep, { paddingHorizontal: hp }]}>
      <View style={s.dateSepLine} />
      <Text style={[s.dateSepText, { fontSize: r(9, 10) }]}>{label}</Text>
      <View style={s.dateSepLine} />
    </View>
  );
});
