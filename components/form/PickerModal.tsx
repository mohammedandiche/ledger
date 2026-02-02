import React, { useCallback, useRef } from 'react';
import { Pressable } from 'react-native';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';
import { BottomSheetModal, BottomSheetFlatList } from '@/components/shared/BottomSheetModal';
import type { BottomSheetRef } from '@/components/shared/BottomSheetModal';

export function PickerModal<T extends { id: string }>({
  visible,
  onClose,
  title,
  items,
  renderItem,
  keyExtractor,
}: {
  visible: boolean;
  onClose: (item: T | null) => void;
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor?: (item: T) => string;
}) {
  const { hp } = useR();
  const fs = useFormStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(
    (result: T | null) => {
      sheetRef.current?.close(() => onClose(result));
    },
    [onClose],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={() => onClose(null)}
      title={title}
      paddingHorizontal={hp}
    >
      <BottomSheetFlatList
        data={items}
        keyExtractor={keyExtractor ?? ((item) => item.id)}
        renderItem={({ item }) => (
          <Pressable style={fs.modalRow} onPress={() => dismiss(item)}>
            {renderItem(item)}
          </Pressable>
        )}
        style={{ maxHeight: 400 }}
      />
    </BottomSheetModal>
  );
}
