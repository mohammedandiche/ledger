export const MONTH_ABBREVS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthToStr(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function monthToInt(y: number, m: number): number {
  return y * 100 + m;
}

export function monthStartInt(y: number, m: number): number {
  return y * 10000 + m * 100 + 1;
}

export function monthEndInt(y: number, m: number): number {
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return ny * 10000 + nm * 100 + 1;
}

export function nextMonthInt(mi: number): number {
  const mm = mi % 100;
  const yy = Math.floor(mi / 100);
  return mm === 12 ? (yy + 1) * 100 + 1 : mi + 1;
}

export function prevMonthInt(mi: number): number {
  const mm = mi % 100;
  const yy = Math.floor(mi / 100);
  return mm === 1 ? (yy - 1) * 100 + 12 : mi - 1;
}
