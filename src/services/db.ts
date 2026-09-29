import { AppDatabaseSchema, UserSettings } from '../types/finance';

export const GAS_WEB_APP_URL =
  (import.meta.env.VITE_GAS_WEB_APP_URL as string) ||
  'https://script.google.com/macros/s/AKfycbz1JD24-hIfPuqo6nQdxtxeOUI3hqH3D4t9vGAMTCmawEmRKc75xqfcgFtOGaqGtpMAuw/exec';

export const STORES = [
  'accounts',
  'incomes',
  'expenses',
  'emis',
  'transfers',
  'creditCards',
  'creditCardBills',
  'savingsGoals',
  'recurringBills',
  'taxSavings',
  'budgetCategories',
  'netWorthSnapshots',
  'settings',
] as const;

export type StoreName = (typeof STORES)[number];

export const SHEET_NAMES: Record<StoreName, string> = {
  accounts: 'Accounts',
  incomes: 'Income Tracker',
  expenses: 'Expense Tracker',
  emis: 'EMI Tracker',
  transfers: 'Account Transfers',
  creditCards: 'Credit Card Tracker',
  creditCardBills: 'Credit Card Bills',
  savingsGoals: 'Savings Goals',
  recurringBills: 'Recurring Bills',
  taxSavings: 'Tax Saver',
  budgetCategories: 'Budget vs Actual',
  netWorthSnapshots: 'Net Worth Snapshots',
  settings: 'Settings',
};

// Default budget categories for instant startup without waiting for slow sheets
export const DEFAULT_BUDGET_CATEGORIES = [
  { id: 'b-food', category: 'Food & Dining', monthlyLimit: 15000 },
  { id: 'b-groceries', category: 'Groceries', monthlyLimit: 12000 },
  { id: 'b-rent', category: 'Housing & Rent', monthlyLimit: 25000 },
  { id: 'b-util', category: 'Utilities', monthlyLimit: 5000 },
  { id: 'b-trans', category: 'Transportation', monthlyLimit: 6000 },
  { id: 'b-ent', category: 'Entertainment', monthlyLimit: 4000 },
  { id: 'b-shop', category: 'Shopping', monthlyLimit: 8000 },
  { id: 'b-health', category: 'Health & Fitness', monthlyLimit: 3000 },
  { id: 'b-misc', category: 'Miscellaneous', monthlyLimit: 5000 },
];

// Helper to check if a row is completely blank or has no meaningful values (ignores blank id-only rows)
export function isRowEmpty(row: any): boolean {
  if (!row || typeof row !== 'object') return true;
  const nonIdEntries = Object.entries(row).filter(([k]) => k.toLowerCase() !== 'id');
  if (nonIdEntries.length === 0) return true;
  return nonIdEntries.every(
    ([, v]) => v === null || v === undefined || String(v).trim() === ''
  );
}

// Local storage caching helper for offline resilience and instant rendering
export function getCachedStore<T>(storeName: StoreName): T[] | null {
  try {
    const raw = localStorage.getItem(`gas_cache_${storeName}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function setCachedStore<T>(storeName: StoreName, items: T[]) {
  try {
    localStorage.setItem(`gas_cache_${storeName}`, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// Numeric fields per store to guarantee proper type casting from Google Sheets rows
const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ['openingBalance'],
  incomes: ['expectedAmount', 'actualAmount'],
  expenses: ['expectedAmount', 'actualAmount', 'amount'],
  emis: ['monthlyAmount', 'outstandingPrincipal', 'interestRate'],
  transfers: ['amount'],
  creditCards: ['limit', 'currentUnbilled', 'statementDay', 'dueDay'],
  creditCardBills: ['billAmount', 'amountPaid'],
  savingsGoals: ['targetAmount', 'currentSaved'],
  recurringBills: ['amount'],
  taxSavings: ['amount'],
  budgetCategories: ['monthlyLimit', 'monthlyBudget'],
  netWorthSnapshots: ['totalAssets', 'totalLiabilities', 'netWorth'],
};

/**
 * Normalizes raw sheet rows by casting numbers, booleans, and JSON objects
 * Also normalizes PascalCase headers from Google Sheets to camelCase
 */
function normalizeRow<T>(storeName: StoreName, rawRow: any): T {
  if (!rawRow || typeof rawRow !== 'object') return rawRow;

  // Convert keys to camelCase (e.g. 'OpeningBalance' -> 'openingBalance', 'Name' -> 'name')
  const row: any = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const camelKey = key.length > 0 ? key.charAt(0).toLowerCase() + key.slice(1) : key;
    row[camelKey] = value;
  }

  // Ensure store-specific default fields
  if (storeName === 'accounts') {
    if (!row.name) row.name = row.Name || 'Account';
    if (!row.type) row.type = (row.Type || 'bank').toLowerCase();
  }

  const numFields = NUMERIC_FIELDS[storeName] || [];

  for (const field of numFields) {
    if (field in row && row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const num = Number(row[field]);
      row[field] = isNaN(num) ? 0 : num;
    }
  }

  // Common boolean fields
  if ('isArchived' in row) row.isArchived = row.isArchived === true || row.isArchived === 'true';
  if ('autoRenew' in row) row.autoRenew = row.autoRenew === true || row.autoRenew === 'true';
  if ('isEmergencyFund' in row) row.isEmergencyFund = row.isEmergencyFund === true || row.isEmergencyFund === 'true';

  // Nested breakdowns for net worth snapshots if serialized as JSON strings in sheets
  if (storeName === 'netWorthSnapshots') {
    if (typeof row.assetBreakdown === 'string') {
      try {
        row.assetBreakdown = JSON.parse(row.assetBreakdown);
      } catch {
        row.assetBreakdown = { liquidAccounts: 0, investments: 0, cash: 0 };
      }
    }
    if (typeof row.liabilityBreakdown === 'string') {
      try {
        row.liabilityBreakdown = JSON.parse(row.liabilityBreakdown);
      } catch {
        row.liabilityBreakdown = { emiPrincipal: 0, creditCards: 0 };
      }
    }
  }

  return row as T;
}

/**
 * Calls Google Apps Script Web App: GET ?sheet=SheetName
 * Includes a 4.5s AbortController timeout to guarantee UI responsiveness
 */
export async function apiGet<T>(sheetName: string, timeoutMs: number = 4500): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const url = `${GAS_WEB_APP_URL}?sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 0) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Google Apps Script requires authorization. In the Apps Script editor, open Deploy > Manage deployments > Edit > Who has access, set to 'Anyone', then click Deploy."
        );
      }
      throw new Error(`Google Apps Script GET failed with HTTP ${response.status}`);
    }

    const text = await response.text();
    // Detect HTML sign-in page returned when Apps Script deployment is restricted
    if (text.trim().startsWith('<!doctype') || text.includes('accounts.google.com')) {
      throw new Error(
        "Google Apps Script access is restricted. Please deploy the Web App with 'Who has access' set to 'Anyone' in the Apps Script editor."
      );
    }

    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
        return (data as any).data;
      }
      return [];
    } catch (err: any) {
      throw new Error(`Invalid JSON from Google Apps Script (${sheetName}): ${err.message}`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`[GAS] GET ${sheetName} timed out after ${timeoutMs}ms, falling back to cache`);
    }
    throw err;
  }
}

/**
 * Calls Google Apps Script Web App: POST
 * Uses Content-Type: text/plain;charset=utf-8 to avoid CORS preflight failures in Apps Script
 */
export async function apiMutate(
  sheetName: string,
  action: 'create' | 'update' | 'delete',
  row?: any,
  id?: string
): Promise<any> {
  const payload = {
    sheet: sheetName,
    action,
    row: row ? serializeRow(row) : undefined,
    id: id || (row && row.id ? String(row.id) : undefined),
  };

  const response = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 0) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Google Apps Script requires authorization. In Apps Script, set 'Who has access' to 'Anyone'."
      );
    }
    throw new Error(`Google Apps Script POST failed with HTTP ${response.status}`);
  }

  const text = await response.text();
  if (text.trim().startsWith('<!doctype') || text.includes('accounts.google.com')) {
    throw new Error(
      "Google Apps Script access is restricted. Please deploy the Web App with 'Who has access: Anyone'."
    );
  }

  try {
    return text ? JSON.parse(text) : { success: true };
  } catch {
    return { success: true, raw: text };
  }
}

/**
 * Prepares row object for sheets (stringifies nested objects if any)
 */
function serializeRow(row: any): any {
  const copy = { ...row };
  for (const [key, value] of Object.entries(copy)) {
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      copy[key] = JSON.stringify(value);
    }
  }
  return copy;
}

// -------------------------------------------------------------
// Unified Store API (Replaces IndexedDB with Google Apps Script)
// -------------------------------------------------------------

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const sheetName = SHEET_NAMES[storeName] || storeName;

  try {
    const rawRows = await apiGet<any>(sheetName);
    // Eliminate blank/empty rows from Google Sheets
    const nonEmpty = rawRows.filter((r) => !isRowEmpty(r));
    const normalized = nonEmpty.map((r) => normalizeRow<T>(storeName, r));

    // Provide default categories if Budget vs Actual has no rows yet
    if (storeName === 'budgetCategories' && normalized.length === 0) {
      const cached = getCachedStore<T>(storeName);
      if (cached && cached.length > 0) return cached;
      return DEFAULT_BUDGET_CATEGORIES as unknown as T[];
    }

    setCachedStore(storeName, normalized);
    return normalized;
  } catch (err) {
    console.warn(`[GAS] Error fetching ${sheetName}, checking local cache:`, err);
    const cached = getCachedStore<T>(storeName);
    if (cached && cached.length > 0) {
      return cached;
    }
    if (storeName === 'budgetCategories') {
      return DEFAULT_BUDGET_CATEGORIES as unknown as T[];
    }
    return [];
  }
}

export async function putItemInStore<T>(storeName: StoreName, item: T): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;
  const anyItem = item as any;
  const id = anyItem.id || anyItem.key;

  // Clean payload if budgetCategories to prevent cross-sheet formula pollution
  let payloadRow = item;
  if (storeName === 'budgetCategories') {
    payloadRow = {
      id: anyItem.id || `b-${Date.now()}`,
      category: anyItem.category,
      monthlyLimit: Number(anyItem.monthlyLimit) || 0,
    } as any;
  }

  // Optimistically update local cache
  const cached = getCachedStore<any>(storeName) || [];
  const index = cached.findIndex((i) => (i.id && i.id === id) || (i.key && i.key === id));
  if (index >= 0) {
    cached[index] = payloadRow;
  } else {
    cached.push(payloadRow);
  }
  setCachedStore(storeName, cached);

  // Send mutation to Google Apps Script
  const action = index >= 0 ? 'update' : 'create';
  await apiMutate(sheetName, action, payloadRow, id);
}

export async function putItemsInStore<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const sheetName = SHEET_NAMES[storeName] || storeName;

  // Update local cache
  setCachedStore(storeName, items);

  // Insert items to Google Apps Script
  for (const item of items) {
    const anyItem = item as any;
    const id = anyItem.id || anyItem.key;
    await apiMutate(sheetName, 'create', item, id);
  }
}

export async function deleteItemFromStore(storeName: StoreName, id: string): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;

  // Update local cache
  const cached = getCachedStore<any>(storeName) || [];
  const filtered = cached.filter((i) => (i.id ? i.id !== id : i.key !== id));
  setCachedStore(storeName, filtered);

  await apiMutate(sheetName, 'delete', undefined, id);
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;
  setCachedStore(storeName, []);

  // Fetch all existing rows and delete them
  try {
    const current = await apiGet<any>(sheetName);
    for (const item of current) {
      const id = item.id || item.key;
      if (id) {
        await apiMutate(sheetName, 'delete', undefined, String(id));
      }
    }
  } catch (err) {
    console.warn(`[GAS] Clear store warning for ${sheetName}:`, err);
  }
}

export async function exportDatabase(): Promise<AppDatabaseSchema> {
  const [
    accounts,
    incomes,
    expenses,
    emis,
    transfers,
    creditCards,
    creditCardBills,
    savingsGoals,
    recurringBills,
    taxSavings,
    budgetCategories,
    netWorthSnapshots,
    rawSettings,
  ] = await Promise.all([
    getAllFromStore<any>('accounts'),
    getAllFromStore<any>('incomes'),
    getAllFromStore<any>('expenses'),
    getAllFromStore<any>('emis'),
    getAllFromStore<any>('transfers'),
    getAllFromStore<any>('creditCards'),
    getAllFromStore<any>('creditCardBills'),
    getAllFromStore<any>('savingsGoals'),
    getAllFromStore<any>('recurringBills'),
    getAllFromStore<any>('taxSavings'),
    getAllFromStore<any>('budgetCategories'),
    getAllFromStore<any>('netWorthSnapshots'),
    getAllFromStore<any>('settings'),
  ]);

  const settingsObj: any = {};
  rawSettings.forEach((s) => {
    if (s && s.key) {
      settingsObj[s.key] = s.value;
    }
  });

  const settings: UserSettings = {
    currency: settingsObj.currency || '₹',
    savingsRateTarget: settingsObj.savingsRateTarget ?? 20,
    emergencyFundTargetMonths: settingsObj.emergencyFundTargetMonths ?? 6,
    section80cLimit: settingsObj.section80cLimit ?? 150000,
    section80dLimit: settingsObj.section80dLimit ?? 25000,
    activeMonth: settingsObj.activeMonth || new Date().toISOString().slice(0, 7),
  };

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    incomes,
    expenses,
    emis,
    transfers,
    creditCards,
    creditCardBills,
    savingsGoals,
    recurringBills,
    taxSavings,
    budgetCategories,
    netWorthSnapshots,
    settings,
  };
}

export async function importDatabase(data: AppDatabaseSchema): Promise<void> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON backup file');
  }

  // Populate stores
  if (Array.isArray(data.accounts) && data.accounts.length > 0) {
    await putItemsInStore('accounts', data.accounts);
  }
  if (Array.isArray(data.incomes) && data.incomes.length > 0) {
    await putItemsInStore('incomes', data.incomes);
  }
  if (Array.isArray(data.expenses) && data.expenses.length > 0) {
    await putItemsInStore('expenses', data.expenses);
  }
  if (Array.isArray(data.emis) && data.emis.length > 0) {
    await putItemsInStore('emis', data.emis);
  }
  if (Array.isArray(data.transfers) && data.transfers.length > 0) {
    await putItemsInStore('transfers', data.transfers);
  }
  if (Array.isArray(data.creditCards) && data.creditCards.length > 0) {
    await putItemsInStore('creditCards', data.creditCards);
  }
  if (Array.isArray(data.creditCardBills) && data.creditCardBills.length > 0) {
    await putItemsInStore('creditCardBills', data.creditCardBills);
  }
  if (Array.isArray(data.savingsGoals) && data.savingsGoals.length > 0) {
    await putItemsInStore('savingsGoals', data.savingsGoals);
  }
  if (Array.isArray(data.recurringBills) && data.recurringBills.length > 0) {
    await putItemsInStore('recurringBills', data.recurringBills);
  }
  if (Array.isArray(data.taxSavings) && data.taxSavings.length > 0) {
    await putItemsInStore('taxSavings', data.taxSavings);
  }
  if (Array.isArray(data.budgetCategories) && data.budgetCategories.length > 0) {
    await putItemsInStore('budgetCategories', data.budgetCategories);
  }
  if (Array.isArray(data.netWorthSnapshots) && data.netWorthSnapshots.length > 0) {
    await putItemsInStore('netWorthSnapshots', data.netWorthSnapshots);
  }

  const settingEntries = data.settings
    ? Object.entries(data.settings).map(([key, value]) => ({ key, value }))
    : [];

  if (!settingEntries.some((s) => s.key === 'is_initialized')) {
    settingEntries.push({ key: 'is_initialized', value: true });
  }
  await putItemsInStore('settings', settingEntries);
}

export async function clearAllDatabaseData(): Promise<void> {
  for (const s of STORES) {
    await clearStore(s);
  }
  await putItemInStore('settings', { key: 'is_initialized', value: true });
}
