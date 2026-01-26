import { memo, useCallback } from 'react';
import { View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/theme';
import type { BudgetGroup, EnvelopeRow } from '@/constants/types';
import { Group } from './EnvRow';
import { DraggableCatItem } from './DraggableCatItem';
import { computeGroupTarget, groupItemShift, SHIFT_TIMING, SETTLE_TIMING } from './dragHelpers';
import type { CatDragState } from './dragHelpers';

export interface DraggableGroupItemProps {
  group: BudgetGroup;
  index: number;
  // Group drag
  activeIdx: SharedValue<number>;
  dragY: SharedValue<number>;
  toIdx: SharedValue<number>;
  heights: SharedValue<number[]>;
  onMeasure: (idx: number, height: number) => void;
  onMeasureGroupHeader: (idx: number, height: number) => void;
  onGrabStart: (idx: number) => void;
  onGrabEnd: (from: number, to: number) => void;
  forceCollapsed?: boolean;
  // Category drag
  catDrag: CatDragState;
  onCatGrabStart: (groupIdx: number, catIdx: number) => void;
  onCatGrabEnd: (fromGi: number, fromCi: number, toGi: number, toCi: number) => void;
  onMeasureCat: (groupIdx: number, catIdx: number, height: number) => void;
  // Row callbacks
  onEditBudget: (id: string, name: string, amountCents: number) => void;
  onTapActivity: (id: string, name: string) => void;
  onTapBalance: (env: EnvelopeRow) => void;
  onLongPress: (g: BudgetGroup) => void;
  onLongPressEnv: (env: EnvelopeRow, g: BudgetGroup) => void;
}

export const DraggableGroupItem = memo(function DraggableGroupItem({
  group,
  index,
  activeIdx,
  dragY,
  toIdx,
  heights,
  onMeasure,
  onMeasureGroupHeader,
  onGrabStart,
  onGrabEnd,
  forceCollapsed,
  catDrag,
  onCatGrabStart,
  onCatGrabEnd,
  onMeasureCat,
  onEditBudget,
  onTapActivity,
  onTapBalance,
  onLongPress,
  onLongPressEnv,
}: DraggableGroupItemProps) {
  const { colors } = useTheme();

  const easeOut = Easing.out(Easing.cubic);

  const animStyle = useAnimatedStyle(() => {
    if (activeIdx.value === -1) {
      return {
        opacity: 1,
        transform: [{ translateY: withTiming(0, { ...SETTLE_TIMING, easing: easeOut }) }],
      };
    }
    if (activeIdx.value === index) {
      // Grey out the group being moved — it stays in place, others shift around it
      return { opacity: 0.35, transform: [{ translateY: 0 }] };
    }
    const shift = groupItemShift(index, activeIdx.value, toIdx.value, heights.value);
    return {
      opacity: 1,
      transform: [{ translateY: withTiming(shift, { ...SHIFT_TIMING, easing: easeOut }) }],
    };
  }, [index]);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      // Set toIdx BEFORE activeIdx so animated styles never see a stale toIdx
      toIdx.value = index;
      activeIdx.value = index;
      catDrag.scrollOffsetAtDragStart.value = catDrag.scrollOffset.value;
      runOnJS(onGrabStart)(index);
    })
    .onUpdate((e) => {
      'worklet';
      dragY.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const to = computeGroupTarget(index, dragY.value, heights.value);
      // Don't clear activeIdx here — let the JS callback (handleGroupGrabEnd)
      // reorder state first, THEN clear activeIdx to avoid a flash where items
      // snap to translateY:0 before the list re-renders in the new order.
      dragY.value = 0;
      runOnJS(onGrabEnd)(index, to);
    })
    .onFinalize(() => {
      'worklet';
      if (activeIdx.value === index) {
        activeIdx.value = -1;
        dragY.value = 0;
        // Notify JS thread to reset isDraggingGroupRef (from === to means no reorder)
        runOnJS(onGrabEnd)(index, index);
      }
    });

  const groupDragHandle = (
    <GestureDetector gesture={panGesture}>
      <View
        style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
      >
        <View style={{ gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{ width: 16, height: 1.5, borderRadius: 1, backgroundColor: colors.t3 }}
            />
          ))}
        </View>
      </View>
    </GestureDetector>
  );

  const renderCategoryItems = useCallback(
    (envelopes: EnvelopeRow[], collapsed: boolean) => {
      if (collapsed) return null;
      return envelopes.map((env, catIdx) => (
        <DraggableCatItem
          key={env.id}
          env={env}
          catIdx={catIdx}
          groupIdx={index}
          isIncome={group.isIncome}
          catDrag={catDrag}
          onCatGrabStart={onCatGrabStart}
          onCatGrabEnd={onCatGrabEnd}
          onMeasureCat={onMeasureCat}
          onEditBudget={onEditBudget}
          onTapActivity={onTapActivity}
          onTapBalance={onTapBalance}
          onLongPress={(env) => onLongPressEnv(env, group)}
        />
      ));
    },
    [
      index, group, catDrag,
      onCatGrabStart, onCatGrabEnd, onMeasureCat,
      onEditBudget, onTapActivity, onTapBalance, onLongPressEnv,
    ],
  );

  return (
    <Animated.View
      style={animStyle}
      onLayout={(e) => onMeasure(index, e.nativeEvent.layout.height)}
    >
      <Group
        group={group}
        onEditBudget={onEditBudget}
        onTapActivity={onTapActivity}
        onTapBalance={onTapBalance}
        onLongPress={onLongPress}
        dragHandle={groupDragHandle}
        renderEnvelopes={renderCategoryItems}
        forceCollapsed={forceCollapsed}
        onMeasureHeader={(h) => onMeasureGroupHeader(index, h)}
      />
    </Animated.View>
  );
});
