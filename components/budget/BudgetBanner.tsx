import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { fmt } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import { MONTH_ABBREVS } from '@/utils/monthHelpers';
import { signColor } from '@/utils/amountHelpers';

export function BudgetBanner() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { toBudget, month, budgetSummary } = useBudget();
  const { availableFunds, overspentPrevMonth, forNextMonth } = budgetSummary;
  const prevMonthName = MONTH_ABBREVS[month === 1 ? 11 : month - 2];
  const toBudgetColor = signColor(toBudget, colors);

  return (
    <View style={[s.budgetBanner, { paddingHorizontal: hp }]}>
      <View style={s.budgetRow}>
        <Text style={[s.budgetRowLabel, { fontSize: r(8, 10) }]}>available funds</Text>
        <Text style={[s.budgetRowVal, { fontSize: r(10, 12) }]}>{fmt(availableFunds)}</Text>
      </View>
      <View style={s.budgetRow}>
        <Text style={[s.budgetRowLabel, { fontSize: r(8, 10) }]}>overspent in {prevMonthName}</Text>
        <Text
          style={[
            s.budgetRowVal,
            { fontSize: r(10, 12), color: overspentPrevMonth < 0 ? colors.redL : colors.t2 },
          ]}
        >
          {fmt(overspentPrevMonth)}
        </Text>
      </View>
      <View style={s.budgetRow}>
        <Text style={[s.budgetRowLabel, { fontSize: r(8, 10) }]}>budgeted</Text>
        <Text style={[s.budgetRowVal, { fontSize: r(10, 12) }]}>{fmt(-budgetSummary.budgeted)}</Text>
      </View>
      <View style={s.budgetRow}>
        <Text style={[s.budgetRowLabel, { fontSize: r(8, 10) }]}>for next month</Text>
        <Text style={[s.budgetRowVal, { fontSize: r(10, 12) }]}>{fmt(-forNextMonth)}</Text>
      </View>
      <View style={[s.budgetSep, { marginVertical: r(5, 7) }]} />
      <View style={s.budgetRow}>
        <View style={s.budgetTotalLeft}>
          <Text style={{ fontSize: r(11, 14) }}>📬</Text>
          <Text style={[s.budgetRowLabel, { fontSize: r(8, 10), color: colors.t1 }]}>to budget</Text>
        </View>
        <Text style={[s.budgetTotalVal, { fontSize: r(16, 20), color: toBudgetColor }]}>{fmt(toBudget)}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    budgetBanner: {
      paddingVertical: 8,
      backgroundColor: C.amberBg,
      borderBottomWidth: 1,
      borderBottomColor: C.b1,
    },
    budgetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 1,
    },
    budgetRowLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
    },
    budgetRowVal: {
      fontFamily: 'OverpassMono_500Medium',
      color: C.t2,
      textAlign: 'right',
    },
    budgetSep: {
      height: 1,
      backgroundColor: C.b1,
    },
    budgetTotalLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    budgetTotalVal: {
      fontFamily: 'NunitoSans_900Black',
      letterSpacing: -0.5,
    },
  });
}
