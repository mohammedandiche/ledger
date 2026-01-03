import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  ANIM_SPLASH_SCALE,
  ANIM_SPLASH_FADE_DELAY,
  ANIM_SPLASH_FADE,
} from '@/constants/animations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ICON = require('@/assets/icon.png') as number;
const BG_COLOR = '#110E09';

interface AnimatedSplashProps {
  ready: boolean;
  onFinish: () => void;
}

export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;

    scale.value = withTiming(
      1.1,
      { duration: ANIM_SPLASH_SCALE, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(onFinish)();
      },
    );

    opacity.value = withDelay(
      ANIM_SPLASH_FADE_DELAY,
      withTiming(0, {
        duration: ANIM_SPLASH_FADE,
        easing: Easing.in(Easing.cubic),
      }),
    );
  }, [ready]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={iconStyle}>
        <Image source={ICON} style={styles.icon} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
});
