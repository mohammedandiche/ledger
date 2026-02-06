import { useState, useCallback } from 'react';
import { success, error } from '@/utils/haptics';
import { todayInt } from '@/components/form';
import { SAVE_SUCCESS_DISPLAY_MS } from '@/constants/config';
import { parseCents, isValidAmount } from '@/utils/amountHelpers';
import { useSplitForm } from './useSplitForm';
import type { Account } from '@/constants/types';
export type { SplitChild } from './useSplitForm';

export interface AddTransactionFormProps {
  addTransaction: (tx: {
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
    transferAccountId?: string | null;
  }) => Promise<void>;
  addSplitTransaction: (
    parent: {
      accountId: string;
      date: number;
      payeeName: string;
      amount: number;
      notes: string;
      cleared: boolean;
    },
    children: { payeeName: string; categoryId: string | null; amount: number; notes: string }[],
  ) => Promise<void>;
}

export function useAddTransactionForm({
  addTransaction,
  addSplitTransaction,
}: AddTransactionFormProps) {
  const [amountStr, setAmountStr] = useState('');
  const [isOutflow, setIsOutflow] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateInt, setDateInt] = useState(todayInt);
  const [payeeName, setPayeeName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [notes, setNotes] = useState('');
  const [cleared, setCleared] = useState(false);

  const [isTransfer, setIsTransfer] = useState(false);
  const [transferDestAccountId, setTransferDestAccountId] = useState<string | null>(null);

  const [showAcctPicker, setShowAcctPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const split = useSplitForm({
    amountStr,
    setAmountStr,
    isOutflow,
    setIsOutflow,
    payeeName,
    setPayeeName,
    categoryId,
    setCategoryId,
    categoryName,
    setCategoryName,
    notes,
    setNotes,
    prefix: '__add',
  });

  const handleSelectTransfer = useCallback(
    (account: Account) => {
      split.handleParentPayeeChange(`Transfer: ${account.name}`);
      setIsTransfer(true);
      setTransferDestAccountId(account.id);
      setCategoryId(null);
      setCategoryName('');
    },
    [split.handleParentPayeeChange],
  );

  // Manually typing a new payee name clears the transfer flag,
  // letting the user "undo" a transfer selection by editing the payee field
  const handlePayeeChangeWithTransferClear = useCallback(
    (name: string) => {
      split.handleParentPayeeChange(name);
      if (isTransfer) {
        setIsTransfer(false);
        setTransferDestAccountId(null);
      }
    },
    [split.handleParentPayeeChange, isTransfer],
  );

  const canSave = split.isSplit
    ? !!accountId &&
      isValidAmount(amountStr) &&
      split.childForms.every((c) => isValidAmount(c.amountStr)) &&
      split.isBalanced
    : !!accountId && isValidAmount(amountStr);

  const resetForm = useCallback(() => {
    setAmountStr('');
    setIsOutflow(true);
    setPayeeName('');
    setCategoryId(null);
    setCategoryName('');
    setNotes('');
    setCleared(false);
    setDateInt(todayInt());
    setSaveError(null);
    setIsTransfer(false);
    setTransferDestAccountId(null);
    split.setChildForms([]);
  }, [split]);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (split.isSplit) {
        await addSplitTransaction(
          {
            accountId: accountId!,
            date: dateInt,
            payeeName,
            amount: split.parentAmountCents,
            notes: '',
            cleared,
          },
          split.childForms.map((c) => ({
            payeeName: c.payeeName,
            categoryId: c.categoryId,
            amount: c.isOutflow ? -parseCents(c.amountStr) : parseCents(c.amountStr),
            notes: c.notes,
          })),
        );
      } else {
        const amountCents = parseCents(amountStr);
        await addTransaction({
          accountId: accountId!,
          date: dateInt,
          payeeName,
          categoryId,
          amount: isOutflow ? -amountCents : amountCents,
          notes,
          cleared,
          transferAccountId: transferDestAccountId,
        });
      }
      success();
      setSaved(true);
      resetForm();
      setTimeout(() => setSaved(false), SAVE_SUCCESS_DISPLAY_MS);
    } catch (e: unknown) {
      error();
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    saving,
    split.isSplit,
    split.childForms,
    split.parentAmountCents,
    accountId,
    dateInt,
    payeeName,
    categoryId,
    amountStr,
    isOutflow,
    notes,
    cleared,
    transferDestAccountId,
    addTransaction,
    addSplitTransaction,
    resetForm,
  ]);

  const canEditCategory = split.canEditCategory;

  return {
    amountStr,
    setAmountStr,
    isOutflow,
    setIsOutflow,
    accountId,
    setAccountId,
    dateInt,
    setDateInt,
    payeeName,
    categoryId,
    categoryName,
    notes,
    setNotes,
    cleared,
    setCleared,

    ...split,
    canEditCategory,

    onPayeeChange: handlePayeeChangeWithTransferClear,
    onDeleteChild: split.removeChild,

    isTransfer,
    transferDestAccountId,
    canSave,

    saving,
    saveError,
    saved,

    showAcctPicker,
    setShowAcctPicker,
    showDatePicker,
    setShowDatePicker,

    resetForm,
    handleSave,
    handleSelectTransfer,
  };
}
