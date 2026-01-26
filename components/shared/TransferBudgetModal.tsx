import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import type { CategoryOption } from '@/constants/types';
import { BottomSheetModal, BottomSheetFlatList } from './BottomSheetModal';
import type { BottomSheetRef } from './BottomSheetModal';

interface Props {
  visible: boolean;
  mode: 'transfer' | 'cover';
  sourceCategory: { id: string; name: string; balance: number }; // balance in display units (dollars)
  categories: CategoryOption[];
  onTransfer: (fromId: string, toId: string, amountCents: number) => Promise<void>;
  onClose: () => void;
}

export function TransferBudgetModal({
  visible,
  mode,
  sourceCategory,
  categories,
  onTransfer,
  onClose,
}: Props) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const sheetRef = useRef<BottomSheetRef>(null);

  const [selectedCat, setSelectedCat] = useState<CategoryOption | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter: exclude source category, exclude income categories
  const filteredCats = useMemo(
    () => categories.filter((c) => c.id !== sourceCategory.id && !c.isIncome),
    [categories, sourceCategory.id],
  );

  // Group categories by group name for display
  const flatItems = useMemo(() => {
    const items: ({ type: 'header'; title: string } | { type: 'cat'; cat: CategoryOption })[] = [];
    let currentGroup = '';
    for (const cat of filteredCats) {
      if (cat.groupName !== currentGroup) {
        currentGroup = cat.groupName;
        items.push({ type: 'header', title: cat.groupName });
      }
      items.push({ type: 'cat', cat });
    }
    return items;
  }, [filteredCats]);

  // Pre-fill with absolute balance
  const defaultAmount = Math.abs(sourceCategory.balance);

  useEffect(() => {
    if (visible) {
      setSelectedCat(null);
      setAmountStr(defaultAmount > 0 ? defaultAmount.toFixed(2) : '');
      setSaving(false);
    }
  }, [visible, defaultAmount]);

  const handleDismiss = useCallback(() => sheetRef.current?.close(), []);

  const handleTransfer = useCallback(async () => {
    if (!selectedCat || saving) return;
    const cents = Math.round(parseFloat(amountStr || '0') * 100);
    if (cents <= 0) return;
    setSaving(true);
    try {
      if (mode === 'transfer') {
        await onTransfer(sourceCategory.id, selectedCat.id, cents);
      } else {
        await onTransfer(selectedCat.id, sourceCategory.id, cents);
      }
      sheetRef.current?.close();
    } finally {
      setSaving(false);
    }
  }, [selectedCat, amountStr, saving, mode, sourceCategory.id, onTransfer]);

  const title = mode === 'transfer' ? 'transfer budget' : 'cover overspending';
  const subtitle =
    mode === 'transfer' ? `from ${sourceCategory.name}` : `for ${sourceCategory.name}`;

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={onClose}
      maxHeight="80%"
      statusBarTranslucent
      keyboardAvoiding
      sheetStyle={s.sheetBorder}
    >
      {/* Title block — centered, no standard X header */}
      <Text style={[s.title, { fontSize: r(13, 15) }]}>{title}</Text>
      <Text style={[s.subtitle, { fontSize: r(10, 12) }]}>{subtitle}</Text>

      {/* Amount row */}
      <View style={s.amountRow}>
        <Text style={[s.amountLabel, { fontSize: r(10, 12) }]}>amount</Text>
        <TextInput
          style={[s.amountInput, { fontSize: r(16, 20) }]}
          value={amountStr}
          onChangeText={setAmountStr}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.t4}
          selectTextOnFocus
          selectionColor={colors.amber}
        />
      </View>

      {/* Category list */}
      <Text style={[s.pickLabel, { fontSize: r(9, 11) }]}>
        {mode === 'transfer' ? 'transfer to' : 'cover from'}
      </Text>

      <BottomSheetFlatList
        data={flatItems}
        keyExtractor={(item: any, i: number) => (item.type === 'header' ? `h-${i}` : item.cat.id)}
        style={s.list}
        renderItem={({ item }: any) => {
          if (item.type === 'header') {
            return <Text style={[s.groupHeader, { fontSize: r(8, 10) }]}>{item.title}</Text>;
          }
          const isSelected = selectedCat?.id === item.cat.id;
          return (
            <Pressable
              style={[s.catRow, isSelected && s.catRowSelected]}
              onPress={() => setSelectedCat(item.cat)}
            >
              <Text
                style={[s.catName, { fontSize: r(12, 14) }, isSelected && s.catNameSelected]}
              >
                {item.cat.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Action buttons */}
      <View style={s.actions}>
        <Pressable
          style={({ pressed }) => [
            s.transferBtn,
            (!selectedCat || saving) && s.btnDisabled,
            pressed && s.btnPressed,
          ]}
          onPress={handleTransfer}
          disabled={!selectedCat || saving}
        >
          <Text style={[s.transferBtnText, { fontSize: r(12, 14) }]}>
            {saving ? 'saving…' : mode === 'transfer' ? 'transfer' : 'cover'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.cancelBtn, pressed && s.btnPressed]}
          onPress={handleDismiss}
        >
          <Text style={[s.cancelText, { fontSize: r(11, 13) }]}>cancel</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    // Extra border on the sheet surface (no bottom border)
    sheetBorder: {
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: C.b1,
    } as any,
    title: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.amber,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      textAlign: 'center',
      marginTop: 2,
      marginBottom: 16,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 16,
      gap: 12,
    },
    amountLabel: {
      fontFamily: 'OverpassMono_400Regular',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.t3,
    },
    amountInput: {
      flex: 1,
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t1,
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      textAlign: 'right',
    },
    pickLabel: {
      fontFamily: 'OverpassMono_400Regular',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.t3,
      paddingHorizontal: 24,
      marginBottom: 6,
    },
    list: {
      maxHeight: 280,
      paddingHorizontal: 16,
    },
    groupHeader: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.t3,
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginTop: 4,
    },
    catRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    catRowSelected: {
      backgroundColor: C.amberBg2,
    },
    catName: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t2,
    },
    catNameSelected: {
      color: C.amber,
    },
    actions: {
      paddingHorizontal: 24,
      paddingTop: 16,
      gap: 10,
      alignItems: 'center',
    },
    transferBtn: {
      width: '100%',
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      minHeight: 48,
    },
    transferBtnText: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.amber,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnPressed: {
      opacity: 0.7,
    },
    cancelBtn: {
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    cancelText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
