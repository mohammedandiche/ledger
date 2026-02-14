import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { success, error, warning } from '@/utils/haptics';
import type { Transaction, Account } from '@/constants/types';
import { DISCARD_MODAL_DELAY_MS } from '@/constants/config';
import { parseCents, isValidAmount } from '@/utils/amountHelpers';
import { useSplitForm, childFromTx } from './useSplitForm';
import type { SplitChild } from './useSplitForm';
export type { SplitChild } from './useSplitForm';

function formSnapshot(fields: {
  amountStr: string;
  isOutflow: boolean;
  accountId: string | null;
  dateInt: number;
  payeeName: string;
  categoryId: string | null;
  notes: string;
  cleared: boolean;
  childForms: SplitChild[];
}) {
  return JSON.stringify(fields);
}

export interface EditTransactionFormProps {
  transaction: Transaction | null;
  splitChildren?: Transaction[];
  onClose: () => void;
  onSave: (tx: {
    id: string;
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
    transferAccountId?: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSplitChild: (
    parentId: string,
    child: {
      accountId: string;
      date: number;
      payeeName: string;
      categoryId: string | null;
      amount: number;
      notes: string;
      cleared: boolean;
    },
  ) => Promise<string>;
  onUnreconcile?: (id: string) => Promise<void>;
}

export function useEditTransactionForm(
  {
    transaction,
    splitChildren,
    onClose,
    onSave,
    onDelete,
    onAddSplitChild,
    onUnreconcile,
  }: EditTransactionFormProps,
  accounts: Account[] = [],
) {
  const [amountStr, setAmountStr] = useState('');
  const [isOutflow, setIsOutflow] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateInt, setDateInt] = useState(0);
  const [payeeName, setPayeeName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [notes, setNotes] = useState('');
  const [cleared, setCleared] = useState(false);
  const [transferDestAccountId, setTransferDestAccountId] = useState<string | null>(null);

  const [showAcctPicker, setShowAcctPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSplitConfirm, setShowDeleteSplitConfirm] = useState<number | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showReconcileEditConfirm, setShowReconcileEditConfirm] = useState(false);
  const [showUnreconcileConfirm, setShowUnreconcileConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initialSnapshotRef = useRef('');

  const isReconciled = transaction?.cleared === 'reconciled';
  const isTransfer = !!transaction?.transferAccountId;

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
    prefix: '__new',
    // When an existing DB child is collapsed via convertFromSplit, delete it from DB
    onDeleteExistingChild: (id) => {
      onDelete(id).catch(() => {});
    },
  });

  const canEditCategory = split.canEditCategory;

  const handleSelectTransfer = useCallback((account: Account) => {
    setPayeeName(`Transfer: ${account.name}`);
    setTransferDestAccountId(account.id);
  }, []);

  const canSave = split.isSplit
    ? !!accountId &&
      split.childForms.every((c) => isValidAmount(c.amountStr)) &&
      split.isBalanced
    : !!accountId && isValidAmount(amountStr);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return (
      formSnapshot({
        amountStr,
        isOutflow,
        accountId,
        dateInt,
        payeeName,
        categoryId,
        notes,
        cleared,
        childForms: split.childForms,
      }) !== initialSnapshotRef.current
    );
  }, [
    amountStr,
    isOutflow,
    accountId,
    dateInt,
    payeeName,
    categoryId,
    notes,
    cleared,
    split.childForms,
  ]);

  useEffect(() => {
    if (!transaction) return;
    const amt = Math.abs(transaction.amount).toFixed(2);
    const out = transaction.amount < 0;
    const acct = transaction.accountId ?? null;
    const date = transaction.dateInt ?? 0;
    // For transfers, derive display name from destination account for consistency
    let payee: string;
    if (transaction.transferAccountId) {
      const destAcct = accounts.find((a) => a.id === transaction.transferAccountId);
      payee = destAcct ? `Transfer: ${destAcct.name}` : (transaction.payeeName ?? transaction.payee ?? '');
    } else {
      payee = transaction.payeeName ?? transaction.payee ?? '';
    }
    const catId = transaction.categoryId ?? null;
    const catName = transaction.category ?? '';
    const txNotes = transaction.notes ?? '';
    const clr = transaction.cleared === 'cleared';
    const children = splitChildren?.length ? splitChildren.map(childFromTx) : [];

    setAmountStr(amt);
    setIsOutflow(out);
    setAccountId(acct);
    setDateInt(date);
    setPayeeName(payee);
    setCategoryId(catId);
    setCategoryName(catName);
    setNotes(txNotes);
    setCleared(clr);
    setTransferDestAccountId(transaction.transferAccountId ?? null);
    setSaveError(null);
    setShowDatePicker(false);
    split.setChildForms(children);

    initialSnapshotRef.current = formSnapshot({
      amountStr: amt,
      isOutflow: out,
      accountId: acct,
      dateInt: date,
      payeeName: payee,
      categoryId: catId,
      notes: txNotes,
      cleared: clr,
      childForms: children,
    });
  }, [transaction, splitChildren, split.setChildForms]);

  const handleClose = useCallback(() => {
    if (isDirty) setShowDiscardConfirm(true);
    else onClose();
  }, [isDirty, onClose]);

  const deleteChild = useCallback(
    (idx: number) => {
      if (split.childForms[idx].isNew) {
        split.removeChild(idx);
      } else {
        setShowDeleteSplitConfirm(idx);
      }
    },
    [split],
  );

  const confirmDeleteChild = useCallback(async () => {
    if (showDeleteSplitConfirm == null) return;
    const idx = showDeleteSplitConfirm;
    setShowDeleteSplitConfirm(null);
    try {
      await onDelete(split.childForms[idx].id);
      split.removeChild(idx);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete split');
    }
  }, [showDeleteSplitConfirm, split, onDelete]);

  const performSave = useCallback(async () => {
    if (!transaction) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (split.isSplit) {
        await onSave({
          id: transaction.id,
          accountId: accountId!,
          date: dateInt,
          payeeName,
          categoryId: null,
          amount: split.parentAmountCents,
          notes: transaction.notes ?? '',
          cleared,
        });
        await Promise.all(
          split.childForms.map((child) => {
            const childAmount = child.isOutflow
              ? -parseCents(child.amountStr)
              : parseCents(child.amountStr);
            if (child.isNew) {
              return onAddSplitChild(transaction.id, {
                accountId: accountId!,
                date: dateInt,
                payeeName: child.payeeName,
                categoryId: child.categoryId,
                amount: childAmount,
                notes: child.notes,
                cleared,
              });
            }
            return onSave({
              id: child.id,
              accountId: accountId!,
              date: dateInt,
              payeeName: child.payeeName,
              categoryId: child.categoryId,
              amount: childAmount,
              notes: child.notes,
              cleared,
            });
          }),
        );
      } else {
        const amountCents = parseCents(amountStr);
        await onSave({
          id: transaction.id,
          accountId: accountId!,
          date: dateInt,
          payeeName,
          categoryId,
          amount: isOutflow ? -amountCents : amountCents,
          notes,
          cleared,
          transferAccountId: transferDestAccountId ?? transaction.transferAccountId,
        });
      }
      success();
      onClose();
    } catch (e: unknown) {
      error();
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [
    transaction,
    accountId,
    dateInt,
    payeeName,
    categoryId,
    amountStr,
    isOutflow,
    notes,
    cleared,
    transferDestAccountId,
    split.isSplit,
    split.childForms,
    split.parentAmountCents,
    onSave,
    onAddSplitChild,
    onClose,
  ]);

  const handleSave = useCallback(async () => {
    if (!canSave || saving || !transaction) return;
    if (isReconciled) {
      setShowReconcileEditConfirm(true);
      return;
    }
    await performSave();
  }, [canSave, saving, transaction, isReconciled, performSave]);

  const handleDelete = useCallback(() => {
    if (!transaction || deleting) return;
    setShowDeleteConfirm(true);
  }, [transaction, deleting]);

  const confirmDelete = useCallback(async () => {
    if (!transaction) return;
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await onDelete(transaction.id);
      warning();
      onClose();
    } catch (e: unknown) {
      error();
      setSaveError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }, [transaction, onDelete, onClose]);

  const confirmUnreconcile = useCallback(async () => {
    if (!transaction || !onUnreconcile) return;
    setShowUnreconcileConfirm(false);
    try {
      await onUnreconcile(transaction.id);
      onClose();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to remove reconciliation');
    }
  }, [transaction, onUnreconcile, onClose]);

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

    onPayeeChange: split.handleParentPayeeChange,
    onDeleteChild: deleteChild,

    transferDestAccountId,
    handleSelectTransfer,

    isReconciled,
    isTransfer,
    canSave,
    isDirty,

    saving,
    deleting,
    saveError,

    showAcctPicker,
    setShowAcctPicker,
    showDatePicker,
    setShowDatePicker,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showDeleteSplitConfirm,
    setShowDeleteSplitConfirm,
    showDiscardConfirm,
    setShowDiscardConfirm,
    showReconcileEditConfirm,
    setShowReconcileEditConfirm,
    showUnreconcileConfirm,
    setShowUnreconcileConfirm,

    handleClose,
    handleSave,
    performSave,
    handleDelete,
    confirmDelete,
    deleteChild,
    confirmDeleteChild,
    confirmUnreconcile,

    discardDelay: DISCARD_MODAL_DELAY_MS,
  };
}
