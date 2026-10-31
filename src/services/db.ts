import {
  Account,
  Income,
  Expense,
  EmiLoan,
  EmiPayment,
  AccountTransfer,
  CreditCard,
  CreditCardBill,
  SavingsGoal,
  RecurringBill,
  TaxSavingItem,
  BudgetCategory,
  NetWorthSnapshot,
  AppDatabaseSchema,
  UserSettings,
} from '../types/finance';

export const GAS_WEB_APP_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_WEB_APP_URL as string) ||
  'https://script.google.com/macros/s/AKfycbz1JD24-hIfPuqo6nQdxtxeOUI3hqH3D4t9vGAMTCmawEmRKc75xqfcgFtOGaqGtpMAuw/exec';

export const STORES = [
  'accounts',
  'incomes',
  'expenses',
  'emis',
  'emiPayments',
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
  emiPayments: 'EMI Payments',
  transfers: 'Account Transfers',
  creditCards: 'Credit Card Tracker',
  creditCardBills: 'Credit Card Tracker',
  savingsGoals: 'Savings Goals',
  recurringBills: 'Recurring Bills',
  taxSavings: 'Tax Saver',
  budgetCategories: 'Budget vs Actual',
  netWorthSnapshots: 'Net Worth Snapshots',
  settings: 'Settings',
};

// Default budget categories for instant startup without waiting for slow sheets
export const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
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

/**
 * Checks if a row is completely blank or has no meaningful values (ignores id-only probe/corrupt rows)
 */
export function isRowEmpty(row: any): boolean {
  if (!row || typeof row !== 'object') return true;
  const nonIdEntries = Object.entries(row).filter(
    ([k]) => !['id', 'key', '_rowindex'].includes(k.toLowerCase())
  );
  if (nonIdEntries.length === 0) return true;
  return nonIdEntries.every(
    ([, v]) => v === null || v === undefined || String(v).trim() === ''
  );
}

export const SAMPLE_IDS = new Set([
  'acc-hdfc-salary',
  'acc-icici-savings',
  'acc-cash-wallet',
  'acc-regalia-card',
  'acc-zerodha',
  'inc-1',
  'inc-2',
  'inc-3',
  'inc-4',
  'exp-1',
  'exp-2',
  'exp-3',
  'exp-4',
  'exp-5',
  'exp-6',
  'exp-7',
  'exp-8',
  'emi-1',
  'emi-2',
  'tr-1',
  'tr-2',
  'cc-1',
  'ccb-1',
  'ccb-2',
  'goal-1',
  'goal-2',
  'goal-3',
  'rec-1',
  'rec-2',
  'rec-3',
  'tax-1',
  'tax-2',
  'tax-3',
  'tax-4',
  'nw-1',
  'nw-2',
  'nw-3',
]);

/**
 * Strips any leftover sample data from localStorage
 */
export function purgeAllSampleDataFromLocalStorage(): void {
  try {
    for (const store of STORES) {
      const key = `gas_cache_${store}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const cleaned = items.filter((i) => !i?.id || !SAMPLE_IDS.has(String(i.id)));
          if (cleaned.length !== items.length) {
            localStorage.setItem(key, JSON.stringify(cleaned));
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

// Auto-run cache sanitation immediately on module load
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  purgeAllSampleDataFromLocalStorage();
}

/**
 * Local storage caching helper for offline resilience and instant rendering
 * Automatically excludes fabricated sample data.
 */
export function getCachedStore<T>(storeName: StoreName): T[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`gas_cache_${storeName}`);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item) => !item?.id || !SAMPLE_IDS.has(String(item.id)));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(`gas_cache_${storeName}`, JSON.stringify(cleaned));
        }
        return cleaned as T[];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function setCachedStore<T>(storeName: StoreName, items: T[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    // Never persist sample entries
    const safeItems = Array.isArray(items)
      ? items.filter((item: any) => !item?.id || !SAMPLE_IDS.has(String(item.id)))
      : items;
    localStorage.setItem(`gas_cache_${storeName}`, JSON.stringify(safeItems));
  } catch {
    // ignore
  }
}

function formatDateString(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes('T')) {
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      // ignore
    }
    return s.split('T')[0];
  }
  return s;
}

export function formatMonthString(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes('T')) {
    const formatted = formatDateString(s);
    return formatted.slice(0, 7);
  }
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.slice(0, 7);
  }
  return s;
}

function parseNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/**
 * Explicit Bi-directional Mapping: Entity -> Exact Google Sheet Header Row
 * Google Apps Script looks up row[headerName] case-sensitively.
 */
export function mapEntityToSheetRow(storeName: StoreName, entity: any): Record<string, any> {
  if (!entity || typeof entity !== 'object') return entity;

  switch (storeName) {
    case 'accounts':
      return {
        id: String(entity.id || ''),
        Name: String(entity.name || ''),
        Type: String(entity.type || 'bank'),
        OpeningBalance: parseNumber(entity.openingBalance, 0),
        Notes: String(entity.notes || ''),
      };

    case 'incomes':
      return {
        id: String(entity.id || ''),
        Date: formatDateString(entity.date),
        Source: String(entity.source || ''),
        ExpectedAmount: parseNumber(entity.expectedAmount, 0),
        Account: String(entity.accountId || ''),
        ActualAmount: parseNumber(entity.actualAmount, 0),
        ActualDate: formatDateString(entity.actualDate),
        Status: String(entity.status || 'Pending'),
        Notes: String(entity.notes || ''),
      };

    case 'expenses':
      return {
        id: String(entity.id || ''),
        Date: formatDateString(entity.date),
        Name: String(entity.name || ''),
        Category: String(entity.category || ''),
        ExpectedAmount: parseNumber(entity.expectedAmount, 0),
        Account: String(entity.accountId || ''),
        ActualAmount: parseNumber(entity.actualAmount, 0),
        ActualDate: formatDateString(entity.actualDate),
        Status: String(entity.status || 'Pending'),
        Notes: String(entity.notes || ''),
      };

    case 'emis':
      return {
        id: String(entity.id || ''),
        LoanName: String(entity.loanName || ''),
        Lender: String(entity.lender || ''),
        MonthlyAmount: parseNumber(entity.monthlyAmount, 0),
        OutstandingPrincipal: parseNumber(entity.outstandingPrincipal, 0),
        InterestRate: parseNumber(entity.interestRate, 0),
        DueDate: formatDateString(entity.dueDate),
        Account: String(entity.accountId || ''),
        Status: String(entity.status || 'Pending'),
        Notes: String(entity.notes || ''),
        StartDate: formatDateString(entity.startDate || entity.dueDate),
        TotalInstallments: entity.totalInstallments ? parseNumber(entity.totalInstallments, 0) : '',
      };

    case 'emiPayments':
      return {
        id: String(entity.id || ''),
        LoanId: String(entity.loanId || ''),
        Month: String(entity.month || ''),
        DueDate: formatDateString(entity.dueDate),
        Amount: parseNumber(entity.amount, 0),
        Status: String(entity.status || 'Pending'),
        PaidDate: formatDateString(entity.paidDate),
        PaidAmount: parseNumber(entity.paidAmount, 0),
        Account: String(entity.accountId || ''),
      };

    case 'transfers':
      return {
        id: String(entity.id || ''),
        Date: formatDateString(entity.date),
        FromAccount: String(entity.fromAccountId || ''),
        ToAccount: String(entity.toAccountId || ''),
        Amount: parseNumber(entity.amount, 0),
        Reason: String(entity.reason || ''),
        Status: String(entity.status || 'Completed'),
        Notes: String(entity.notes || ''),
      };

    case 'creditCards':
      return {
        id: String(entity.id || ''),
        CardName: String(entity.name || ''),
        CreditLimit: parseNumber(entity.limit, 0),
        CurrentUnbilled: parseNumber(entity.currentUnbilled, 0),
        StatementDate: entity.statementDay ? String(entity.statementDay) : '',
        PaymentDueDate: entity.dueDay ? String(entity.dueDay) : '',
        Notes: entity.bank ? `Bank: ${entity.bank}` : '',
      };

    case 'creditCardBills':
      return {
        id: String(entity.id || ''),
        CardName: String(entity.cardId || ''),
        BillingMonth: String(entity.billingMonth || ''),
        StatementDate: formatDateString(entity.statementDate),
        BillAmount: parseNumber(entity.billAmount, 0),
        AmountPaid: parseNumber(entity.amountPaid, 0),
        PaymentDueDate: formatDateString(entity.paymentDueDate),
        PaymentDateActual: formatDateString(entity.paymentDateActual),
        Status: String(entity.status || 'Pending'),
        Notes: String(entity.notes || ''),
      };

    case 'savingsGoals':
      return {
        id: String(entity.id || ''),
        GoalName: String(entity.name || ''),
        TargetAmount: parseNumber(entity.targetAmount, 0),
        TargetDate: formatDateString(entity.targetDate),
        CurrentSaved: parseNumber(entity.currentSaved, 0),
        Notes: String(entity.notes || ''),
      };

    case 'recurringBills':
      return {
        id: String(entity.id || ''),
        Name: String(entity.name || ''),
        Amount: parseNumber(entity.amount, 0),
        Frequency: String(entity.frequency || 'Monthly'),
        NextRenewalDate: formatDateString(entity.nextRenewalDate),
        Category: String(entity.category || ''),
        Account: String(entity.accountId || ''),
        Notes: String(entity.notes || ''),
      };

    case 'taxSavings':
      return {
        id: String(entity.id || ''),
        Name: String(entity.name || ''),
        Section: String(entity.section || '80C'),
        Amount: parseNumber(entity.amount, 0),
        Date: formatDateString(entity.date),
      };

    case 'budgetCategories':
      return {
        id: String(entity.id || ''),
        Category: String(entity.category || ''),
        MonthlyBudget: parseNumber(entity.monthlyLimit, 0),
        Month: String(entity.month || new Date().toISOString().slice(0, 7)),
      };

    case 'netWorthSnapshots':
      return {
        id: String(entity.id || ''),
        Date: formatDateString(entity.date || entity.month),
        TotalAssets: parseNumber(entity.totalAssets, 0),
        TotalLiabilities: parseNumber(entity.totalLiabilities, 0),
        NetWorth: parseNumber(entity.netWorth, 0),
      };

    default:
      return entity;
  }
}

/**
 * Explicit Bi-directional Mapping: Google Sheet Row -> Clean Frontend Entity
 */
export function mapSheetRowToEntity<T>(storeName: StoreName, row: any): T {
  if (!row || typeof row !== 'object') return row;

  switch (storeName) {
    case 'accounts': {
      const res: Account = {
        id: String(row.id || ''),
        name: String(row.Name ?? row.name ?? 'Account'),
        type: (row.Type ?? row.type ?? 'bank').toLowerCase() as any,
        openingBalance: parseNumber(row.OpeningBalance ?? row.openingBalance, 0),
        color: row.color || '#3b82f6',
        accountNumberLast4: row.accountNumberLast4 || '',
        isArchived: row.isArchived === true || row.isArchived === 'true',
        createdAt: row.createdAt || new Date().toISOString(),
      };
      return res as unknown as T;
    }

    case 'incomes': {
      const res: Income = {
        id: String(row.id || ''),
        date: formatDateString(row.Date ?? row.date) || new Date().toISOString().slice(0, 10),
        source: String(row.Source ?? row.source ?? ''),
        expectedAmount: parseNumber(row.ExpectedAmount ?? row.expectedAmount, 0),
        actualAmount: parseNumber(row.ActualAmount ?? row.actualAmount, 0),
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        actualDate: formatDateString(row.ActualDate ?? row.actualDate),
        status: (row.Status ?? row.status ?? 'Pending') as any,
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'expenses': {
      const res: Expense = {
        id: String(row.id || ''),
        date: formatDateString(row.Date ?? row.date) || new Date().toISOString().slice(0, 10),
        name: String(row.Name ?? row.name ?? ''),
        category: String(row.Category ?? row.category ?? 'Miscellaneous'),
        expectedAmount: parseNumber(row.ExpectedAmount ?? row.expectedAmount ?? row.amount, 0),
        actualAmount: parseNumber(row.ActualAmount ?? row.actualAmount, 0),
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        actualDate: formatDateString(row.ActualDate ?? row.actualDate),
        status: (row.Status ?? row.status ?? 'Pending') as any,
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'emis': {
      const dueDate = formatDateString(row.DueDate ?? row.dueDate);
      const rawStart = row.StartDate ?? row.startDate;
      const startDate = rawStart ? formatDateString(rawStart) : dueDate;
      const rawTot = row.TotalInstallments ?? row.totalInstallments;
      const totalInstallments =
        rawTot !== undefined && rawTot !== null && rawTot !== ''
          ? parseNumber(rawTot, 0)
          : null;

      const res: EmiLoan = {
        id: String(row.id || ''),
        loanName: String(row.LoanName ?? row.loanName ?? ''),
        lender: String(row.Lender ?? row.lender ?? ''),
        monthlyAmount: parseNumber(row.MonthlyAmount ?? row.monthlyAmount, 0),
        outstandingPrincipal: parseNumber(row.OutstandingPrincipal ?? row.outstandingPrincipal, 0),
        interestRate: parseNumber(row.InterestRate ?? row.interestRate, 0),
        dueDate: dueDate,
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        status: (row.Status ?? row.status ?? 'Pending') as any,
        notes: String(row.Notes ?? row.notes ?? ''),
        startDate: startDate,
        totalInstallments: totalInstallments && totalInstallments > 0 ? totalInstallments : null,
      };
      return res as unknown as T;
    }

    case 'emiPayments': {
      const res: EmiPayment = {
        id: String(row.id || ''),
        loanId: String(row.LoanId ?? row.loanId ?? ''),
        month: formatMonthString(row.Month ?? row.month),
        dueDate: formatDateString(row.DueDate ?? row.dueDate),
        amount: parseNumber(row.Amount ?? row.amount, 0),
        status: (row.Status ?? row.status ?? 'Pending') as any,
        paidDate: formatDateString(row.PaidDate ?? row.paidDate),
        paidAmount: parseNumber(row.PaidAmount ?? row.paidAmount, 0),
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
      };
      return res as unknown as T;
    }

    case 'transfers': {
      const res: AccountTransfer = {
        id: String(row.id || ''),
        date: formatDateString(row.Date ?? row.date) || new Date().toISOString().slice(0, 10),
        fromAccountId: String(row.FromAccount ?? row.fromAccountId ?? row.fromAccount ?? ''),
        toAccountId: String(row.ToAccount ?? row.toAccountId ?? row.toAccount ?? ''),
        amount: parseNumber(row.Amount ?? row.amount, 0),
        reason: String(row.Reason ?? row.reason ?? ''),
        status: (row.Status ?? row.status ?? 'Completed') as any,
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'creditCards': {
      const rawBank =
        row.bank ||
        (row.Notes && String(row.Notes).startsWith('Bank:')
          ? String(row.Notes).replace('Bank:', '').trim()
          : '');
      const rawStmt = row.StatementDate ?? row.statementDay;
      const rawDue = row.PaymentDueDate ?? row.dueDay;
      const stmtDay = rawStmt
        ? parseNumber(rawStmt, parseInt(String(rawStmt).split('-').pop() || '1'))
        : 1;
      const dueDay = rawDue
        ? parseNumber(rawDue, parseInt(String(rawDue).split('-').pop() || '1'))
        : 1;

      const res: CreditCard = {
        id: String(row.id || ''),
        name: String(row.CardName ?? row.name ?? 'Credit Card'),
        bank: rawBank,
        limit: parseNumber(row.CreditLimit ?? row.limit, 0),
        currentUnbilled: parseNumber(row.CurrentUnbilled ?? row.currentUnbilled, 0),
        accountId: String(row.accountId || ''),
        color: row.color || 'purple',
        statementDay: stmtDay || 1,
        dueDay: dueDay || 1,
      };
      return res as unknown as T;
    }

    case 'creditCardBills': {
      const res: CreditCardBill = {
        id: String(row.id || ''),
        cardId: String(row.CardName ?? row.cardId ?? row.id ?? ''),
        billingMonth: formatMonthString(row.BillingMonth ?? row.billingMonth),
        statementDate: formatDateString(row.StatementDate ?? row.statementDate),
        billAmount: parseNumber(row.BillAmount ?? row.billAmount, 0),
        amountPaid: parseNumber(row.AmountPaid ?? row.amountPaid, 0),
        paymentDueDate: formatDateString(row.PaymentDueDate ?? row.paymentDueDate),
        paymentDateActual: formatDateString(row.PaymentDateActual ?? row.paymentDateActual),
        status: (row.Status ?? row.status ?? 'Pending') as any,
      };
      return res as unknown as T;
    }

    case 'savingsGoals': {
      const res: SavingsGoal = {
        id: String(row.id || ''),
        name: String(row.GoalName ?? row.name ?? ''),
        targetAmount: parseNumber(row.TargetAmount ?? row.targetAmount, 0),
        targetDate: formatDateString(row.TargetDate ?? row.targetDate),
        currentSaved: parseNumber(row.CurrentSaved ?? row.currentSaved, 0),
        category: String(row.category || 'General'),
        icon: String(row.icon || 'Target'),
        color: String(row.color || 'blue'),
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'recurringBills': {
      const res: RecurringBill = {
        id: String(row.id || ''),
        name: String(row.Name ?? row.name ?? ''),
        amount: parseNumber(row.Amount ?? row.amount, 0),
        frequency: (row.Frequency ?? row.frequency ?? 'Monthly') as any,
        nextRenewalDate: formatDateString(row.NextRenewalDate ?? row.nextRenewalDate),
        category: String(row.Category ?? row.category ?? ''),
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        autoRenew: row.autoRenew === true || row.autoRenew === 'true',
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'taxSavings': {
      const res: TaxSavingItem = {
        id: String(row.id || ''),
        name: String(row.Name ?? row.name ?? ''),
        section: (row.Section ?? row.section ?? '80C') as any,
        amount: parseNumber(row.Amount ?? row.amount, 0),
        date: formatDateString(row.Date ?? row.date),
        financialYear: String(row.financialYear || '2026-2027'),
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'budgetCategories': {
      const res: BudgetCategory = {
        id: String(row.id || `b-${Date.now()}`),
        category: String(row.Category ?? row.category ?? ''),
        monthlyLimit: parseNumber(row.MonthlyBudget ?? row.monthlyBudget ?? row.monthlyLimit, 0),
        color: row.color,
      };
      return res as unknown as T;
    }

    case 'netWorthSnapshots': {
      const dateStr = formatDateString(row.Date ?? row.date) || new Date().toISOString().slice(0, 10);
      let assetBreakdown = { liquidAccounts: 0, investments: 0, cash: 0 };
      let liabilityBreakdown = { emiPrincipal: 0, creditCards: 0 };

      if (typeof row.assetBreakdown === 'string') {
        try {
          assetBreakdown = JSON.parse(row.assetBreakdown);
        } catch {
          // ignore
        }
      } else if (row.assetBreakdown && typeof row.assetBreakdown === 'object') {
        assetBreakdown = row.assetBreakdown;
      }

      if (typeof row.liabilityBreakdown === 'string') {
        try {
          liabilityBreakdown = JSON.parse(row.liabilityBreakdown);
        } catch {
          // ignore
        }
      } else if (row.liabilityBreakdown && typeof row.liabilityBreakdown === 'object') {
        liabilityBreakdown = row.liabilityBreakdown;
      }

      const res: NetWorthSnapshot = {
        id: String(row.id || ''),
        date: dateStr,
        month: dateStr.slice(0, 7),
        totalAssets: parseNumber(row.TotalAssets ?? row.totalAssets, 0),
        totalLiabilities: parseNumber(row.TotalLiabilities ?? row.totalLiabilities, 0),
        netWorth: parseNumber(row.NetWorth ?? row.netWorth, 0),
        assetBreakdown,
        liabilityBreakdown,
      };
      return res as unknown as T;
    }

    default:
      return row as T;
  }
}

/**
 * Calls Google Apps Script Web App: GET ?sheet=SheetName
 * Includes a 15s AbortController timeout to handle Google Apps Script cold-starts
 */
export async function apiGet<T>(sheetName: string, timeoutMs: number = 15000): Promise<T[]> {
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
      if (data && typeof data === 'object') {
        if (Array.isArray((data as any).data)) {
          return (data as any).data;
        }
        if ((data as any).error && String((data as any).error).includes('Sheet not found')) {
          console.info(`[GAS] Sheet not yet created: ${sheetName}, using local storage`);
          return [];
        }
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
    const parsed = text ? JSON.parse(text) : { success: true };
    if (parsed && parsed.error && String(parsed.error).includes('Sheet not found')) {
      console.warn(`[GAS] Sheet not yet created: ${sheetName}. Mutation saved to local cache only.`);
      return { success: true, localOnly: true };
    }
    return parsed;
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
  if (storeName === 'settings') {
    const cached = getCachedStore<T>('settings');
    return cached || [];
  }

  const sheetName = SHEET_NAMES[storeName] || storeName;

  try {
    const rawRows = await apiGet<any>(sheetName);
    // Eliminate blank/empty/corrupted rows from Google Sheets
    const nonEmpty = rawRows.filter((r) => !isRowEmpty(r));
    const entities = nonEmpty.map((r) => mapSheetRowToEntity<T>(storeName, r));

    // Provide default categories if Budget vs Actual has no rows yet
    if (storeName === 'budgetCategories' && entities.length === 0) {
      const cached = getCachedStore<T>(storeName);
      if (cached && cached.length > 0) return cached;
      return DEFAULT_BUDGET_CATEGORIES as unknown as T[];
    }

    setCachedStore(storeName, entities);
    return entities;
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

export async function putItemInStore<T>(storeName: StoreName, item: T): Promise<T> {
  const sheetName = SHEET_NAMES[storeName] || storeName;
  const anyItem = item as any;
  const id = anyItem.id || anyItem.key;

  // Clean payload if budgetCategories to prevent cross-sheet formula pollution
  let entityToSave = { ...anyItem };
  if (storeName === 'budgetCategories') {
    entityToSave = {
      id: anyItem.id || `b-${Date.now()}`,
      category: anyItem.category,
      monthlyLimit: Number(anyItem.monthlyLimit) || 0,
    } as any;
  }

  // Optimistically update local cache with clean frontend entity
  const cached = getCachedStore<any>(storeName) || [];
  const index = cached.findIndex((i) => (i.id && i.id === id) || (i.key && i.key === id));
  if (index >= 0) {
    cached[index] = entityToSave;
  } else {
    cached.push(entityToSave);
  }
  setCachedStore(storeName, cached);

  if (storeName === 'settings') {
    return entityToSave as T;
  }

  // Explicitly map frontend entity to exact Google Sheet header names
  const sheetRow = mapEntityToSheetRow(storeName, entityToSave);
  const action = index >= 0 ? 'update' : 'create';
  const res = await apiMutate(sheetName, action, sheetRow, id);

  // If GAS returned a generated UUID for create, update local cache and entity ID
  if (action === 'create' && res && res.id && res.id !== id) {
    const assignedId = String(res.id);
    entityToSave.id = assignedId;
    const finalCached = getCachedStore<any>(storeName) || [];
    const itemIdx = finalCached.findIndex((i) => i.id === id);
    if (itemIdx >= 0) {
      finalCached[itemIdx] = { ...finalCached[itemIdx], id: assignedId };
      setCachedStore(storeName, finalCached);
    }
  }

  return entityToSave as T;
}

export async function putItemsInStore<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const sheetName = SHEET_NAMES[storeName] || storeName;

  // Update local cache
  setCachedStore(storeName, items);

  if (storeName === 'settings') {
    return;
  }

  // Insert items to Google Apps Script mapped to exact sheet headers
  for (const item of items) {
    const anyItem = item as any;
    const id = anyItem.id || anyItem.key;
    const sheetRow = mapEntityToSheetRow(storeName, item);
    await apiMutate(sheetName, 'create', sheetRow, id);
  }
}

export async function deleteItemFromStore(storeName: StoreName, id: string): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;

  // Update local cache
  const cached = getCachedStore<any>(storeName) || [];
  const filtered = cached.filter((i) => (i.id ? i.id !== id : i.key !== id));
  setCachedStore(storeName, filtered);

  if (storeName === 'settings') {
    return;
  }

  await apiMutate(sheetName, 'delete', undefined, id);
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;
  setCachedStore(storeName, []);

  if (storeName === 'settings') {
    return;
  }

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
    emiPayments,
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
    getAllFromStore<Account>('accounts'),
    getAllFromStore<Income>('incomes'),
    getAllFromStore<Expense>('expenses'),
    getAllFromStore<EmiLoan>('emis'),
    getAllFromStore<EmiPayment>('emiPayments'),
    getAllFromStore<AccountTransfer>('transfers'),
    getAllFromStore<CreditCard>('creditCards'),
    getAllFromStore<CreditCardBill>('creditCardBills'),
    getAllFromStore<SavingsGoal>('savingsGoals'),
    getAllFromStore<RecurringBill>('recurringBills'),
    getAllFromStore<TaxSavingItem>('taxSavings'),
    getAllFromStore<BudgetCategory>('budgetCategories'),
    getAllFromStore<NetWorthSnapshot>('netWorthSnapshots'),
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
    emiPayments,
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
  if (Array.isArray(data.emiPayments) && data.emiPayments.length > 0) {
    await putItemsInStore('emiPayments', data.emiPayments);
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
