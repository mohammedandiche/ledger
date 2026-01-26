import { memo } from 'react';
import { View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/theme';
import type { EnvelopeRow } from '@/constants/types';
import { EnvRow } from './EnvRow';
import { SETTLE_TIMING } from './dragHelpers';
import type { CatDragState } from './dragHelpers';

export interface DraggableCatItemProps {
  env: EnvelopeRow;
  catIdx: number;
  groupIdx: number;
  isIncome: boolean;
  catDrag: CatDragState;
  onCatGrabStart: (groupIdx: number, catIdx: number) => void;
  onCatGrabEnd: (fromGi: number, fromCi: number, toGi: number, toCi: number) => void;
  onMeasureCat: (groupIdx: number, catIdx: number, height: number) => void;
  onEditBudget: (id: string, name: string, amountCents: number) => void;
  onTapActivity: (id: string, name: string) => void;
  onTapBalance: (env: EnvelopeRow) => void;
  onLongPress?: (env: EnvelopeRow) => void;
}

export const DraggableCatItem = memo(function DraggableCatItem({
  env,
  catIdx,
  groupIdx,
  isIncome,
  catDrag,
  onCatGrabStart,
  onCatGrabEnd,
  onMeasureCat,
  onEditBudget,
  onTapActivity,
  onTapBalance,
  onLongPress,
}: DraggableCatItemProps) {
  const { colors } = useTheme();

  const animStyle = useAnimatedStyle(() => {
    if (!catDrag.active.value) {
      // Fade back to full opacity when drag ends (smooth for the previously-greyed item)
      return { opacity: withTiming(1, SETTLE_TIMING), transform: [{ translateY: 0 }] };
    }
    if (catDrag.fromGroupIdx.value === groupIdx && catDrag.fromCatIdx.value === catIdx) {
      // Grey out the row being moved — it stays in place, insertion line shows target
      return { opacity: 0.35, transform: [{ translateY: 0 }] };
    }
    // Non-dragged items stay put; the amber insertion line is the only visual cue
    return { opacity: 1, transform: [{ translateY: 0 }] };
  }, [groupIdx, catIdx]);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      if (catDrag.groupActiveIdx.value !== -1) return; // blocked during group drag

      catDrag.scrollOffsetAtDragStart.value = catDrag.scrollOffset.value;
      catDrag.fromGroupIdx.value = groupIdx;
      catDrag.fromCatIdx.value = catIdx;
      catDrag.targetGroupIdx.value = groupIdx;
      catDrag.targetCatIdx.value = catIdx;
      catDrag.dragY.value = 0;
      catDrag.active.value = true;

      runOnJS(onCatGrabStart)(groupIdx, catIdx);
    })
    .onUpdate((e) => {
      'worklet';
      if (!catDrag.active.value) return;
      catDrag.dragY.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      if (!catDrag.active.value) return;
      // Capture targets before clearing — JS callback will clear catDrag.active
      // after state update to avoid the flash where items snap before re-render.
      const fromG = catDrag.fromGroupIdx.value;
      const fromI = catDrag.fromCatIdx.value;
      const toG = catDrag.targetGroupIdx.value;
      const toI = catDrag.targetCatIdx.value;
      catDrag.dragY.value = 0;
      runOnJS(onCatGrabEnd)(fromG, fromI, toG, toI);
    })
    .onFinalize(() => {
      'worklet';
      // Safety reset if the gesture is cancelled before onEnd fires
      if (
        catDrag.active.value &&
        catDrag.fromGroupIdx.value === groupIdx &&
        catDrag.fromCatIdx.value === catIdx
      ) {
        catDrag.active.value = false;
        catDrag.dragY.value = 0;
        // Notify JS thread to reset isDraggingCatRef (same from/to = no-op move)
        runOnJS(onCatGrabEnd)(groupIdx, catIdx, groupIdx, catIdx);
      }
    });

  const dragHandle = isIncome ? undefined : (
    <GestureDetector gesture={panGesture}>
      <View
        style={{ width: 38, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      >
        <View style={{ gap: 3.5 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{ width: 14, height: 1.5, borderRadius: 1, backgroundColor: colors.t3 }}
            />
          ))}
        </View>
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      style={animStyle}
      onLayout={(e) => onMeasureCat(groupIdx, catIdx, e.nativeEvent.layout.height)}
    >
      <EnvRow
        env={env}
        isIncome={isIncome}
        onEditBudget={onEditBudget}
        onTapActivity={onTapActivity}
        onTapBalance={onTapBalance}
        onLongPress={onLongPress}
        dragHandle={dragHandle}
      />
    </Animated.View>
  );
});
