import { useCallback, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  scrollTo,
  useAnimatedRef,
} from 'react-native-reanimated';
import type Animated from 'react-native-reanimated';

const OFFSCREEN = 600;
const EXIT_MS = 240;
const EASE_OUT = Easing.in(Easing.cubic);

const ENTER_SPRING = { damping: 24, stiffness: 280, mass: 0.9 };
const SNAP_SPRING = { damping: 28, stiffness: 400, mass: 0.8 };

export function useBottomSheet(onDismiss: () => void) {
  const cbRef = useRef(onDismiss);
  cbRef.current = onDismiss;

  const translateY = useSharedValue(OFFSCREEN);
  const overlayOpacity = useSharedValue(0);

  const scrollY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const hasScrollChild = useSharedValue(false);
  const dragOffset = useSharedValue(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeRef = useRef<any>(null);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const fireDismiss = useCallback(() => {
    cbRef.current();
  }, []);

  const open = useCallback(() => {
    translateY.value = OFFSCREEN;
    overlayOpacity.value = 0;
    scrollY.value = 0;
    isDragging.value = false;
    translateY.value = withSpring(0, ENTER_SPRING);
    overlayOpacity.value = withTiming(1, { duration: 300 });
  }, [translateY, overlayOpacity, scrollY, isDragging]);

  const close = useCallback(
    (cb?: () => void) => {
      const fn = cb ?? fireDismiss;
      translateY.value = withTiming(OFFSCREEN, { duration: EXIT_MS, easing: EASE_OUT });
      overlayOpacity.value = withTiming(
        0,
        { duration: EXIT_MS, easing: EASE_OUT },
        (fin) => {
          'worklet';
          if (fin) runOnJS(fn)();
        },
      );
    },
    [translateY, overlayOpacity, fireDismiss],
  );

  const panGesture = Gesture.Pan()
    .withRef(panRef)
    .simultaneousWithExternalGesture(nativeRef)
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onStart(() => {
      'worklet';
      isDragging.value = false;
      dragOffset.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const atTop = scrollY.value <= 0;
      const pullingDown = e.translationY > 0;

      if (atTop && pullingDown && !isDragging.value) {
        isDragging.value = true;
        // Capture current translationY for smooth scroll-to-drag transition
        dragOffset.value = e.translationY;
      }

      if (isDragging.value) {
        const ty = Math.max(0, e.translationY - dragOffset.value);
        translateY.value = ty;
        overlayOpacity.value = 1 - Math.min(ty / OFFSCREEN, 1);
        if (hasScrollChild.value) {
          scrollTo(scrollRef, 0, 0, false);
        }
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isDragging.value) {
        isDragging.value = false;
        const effectiveTranslation = e.translationY - dragOffset.value;
        if (effectiveTranslation > 80 || e.velocityY > 500) {
          translateY.value = withTiming(OFFSCREEN, { duration: EXIT_MS, easing: EASE_OUT });
          overlayOpacity.value = withTiming(
            0,
            { duration: EXIT_MS, easing: EASE_OUT },
            (fin) => {
              'worklet';
              if (fin) runOnJS(fireDismiss)();
            },
          );
        } else {
          translateY.value = withSpring(0, SNAP_SPRING);
          overlayOpacity.value = withSpring(1, SNAP_SPRING);
        }
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return {
    open,
    close,
    panGesture,
    panRef,
    nativeRef,
    scrollY,
    scrollRef,
    hasScrollChild,
    sheetStyle,
    overlayStyle,
  };
}
