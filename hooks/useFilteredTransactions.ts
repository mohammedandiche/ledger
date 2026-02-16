import { useState, useEffect } from 'react';
import type { ActiveFilter, Transaction } from '@/constants/types';

type TxItem = Transaction | { dateSeparator: string };

interface FilteredTxDeps {
  ledgerFilters: ActiveFilter[];
  activeAccountId: string | null;
  query: string;
  queryWithFilters: (
    filters: ActiveFilter[],
    accountId?: string | null,
    searchQuery?: string | null,
  ) => Promise<TxItem[]>;
}

export function useFilteredTransactions({
  ledgerFilters,
  activeAccountId,
  query,
  queryWithFilters,
}: FilteredTxDeps) {
  const [filteredResults, setFilteredResults] = useState<TxItem[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const isFiltered = ledgerFilters.length > 0 || !!query.trim();

  useEffect(() => {
    if (!isFiltered) {
      setFilteredResults([]);
      setFilterLoading(false);
      return;
    }
    let cancelled = false;
    setFilterLoading(true);
    const delay = query.trim() ? 300 : 0;
    const timer = setTimeout(() => {
      queryWithFilters(ledgerFilters, activeAccountId, query.trim() || null)
        .then((items) => {
          if (!cancelled) setFilteredResults(items);
        })
        .finally(() => {
          if (!cancelled) setFilterLoading(false);
        });
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ledgerFilters, query, activeAccountId, queryWithFilters, isFiltered]);

  return { filteredResults, filterLoading, isFiltered };
}
