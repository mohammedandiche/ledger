import { todayInt } from '@/components/form/formStyles';
import type { FilterField } from '@/constants/types';

export function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function monthBounds(offset: number): [number, number] {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return [year * 10000 + month * 100 + 1, year * 10000 + month * 100 + lastDay];
}

export function weekBounds(): [number, number] {
  const d = new Date();
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const toInt = (dt: Date) =>
    dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
  return [toInt(mon), toInt(sun)];
}

export const FILTER_FIELDS: { field: FilterField; label: string }[] = [
  { field: 'account', label: 'Account' },
  { field: 'amount', label: 'Amount' },
  { field: 'category', label: 'Category' },
  { field: 'cleared', label: 'Cleared' },
  { field: 'date', label: 'Date' },
  { field: 'notes', label: 'Notes' },
  { field: 'payee', label: 'Payee' },
  { field: 'reconciled', label: 'Reconciled' },
  { field: 'transfer', label: 'Transfer' },
  { field: 'uncategorized', label: 'Uncategorized' },
];

export const DATE_PRESETS: { id: string; label: string; range: () => [number, number] }[] = [
  { id: 'today', label: 'Today', range: () => { const t = todayInt(); return [t, t]; } },
  { id: 'this-week', label: 'This week', range: weekBounds },
  { id: 'this-month', label: 'This month', range: () => monthBounds(0) },
  { id: 'last-month', label: 'Last month', range: () => monthBounds(-1) },
  { id: 'last-30', label: 'Last 30 days', range: () => [daysAgo(30), todayInt()] },
  { id: 'last-90', label: 'Last 90 days', range: () => [daysAgo(90), todayInt()] },
];

export const IMMEDIATE_FIELDS: Set<FilterField> = new Set(['cleared', 'reconciled', 'transfer', 'uncategorized']);

export const AMOUNT_OPS = [
  { id: 'gt', label: 'greater than', symbol: '>' },
  { id: 'lt', label: 'less than', symbol: '<' },
  { id: 'eq', label: 'equals', symbol: '=' },
] as const;

export type AmountOp = (typeof AMOUNT_OPS)[number]['id'];
