import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme';
import { TabButton } from './TabButton';
import {
  SECONDARY_TABS,
  TRAY_HEIGHT,
  SEPARATOR_HEIGHT,
  TRAY_STAGGER_MS,
} from './navBarConstants';

interface ExpandedTrayProps {
  expandProgress: SharedValue<number>;
  activeRoute: string;
  onTabPress: (route: string) => void;
}

export const ExpandedTray = memo(function ExpandedTray({
  expandProgress,
  activeRoute,
  onTabPress,
}: ExpandedTrayProps) {
  const { colors } = useTheme();

  // Tray container animates height + opacity based on expandProgress
  const trayStyle = useAnimatedStyle(() => {
    const totalHeight = TRAY_HEIGHT + SEPARATOR_HEIGHT;
    return {
      height: interpolate(expandProgress.value, [0, 1], [0, totalHeight], Extrapolation.CLAMP),
      opacity: interpolate(expandProgress.value, [0, 0.3], [0, 1], Extrapolation.CLAMP),
    };
  });

  // Each secondary tab icon staggers in
  const tabStyles = SECONDARY_TABS.map((_, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnimatedStyle(() => {
      const staggerOffset = i * (TRAY_STAGGER_MS / 100);
      const adjustedProgress = Math.max(0, expandProgress.value - staggerOffset * 0.1);
      return {
        opacity: interpolate(adjustedProgress, [0, 0.6], [0, 1], Extrapolation.CLAMP),
        transform: [
          {
            translateY: interpolate(
              adjustedProgress,
              [0, 0.8],
              [8, 0],
              Extrapolation.CLAMP,
            ),
          },
          {
            scale: interpolate(
              adjustedProgress,
              [0, 0.7],
              [0.85, 1],
              Extrapolation.CLAMP,
            ),
          },
        ],
      };
    });
  });

  const separatorColor = useMemo(() => colors.b1, [colors.b1]);

  return (
    <Animated.View style={[s.tray, trayStyle]}>
      <View style={s.row}>
        {SECONDARY_TABS.map((tab, i) => (
          <Animated.View key={tab.route} style={[s.tabWrap, tabStyles[i]]}>
            <TabButton
              tab={tab}
              focused={activeRoute === tab.route}
              onPress={() => onTabPress(tab.route)}
              iconSize={20}
            />
          </Animated.View>
        ))}
      </View>
      <View style={[s.separator, { backgroundColor: separatorColor }]} />
    </Animated.View>
  );
});

const s = StyleSheet.create({
  tray: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: TRAY_HEIGHT,
    alignItems: 'center',
  },
  tabWrap: {
    flex: 1,
  },
  separator: {
    height: SEPARATOR_HEIGHT,
    marginHorizontal: 16,
  },
});
