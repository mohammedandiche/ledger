import { useMemo } from 'react';
import type React from 'react';
import type * as SQLite from 'expo-sqlite';
import type { AuthState } from '@/contexts/auth';
import type { ActiveFilter, Payee, Account } from '@/constants/types';
import type { DiagnosticIssueRaw } from '@/constants/db';
import { sendCrdtMessages } from '@/constants/sync';
import type { CrdtField, SendResult } from '@/constants/sync';
import type { ToastOptions } from '@/contexts/toast';
import { getPendingCount } from '@/services/offlineQueue';
import { TOAST_OFFLINE_SAVE_MS } from '@/constants/config';
import { resolvePayeeForBatch, type MutationCtx } from './mutationContext';
import * as payee from './payeeMutations';
import * as account from './accountMutations';
import * as tx from './transactionMutations';
import * as recon from './reconciliationMutations';
import * as diag from './diagnosticMutations';
import * as budget from './budgetMutations';
import * as cat from './categoryMutations';

export interface MutationDeps {
  dbRef: React.RefObject<SQLite.SQLiteDatabase | null>;
  reloadAllRef: React.RefObject<() => Promise<void>>;
  getGroupId: () => string;
  auth: AuthState;
  isConnected: boolean;
  payees: Payee[];
  setPayees: React.Dispatch<React.SetStateAction<Payee[]>>;
  setLastSyncAt: (ts: number) => void;
  setPendingCount: (count: number) => void;
  addToast: (msg: string, variant: 'success' | 'error' | 'warning' | 'info', opts?: ToastOptions) => void;
  year: number;
  month: number;
  scheduleSync: () => void;
  activeAccountIdRef: React.RefObject<string | null>;
  setActiveAccountId: React.Dispatch<React.SetStateAction<string | null>>;
  canWriteRef: React.RefObject<boolean>;
  recordWrite: () => void;
  showPaywall: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function guardWrite<A extends any[], R>(
  canWriteRef: React.RefObject<boolean>,
  showPaywall: () => void,
  recordWrite: () => void,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    if (!canWriteRef.current) {
      showPaywall();
      // Paywall modal blocks the UI flow; caller never consumes this value
      return undefined as R;
    }
    const result = await fn(...args);
    recordWrite();
    return result;
  };
}

export function useBudgetMutations(deps: MutationDeps) {
  const {
    dbRef,
    reloadAllRef,
    getGroupId,
    auth,
    isConnected,
    payees,
    setPayees,
    setLastSyncAt,
    setPendingCount,
    addToast,
    year,
    month,
    scheduleSync,
    activeAccountIdRef,
    setActiveAccountId,
    canWriteRef,
    recordWrite,
    showPaywall,
  } = deps;

  function requireDb(): SQLite.SQLiteDatabase {
    if (!dbRef.current || !isConnected || !auth.activeFileId) throw new Error('Not connected');
    return dbRef.current;
  }

  async function afterMutation(result: SendResult, db: SQLite.SQLiteDatabase): Promise<void> {
    if (result.queued) {
      setPendingCount(await getPendingCount(db));
      addToast('Saved locally \u2014 will sync when online', 'info', {
        id: 'offline-save',
        duration: TOAST_OFFLINE_SAVE_MS,
      });
    } else {
      setLastSyncAt(Date.now());
    }
    await reloadAllRef.current();
    scheduleSync();
  }

  function resolve(name: string): Promise<{ id: string | null; newFields: CrdtField[] }> {
    return resolvePayeeForBatch(name, payees, dbRef.current ?? undefined);
  }

  function send(db: SQLite.SQLiteDatabase, fields: CrdtField[]): Promise<SendResult> {
    return sendCrdtMessages(db, auth.url, auth.token ?? '', auth.activeFileId!, getGroupId(), fields);
  }

  const ctx: MutationCtx = {
    auth,
    getGroupId,
    dbRef,
    payees,
    setPayees,
    setPendingCount,
    addToast,
    year,
    month,
    activeAccountIdRef,
    setActiveAccountId,
    requireDb,
    afterMutation,
    resolve,
    send,
  };

  const g = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    guardWrite(canWriteRef, showPaywall, recordWrite, fn);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({
    createPayee:      g((name: string) => payee.createPayee(ctx, name)),
    deletePayee:      g((payeeId: string) => payee.deletePayee(ctx, payeeId)),
    renamePayee:      g((payeeId: string, newName: string) => payee.renamePayee(ctx, payeeId, newName)),
    mergePayees:      g((targetId: string, sourceIds: string[]) => payee.mergePayees(ctx, targetId, sourceIds)),
    deleteManyPayees: g((ids: string[]) => payee.deleteManyPayees(ctx, ids)),

    createAccount:  g((name: string, type: Account['type'], onBudget: boolean, startingBalanceCents: number) =>
      account.createAccount(ctx, name, type, onBudget, startingBalanceCents)),
    renameAccount:  g((accountId: string, newName: string) => account.renameAccount(ctx, accountId, newName)),
    closeAccount:   g((accountId: string) => account.closeAccount(ctx, accountId)),
    reopenAccount:  g((accountId: string) => account.reopenAccount(ctx, accountId)),
    deleteAccount:  g((accountId: string) => account.deleteAccount(ctx, accountId)),

    addTransaction:      g((txData: Parameters<typeof tx.addTransaction>[1]) => tx.addTransaction(ctx, txData)),
    updateTransaction:   g((txData: Parameters<typeof tx.updateTransaction>[1]) => tx.updateTransaction(ctx, txData)),
    toggleCleared:       g((id: string, current: 'cleared' | 'uncleared' | 'reconciled') => tx.toggleCleared(ctx, id, current)),
    deleteTransaction:   g((id: string) => tx.deleteTransaction(ctx, id)),
    addSplitChild:       g((parentId: string, child: Parameters<typeof tx.addSplitChild>[2]) => tx.addSplitChild(ctx, parentId, child)),
    addSplitTransaction: g((parent: Parameters<typeof tx.addSplitTransaction>[1], children: Parameters<typeof tx.addSplitTransaction>[2]) =>
      tx.addSplitTransaction(ctx, parent, children)),

    // Read-only — not gated
    getClearedBalance:      (accountId: string) => recon.getClearedBalance(ctx, accountId),

    unreconcileTransaction: g((id: string) => recon.unreconcileTransaction(ctx, id)),
    lockReconciled:         g((accountId: string) => recon.lockReconciled(ctx, accountId)),

    // Read-only — not gated
    runDiagnostics:    () => diag.runDiagnostics(ctx),

    applyDiagnosticFix: g((issue: DiagnosticIssueRaw) => diag.applyDiagnosticFix(ctx, issue)),

    setBudgetAmount: g((categoryId: string, amountCents: number) => budget.setBudgetAmount(ctx, categoryId, amountCents)),
    toggleCarryover: g((categoryId: string) => budget.toggleCarryover(ctx, categoryId)),
    transferBudget:  g((fromCategoryId: string, toCategoryId: string, amountCents: number) =>
      budget.transferBudget(ctx, fromCategoryId, toCategoryId, amountCents)),

    // Read-only — not gated
    queryWithFilters: (filters: ActiveFilter[], accountId?: string | null, searchQuery?: string | null) =>
      budget.queryWithFilters(ctx, filters, accountId, searchQuery),
    getUncatCount:   (accountId: string | null) => budget.getUncatCount(ctx, accountId),

    createCategoryGroup:    g((name: string, isIncome?: boolean) => cat.createCategoryGroup(ctx, name, isIncome)),
    renameCategoryGroup:    g((id: string, name: string) => cat.renameCategoryGroup(ctx, id, name)),
    deleteCategoryGroup:    g((groupId: string) => cat.deleteCategoryGroup(ctx, groupId)),
    setCategoryGroupHidden: g((id: string, hidden: boolean) => cat.setCategoryGroupHidden(ctx, id, hidden)),
    createCategory:         g((name: string, groupId: string) => cat.createCategory(ctx, name, groupId)),
    renameCategory:         g((id: string, name: string) => cat.renameCategory(ctx, id, name)),
    deleteCategory:         g((id: string, transferId?: string | null) => cat.deleteCategory(ctx, id, transferId)),
    setCategoryHidden:      g((id: string, hidden: boolean) => cat.setCategoryHidden(ctx, id, hidden)),
    moveCategoryToGroup:    g((id: string, groupId: string) => cat.moveCategoryToGroup(ctx, id, groupId)),
    reorderCategoryGroups:  g((orderedIds: string[]) => cat.reorderCategoryGroups(ctx, orderedIds)),
    reorderCategories:      g((orderedIds: string[]) => cat.reorderCategories(ctx, orderedIds)),
  }), [auth, isConnected, payees, year, month]);
}
