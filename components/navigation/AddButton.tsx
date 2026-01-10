import { memo, useRef, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Canvas, Circle, Shadow } from '@shopify/react-native-skia';
import { tapMedium } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { FAB_SIZE, TAB_PRESS_MS } from './navBarConstants';

interface AddButtonProps {
  focused: boolean;
  onPress: () => void;
}

export const AddButton = memo(function AddButton({ focused, onPress }: AddButtonProps) {
  const { colors } = useTheme();

  const scale = useSharedValue(focused ? 1.08 : 1);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (focused) {
      scale.value = withSequence(
        withTiming(0.82, { duration: TAB_PRESS_MS }),
        withSpring(1.08, { damping: 8, stiffness: 300 }),
      );
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    tapMedium();
    onPress();
  };

  const glowRadius = FAB_SIZE / 2 + 6;
  const canvasSize = glowRadius * 2 + 12;

  return (
    <Pressable onPress={handlePress} style={s.container}>
      {/* Skia ambient glow ring behind the FAB */}
      <Canvas style={[s.glowCanvas, { width: canvasSize, height: canvasSize }]}>
        <Circle
          cx={canvasSize / 2}
          cy={canvasSize / 2}
          r={glowRadius}
          color="transparent"
        >
          <Shadow dx={0} dy={0} blur={12} color={colors.amber} />
        </Circle>
      </Canvas>

      <Animated.View style={[s.fab, { backgroundColor: colors.amber }, animStyle]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Animated.View>

      <Animated.Text style={[s.label, { color: focused ? colors.amber : colors.t3 }]}>
        Add
      </Animated.Text>
    </Pressable>
  );
});

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    width: FAB_SIZE + 24,
  },
  glowCanvas: {
    position: 'absolute',
    top: -(FAB_SIZE / 2 + 6 + 6 - FAB_SIZE / 2 - 4),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
