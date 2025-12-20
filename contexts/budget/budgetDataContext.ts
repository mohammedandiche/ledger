import { createContext, useContext } from 'react';
import type { Account, Payee, CategoryOption } from '@/constants/types';

export interface BudgetRefCtxValue {
  accounts: Account[];
  payees: Payee[];
  categoryOptions: CategoryOption[];
  unusedPayeeIds: Set<string>;
}

// Separate from BudgetCtx to prevent re-renders on every sync/loading-state flip
export const BudgetRefCtx = createContext<BudgetRefCtxValue>({
  accounts: [],
  payees: [],
  categoryOptions: [],
  unusedPayeeIds: new Set(),
});

export function useBudgetReferenceData() {
  return useContext(BudgetRefCtx);
}
