import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';
import { BottomSheetModal, BottomSheetSectionList } from '@/components/shared/BottomSheetModal';
import type { BottomSheetRef } from '@/components/shared/BottomSheetModal';
import type { Account } from '@/constants/types';

const ACCOUNT_ICONS: Record<Account['type'], string> = {
  checking: '🏦',
  savings: '💰',
  cash: '💵',
  credit: '💳',
  investment: '📈',
};

interface Props {
  visible: boolean;
  onClose: (account: Account | null) => void;
  accounts: Account[];
  excludeAccountId?: string;
}

export function AccountPickerModal({ visible, onClose, accounts, excludeAccountId }: Props) {
  const { hp, r } = useR();
  const fs = useFormStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(
    (result: Account | null) => {
      sheetRef.current?.close(() => onClose(result));
    },
    [onClose],
  );

  // Build section data — only include a section when it has items
  const sections = useMemo(() => {
    const eligible = excludeAccountId ? accounts.filter((a) => a.id !== excludeAccountId) : accounts;
    const onBudget = eligible.filter((a) => a.onBudget);
    const offBudget = eligible.filter((a) => !a.onBudget);
    return [
      ...(onBudget.length > 0 ? [{ title: 'on budget', data: onBudget }] : []),
      ...(offBudget.length > 0 ? [{ title: 'off budget', data: offBudget }] : []),
    ];
  }, [accounts, excludeAccountId]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={() => onClose(null)}
      title="account"
      paddingHorizontal={hp}
    >
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(item: Account) => item.id}
        style={{ maxHeight: 400 }}
        renderSectionHeader={({ section }: any) => (
          <Text style={[fs.catGroup, { fontSize: r(9, 11) }]}>{section.title}</Text>
        )}
        renderItem={({ item }: { item: Account }) => (
          <Pressable style={fs.modalRow} onPress={() => dismiss(item)}>
            <View style={styles.row}>
              <Text style={[styles.icon, { fontSize: r(14, 16) }]}>
                {ACCOUNT_ICONS[item.type]}
              </Text>
              <Text style={[fs.catName, { fontSize: r(13, 15) }]}>{item.name}</Text>
            </View>
          </Pressable>
        )}
        stickySectionHeadersEnabled={false}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
});
