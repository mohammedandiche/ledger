import type { Account, ActiveFilter, BudgetGroup, Transaction, Payee, CategoryOption } from '@/constants/types';
import type { DiagnosticIssueRaw } from '@/constants/db';
import { MONTH_NAMES } from '@/utils/monthHelpers';

type AccountType = Account['type'];

export interface BudgetCtxValue {
  loading: boolean;
  error: string | null;

  year: number;
  month: number;
  monthLabel: string;
  prevMonth: () => void;
  nextMonth: () => void;
  goToMonth: (y: number, m: number) => void;

  accounts: Account[];
  closedAccounts: Account[];
  budgetGroups: BudgetGroup[];
  toBudget: number;
  transactions: (Transaction | { dateSeparator: string })[];

  loadingMore: boolean;
  hasMoreTx: boolean;
  loadMoreTransactions: () => void;

  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  budgetSummary: {
    budgeted: number;
    activity: number;
    toBudget: number;
    availableFunds: number;
    overspentPrevMonth: number;
    forNextMonth: number;
  };

  netWorthHistory: number[];

  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;

  payees: Payee[];
  unusedPayeeIds: Set<string>;
  categoryOptions: CategoryOption[];

  createPayee: (name: string) => Promise<void>;
  deletePayee: (id: string) => Promise<void>;
  renamePayee: (id: string, newName: string) => Promise<void>;
  mergePayees: (targetId: string, sourceIds: string[]) => Promise<void>;
  deleteManyPayees: (ids: string[]) => Promise<void>;

  createAccount: (name: string, type: AccountType, onBudget: boolean, startingBalanceCents: number) => Promise<string>;
  renameAccount: (id: string, newName: string) => Promise<void>;
  closeAccount: (id: string) => Promise<void>;
  reopenAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

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

  updateTransaction: (tx: {
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

  toggleCleared: (id: string, current: 'cleared' | 'uncleared' | 'reconciled') => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addSplitChild: (
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

  addSplitTransaction: (
    parent: {
      accountId: string;
      date: number;
      payeeName: string;
      amount: number;
      notes: string;
      cleared: boolean;
    },
    children: {
      payeeName: string;
      categoryId: string | null;
      amount: number;
      notes: string;
    }[],
  ) => Promise<void>;

  getClearedBalance: (accountId: string) => Promise<number>;
  lockReconciled: (accountId: string) => Promise<void>;
  unreconcileTransaction: (id: string) => Promise<void>;

  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  syncing: boolean;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
  resetSync: () => Promise<void>;

  runDiagnostics: () => Promise<DiagnosticIssueRaw[]>;
  applyDiagnosticFix: (issue: DiagnosticIssueRaw) => Promise<void>;

  ledgerFilters: ActiveFilter[];
  setLedgerFilters: (filters: ActiveFilter[]) => void;

  setBudgetAmount: (categoryId: string, amountCents: number) => Promise<void>;
  toggleCarryover: (categoryId: string) => Promise<void>;
  transferBudget: (
    fromCategoryId: string,
    toCategoryId: string,
    amountCents: number,
  ) => Promise<void>;

  createCategoryGroup: (name: string, isIncome?: boolean) => Promise<string>;
  renameCategoryGroup: (id: string, name: string) => Promise<void>;
  deleteCategoryGroup: (id: string) => Promise<void>;
  setCategoryGroupHidden: (id: string, hidden: boolean) => Promise<void>;

  createCategory: (name: string, groupId: string) => Promise<string>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string, transferId?: string | null) => Promise<void>;
  setCategoryHidden: (id: string, hidden: boolean) => Promise<void>;
  moveCategoryToGroup: (id: string, groupId: string) => Promise<void>;
  reorderCategoryGroups: (orderedIds: string[]) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;

  showHiddenCategories: boolean;
  setShowHiddenCategories: (v: boolean) => void;

  queryWithFilters: (
    filters: ActiveFilter[],
    accountId?: string | null,
    searchQuery?: string | null,
  ) => Promise<(Transaction | { dateSeparator: string })[]>;

  getUncatCount: (accountId: string | null) => Promise<number>;
}

const now = new Date();

export const BUDGET_CTX_DEFAULT: BudgetCtxValue = {
  loading: false,
  error: null,
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  monthLabel: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
  prevMonth: () => {},
  nextMonth: () => {},
  goToMonth: () => {},
  accounts: [],
  closedAccounts: [],
  budgetGroups: [],
  toBudget: 0,
  transactions: [],
  loadingMore: false,
  hasMoreTx: false,
  loadMoreTransactions: () => {},
  netWorth: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  netWorthHistory: [],
  budgetSummary: {
    budgeted: 0,
    activity: 0,
    toBudget: 0,
    availableFunds: 0,
    overspentPrevMonth: 0,
    forNextMonth: 0,
  },
  activeAccountId: null,
  setActiveAccountId: () => {},
  payees: [],
  unusedPayeeIds: new Set(),
  categoryOptions: [],
  createPayee: async () => {},
  deletePayee: async () => {},
  renamePayee: async () => {},
  mergePayees: async () => {},
  deleteManyPayees: async () => {},
  createAccount: async () => '',
  renameAccount: async () => {},
  closeAccount: async () => {},
  reopenAccount: async () => {},
  deleteAccount: async () => {},
  addTransaction: async () => {},
  updateTransaction: async () => {},
  toggleCleared: async () => {},
  deleteTransaction: async () => {},
  addSplitChild: async () => '',
  addSplitTransaction: async () => {},
  getClearedBalance: async () => 0,
  lockReconciled: async () => {},
  unreconcileTransaction: async () => {},
  isOnline: true,
  pendingCount: 0,
  lastSyncAt: null,
  syncing: false,
  sync: async () => {},
  refresh: async () => {},
  resetSync: async () => {},
  runDiagnostics: async () => [],
  applyDiagnosticFix: async () => {},
  ledgerFilters: [],
  setLedgerFilters: () => {},
  setBudgetAmount: async () => {},
  toggleCarryover: async () => {},
  transferBudget: async () => {},
  createCategoryGroup: async () => '',
  renameCategoryGroup: async () => {},
  deleteCategoryGroup: async () => {},
  setCategoryGroupHidden: async () => {},
  createCategory: async () => '',
  renameCategory: async () => {},
  deleteCategory: async () => {},
  setCategoryHidden: async () => {},
  moveCategoryToGroup: async () => {},
  reorderCategoryGroups: async () => {},
  reorderCategories: async () => {},
  showHiddenCategories: false,
  setShowHiddenCategories: () => {},
  queryWithFilters: async () => [],
  getUncatCount: async () => 0,
};
