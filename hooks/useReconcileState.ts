import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '@/constants/types';

interface ReconcileStateDeps {
  activeAccountId: string | null;
  transactions: (Transaction | { dateSeparator: string })[];
  getClearedBalance: (accountId: string) => Promise<number>;
  lockReconciled: (accountId: string) => Promise<void>;
  addTransaction: (tx: {
    accountId: string;
    date: number;
    payeeName: string;
    categoryId: string | null;
    amount: number;
    notes: string;
    cleared: boolean;
  }) => Promise<void>;
}

export function useReconcileState({
  activeAccountId,
  transactions,
  getClearedBalance,
  lockReconciled,
  addTransaction,
}: ReconcileStateDeps) {
  const [reconcileMode, setReconcileMode] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState(0);
  const [reconcileCleared, setReconcileCleared] = useState(0);
  const [showReconcileSetup, setShowReconcileSetup] = useState(false);

  useEffect(() => {
    setReconcileMode(false);
  }, [activeAccountId]);

  useEffect(() => {
    if (!reconcileMode || !activeAccountId) return;
    getClearedBalance(activeAccountId).then((dollars) => {
      setReconcileCleared(Math.round(dollars * 100));
    });
  }, [reconcileMode, activeAccountId, transactions, getClearedBalance]);

  const handleReconcilePress = useCallback(() => {
    setShowReconcileSetup(true);
  }, []);

  const handleStartReconcile = useCallback(
    async (targetCents: number) => {
      if (!activeAccountId) return;
      setShowReconcileSetup(false);
      const dollars = await getClearedBalance(activeAccountId);
      setReconcileTarget(targetCents);
      setReconcileCleared(Math.round(dollars * 100));
      setReconcileMode(true);
    },
    [activeAccountId, getClearedBalance],
  );

  const handleLock = useCallback(async () => {
    if (!activeAccountId) return;
    await lockReconciled(activeAccountId);
    setReconcileMode(false);
  }, [activeAccountId, lockReconciled]);

  const handleExitReconcile = useCallback(() => {
    setReconcileMode(false);
  }, []);

  const handleAddAdjustment = useCallback(async () => {
    if (!activeAccountId) return;
    const diff = reconcileTarget - reconcileCleared;
    if (diff === 0) return;
    const today = new Date();
    const dateInt =
      today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    await addTransaction({
      accountId: activeAccountId,
      date: dateInt,
      payeeName: 'Reconciliation balance adjustment',
      categoryId: null,
      amount: diff,
      notes: '',
      cleared: true,
    });
  }, [activeAccountId, reconcileTarget, reconcileCleared, addTransaction]);

  return {
    reconcileMode,
    reconcileTarget,
    reconcileCleared,
    showReconcileSetup,
    setShowReconcileSetup,
    handleReconcilePress,
    handleStartReconcile,
    handleLock,
    handleExitReconcile,
    handleAddAdjustment,
  };
}
