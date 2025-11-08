export type ClearedStatus = 'cleared' | 'uncleared' | 'reconciled';

export interface EnvelopeRow {
  id: string;
  name: string;
  subtitle?: string;
  budgeted: number;
  activity: number;
  balance: number;
  status: 'ok' | 'low' | 'over';
  prevBalance?: number;
  hasRollover?: boolean;
  hidden?: boolean;
}

export interface BudgetGroup {
  id: string;
  name: string;
  isIncome: boolean;
  envelopes: EnvelopeRow[];
  hidden?: boolean;
  sortOrder?: number;
}

export interface Transaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  categoryType: 'normal' | 'split' | 'uncategorised' | 'transfer' | 'offbudget';
  amount: number;
  runningBalance: number;
  cleared: ClearedStatus;
  isChild?: boolean;
  parentId?: string;
  scheduled?: boolean;
  accountName?: string;
  dateInt?: number;
  accountId?: string;
  payeeId?: string | null;
  payeeName?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  isParent?: boolean;
  transferAccountId?: string | null;
}

export interface Account {
  id: string;
  name: string;
  last4?: string;
  balance: number;
  type: 'checking' | 'savings' | 'cash' | 'credit' | 'investment';
  onBudget: boolean;
  closed?: boolean;
  reconcileNote?: string;
  reconcileDirty?: boolean;
  importType?: 'auto' | 'manual' | 'none';
  importNote?: string;
}

export interface Payee {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  groupName: string;
  isIncome: boolean;
}

export type FilterField =
  | 'account'
  | 'amount'
  | 'category'
  | 'cleared'
  | 'date'
  | 'notes'
  | 'payee'
  | 'reconciled'
  | 'transfer'
  | 'uncategorized';

export interface ActiveFilter {
  id: string;
  field: FilterField;
  operator: string;
  value: unknown;
  label: string;
}

// Negative = outflow. Uses typographic minus (−) instead of hyphen.
export const fmt = (n: number, showPlus = false): string => {
  const abs = Math.abs(n).toFixed(2);
  if (n < 0) return `−${abs}`;
  if (showPlus) return `+${abs}`;
  return abs;
};
