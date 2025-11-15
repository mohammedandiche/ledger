import type { ThemeColors } from '@/constants/tokens';

export function parseCents(str: string): number {
  return Math.round((parseFloat(str) || 0) * 100);
}

export function isValidAmount(s: string): boolean {
  return s.trim() !== '' && parseFloat(s) > 0;
}

export function signColor(value: number, colors: ThemeColors): string {
  if (value > 0) return colors.green;
  if (value < 0) return colors.redL;
  return colors.t2;
}
