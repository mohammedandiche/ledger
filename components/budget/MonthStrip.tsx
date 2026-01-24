import { View, Text, StyleSheet, Pressable, LayoutAnimation } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useBudget } from '@/contexts/budget';
import { ANIM_BUDGET_SPRING } from '@/constants/animations';

const MONTH_GRID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const TODAY_Y = new Date().getFullYear();
const TODAY_M = new Date().getMonth() + 1;

const ANIM_CONFIG = {
  duration: ANIM_BUDGET_SPRING,
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
} as const;

export function MonthStrip() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { year, month, monthLabel, prevMonth, nextMonth, goToMonth } = useBudget();
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  const isToday = year === TODAY_Y && month === TODAY_M;

  const handleLabelPress = useCallback(() => {
    LayoutAnimation.configureNext(ANIM_CONFIG);
    setPickerYear(year);
    setOpen((o) => !o);
  }, [year]);

  const handlePrev = useCallback(() => {
    LayoutAnimation.configureNext(ANIM_CONFIG);
    prevMonth();
  }, [prevMonth]);

  const handleNext = useCallback(() => {
    LayoutAnimation.configureNext(ANIM_CONFIG);
    nextMonth();
  }, [nextMonth]);

  const handleMonthSelect = useCallback(
    (m: number) => {
      LayoutAnimation.configureNext(ANIM_CONFIG);
      goToMonth(pickerYear, m);
      setOpen(false);
    },
    [pickerYear, goToMonth],
  );

  const handleToday = useCallback(() => {
    LayoutAnimation.configureNext(ANIM_CONFIG);
    goToMonth(TODAY_Y, TODAY_M);
    setOpen(false);
  }, [goToMonth]);

  return (
    <View>
      <View style={[s.monthStrip, { paddingHorizontal: hp }]}>
        <Pressable onPress={handlePrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.monthBtn, { fontSize: r(11, 14) }]}>‹</Text>
        </Pressable>

        <Pressable onPress={handleLabelPress} style={s.monthLabelBtn}>
          <Text style={[s.monthLabel, { fontSize: r(13, 15) }]}>{monthLabel}</Text>
          <Text style={[s.monthChevron, { fontSize: r(9, 11) }]}>{open ? '▴' : '▾'}</Text>
        </Pressable>

        <Pressable onPress={handleNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.monthBtn, { fontSize: r(11, 14) }]}>›</Text>
        </Pressable>
      </View>

      {open && (
        <View style={[s.picker, { paddingHorizontal: hp }]}>
          <View style={s.pickerYearRow}>
            <Pressable onPress={() => setPickerYear((y) => y - 1)} hitSlop={10}>
              <Text style={[s.pickerYearBtn, { fontSize: r(12, 14) }]}>‹</Text>
            </Pressable>
            <Text style={[s.pickerYear, { fontSize: r(14, 16) }]}>{pickerYear}</Text>
            <Pressable onPress={() => setPickerYear((y) => y + 1)} hitSlop={10}>
              <Text style={[s.pickerYearBtn, { fontSize: r(12, 14) }]}>›</Text>
            </Pressable>
          </View>

          <View style={s.pickerGrid}>
            {MONTH_GRID.map((label, i) => {
              const m = i + 1;
              const isSelected = pickerYear === year && m === month;
              const isCurrent = pickerYear === TODAY_Y && m === TODAY_M;
              return (
                <Pressable
                  key={label}
                  style={[
                    s.pickerCell,
                    isSelected && s.pickerCellSelected,
                    isCurrent && !isSelected && s.pickerCellToday,
                  ]}
                  onPress={() => handleMonthSelect(m)}
                >
                  <Text
                    style={[
                      s.pickerCellText,
                      { fontSize: r(11, 13) },
                      isSelected && s.pickerCellTextSelected,
                      isCurrent && !isSelected && s.pickerCellTextToday,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!isToday && (
            <Pressable onPress={handleToday} style={s.pickerTodayBtn}>
              <Text style={[s.pickerTodayText, { fontSize: r(10, 12) }]}>Go to today</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    monthStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.s0,
    },
    monthBtn: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      width: 44,
      minHeight: 44,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 44,
    },
    monthLabelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthLabel: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t1,
      letterSpacing: -0.1,
    },
    monthChevron: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
    },
    picker: {
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b1,
      paddingVertical: 10,
    },
    pickerYearRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
      marginBottom: 10,
    },
    pickerYearBtn: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      width: 32,
      textAlign: 'center',
    },
    pickerYear: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t1,
    },
    pickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    pickerCell: {
      width: '25%',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 6,
    },
    pickerCellSelected: {
      backgroundColor: C.amberBg2,
    },
    pickerCellToday: {
      backgroundColor: C.bw2,
    },
    pickerCellText: {
      fontFamily: 'OverpassMono_500Medium',
      color: C.t2,
    },
    pickerCellTextSelected: {
      color: C.amber,
      fontFamily: 'OverpassMono_700Bold',
    },
    pickerCellTextToday: {
      color: C.t1,
    },
    pickerTodayBtn: {
      alignSelf: 'center',
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 4,
      backgroundColor: C.amberBg,
    },
    pickerTodayText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
