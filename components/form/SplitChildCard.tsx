import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';
import { PayeeInput } from './PayeeInput';
import type { Payee } from '@/constants/types';
import type { SplitChild } from '@/hooks/useSplitForm';

interface Props {
  child: SplitChild;
  payees: Payee[];
  onCreatePayee?: (name: string) => Promise<void>;
  onUpdate: (patch: Partial<SplitChild>) => void;
  onDelete: () => void;
  onOpenCatPicker: () => void;
}

export function SplitChildCard({
  child,
  payees,
  onCreatePayee,
  onUpdate,
  onDelete,
  onOpenCatPicker,
}: Props) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();

  return (
    <View style={[fs.splitCard, { marginHorizontal: hp }]}>
      {/* Payee + Amount row */}
      <View style={fs.splitCardRow}>
        <View style={{ flex: 1 }}>
          <Text style={[fs.splitCardLabel, { fontSize: r(8, 10) }]}>payee</Text>
          <PayeeInput
            value={child.payeeName}
            onChange={(v) => onUpdate({ payeeName: v })}
            payees={payees}
            onCreatePayee={onCreatePayee}
          />
        </View>

        <View style={{ width: r(100, 120) }}>
          <Text style={[fs.splitCardLabel, { fontSize: r(8, 10) }]}>amount</Text>
          <View style={fs.splitAmountRow}>
            <Pressable
              style={[fs.splitFlowBtn, child.isOutflow ? fs.flowOut : fs.flowIn]}
              onPress={() => onUpdate({ isOutflow: !child.isOutflow })}
              hitSlop={4}
            >
              <Text style={[fs.splitFlowText, { fontSize: r(11, 13) }]}>
                {child.isOutflow ? '−' : '+'}
              </Text>
            </Pressable>
            <TextInput
              style={[fs.input, { fontSize: r(12, 14), flex: 1, textAlign: 'right' }]}
              value={child.amountStr}
              onChangeText={(v) => onUpdate({ amountStr: v })}
              placeholder="0.00"
              placeholderTextColor={colors.t3}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* Category */}
      <View style={{ marginTop: 8 }}>
        <Text style={[fs.splitCardLabel, { fontSize: r(8, 10) }]}>category</Text>
        <Pressable style={fs.pickerBtn} onPress={onOpenCatPicker}>
          <Text
            style={[
              fs.pickerText,
              { fontSize: r(12, 14) },
              !child.categoryId && fs.pickerPlaceholder,
            ]}
          >
            {child.categoryName || 'no category'}
          </Text>
          <Text style={[fs.pickerArrow, { fontSize: r(10, 12) }]}>▾</Text>
        </Pressable>
      </View>

      {/* Notes */}
      <View style={{ marginTop: 8 }}>
        <Text style={[fs.splitCardLabel, { fontSize: r(8, 10) }]}>notes</Text>
        <TextInput
          style={[fs.input, { fontSize: r(12, 14) }]}
          value={child.notes}
          onChangeText={(v) => onUpdate({ notes: v })}
          placeholder="optional"
          placeholderTextColor={colors.t3}
        />
      </View>

      <Pressable style={fs.splitDeleteBtn} onPress={onDelete} hitSlop={8}>
        <Text style={[fs.splitDeleteText, { fontSize: r(9, 11) }]}>delete split</Text>
      </Pressable>
    </View>
  );
}
