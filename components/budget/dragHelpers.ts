import type { SharedValue } from 'react-native-reanimated';

export const GROUP_HEADER_H = 44;

export const SHIFT_TIMING = { duration: 200 } as const;

export const SETTLE_TIMING = { duration: 250 } as const;

export const INDICATOR_TIMING = { duration: 150 } as const;

export interface CatDragState {
  active: SharedValue<boolean>;
  fromGroupIdx: SharedValue<number>;
  fromCatIdx: SharedValue<number>;
  dragY: SharedValue<number>;
  targetGroupIdx: SharedValue<number>;
  targetCatIdx: SharedValue<number>;
  catHeightsAll: SharedValue<number[][]>;
  groupHeights: SharedValue<number[]>;
  groupHeaderHeights: SharedValue<number[]>;
  groupActiveIdx: SharedValue<number>;
  scrollOffset: SharedValue<number>;
  scrollOffsetAtDragStart: SharedValue<number>;
}

export function computeGroupTarget(fromIdx: number, dy: number, heights: number[]): number {
  'worklet';
  if (heights.length === 0) return fromIdx;
  let top = 0;
  let fromCenter = 0;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i] ?? 60;
    if (i === fromIdx) fromCenter = top + h / 2;
    top += h;
  }
  const draggedCenter = fromCenter + dy;
  top = 0;
  let best = fromIdx;
  let bestDist = Infinity;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i] ?? 60;
    const dist = Math.abs(top + h / 2 - draggedCenter);
    if (dist < bestDist) { bestDist = dist; best = i; }
    top += h;
  }
  return Math.max(0, Math.min(heights.length - 1, best));
}

export function groupItemShift(idx: number, fromIdx: number, toIdx: number, heights: number[]): number {
  'worklet';
  if (idx === fromIdx || fromIdx === toIdx) return 0;
  const draggedH = heights[fromIdx] ?? 60;
  if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) return -draggedH;
  if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) return draggedH;
  return 0;
}

export function computeCatTarget(
  fromGroupIdx: number,
  fromCatIdx: number,
  translationY: number,
  groupHeights: number[],
  catHeightsAll: number[][],
  groupCount: number,
  groupHeaderHeights: number[],
): { groupIdx: number; catIdx: number } {
  'worklet';
  // Absolute Y of the dragged item's center
  let catAbsY = 0;
  for (let i = 0; i < fromGroupIdx; i++) catAbsY += groupHeights[i] ?? 60;
  const fromHdrH = groupHeaderHeights[fromGroupIdx] ?? GROUP_HEADER_H;
  catAbsY += fromHdrH;
  const fromGroupCats = catHeightsAll[fromGroupIdx] ?? [];
  for (let i = 0; i < fromCatIdx; i++) catAbsY += fromGroupCats[i] ?? 40;
  const absCenter = catAbsY + (fromGroupCats[fromCatIdx] ?? 40) / 2 + translationY;

  let gY = 0;
  for (let gi = 0; gi < groupCount; gi++) {
    const gH = groupHeights[gi] ?? 60;
    const hdrH = groupHeaderHeights[gi] ?? GROUP_HEADER_H;
    const cats = catHeightsAll[gi] ?? [];

    // Use measured groupHeight for extent (includes borders) — no gaps between groups
    if (absCenter >= gY && absCenter < gY + gH) {
      // If in the header region, snap to catIdx 0 of this group
      if (absCenter < gY + hdrH) return { groupIdx: gi, catIdx: 0 };

      // In the categories region — find the nearest slot
      let catY = gY + hdrH;
      for (let ci = 0; ci < cats.length; ci++) {
        const h = cats[ci] ?? 40;
        if (absCenter <= catY + h / 2) return { groupIdx: gi, catIdx: ci };
        catY += h;
      }
      // Past last cat's midpoint → insert AFTER last item
      return { groupIdx: gi, catIdx: cats.length };
    }
    gY += gH;
  }

  // Clamp to boundaries
  const firstHdrH = groupHeaderHeights[0] ?? GROUP_HEADER_H;
  if (absCenter < firstHdrH) return { groupIdx: 0, catIdx: 0 };
  const lastGi = groupCount - 1;
  return { groupIdx: lastGi, catIdx: (catHeightsAll[lastGi] ?? []).length };
}

export function catItemShift(
  idx: number,
  myGroupIdx: number,
  fromGroupIdx: number,
  fromCatIdx: number,
  toGroupIdx: number,
  toCatIdx: number,
  catHeightsAll: number[][],
): number {
  'worklet';
  // No shift when target is still at origin
  if (fromGroupIdx === toGroupIdx && fromCatIdx === toCatIdx) return 0;

  const draggedH = (catHeightsAll[fromGroupIdx] ?? [])[fromCatIdx] ?? 40;

  if (fromGroupIdx === toGroupIdx) {
    // Within-group: identical logic to group reorder
    if (myGroupIdx !== fromGroupIdx || idx === fromCatIdx) return 0;
    if (fromCatIdx < toCatIdx && idx > fromCatIdx && idx <= toCatIdx) return -draggedH;
    if (fromCatIdx > toCatIdx && idx >= toCatIdx && idx < fromCatIdx) return draggedH;
    return 0;
  }

  // Cross-group: source fills gap, target makes space
  if (myGroupIdx === fromGroupIdx && idx > fromCatIdx) return -draggedH;
  if (myGroupIdx === toGroupIdx && idx >= toCatIdx) return draggedH;
  return 0;
}

export function computeInsertionY(
  targetGroupIdx: number,
  targetCatIdx: number,
  groupHeights: number[],
  catHeightsAll: number[][],
  groupHeaderHeights: number[],
): number {
  'worklet';
  let y = 0;
  for (let i = 0; i < targetGroupIdx; i++) y += groupHeights[i] ?? 60;
  y += groupHeaderHeights[targetGroupIdx] ?? GROUP_HEADER_H;
  const cats = catHeightsAll[targetGroupIdx] ?? [];
  for (let i = 0; i < targetCatIdx; i++) y += cats[i] ?? 40;
  return y;
}
