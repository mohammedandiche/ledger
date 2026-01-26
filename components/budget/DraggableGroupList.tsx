import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';
import { tap, tapMedium, select } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import type { BudgetGroup, EnvelopeRow } from '@/constants/types';
import { DraggableGroupItem } from './DraggableGroupItem';
import { computeGroupTarget, computeCatTarget, computeInsertionY, GROUP_HEADER_H, INDICATOR_TIMING } from './dragHelpers';
import type { CatDragState } from './dragHelpers';

export interface DraggableGroupListProps {
  groups: BudgetGroup[];
  onReorder: (newIds: string[]) => void;
  onReorderCategories: (orderedIds: string[]) => void;
  onMoveCategoryToGroup: (catId: string, newGroupId: string, orderedIds: string[]) => void;
  onEditBudget: (id: string, name: string, amountCents: number) => void;
  onTapActivity: (id: string, name: string) => void;
  onTapBalance: (env: EnvelopeRow) => void;
  onLongPressGroup: (group: BudgetGroup) => void;
  onLongPressEnv: (env: EnvelopeRow, group: BudgetGroup) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  scrollRef?: AnimatedRef<Animated.ScrollView>;
  scrollOffset?: SharedValue<number>;
  containerHeight?: number;
}

export const DraggableGroupList = memo(function DraggableGroupList({
  groups,
  onReorder,
  onReorderCategories,
  onMoveCategoryToGroup,
  onEditBudget,
  onTapActivity,
  onTapBalance,
  onLongPressGroup,
  onLongPressEnv,
  onDragStateChange,
  scrollRef,
  scrollOffset: scrollOffsetProp,
  containerHeight,
}: DraggableGroupListProps) {
  const { colors } = useTheme();
  const [localGroups, setLocalGroups] = useState(groups);
  const localGroupsRef = useRef(localGroups);
  localGroupsRef.current = localGroups;

  const isDraggingGroupRef = useRef(false);
  const isDraggingCatRef = useRef(false);
  const [groupDragActive, setGroupDragActive] = useState(false);

  const activeIdx = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const toIdx = useSharedValue(-1);
  const heights = useSharedValue<number[]>(groups.map(() => 60));
  const groupHeaderHeights = useSharedValue<number[]>(groups.map(() => GROUP_HEADER_H));

  const catActive = useSharedValue(false);
  const catFromGroupIdx = useSharedValue(-1);
  const catFromCatIdx = useSharedValue(-1);
  const catDragY = useSharedValue(0);
  const catTargetGroupIdx = useSharedValue(-1);
  const catTargetCatIdx = useSharedValue(-1);
  const catHeightsAll = useSharedValue<number[][]>(groups.map(() => []));
  const groupCount = useSharedValue(groups.length);

  const scrollOffsetFallback = useSharedValue(0);
  const effectiveScrollOffset = scrollOffsetProp ?? scrollOffsetFallback;
  const scrollOffsetAtDragStart = useSharedValue(0);

  // Stable CatDragState (shared values have stable identity across renders)
  const catDragRef = useRef<CatDragState>({
    active: catActive,
    fromGroupIdx: catFromGroupIdx,
    fromCatIdx: catFromCatIdx,
    dragY: catDragY,
    targetGroupIdx: catTargetGroupIdx,
    targetCatIdx: catTargetCatIdx,
    catHeightsAll,
    groupHeights: heights,
    groupHeaderHeights,
    groupActiveIdx: activeIdx,
    scrollOffset: effectiveScrollOffset,
    scrollOffsetAtDragStart,
  });

  // Sync from parent when groups change externally, but not mid-drag
  useEffect(() => {
    if (!isDraggingGroupRef.current && !isDraggingCatRef.current) setLocalGroups(groups);
  }, [groups]);

  useEffect(() => {
    groupCount.value = groups.length;
  }, [groups.length, groupCount]);

  const selectionHaptic = useCallback(() => { select(); }, []);

  useAnimatedReaction(
    () => {
      if (activeIdx.value === -1) return -1;
      const scrollDelta = effectiveScrollOffset.value - scrollOffsetAtDragStart.value;
      const totalDy = dragY.value + scrollDelta;
      // No finger movement → keep target at origin (prevents shifts on drag start)
      if (totalDy === 0) return activeIdx.value;
      return computeGroupTarget(activeIdx.value, totalDy, heights.value);
    },
    (cur, prev) => {
      toIdx.value = cur;
      if (cur !== prev && prev !== null && cur !== -1 && prev !== -1) runOnJS(selectionHaptic)();
    },
  );

  useAnimatedReaction(
    () => {
      if (!catActive.value) return { groupIdx: -1, catIdx: -1 };
      const scrollDelta = effectiveScrollOffset.value - scrollOffsetAtDragStart.value;
      const totalDy = catDragY.value + scrollDelta;
      // No finger movement → keep target at origin (prevents shifts on drag start)
      if (totalDy === 0) {
        return { groupIdx: catFromGroupIdx.value, catIdx: catFromCatIdx.value };
      }
      return computeCatTarget(
        catFromGroupIdx.value,
        catFromCatIdx.value,
        totalDy,
        heights.value,
        catHeightsAll.value,
        groupCount.value,
        groupHeaderHeights.value,
      );
    },
    (cur, prev) => {
      catTargetGroupIdx.value = cur.groupIdx;
      catTargetCatIdx.value = cur.catIdx;
      if (prev !== null && cur.groupIdx !== -1 &&
          (cur.groupIdx !== prev.groupIdx || cur.catIdx !== prev.catIdx)) {
        runOnJS(selectionHaptic)();
      }
    },
  );

  const AUTO_SCROLL_EDGE = 60;
  const AUTO_SCROLL_SPEED = 8;

  useAnimatedReaction(
    () => {
      // Only scroll when a drag is active and scroll infrastructure is available
      if (!scrollRef || !containerHeight) return 0;
      const isGroupDrag = activeIdx.value !== -1;
      const isCatDrag = catActive.value;
      if (!isGroupDrag && !isCatDrag) return 0;

      // Compute the ghost's content-space Y including scroll delta, then convert to screen-space
      let ghostContentY = 0;
      const sDelta = effectiveScrollOffset.value - scrollOffsetAtDragStart.value;

      if (isGroupDrag) {
        for (let i = 0; i < activeIdx.value; i++) ghostContentY += heights.value[i] ?? 60;
        ghostContentY += dragY.value + sDelta;
      } else {
        const fromG = catFromGroupIdx.value;
        const fromC = catFromCatIdx.value;
        for (let i = 0; i < fromG; i++) ghostContentY += heights.value[i] ?? 60;
        ghostContentY += groupHeaderHeights.value[fromG] ?? GROUP_HEADER_H;
        const groupCats = catHeightsAll.value[fromG] ?? [];
        for (let i = 0; i < fromC; i++) ghostContentY += groupCats[i] ?? 40;
        ghostContentY += catDragY.value + sDelta;
      }

      const screenY = ghostContentY - effectiveScrollOffset.value;

      if (screenY < AUTO_SCROLL_EDGE) {
        const intensity = 1 - Math.max(0, screenY) / AUTO_SCROLL_EDGE;
        return -(AUTO_SCROLL_SPEED * intensity);
      }
      if (screenY > containerHeight - AUTO_SCROLL_EDGE) {
        const intensity = 1 - Math.max(0, containerHeight - screenY) / AUTO_SCROLL_EDGE;
        return AUTO_SCROLL_SPEED * intensity;
      }
      return 0;
    },
    (scrollSpeed) => {
      if (scrollSpeed === 0 || !scrollRef) return;
      const newOffset = Math.max(0, effectiveScrollOffset.value + scrollSpeed);
      scrollTo(scrollRef, 0, newOffset, false);
    },
  );

  const handleMeasureGroup = useCallback(
    (idx: number, h: number) => {
      const arr = [...heights.value];
      arr[idx] = h;
      heights.value = arr;
    },
    [heights],
  );

  const handleMeasureGroupHeader = useCallback(
    (idx: number, h: number) => {
      const arr = [...groupHeaderHeights.value];
      arr[idx] = h;
      groupHeaderHeights.value = arr;
    },
    [groupHeaderHeights],
  );

  const handleGroupGrabStart = useCallback(
    (idx: number) => {
      isDraggingGroupRef.current = true;
      setGroupDragActive(true);
      onDragStateChange?.(true);
      // toIdx is already set in the worklet onStart (before activeIdx)
      // Speculatively update heights to collapsed layout (header-only for non-dragged groups)
      heights.value = heights.value.map((h, i) =>
        i === idx ? h : groupHeaderHeights.value[i] ?? GROUP_HEADER_H,
      );
      tapMedium();
    },
    [toIdx, onDragStateChange, heights, groupHeaderHeights],
  );

  const handleGroupGrabEnd = useCallback(
    (from: number, to: number) => {
      tap();
      setGroupDragActive(false);
      onDragStateChange?.(false);
      // Clear active state AFTER state update so animated styles don't snap prematurely
      activeIdx.value = -1;
      if (from === to) { isDraggingGroupRef.current = false; return; }
      const prev = localGroupsRef.current;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setLocalGroups(next);
      onReorder(next.map((g) => g.id));
      const oldHeights = heights.value.slice();
      heights.value = next.map((g) => oldHeights[prev.findIndex((p) => p.id === g.id)] ?? 60);
      const oldCatH = catHeightsAll.value.slice();
      catHeightsAll.value = next.map((g) => {
        const h = oldCatH[prev.findIndex((p) => p.id === g.id)];
        return Array.isArray(h) ? h : [];
      });
      setTimeout(() => { isDraggingGroupRef.current = false; }, 100);
    },
    [onReorder, heights, catHeightsAll, onDragStateChange, activeIdx],
  );

  const handleMeasureCat = useCallback(
    (groupIdx: number, catIdx: number, h: number) => {
      const all = catHeightsAll.value.map((a) => (Array.isArray(a) ? [...a] : []));
      if (!all[groupIdx]) all[groupIdx] = [];
      all[groupIdx][catIdx] = h;
      catHeightsAll.value = all;
    },
    [catHeightsAll],
  );

  const handleCatGrabStart = useCallback(
    (_groupIdx: number, _catIdx: number) => {
      isDraggingCatRef.current = true;
      onDragStateChange?.(true);
      tapMedium();
    },
    [onDragStateChange],
  );

  const handleCatGrabEnd = useCallback(
    (fromGroupIdx: number, fromCatIdx: number, toGroupIdx: number, toCatIdx: number) => {
      tap();
      onDragStateChange?.(false);
      // Clear active state AFTER state update so animated styles don't snap prematurely
      catActive.value = false;

      if (toGroupIdx === -1 || (fromGroupIdx === toGroupIdx && fromCatIdx === toCatIdx)) {
        isDraggingCatRef.current = false;
        return;
      }

      const prev = localGroupsRef.current;
      const next = prev.map((g) => ({ ...g, envelopes: [...g.envelopes] }));
      const [movedEnv] = next[fromGroupIdx].envelopes.splice(fromCatIdx, 1);
      next[toGroupIdx].envelopes.splice(toCatIdx, 0, movedEnv);
      setLocalGroups(next);

      const targetGroup = next[toGroupIdx];
      const orderedIds = targetGroup.envelopes.map((e) => e.id);

      if (fromGroupIdx === toGroupIdx) {
        onReorderCategories(orderedIds);
      } else {
        onMoveCategoryToGroup(movedEnv.id, targetGroup.id, orderedIds);
      }

      // Reset category heights for affected groups; onLayout will re-measure
      const newCatH = catHeightsAll.value.map((a) => (Array.isArray(a) ? [...a] : []));
      newCatH[fromGroupIdx] = next[fromGroupIdx].envelopes.map(() => 40);
      if (fromGroupIdx !== toGroupIdx) {
        newCatH[toGroupIdx] = next[toGroupIdx].envelopes.map(() => 40);
      }
      catHeightsAll.value = newCatH;

      setTimeout(() => { isDraggingCatRef.current = false; }, 100);
    },
    [catHeightsAll, catActive, onReorderCategories, onMoveCategoryToGroup, onDragStateChange],
  );

  // Category insertion indicator: 2px amber line tracking the drop target.
  const indicatorEasing = Easing.out(Easing.cubic);
  const insertionIndicatorStyle = useAnimatedStyle(() => {
    if (!catActive.value || catTargetGroupIdx.value === -1) {
      return { opacity: 0, transform: [{ translateY: 0 }] };
    }
    const y = computeInsertionY(
      catTargetGroupIdx.value,
      catTargetCatIdx.value,
      heights.value,
      catHeightsAll.value,
      groupHeaderHeights.value,
    );
    return {
      opacity: 1,
      transform: [{ translateY: withTiming(y, { ...INDICATOR_TIMING, easing: indicatorEasing }) }],
    };
  });

  return (
    <View style={{ position: 'relative' }}>
      {localGroups.map((group, idx) => (
        <DraggableGroupItem
          key={group.id}
          group={group}
          index={idx}
          activeIdx={activeIdx}
          dragY={dragY}
          toIdx={toIdx}
          heights={heights}
          onMeasure={handleMeasureGroup}
          onMeasureGroupHeader={handleMeasureGroupHeader}
          onGrabStart={handleGroupGrabStart}
          onGrabEnd={handleGroupGrabEnd}
          forceCollapsed={groupDragActive}
          catDrag={catDragRef.current}
          onCatGrabStart={handleCatGrabStart}
          onCatGrabEnd={handleCatGrabEnd}
          onMeasureCat={handleMeasureCat}
          onEditBudget={onEditBudget}
          onTapActivity={onTapActivity}
          onTapBalance={onTapBalance}
          onLongPress={onLongPressGroup}
          onLongPressEnv={onLongPressEnv}
        />
      ))}

      {/* Category insertion indicator: amber line showing drop target position */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: colors.amber,
            zIndex: 199,
            borderRadius: 1,
          },
          insertionIndicatorStyle,
        ]}
        pointerEvents="none"
      />

    </View>
  );
});
