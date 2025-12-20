import type React from 'react';
import type * as SQLite from 'expo-sqlite';
import type { AuthState } from '@/contexts/auth';
import type { Payee } from '@/constants/types';
import type { CrdtField, SendResult } from '@/constants/sync';
import type { ToastOptions } from '@/contexts/toast';
import { buildNewPayeeFields } from '@/services/mutations';
import { uuid } from '@/constants/sync';

export interface MutationCtx {
  auth: AuthState;
  getGroupId: () => string;
  dbRef: React.RefObject<SQLite.SQLiteDatabase | null>;
  payees: Payee[];
  setPayees: React.Dispatch<React.SetStateAction<Payee[]>>;
  setPendingCount: (count: number) => void;
  addToast: (msg: string, variant: 'success' | 'error' | 'warning' | 'info', opts?: ToastOptions) => void;
  year: number;
  month: number;
  activeAccountIdRef: React.RefObject<string | null>;
  setActiveAccountId: React.Dispatch<React.SetStateAction<string | null>>;
  requireDb: () => SQLite.SQLiteDatabase;
  afterMutation: (result: SendResult, db: SQLite.SQLiteDatabase) => Promise<void>;
  resolve: (name: string) => Promise<{ id: string | null; newFields: CrdtField[] }>;
  send: (db: SQLite.SQLiteDatabase, fields: CrdtField[]) => Promise<SendResult>;
}

// Returns existing payee id when name matches, or a fresh id plus CRDT fields
// to create it. No server I/O — callers batch these with transaction fields.
export async function resolvePayeeForBatch(
  name: string,
  payees: Payee[],
  db?: SQLite.SQLiteDatabase,
): Promise<{ id: string | null; newFields: CrdtField[] }> {
  const trimmed = name.trim();
  if (!trimmed) return { id: null, newFields: [] };
  const existing = payees.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return { id: existing.id, newFields: [] };
  // Transfer payees are excluded from context state (queryPayees uses transfer_acct IS NULL).
  // Look them up directly to avoid creating a duplicate regular payee.
  if (db && trimmed.toLowerCase().startsWith('transfer:')) {
    const row = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM payees WHERE name = ? AND transfer_acct IS NOT NULL AND tombstone = 0`,
      [trimmed],
    );
    if (row) return { id: row.id, newFields: [] };
  }
  const payeeId = uuid();
  return { id: payeeId, newFields: buildNewPayeeFields(payeeId, trimmed) };
}
