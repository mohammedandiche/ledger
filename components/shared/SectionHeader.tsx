import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

interface SectionHeaderProps {
  title: string;
  action?: string;
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    title: {
      fontFamily: 'OverpassMono_600SemiBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: C.t3,
    },
    action: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.amberD,
    },
  });
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { hp, r } = useR();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.container, { paddingHorizontal: hp }]}>
      <Text style={[styles.title, { fontSize: r(8, 10) }]}>{title}</Text>
      {action && <Text style={[styles.action, { fontSize: r(8, 10) }]}>{action}</Text>}
    </View>
  );
}
