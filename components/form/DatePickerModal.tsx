import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { useFormStyles, todayInt } from './formStyles';
import { BottomSheetModal } from '@/components/shared/BottomSheetModal';
import type { BottomSheetRef } from '@/components/shared/BottomSheetModal';
import { MONTH_ABBREVS } from '@/utils/monthHelpers';

const DP_ITEM_H = 48;
const DP_WHEEL_H = DP_ITEM_H * 5;
const DP_YEARS = Array.from({ length: 41 }, (_, i) => 2000 + i);
const DP_YEAR_STRS = DP_YEARS.map(String);

function getDaysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

const WheelColumn = memo(function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  flex = 1,
  resetKey,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  flex?: number;
  resetKey: number;
}) {
  const fs = useFormStyles();
  const listRef = useRef<any>(null);
  const isDragging = useRef(false);
  const lastResetKey = useRef(resetKey);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // First mount — contentOffset handles initial positioning
      mounted.current = true;
      return;
    }
    const isReset = resetKey !== lastResetKey.current;
    lastResetKey.current = resetKey;
    if (!isDragging.current) {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * DP_ITEM_H,
        animated: !isReset,
      });
    }
  }, [selectedIndex, resetKey]);

  const handleScrollEnd = useCallback(
    (e: any) => {
      isDragging.current = false;
      const raw = e.nativeEvent.contentOffset.y;
      const idx = Math.max(0, Math.min(Math.round(raw / DP_ITEM_H), items.length - 1));
      onSelect(idx);
    },
    [items.length, onSelect],
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      style={{ flex, height: DP_WHEEL_H }}
      contentContainerStyle={{ paddingVertical: DP_ITEM_H * 2 }}
      contentOffset={{ x: 0, y: selectedIndex * DP_ITEM_H }}
      snapToInterval={DP_ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, i) => ({
        length: DP_ITEM_H,
        offset: DP_ITEM_H * 2 + DP_ITEM_H * i,
        index: i,
      })}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
        <View style={[fs.dpWheelItem, { height: DP_ITEM_H }]}>
          <Text style={[fs.dpWheelText, index === selectedIndex && fs.dpWheelTextSel]}>{item}</Text>
        </View>
      )}
      onScrollBeginDrag={() => {
        isDragging.current = true;
      }}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
    />
  );
});

// Overrides for the sheet surface: slightly more padding than the default sheet.
const SHEET_OVERRIDES = { paddingTop: 18, paddingBottom: 36 };

export function DatePickerModal({
  visible,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: number;
  onConfirm: (dateInt: number) => void;
  onClose: () => void;
}) {
  const { r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const [dayIdx, setDayIdx] = useState(0);
  const [monthIdx, setMonthIdx] = useState(0);
  const [yearIdx, setYearIdx] = useState(0);
  const [colKey, setColKey] = useState(0);

  function parseToIndices(v: number) {
    const s = String(v || todayInt()).padStart(8, '0');
    const yr = parseInt(s.slice(0, 4), 10);
    const mo = parseInt(s.slice(4, 6), 10);
    const da = parseInt(s.slice(6, 8), 10);
    return {
      yi: Math.max(0, DP_YEARS.indexOf(yr)),
      mi: Math.max(0, Math.min(mo - 1, 11)),
      di: Math.max(0, da - 1),
    };
  }

  useEffect(() => {
    if (visible) {
      const { yi, mi, di } = parseToIndices(value);
      setYearIdx(yi);
      setMonthIdx(mi);
      setDayIdx(di);
      setColKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dayCount = useMemo(
    () => getDaysInMonth(DP_YEARS[yearIdx], monthIdx + 1),
    [yearIdx, monthIdx],
  );
  const dayItems = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => String(i + 1).padStart(2, '0')),
    [dayCount],
  );

  useEffect(() => {
    if (dayIdx >= dayCount) setDayIdx(dayCount - 1);
  }, [dayCount, dayIdx]);

  function goToday() {
    const { yi, mi, di } = parseToIndices(todayInt());
    setYearIdx(yi);
    setMonthIdx(mi);
    setDayIdx(di);
  }

  function handleConfirm() {
    const year = DP_YEARS[yearIdx];
    const month = monthIdx + 1;
    const day = Math.min(dayIdx + 1, dayCount);
    const dateInt = year * 10000 + month * 100 + day;
    sheetRef.current?.close(() => onConfirm(dateInt));
  }

  const fadeColor = `${colors.s1}D0`;

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={onClose}
      title="date"
      paddingHorizontal={16}
      sheetStyle={SHEET_OVERRIDES}
    >
      <Pressable style={fs.dpTodayBtn} onPress={goToday} hitSlop={4}>
        <Text style={[fs.dpTodayText, { fontSize: r(10, 12) }]}>today</Text>
      </Pressable>

      <View style={[fs.dpWheelsWrapper, { height: DP_WHEEL_H }]}>
        <View
          style={[fs.dpSelectionBar, { top: DP_ITEM_H * 2, height: DP_ITEM_H }]}
          pointerEvents="none"
        />
        <View
          style={[
            fs.dpFadeOverlay,
            { top: 0, height: DP_ITEM_H * 2, backgroundColor: fadeColor },
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            fs.dpFadeOverlay,
            { bottom: 0, height: DP_ITEM_H * 2, backgroundColor: fadeColor },
          ]}
          pointerEvents="none"
        />

        <WheelColumn
          resetKey={colKey}
          items={dayItems}
          selectedIndex={dayIdx}
          onSelect={setDayIdx}
          flex={1}
        />
        <Text style={[fs.dpSep, { fontSize: r(13, 15) }]} pointerEvents="none">
          /
        </Text>
        <WheelColumn
          resetKey={colKey}
          items={MONTH_ABBREVS}
          selectedIndex={monthIdx}
          onSelect={setMonthIdx}
          flex={1.4}
        />
        <Text style={[fs.dpSep, { fontSize: r(13, 15) }]} pointerEvents="none">
          /
        </Text>
        <WheelColumn
          resetKey={colKey}
          items={DP_YEAR_STRS}
          selectedIndex={yearIdx}
          onSelect={setYearIdx}
          flex={2}
        />
      </View>

      <Pressable style={fs.dpConfirmBtn} onPress={handleConfirm}>
        <Text style={[fs.dpConfirmText, { fontSize: r(13, 15) }]}>set date</Text>
      </Pressable>
    </BottomSheetModal>
  );
}
