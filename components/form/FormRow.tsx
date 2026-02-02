import React from 'react';
import { View, Text } from 'react-native';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';

export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { hp, r } = useR();
  const fs = useFormStyles();
  return (
    <View style={[fs.formRow, { paddingHorizontal: hp }]}>
      <Text style={[fs.formLabel, { fontSize: r(9, 11) }]}>{label}</Text>
      {children}
    </View>
  );
}
