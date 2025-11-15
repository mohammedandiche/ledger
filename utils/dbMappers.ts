import type { Account, ClearedStatus, Transaction } from '@/constants/types';
import { MONTH_ABBREVS } from '@/utils/monthHelpers';

export function mapAccountType(raw: string): Account['type'] {
  switch (raw) {
    case 'savings':
      return 'savings';
    case 'cash':
      return 'cash';
    case 'investment':
      return 'investment';
    case 'credit':
    case 'creditCard':
    case 'credit card':
      return 'credit';
    default:
      return 'checking';
  }
}

export function mapCleared(cleared: number, reconciled: number): ClearedStatus {
  if (reconciled === 1) return 'reconciled';
  if (cleared === 1) return 'cleared';
  return 'uncleared';
}

export function formatDateInt(d: number): string {
  const s = String(d).padStart(8, '0');
  const day = parseInt(s.slice(6, 8), 10);
  const mon = parseInt(s.slice(4, 6), 10);
  return `${day} ${MONTH_ABBREVS[mon - 1] ?? ''}`;
}

export function todayInt(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function yesterdayInt(): number {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Caches today/yesterday to avoid creating Date objects for every transaction row
let _cachedToday = 0;
let _cachedYesterday = 0;
let _cachedAt = 0;

export function formatDateSep(d: number): string {
  const now = Date.now();
  if (now - _cachedAt > 1000) {
    _cachedToday = todayInt();
    _cachedYesterday = yesterdayInt();
    _cachedAt = now;
  }
  const raw = formatDateInt(d);
  if (d === _cachedToday) return `today · ${raw}`;
  if (d === _cachedYesterday) return `yesterday · ${raw}`;
  return raw;
}

export const TX_PAGE_SIZE = 50;

export type TxPage = {
  items: (Transaction | { dateSeparator: string })[];
  hasMore: boolean;
  nextStartingBalance: number;
  lastDate: number;
};
