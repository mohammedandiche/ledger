import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/constants/tokens';

export function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    handleBar: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, backgroundColor: C.s0 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.t4, opacity: 0.6 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      backgroundColor: C.s0,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    headerTitle: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    headerClose: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    deleteArea: { paddingTop: 12 },
    deleteBtn: {
      backgroundColor: C.redBg,
      borderWidth: 1,
      borderColor: C.redBorder,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    deleteBtnText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.redL,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    unrecBtn: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    unrecBtnText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
