import { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { TabButton } from './TabButton';
import { AddButton } from './AddButton';
import { ExpandedTray } from './ExpandedTray';
import { useNavBarGesture } from './useNavBarGesture';
import {
  PRIMARY_TABS,
  ADD_ROUTE,
  BAR_HEIGHT,
  HANDLE_WIDTH,
  HANDLE_HEIGHT,
  COLLAPSE_DELAY_MS,
} from './navBarConstants';

export function CustomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { expandProgress, panGesture, collapseJS } = useNavBarGesture();

  const activeRoute = state.routes[state.index].name;

  const navigateTo = useCallback(
    (route: string) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes.find((r) => r.name === route)?.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(route);
      }
    },
    [navigation, state.routes],
  );

  const handleSecondaryPress = useCallback(
    (route: string) => {
      navigateTo(route);
      // Auto-collapse after a brief delay
      setTimeout(collapseJS, COLLAPSE_DELAY_MS);
    },
    [navigateTo, collapseJS],
  );

  // Animate the drag handle opacity based on expand state
  const handleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.5], [0.35, 0.6], Extrapolation.CLAMP),
  }));

  return (
    <View style={[s.wrapper, { paddingBottom: insets.bottom }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={s.barOuter}>
          {/* Drag handle */}
          <Animated.View style={[s.handle, { backgroundColor: colors.t3 }, handleStyle]} />

          {/* Expanded tray (secondary tabs) */}
          <ExpandedTray
            expandProgress={expandProgress}
            activeRoute={activeRoute}
            onTabPress={handleSecondaryPress}
          />

          {/* Primary row: Budget — Add FAB — Ledger */}
          <View style={s.primaryRow}>
            <TabButton
              tab={PRIMARY_TABS[0]}
              focused={activeRoute === PRIMARY_TABS[0].route}
              onPress={() => navigateTo(PRIMARY_TABS[0].route)}
            />

            <AddButton
              focused={activeRoute === ADD_ROUTE}
              onPress={() => navigateTo(ADD_ROUTE)}
            />

            <TabButton
              tab={PRIMARY_TABS[1]}
              focused={activeRoute === PRIMARY_TABS[1].route}
              onPress={() => navigateTo(PRIMARY_TABS[1].route)}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: C.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.b1,
    },
    barOuter: {
      overflow: 'hidden',
    },
    handle: {
      width: HANDLE_WIDTH,
      height: HANDLE_HEIGHT,
      borderRadius: HANDLE_HEIGHT / 2,
      alignSelf: 'center',
      marginTop: 8,
    },
    primaryRow: {
      flexDirection: 'row',
      height: BAR_HEIGHT,
      alignItems: 'center',
    },
  });
}
