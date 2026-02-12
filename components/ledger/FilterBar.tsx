import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { tap } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { ActiveFilter, FilterField, Account, CategoryOption } from '@/constants/types';
import { useBudgetReferenceData } from '@/contexts/budget';
import { CategoryPickerModal } from '@/components/form/CategoryPickerModal';
import { PickerModal } from '@/components/form/PickerModal';
import { BottomSheetModal } from '@/components/shared/BottomSheetModal';
import { makeFilterBarStyles } from './filterBarStyles';
import {
  FILTER_FIELDS,
  DATE_PRESETS,
  IMMEDIATE_FIELDS,
  AMOUNT_OPS,
  type AmountOp,
} from './filterBarHelpers';

export function FilterBar({
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onAddFilter: (filter: ActiveFilter) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeFilterBarStyles(colors), [colors]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [textPickerField, setTextPickerField] = useState<'payee' | 'notes' | null>(null);
  const [amountPickerOpen, setAmountPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { accounts, categoryOptions } = useBudgetReferenceData();

  const [textValue, setTextValue] = useState('');
  const [amountOp, setAmountOp] = useState<AmountOp>('gt');
  const [amountValue, setAmountValue] = useState('');

  const handleSelectField = useCallback(
    (field: FilterField) => {
      setMenuOpen(false);
      tap();

      if (IMMEDIATE_FIELDS.has(field)) {
        const existing = filters.find((f) => f.field === field);
        if (existing) {
          onRemoveFilter(existing.id);
        } else {
          onAddFilter({
            id: field,
            field,
            operator: 'is',
            value: true,
            label: field.charAt(0).toUpperCase() + field.slice(1),
          });
        }
        return;
      }

      switch (field) {
        case 'account':
          setAccountPickerOpen(true);
          break;
        case 'category':
          setCategoryPickerOpen(true);
          break;
        case 'payee':
          setTextValue('');
          setTextPickerField('payee');
          break;
        case 'notes':
          setTextValue('');
          setTextPickerField('notes');
          break;
        case 'amount':
          setAmountOp('gt');
          setAmountValue('');
          setAmountPickerOpen(true);
          break;
        case 'date':
          setDatePickerOpen(true);
          break;
      }
    },
    [filters, onAddFilter, onRemoveFilter],
  );

  const handleAccountSelect = useCallback(
    (account: Account | null) => {
      setAccountPickerOpen(false);
      if (!account) return;
      onAddFilter({
        id: 'account',
        field: 'account',
        operator: 'is',
        value: account.id,
        label: account.name,
      });
    },
    [onAddFilter],
  );

  const handleCategorySelect = useCallback(
    (cat: CategoryOption | null) => {
      setCategoryPickerOpen(false);
      if (!cat || cat.id === '__split__') return;
      onAddFilter({
        id: 'category',
        field: 'category',
        operator: 'is',
        value: cat.id || null,
        label: cat.name || 'Uncategorised',
      });
    },
    [onAddFilter],
  );

  const handleTextApply = useCallback(() => {
    if (!textPickerField || !textValue.trim()) return;
    onAddFilter({
      id: textPickerField,
      field: textPickerField,
      operator: 'contains',
      value: textValue.trim(),
      label: `${textPickerField}: ${textValue.trim()}`,
    });
    setTextPickerField(null);
  }, [textPickerField, textValue, onAddFilter]);

  const handleAmountApply = useCallback(() => {
    const num = parseFloat(amountValue);
    if (isNaN(num) || num < 0) return;
    const op = AMOUNT_OPS.find((o) => o.id === amountOp);
    onAddFilter({
      id: 'amount',
      field: 'amount',
      operator: amountOp,
      value: num,
      label: `${op?.symbol ?? '>'} ${num.toFixed(2)}`,
    });
    setAmountPickerOpen(false);
  }, [amountOp, amountValue, onAddFilter]);

  const handleDatePreset = useCallback(
    (presetId: string) => {
      setDatePickerOpen(false);
      const preset = DATE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const [from, to] = preset.range();
      onAddFilter({
        id: 'date',
        field: 'date',
        operator: 'between',
        value: [from, to],
        label: preset.label,
      });
    },
    [onAddFilter],
  );

  const hasFilters = filters.length > 0;
  const fontSize = r(9, 11);

  return (
    <>
      {/* Always-visible bar */}
      <View style={[s.bar, { paddingHorizontal: hp }]}>
        <Pressable
          style={[s.filterBtn, hasFilters && s.filterBtnActive]}
          onPress={() => {
            tap();
            setMenuOpen(true);
          }}
        >
          <Text style={[s.filterBtnText, { fontSize }]}>▾ Filter</Text>
        </Pressable>

        {hasFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          >
            {filters.map((f) => (
              <Pressable
                key={f.id}
                style={s.chip}
                onPress={() => {
                  tap();
                  onRemoveFilter(f.id);
                }}
              >
                <Text style={[s.chipText, { fontSize }]}>{f.label}</Text>
                <Text style={[s.chipClose, { fontSize: r(8, 10) }]}>✕</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {hasFilters && (
          <Pressable
            style={s.clearBtn}
            onPress={() => {
              tap();
              onClearAll();
            }}
          >
            <Text style={[s.clearText, { fontSize: r(8, 10) }]}>clear</Text>
          </Pressable>
        )}
      </View>

      <BottomSheetModal
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        title="filter"
        paddingHorizontal={hp}
      >
        {FILTER_FIELDS.map((ff) => {
          const isActive = filters.some((f) => f.field === ff.field);
          return (
            <Pressable
              key={ff.field}
              style={[s.menuRow, isActive && s.menuRowActive]}
              onPress={() => handleSelectField(ff.field)}
            >
              <Text
                style={[s.menuRowText, { fontSize: r(13, 15) }, isActive && s.menuRowTextActive]}
              >
                {ff.label}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheetModal>

      <PickerModal
        visible={accountPickerOpen}
        onClose={handleAccountSelect}
        title="account"
        items={accounts}
        renderItem={(acct) => (
          <Text style={[s.menuRowText, { fontSize: r(13, 15) }]}>{acct.name}</Text>
        )}
      />

      <CategoryPickerModal
        visible={categoryPickerOpen}
        onClose={handleCategorySelect}
        categories={categoryOptions}
      />

      <BottomSheetModal
        visible={textPickerField !== null}
        onDismiss={() => setTextPickerField(null)}
        title={textPickerField === 'payee' ? 'payee' : 'notes'}
        paddingHorizontal={hp}
        keyboardAvoiding
      >
        <TextInput
          style={[s.textInput, { fontSize: r(14, 16) }]}
          value={textValue}
          onChangeText={setTextValue}
          placeholder={textPickerField === 'payee' ? 'search payee…' : 'search notes…'}
          placeholderTextColor={colors.t3}
          returnKeyType="done"
          onSubmitEditing={handleTextApply}
          selectionColor={colors.amber}
        />
        <Pressable
          style={[s.applyBtn, !textValue.trim() && s.applyBtnDisabled]}
          onPress={handleTextApply}
          disabled={!textValue.trim()}
        >
          <Text style={[s.applyText, { fontSize: r(11, 13) }]}>apply</Text>
        </Pressable>
      </BottomSheetModal>

      <BottomSheetModal
        visible={amountPickerOpen}
        onDismiss={() => setAmountPickerOpen(false)}
        title="amount"
        paddingHorizontal={hp}
        keyboardAvoiding
      >
        <View style={s.opRow}>
          {AMOUNT_OPS.map((op) => (
            <Pressable
              key={op.id}
              style={[s.opPill, amountOp === op.id && s.opPillOn]}
              onPress={() => setAmountOp(op.id)}
            >
              <Text
                style={[s.opPillText, { fontSize: r(9, 11) }, amountOp === op.id && s.opPillTextOn]}
              >
                {op.symbol} {op.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[s.textInput, { fontSize: r(14, 16) }]}
          value={amountValue}
          onChangeText={setAmountValue}
          placeholder="0.00"
          placeholderTextColor={colors.t3}
          keyboardType="decimal-pad"
          selectionColor={colors.amber}
        />
        <Pressable
          style={[s.applyBtn, !amountValue && s.applyBtnDisabled]}
          onPress={handleAmountApply}
          disabled={!amountValue}
        >
          <Text style={[s.applyText, { fontSize: r(11, 13) }]}>apply</Text>
        </Pressable>
      </BottomSheetModal>

      <BottomSheetModal
        visible={datePickerOpen}
        onDismiss={() => setDatePickerOpen(false)}
        title="date range"
        paddingHorizontal={hp}
      >
        {DATE_PRESETS.map((preset) => (
          <Pressable
            key={preset.id}
            style={s.menuRow}
            onPress={() => handleDatePreset(preset.id)}
          >
            <Text style={[s.menuRowText, { fontSize: r(13, 15) }]}>{preset.label}</Text>
          </Pressable>
        ))}
      </BottomSheetModal>
    </>
  );
}
