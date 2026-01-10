import { memo, useRef, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import { Canvas, RoundedRect, Shadow } from '@shopify/react-native-skia';
import { tap } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { Typography } from '@/constants/tokens';
import { TAB_PRESS_MS } from './navBarConstants';

import type { TabDef } from './navBarConstants';

function SkiaGlowBar({ width, color }: { width: number; color: string }) {
  if (width <= 0) return null;
  const h = 3;
  const canvasH = h + 10;
  return (
    <Canvas style={{ width: Math.max(width, 1), height: canvasH, position: 'absolute', top: -3 }}>
      <RoundedRect x={0} y={4} width={width} height={h} r={1.5} color={color}>
        <Shadow dx={0} dy={0} blur={5} color={color} />
      </RoundedRect>
    </Canvas>
  );
}

interface TabButtonProps {
  tab: TabDef;
  focused: boolean;
  onPress: () => void;
  iconSize?: number;
}

export const TabButton = memo(function TabButton({
  tab,
  focused,
  onPress,
  iconSize = 22,
}: TabButtonProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors.amber), [colors.amber]);

  const scale = useSharedValue(1);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (focused) {
      scale.value = withSequence(
        withTiming(0.76, { duration: TAB_PRESS_MS }),
        withSpring(1, { damping: 8, stiffness: 320 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    tap();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={s.container}>
      {/* Glow bar above icon */}
      <MotiView
        animate={{ width: focused ? 22 : 0 }}
        transition={{ type: 'spring', damping: 13, stiffness: 270 }}
        style={s.glowWrap}
      >
        <SkiaGlowBar width={focused ? 22 : 0} color={colors.amber} />
      </MotiView>

      <Animated.View style={iconAnim}>
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={iconSize}
          color={focused ? colors.amber : colors.t3}
        />
      </Animated.View>

      <Animated.Text
        style={[
          s.label,
          { color: focused ? colors.amber : colors.t3 },
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
});

function styles(_amber: string) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    glowWrap: {
      position: 'absolute',
      top: 0,
      overflow: 'visible',
    },
    label: {
      fontFamily: Typography.sansB,
      fontSize: 9,
      marginTop: 2,
      letterSpacing: 0.2,
    },
  });
}
