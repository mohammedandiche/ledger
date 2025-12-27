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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({
    createPayee:      (name: string) => payee.createPayee(ctx, name),
    deletePayee:      (payeeId: string) => payee.deletePayee(ctx, payeeId),
    renamePayee:      (payeeId: string, newName: string) => payee.renamePayee(ctx, payeeId, newName),
    mergePayees:      (targetId: string, sourceIds: string[]) => payee.mergePayees(ctx, targetId, sourceIds),
    deleteManyPayees: (ids: string[]) => payee.deleteManyPayees(ctx, ids),

    createAccount:  (name: string, type: Account['type'], onBudget: boolean, startingBalanceCents: number) =>
      account.createAccount(ctx, name, type, onBudget, startingBalanceCents),
    renameAccount:  (accountId: string, newName: string) => account.renameAccount(ctx, accountId, newName),
    closeAccount:   (accountId: string) => account.closeAccount(ctx, accountId),
    reopenAccount:  (accountId: string) => account.reopenAccount(ctx, accountId),
    deleteAccount:  (accountId: string) => account.deleteAccount(ctx, accountId),

    addTransaction:      (txData: Parameters<typeof tx.addTransaction>[1]) => tx.addTransaction(ctx, txData),
    updateTransaction:   (txData: Parameters<typeof tx.updateTransaction>[1]) => tx.updateTransaction(ctx, txData),
    toggleCleared:       (id: string, current: 'cleared' | 'uncleared' | 'reconciled') => tx.toggleCleared(ctx, id, current),
    deleteTransaction:   (id: string) => tx.deleteTransaction(ctx, id),
    addSplitChild:       (parentId: string, child: Parameters<typeof tx.addSplitChild>[2]) => tx.addSplitChild(ctx, parentId, child),
    addSplitTransaction: (parent: Parameters<typeof tx.addSplitTransaction>[1], children: Parameters<typeof tx.addSplitTransaction>[2]) =>
      tx.addSplitTransaction(ctx, parent, children),

    getClearedBalance:      (accountId: string) => recon.getClearedBalance(ctx, accountId),
    unreconcileTransaction: (id: string) => recon.unreconcileTransaction(ctx, id),
    lockReconciled:         (accountId: string) => recon.lockReconciled(ctx, accountId),

    runDiagnostics:    () => diag.runDiagnostics(ctx),
    applyDiagnosticFix: (issue: DiagnosticIssueRaw) => diag.applyDiagnosticFix(ctx, issue),

    setBudgetAmount: (categoryId: string, amountCents: number) => budget.setBudgetAmount(ctx, categoryId, amountCents),
    toggleCarryover: (categoryId: string) => budget.toggleCarryover(ctx, categoryId),
    transferBudget:  (fromCategoryId: string, toCategoryId: string, amountCents: number) =>
      budget.transferBudget(ctx, fromCategoryId, toCategoryId, amountCents),
    queryWithFilters: (filters: ActiveFilter[], accountId?: string | null, searchQuery?: string | null) =>
      budget.queryWithFilters(ctx, filters, accountId, searchQuery),
    getUncatCount:   (accountId: string | null) => budget.getUncatCount(ctx, accountId),

    createCategoryGroup:    (name: string, isIncome?: boolean) => cat.createCategoryGroup(ctx, name, isIncome),
    renameCategoryGroup:    (id: string, name: string) => cat.renameCategoryGroup(ctx, id, name),
    deleteCategoryGroup:    (groupId: string) => cat.deleteCategoryGroup(ctx, groupId),
    setCategoryGroupHidden: (id: string, hidden: boolean) => cat.setCategoryGroupHidden(ctx, id, hidden),
    createCategory:         (name: string, groupId: string) => cat.createCategory(ctx, name, groupId),
    renameCategory:         (id: string, name: string) => cat.renameCategory(ctx, id, name),
    deleteCategory:         (id: string, transferId?: string | null) => cat.deleteCategory(ctx, id, transferId),
    setCategoryHidden:      (id: string, hidden: boolean) => cat.setCategoryHidden(ctx, id, hidden),
    moveCategoryToGroup:    (id: string, groupId: string) => cat.moveCategoryToGroup(ctx, id, groupId),
    reorderCategoryGroups:  (orderedIds: string[]) => cat.reorderCategoryGroups(ctx, orderedIds),
    reorderCategories:      (orderedIds: string[]) => cat.reorderCategories(ctx, orderedIds),
  }), [auth, isConnected, payees, year, month]);
}
