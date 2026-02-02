import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';

export function makeFormStyles(C: ThemeColors) {
  return StyleSheet.create({
    formRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    formLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 6,
    },

    input: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t0,
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b0,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },

    pickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b0,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 10,
      minHeight: 44,
    },
    pickerText: { fontFamily: 'NunitoSans_700Bold', color: C.t0 },
    pickerPlaceholder: { color: C.t3 },
    pickerArrow: { fontFamily: 'OverpassMono_400Regular', color: C.t2 },

    suggestions: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 6,
      marginTop: 4,
      maxHeight: 220,
      overflow: 'hidden',
    },
    suggestionRow: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      minHeight: 44,
      justifyContent: 'center',
    },
    suggestionText: { fontFamily: 'NunitoSans_600SemiBold', color: C.t1 },

    clearedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: C.t3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: C.amberBg, borderColor: C.amber },
    checkmark: {
      fontFamily: 'NunitoSans_800ExtraBold',
      fontSize: 14,
      color: C.amber,
      marginTop: -1,
    },
    clearedText: { fontFamily: 'NunitoSans_700Bold', color: C.t1 },

    modalRow: {
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      minHeight: 44,
      justifyContent: 'center',
    },

    catGroup: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      paddingTop: 12,
      paddingBottom: 4,
    },
    catName: { fontFamily: 'NunitoSans_700Bold', color: C.t0 },

    feedback: { paddingTop: 8 },
    feedbackError: { fontFamily: 'OverpassMono_400Regular', color: C.redL },
    feedbackOk: { fontFamily: 'OverpassMono_400Regular', color: C.green },

    saveBtn: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amber,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    actionArea: { paddingTop: 20 },

    disabled: { opacity: 0.5 },

    amountSection: {
      paddingTop: 16,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.s0,
    },
    amountLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 6,
    },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flowToggle: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    flowOut: { backgroundColor: C.redBg, borderColor: C.redBorder },
    flowIn: { backgroundColor: C.greenBg, borderColor: C.greenBorder },
    flowToggleText: { fontFamily: 'NunitoSans_800ExtraBold', color: C.t0 },
    amountInput: {
      flex: 1,
      fontFamily: 'NunitoSans_900Black',
      color: C.t0,
      letterSpacing: -1,
      padding: 0,
    },

    allocRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    allocText: { fontFamily: 'OverpassMono_400Regular', color: C.t3 },
    allocRemaining: { fontFamily: 'OverpassMono_600SemiBold' },
    allocUnder: { color: C.amber },
    allocOver: { color: C.redL },
    allocBalanced: { fontFamily: 'OverpassMono_600SemiBold', color: C.green },

    splitCard: {
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b0,
      borderRadius: 10,
      padding: 14,
      marginTop: 12,
    },
    splitCardRow: { flexDirection: 'row', gap: 10 },
    splitCardLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 4,
    },
    splitAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    splitFlowBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    splitFlowText: { fontFamily: 'NunitoSans_800ExtraBold', color: C.t0 },
    splitDeleteBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
    splitDeleteText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.redL,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    addSplitInline: {
      alignItems: 'center',
      marginTop: 10,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 8,
      borderStyle: 'dashed',
    },
    addSplitInlineText: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    statusPills: { flexDirection: 'row', gap: 8 },
    statusPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.b1,
      backgroundColor: C.s2,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    statusPillOn: { backgroundColor: C.redBg, borderColor: C.redBorder },
    statusPillOnGreen: { backgroundColor: C.greenBg, borderColor: C.greenBorder },
    statusPillText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    statusPillTextOn: { color: C.redL },
    statusPillTextOnGreen: { color: C.greenL },

    reconcBadge: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
    },
    reconcBadgeText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    dpTodayBtn: {
      alignSelf: 'center',
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 6,
      paddingHorizontal: 22,
      paddingVertical: 7,
      marginBottom: 14,
    },
    dpTodayText: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dpWheelsWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      marginBottom: 16,
    },
    dpSelectionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: C.amberBg,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: C.b2,
      zIndex: 1,
    },
    dpFadeOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 2 },
    dpSep: { fontFamily: 'OverpassMono_600SemiBold', color: C.t3, marginHorizontal: 2, zIndex: 3 },
    dpWheelItem: { justifyContent: 'center', alignItems: 'center' },
    dpWheelText: {
      fontFamily: 'NunitoSans_600SemiBold',
      fontSize: 15,
      color: C.t3,
      textAlign: 'center',
    },
    dpWheelTextSel: { fontFamily: 'NunitoSans_800ExtraBold', fontSize: 19, color: C.t0 },
    dpConfirmBtn: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amber,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    dpConfirmText: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
  });
}

export function useFormStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeFormStyles(colors), [colors]);
}

// todayInt is re-exported from dbMappers to avoid duplication.
export { todayInt } from '@/utils/dbMappers';

export function formatDateInt(d: number): string {
  const s = String(d).padStart(8, '0');
  const yr = s.slice(0, 4);
  const mon = parseInt(s.slice(4, 6), 10);
  const day = parseInt(s.slice(6, 8), 10);
  const MONTHS = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];
  return `${day} ${MONTHS[mon - 1]} ${yr}`;
}

export function parseDateInput(s: string): number | null {
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  const yr = parseInt(m[3], 10);
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  // Reject impossible dates like Feb 30 by round-tripping through Date
  const probe = new Date(yr, mon - 1, day);
  if (probe.getFullYear() !== yr || probe.getMonth() !== mon - 1 || probe.getDate() !== day) {
    return null;
  }
  return yr * 10000 + mon * 100 + day;
}
