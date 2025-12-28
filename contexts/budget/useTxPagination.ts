import { useState, useRef } from 'react';
import type React from 'react';
import type { Transaction } from '@/constants/types';
import { TX_PAGE_SIZE } from '@/constants/db';

export type TxCacheEntry = {
  items: (Transaction | { dateSeparator: string })[];
  hasMore: boolean;
  offset: number;
  bal: number | null;
  lastDate: number;
};

type TxPage = {
  items: (Transaction | { dateSeparator: string })[];
  hasMore: boolean;
  nextStartingBalance: number;
  lastDate: number;
};

export function useTxPagination(activeAccountIdRef: React.RefObject<string | null>) {
  const [transactions, setTransactions] = useState<(Transaction | { dateSeparator: string })[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreTx, setHasMoreTx] = useState(false);

  const txOffsetRef = useRef(0);
  const txBalRef = useRef<number | null>(null);
  const txLastDateRef = useRef(-1);
  const isLoadingMoreRef = useRef(false);
  const hasMoreTxRef = useRef(false);
  const txCacheRef = useRef<Map<string, TxCacheEntry>>(new Map());

  function resetTxCursors() {
    txOffsetRef.current = 0;
    txBalRef.current = null;
    txLastDateRef.current = -1;
  }

  function saveTxCache(items: (Transaction | { dateSeparator: string })[]) {
    const key = activeAccountIdRef.current ?? '__all';
    txCacheRef.current.set(key, {
      items,
      hasMore: hasMoreTxRef.current,
      offset: txOffsetRef.current,
      bal: txBalRef.current,
      lastDate: txLastDateRef.current,
    });
  }

  function applyTxPage(page: TxPage, append: boolean) {
    txOffsetRef.current += TX_PAGE_SIZE;
    txBalRef.current = page.nextStartingBalance;
    txLastDateRef.current = page.lastDate;
    hasMoreTxRef.current = page.hasMore;
    setHasMoreTx(page.hasMore);
    if (append) {
      setTransactions((prev) => {
        const merged = [...prev, ...page.items];
        saveTxCache(merged);
        return merged;
      });
    } else {
      setTransactions(page.items);
      saveTxCache(page.items);
    }
  }

  return {
    transactions,
    setTransactions,
    loadingMore,
    setLoadingMore,
    hasMoreTx,
    setHasMoreTx,
    txOffsetRef,
    txBalRef,
    txLastDateRef,
    isLoadingMoreRef,
    hasMoreTxRef,
    txCacheRef,
    resetTxCursors,
    applyTxPage,
  };
}
