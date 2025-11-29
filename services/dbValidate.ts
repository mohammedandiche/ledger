import type { SQLiteDatabase } from 'expo-sqlite';

const REQUIRED_SCHEMA: Record<string, string[]> = {
  accounts: ['id', 'name', 'type', 'offbudget', 'closed', 'tombstone', 'sort_order'],
  transactions: [
    'id',
    'acct',
    'date',
    'amount',
    'description',
    'category',
    'notes',
    'cleared',
    'reconciled',
    'tombstone',
    'isParent',
    'isChild',
    'parent_id',
    'sort_order',
  ],
  payees: ['id', 'name', 'transfer_acct', 'tombstone'],
  categories: ['id', 'name', 'cat_group', 'is_income', 'sort_order', 'hidden', 'tombstone'],
  category_groups: ['id', 'name', 'is_income', 'sort_order', 'hidden', 'tombstone'],
  category_mapping: ['id', 'transferId'],
  payee_mapping: ['id', 'targetId'],
  zero_budgets: ['id', 'month', 'category', 'amount', 'carryover'],
  zero_budget_months: ['id', 'buffered'],
};

interface PragmaColumn {
  name: string;
}

const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export class SchemaError extends Error {
  missingTables: string[];
  missingColumns: Record<string, string[]>;

  constructor(missingTables: string[], missingColumns: Record<string, string[]>) {
    const parts: string[] = [];
    if (missingTables.length > 0) {
      parts.push(`Missing tables: ${missingTables.join(', ')}`);
    }
    for (const [table, cols] of Object.entries(missingColumns)) {
      parts.push(`${table} missing columns: ${cols.join(', ')}`);
    }
    super(
      `Budget file is incompatible with this app version.\n${parts.join('\n')}\n\nThe server may have a newer or older database format. Try updating the app or re-uploading the budget.`,
    );
    this.name = 'SchemaError';
    this.missingTables = missingTables;
    this.missingColumns = missingColumns;
  }
}

export async function validateBudgetSchema(db: SQLiteDatabase): Promise<void> {
  const tableRows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table'`,
  );
  const existingTables = new Set(tableRows.map((r) => r.name));

  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};

  for (const [table, requiredCols] of Object.entries(REQUIRED_SCHEMA)) {
    if (!SAFE_IDENT.test(table)) continue;
    if (!existingTables.has(table)) {
      missingTables.push(table);
      continue;
    }

    const colRows = await db.getAllAsync<PragmaColumn>(`PRAGMA table_info("${table}")`);
    const existingCols = new Set(colRows.map((c) => c.name));

    const missing = requiredCols.filter((col) => !existingCols.has(col));
    if (missing.length > 0) {
      missingColumns[table] = missing;
    }
  }

  if (missingTables.length > 0 || Object.keys(missingColumns).length > 0) {
    throw new SchemaError(missingTables, missingColumns);
  }
}
