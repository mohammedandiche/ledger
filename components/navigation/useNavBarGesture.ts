import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { tap } from '@/utils/haptics';
import {
  EXPAND_SPRING,
  FLING_VELOCITY,
  DRAG_THRESHOLD,
} from './navBarConstants';

export function useNavBarGesture() {
  const expandProgress = useSharedValue(0);
  const isExpanded = useSharedValue(false);

  const fireHaptic = useCallback(() => {
    tap();
  }, []);

  const expand = useCallback(() => {
    'worklet';
    expandProgress.value = withSpring(1, EXPAND_SPRING);
    isExpanded.value = true;
    runOnJS(fireHaptic)();
  }, [expandProgress, isExpanded, fireHaptic]);

  const collapse = useCallback(() => {
    'worklet';
    expandProgress.value = withSpring(0, EXPAND_SPRING);
    isExpanded.value = false;
    runOnJS(fireHaptic)();
  }, [expandProgress, isExpanded, fireHaptic]);

  const collapseJS = useCallback(() => {
    expandProgress.value = withSpring(0, EXPAND_SPRING);
    isExpanded.value = false;
  }, [expandProgress, isExpanded]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      'worklet';
      const currentlyExpanded = isExpanded.value;
      // Map drag translation to progress. Negative Y = swipe up = expand.
      // 80pt travel gives a more natural, less twitchy feel.
      if (currentlyExpanded) {
        // When expanded, dragging down (positive) should collapse
        const progress = 1 - Math.min(Math.max(e.translationY / 80, 0), 1);
        expandProgress.value = progress;
      } else {
        // When collapsed, dragging up (negative) should expand
        const progress = Math.min(Math.max(-e.translationY / 80, 0), 1);
        expandProgress.value = progress;
      }
    })
    .onEnd((e) => {
      'worklet';
      const currentlyExpanded = isExpanded.value;

      if (currentlyExpanded) {
        // Decide: stay expanded or collapse
        if (e.velocityY > FLING_VELOCITY || e.translationY > DRAG_THRESHOLD) {
          // Fling down or dragged past threshold → collapse
          expandProgress.value = withSpring(0, EXPAND_SPRING);
          isExpanded.value = false;
          runOnJS(fireHaptic)();
        } else {
          // Snap back to expanded
          expandProgress.value = withSpring(1, EXPAND_SPRING);
        }
      } else {
        // Decide: expand or stay collapsed
        if (-e.velocityY > FLING_VELOCITY || -e.translationY > DRAG_THRESHOLD) {
          // Fling up or dragged past threshold → expand
          expandProgress.value = withSpring(1, EXPAND_SPRING);
          isExpanded.value = true;
          runOnJS(fireHaptic)();
        } else {
          // Snap back to collapsed
          expandProgress.value = withSpring(0, EXPAND_SPRING);
        }
      }
    });

  return {
    expandProgress,
    isExpanded,
    panGesture,
    expand,
    collapse,
    collapseJS,
  };
}
