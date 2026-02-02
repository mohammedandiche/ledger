import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';

interface Props {
  amountStr: string;
  onChangeAmount: (s: string) => void;
  isOutflow: boolean;
  onToggleOutflow: () => void;
  isSplit: boolean;
  childrenSumCents: number;
  remainingCents: number;
  isBalanced: boolean;
  isOver: boolean;
}

export function AmountSection({
  amountStr,
  onChangeAmount,
  isOutflow,
  onToggleOutflow,
  isSplit,
  childrenSumCents,
  remainingCents,
  isBalanced,
  isOver,
}: Props) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();

  const remainingAbs = Math.abs(remainingCents) / 100;

  return (
    <View style={[fs.amountSection, { paddingHorizontal: hp }]}>
      <Text style={[fs.amountLabel, { fontSize: r(9, 11) }]}>
        {isSplit ? 'total' : isOutflow ? 'outflow' : 'inflow'}
      </Text>

      <View style={fs.amountRow}>
        <Pressable
          style={[fs.flowToggle, isOutflow ? fs.flowOut : fs.flowIn]}
          onPress={onToggleOutflow}
          hitSlop={8}
        >
          <Text style={[fs.flowToggleText, { fontSize: r(14, 16) }]}>{isOutflow ? '−' : '+'}</Text>
        </Pressable>

        <TextInput
          style={[fs.amountInput, { fontSize: r(32, 40) }]}
          value={amountStr}
          onChangeText={onChangeAmount}
          placeholder="0.00"
          placeholderTextColor={colors.t3}
          keyboardType="decimal-pad"
        />
      </View>

      {isSplit && (
        <View style={fs.allocRow}>
          <Text style={[fs.allocText, { fontSize: r(9, 11) }]}>
            allocated {Math.abs(childrenSumCents / 100).toFixed(2)}
          </Text>
          {isBalanced ? (
            <Text style={[fs.allocBalanced, { fontSize: r(9, 11) }]}>balanced</Text>
          ) : (
            <Text
              style={[
                fs.allocRemaining,
                { fontSize: r(9, 11) },
                isOver ? fs.allocOver : fs.allocUnder,
              ]}
            >
              {isOver ? `${remainingAbs.toFixed(2)} over` : `${remainingAbs.toFixed(2)} remaining`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
