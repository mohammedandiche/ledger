import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { ThemeColors } from '@/constants/tokens';
import type { ClearedStatus } from '@/constants/types';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    dot: {
      borderRadius: 99,
      shadowOffset: { width: 0, height: 0 },
      flexShrink: 0,
    },
  });
}

export function ClearedDot({ status }: { status: ClearedStatus }) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const size = r(6, 7);

  const dotStyle = {
    cleared: {
      backgroundColor: colors.green,
      shadowColor: colors.green,
      shadowOpacity: 0.6,
      shadowRadius: 3,
    },
    uncleared: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.t4 },
    reconciled: {
      backgroundColor: colors.amber,
      shadowColor: colors.amber,
      shadowOpacity: 0.6,
      shadowRadius: 3,
    },
  }[status];

  return <View style={[s.dot, { width: size, height: size }, dotStyle as any]} />;
}
