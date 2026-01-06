import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PulseView } from '@/components/shared/MotiPresets';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { ANIM_APPBAR_PULSE } from '@/constants/animations';
import { formatSyncAge } from '@/utils/formatSyncAge';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.bg,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logo: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      letterSpacing: -0.3,
    },
    badge: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b0,
      borderRadius: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sync: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 3,
      paddingHorizontal: 2,
    },
    syncDot: {
      width: 6,
      height: 6,
      borderRadius: 99,
      backgroundColor: C.green,
      shadowColor: C.green,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 4,
    },
    syncDotActive: {
      backgroundColor: C.amber,
      shadowColor: C.amber,
    },
    syncDotOffline: {
      backgroundColor: C.t3,
      shadowColor: C.t3,
      shadowOpacity: 0.4,
    },
    syncText: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
    },
  });
}

interface AppBarProps {
  title?: string;
  badge?: string;
  right?: React.ReactNode;
  showSync?: boolean;
  lastSyncAt?: number | null;
  syncing?: boolean;
  onSync?: () => void;
  isOnline?: boolean;
  pendingCount?: number;
}

export function AppBar({
  title = 'ledger',
  badge,
  right,
  showSync = false,
  lastSyncAt,
  syncing,
  onSync,
  isOnline = true,
  pendingCount = 0,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const { hp, r } = useR();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!showSync || !lastSyncAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, [showSync, lastSyncAt]);

  const syncBtnScale = useSharedValue(1);
  const syncBtnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: syncBtnScale.value }],
  }));

  return (
    <View style={[styles.container, { paddingHorizontal: hp, paddingTop: insets.top + 6 }]}>
      <View style={styles.left}>
        <Text style={[styles.logo, { fontSize: r(13, 15) }]}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { fontSize: r(8, 9) }]}>{badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        {showSync && (
          <Animated.View style={syncBtnAnim}>
            <Pressable
              style={styles.sync}
              onPress={() => {
                tap();
                onSync?.();
              }}
              onPressIn={() => {
                syncBtnScale.value = withSpring(0.88, { damping: 10, stiffness: 420 });
              }}
              onPressOut={() => {
                syncBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              }}
              disabled={syncing}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <PulseView active={!!syncing} peakScale={1.6} duration={ANIM_APPBAR_PULSE}>
                <View style={[styles.syncDot, syncing && styles.syncDotActive, !isOnline && styles.syncDotOffline]} />
              </PulseView>
              {syncing && isOnline && (
                <LottieLoader animation="sync" size={14} />
              )}
              <Text style={[styles.syncText, { fontSize: r(8, 9) }]}>
                {!isOnline
                  ? pendingCount > 0
                    ? `offline (${pendingCount})`
                    : 'offline'
                  : syncing
                    ? 'syncing…'
                    : formatSyncAge(lastSyncAt ?? null)}
              </Text>
            </Pressable>
          </Animated.View>
        )}
        {right}
      </View>
    </View>
  );
}
