import React, { useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { CategoryOption } from '@/constants/types';
import { useFormStyles } from './formStyles';
import { BottomSheetModal, BottomSheetScrollView } from '@/components/shared/BottomSheetModal';
import type { BottomSheetRef } from '@/components/shared/BottomSheetModal';

export const SPLIT_CATEGORY: CategoryOption = {
  id: '__split__',
  name: '✂️ Split',
  groupName: '',
  isIncome: false,
};

interface CatSection {
  groupName: string;
  items: CategoryOption[];
}

export function CategoryPickerModal({
  visible,
  onClose,
  categories,
  showSplit,
}: {
  visible: boolean;
  onClose: (cat: CategoryOption | null) => void;
  categories: CategoryOption[];
  showSplit?: boolean;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(
    (result: CategoryOption | null) => {
      sheetRef.current?.close(() => onClose(result));
    },
    [onClose],
  );

  const sections = useMemo<CatSection[]>(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const c of categories) {
      if (!map.has(c.groupName)) map.set(c.groupName, []);
      map.get(c.groupName)!.push(c);
    }
    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [categories]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={() => onClose(null)}
      title="category"
      paddingHorizontal={hp}
    >
      {showSplit && (
        <Pressable style={fs.modalRow} onPress={() => dismiss(SPLIT_CATEGORY)}>
          <Text style={[fs.catName, { fontSize: r(13, 15), color: colors.amber }]}>
            ✂️ Split transaction
          </Text>
        </Pressable>
      )}
      <Pressable
        style={fs.modalRow}
        onPress={() => dismiss({ id: '', name: '', groupName: '', isIncome: false })}
      >
        <Text
          style={[fs.catName, { fontSize: r(13, 15), color: colors.t2, fontStyle: 'italic' }]}
        >
          no category
        </Text>
      </Pressable>
      <BottomSheetScrollView style={{ maxHeight: 400 }}>
        {sections.map((sec) => (
          <View key={sec.groupName}>
            <Text style={[fs.catGroup, { fontSize: r(9, 11) }]}>{sec.groupName}</Text>
            {sec.items.map((cat) => (
              <Pressable key={cat.id} style={fs.modalRow} onPress={() => dismiss(cat)}>
                <Text style={[fs.catName, { fontSize: r(13, 15) }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
