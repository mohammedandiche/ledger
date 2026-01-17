import { ViewStyle, TextStyle } from 'react-native';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';

export interface SettingsStyleBase {
  // Action button row
  btnRow: ViewStyle;
  btn: ViewStyle;
  btnSecondary: ViewStyle;
  btnTextSecondary: TextStyle;
  // Budget file rows
  fileRow: ViewStyle;
  fileRowActive: ViewStyle;
  fileRadio: ViewStyle;
  fileRadioActive: ViewStyle;
  fileInfo: ViewStyle;
  fileName: TextStyle;
  fileNameActive: TextStyle;
  fileId: TextStyle;
  activeTag: TextStyle;
  // Envelope-only notice
  envelopeNote: ViewStyle;
  envelopeNoteText: TextStyle;
  // Disabled file row (encrypted / unsupported)
  fileRowDisabled: ViewStyle;
  fileNameDisabled: TextStyle;
  disabledTag: TextStyle;
  // Empty / error states
  emptyNote: ViewStyle;
  emptyNoteText: TextStyle;
  errorRow: ViewStyle;
  errorText: TextStyle;
}

export function settingsStyleBase(C: ThemeColors): SettingsStyleBase {
  return {
    btnRow: {
      paddingVertical: 8,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    btn: {
      backgroundColor: C.amberBg2,
      borderWidth: 1,
      borderColor: C.b2,
      borderRadius: Radius.sm,
      paddingVertical: 9,
      alignItems: 'center',
    },
    btnSecondary: {
      backgroundColor: C.s2,
      borderColor: C.bw,
    },
    btnTextSecondary: {
      fontFamily: Typography.mono,
      letterSpacing: 0.5,
      color: C.t2,
    },

    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.s1,
      gap: 10,
    },
    fileRowActive: {
      backgroundColor: C.amberBg,
    },
    fileRadio: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: C.t4,
      flexShrink: 0,
    },
    fileRadioActive: {
      borderColor: C.amber,
      backgroundColor: C.amber,
    },
    fileInfo: { flex: 1, minWidth: 0 },
    fileName: {
      fontFamily: Typography.sansBB,
      color: C.t1,
    },
    fileNameActive: { color: C.t0 },
    fileId: {
      fontFamily: Typography.mono,
      color: C.t4,
      marginTop: 1,
    },
    activeTag: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.amber,
      flexShrink: 0,
    },

    envelopeNote: {
      paddingVertical: 6,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    envelopeNoteText: {
      fontFamily: Typography.mono,
      letterSpacing: 0.3,
      color: C.t3,
      fontStyle: 'italic',
    },

    fileRowDisabled: {
      opacity: 0.45,
    },
    fileNameDisabled: {
      color: C.t4,
    },
    disabledTag: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.t4,
      flexShrink: 0,
    },

    emptyNote: {
      paddingVertical: 16,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      alignItems: 'flex-start',
    },
    emptyNoteText: {
      fontFamily: Typography.mono,
      color: C.t3,
    },
    errorRow: {
      paddingVertical: 8,
      backgroundColor: C.redBg,
      borderTopWidth: 1,
      borderTopColor: C.redBorder,
      borderBottomWidth: 1,
      borderBottomColor: C.redBorder,
    },
    errorText: {
      fontFamily: Typography.mono,
      color: C.redL,
      lineHeight: 17,
    },
  };
}
