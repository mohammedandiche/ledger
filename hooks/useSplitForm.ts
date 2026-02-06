import { useState, useMemo, useCallback } from 'react';
import { parseCents } from '@/utils/amountHelpers';
import { SPLIT_CATEGORY } from '@/components/form';
import type { CategoryOption, Transaction } from '@/constants/types';

export interface SplitChild {
  id: string;
  payeeName: string;
  amountStr: string;
  isOutflow: boolean;
  categoryId: string | null;
  categoryName: string;
  notes: string;
  isNew?: boolean;
}

export function childFromTx(tx: Transaction): SplitChild {
  return {
    id: tx.id,
    payeeName: tx.payeeName ?? tx.payee ?? '',
    amountStr: Math.abs(tx.amount).toFixed(2),
    isOutflow: tx.amount < 0,
    categoryId: tx.categoryId ?? null,
    categoryName: tx.category ?? '',
    notes: tx.notes ?? '',
  };
}

let _counter = 0;

interface Options {
  amountStr: string;
  setAmountStr: (s: string) => void;
  isOutflow: boolean;
  setIsOutflow: (v: boolean) => void;
  payeeName: string;
  setPayeeName: (n: string) => void;
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
  categoryName: string;
  setCategoryName: (n: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  prefix?: string;
  onDeleteExistingChild?: (id: string) => void;
}

export function useSplitForm({
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
  prefix = '__child',
  onDeleteExistingChild,
}: Options) {
  const [childForms, setChildForms] = useState<SplitChild[]>([]);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [catPickerTarget, setCatPickerTarget] = useState(-1);

  const isSplit = childForms.length > 0;
  const canEditCategory = childForms.length <= 1;

  const parentAmountCents = useMemo(
    () => parseCents(amountStr) * (isOutflow ? -1 : 1),
    [amountStr, isOutflow],
  );

  const childrenSumCents = useMemo(
    () =>
      childForms.reduce((sum, c) => {
        const v = parseCents(c.amountStr);
        return sum + (c.isOutflow ? -v : v);
      }, 0),
    [childForms],
  );

  const remainingCents = parentAmountCents - childrenSumCents;
  const isBalanced = remainingCents === 0;
  const isOver = isOutflow ? remainingCents > 0 : remainingCents < 0;

  const updateChild = useCallback((idx: number, patch: Partial<SplitChild>) => {
    setChildForms((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }, []);

  const addChild = useCallback(
    (prefillAmountCents?: number) => {
      const id = `${prefix}_${++_counter}`;
      const amt = prefillAmountCents != null ? Math.abs(prefillAmountCents) / 100 : 0;
      const out = prefillAmountCents != null ? prefillAmountCents < 0 : isOutflow;
      setChildForms((prev) => [
        ...prev,
        {
          id,
          payeeName: '',
          amountStr: amt > 0 ? amt.toFixed(2) : '',
          isOutflow: out,
          categoryId: null,
          categoryName: '',
          notes: '',
          isNew: true,
        },
      ]);
    },
    [isOutflow, prefix],
  );

  const removeChild = useCallback((idx: number) => {
    setChildForms((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleParentPayeeChange = useCallback(
    (name: string) => {
      setPayeeName(name);
      setChildForms((prev) => {
        if (prev.length === 1 && !prev[0].payeeName.trim()) {
          return [{ ...prev[0], payeeName: name }];
        }
        return prev;
      });
    },
    [setPayeeName],
  );

  const convertToSplit = useCallback(() => {
    setChildForms([
      {
        id: `${prefix}_${++_counter}`,
        payeeName,
        amountStr,
        isOutflow,
        categoryId,
        categoryName,
        notes,
        isNew: true,
      },
    ]);
    setCategoryId(null);
    setCategoryName('');
    setNotes('');
  }, [
    payeeName,
    amountStr,
    isOutflow,
    categoryId,
    categoryName,
    notes,
    prefix,
    setCategoryId,
    setCategoryName,
    setNotes,
  ]);

  const convertFromSplit = useCallback(
    (cat: CategoryOption) => {
      if (childForms.length === 1) {
        const child = childForms[0];
        setPayeeName(child.payeeName || payeeName);
        setAmountStr(child.amountStr || amountStr);
        setIsOutflow(child.isOutflow);
        setNotes(child.notes || notes);
        if (!child.isNew && onDeleteExistingChild) {
          onDeleteExistingChild(child.id);
        }
      }
      setChildForms([]);
      setCategoryId(cat.id || null);
      setCategoryName(cat.name);
    },
    [
      childForms,
      payeeName,
      amountStr,
      notes,
      onDeleteExistingChild,
      setPayeeName,
      setAmountStr,
      setIsOutflow,
      setNotes,
      setCategoryId,
      setCategoryName,
    ],
  );

  const openCatPicker = useCallback((targetIdx: number) => {
    setCatPickerTarget(targetIdx);
    setShowCatPicker(true);
  }, []);

  const handleCatPicked = useCallback(
    (cat: CategoryOption | null) => {
      if (!cat) {
        setShowCatPicker(false);
        return;
      }
      if (catPickerTarget === -1) {
        if (cat.id === SPLIT_CATEGORY.id) convertToSplit();
        else if (isSplit && childForms.length <= 1) convertFromSplit(cat);
        else {
          setCategoryId(cat.id || null);
          setCategoryName(cat.name);
        }
      } else {
        updateChild(catPickerTarget, { categoryId: cat.id || null, categoryName: cat.name });
      }
      setShowCatPicker(false);
    },
    [
      catPickerTarget,
      isSplit,
      childForms,
      convertToSplit,
      convertFromSplit,
      setCategoryId,
      setCategoryName,
      updateChild,
    ],
  );

  return {
    childForms,
    setChildForms,
    isSplit,
    canEditCategory,
    parentAmountCents,
    childrenSumCents,
    remainingCents,
    isBalanced,
    isOver,
    updateChild,
    addChild,
    removeChild,
    handleParentPayeeChange,
    showCatPicker,
    catPickerTarget,
    openCatPicker,
    handleCatPicked,
  };
}
