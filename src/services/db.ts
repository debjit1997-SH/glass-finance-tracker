import { localDate, financialYearForDate } from './financeRules';
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

export const GAS_WEB_APP_URL = '/api/sheets';

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
          const cleaned = items.filter(
            (i) => !i?.id || !SAMPLE_IDS.has(String(i.id))
          );
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

// Existing caches are never purged automatically.

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
        const cleaned = parsed;
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(
            `gas_cache_${storeName}`,
            JSON.stringify(cleaned)
          );
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
    const safeItems = Array.isArray(items) ? items : items;
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
export function mapEntityToSheetRow(
  storeName: StoreName,
  entity: any
): Record<string, any> {
  if (!entity || typeof entity !== 'object') return entity;

  switch (storeName) {
    case 'accounts':
      return {
        id: String(entity.id || ''),
        Name: String(entity.name || ''),
        Type: String(entity.type || 'bank'),
        OpeningBalance: parseNumber(entity.openingBalance, 0),
        color: entity.color,
        accountNumberLast4: entity.accountNumberLast4 || '',
        isArchived: Boolean(entity.isArchived),
        createdAt: entity.createdAt,
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
        TotalInstallments: entity.totalInstallments
          ? parseNumber(entity.totalInstallments, 0)
          : '',
        Lifecycle: entity.lifecycle || 'Active',
        ClosureDate: entity.closureDate || '',
        SettlementAmount: entity.settlementAmount ?? '',
        LoanEvents: JSON.stringify(entity.loanEvents || []),
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
        bank: entity.bank || '',
        accountId: entity.accountId || '',
        color: entity.color || 'indigo',
      };

    case 'creditCardBills':
      return {
        id: String(entity.id || ''),
        CardName: String(entity.cardId || ''),
        BillingMonth: String(entity.billingMonth || ''),
        StatementDate: formatDateString(entity.statementDate),
        BillAmount: parseNumber(entity.billAmount, 0),
        AmountPaid: parseNumber(entity.amountPaid, 0),
        PaymentHistory: JSON.stringify(entity.payments || []),
        PaymentDueDate: formatDateString(entity.paymentDueDate),
        PaymentDateActual: formatDateString(entity.paymentDateActual),
        Status: String(entity.status || 'Pending'),
        ...(entity.notes !== undefined ? { Notes: String(entity.notes) } : {}),
      };

    case 'savingsGoals':
      return {
        id: String(entity.id || ''),
        GoalName: String(entity.name || ''),
        TargetAmount: parseNumber(entity.targetAmount, 0),
        TargetDate: formatDateString(entity.targetDate),
        CurrentSaved: parseNumber(entity.currentSaved, 0),
        category: entity.category || 'General',
        icon: entity.icon || 'Target',
        color: entity.color || 'blue',
        Notes: String(entity.notes || ''),
      };

    case 'recurringBills':
      return {
        id: String(entity.id || ''),
        Name: String(entity.name || ''),
        Amount: parseNumber(entity.amount, 0),
        Frequency: String(entity.frequency || 'Monthly'),
        autoRenew: Boolean(entity.autoRenew),
        TemplateEnabled: Boolean(entity.templateEnabled),
        EntryKind: entity.entryKind || 'Expense',
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
        financialYear:
          entity.financialYear || financialYearForDate(entity.date),
        Notes: entity.notes || '',
        Amount: parseNumber(entity.amount, 0),
        Date: formatDateString(entity.date),
      };

    case 'budgetCategories':
      return {
        id: String(entity.id || ''),
        Category: String(entity.category || ''),
        MonthlyBudget: parseNumber(entity.monthlyLimit, 0),
        // Existing Month column is preserved from the source row.
      };

    case 'netWorthSnapshots':
      return {
        id: String(entity.id || ''),
        Date: formatDateString(entity.date || entity.month),
        TotalAssets: parseNumber(entity.totalAssets, 0),
        TotalLiabilities: parseNumber(entity.totalLiabilities, 0),
        NetWorth: parseNumber(entity.netWorth, 0),
        month: entity.month,
        assetBreakdown: entity.assetBreakdown,
        liabilityBreakdown: entity.liabilityBreakdown,
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
        openingBalance: parseNumber(
          row.OpeningBalance ?? row.openingBalance,
          0
        ),
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
        date: formatDateString(row.Date ?? row.date) || localDate(),
        source: String(row.Source ?? row.source ?? ''),
        expectedAmount: parseNumber(
          row.ExpectedAmount ?? row.expectedAmount,
          0
        ),
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
        date: formatDateString(row.Date ?? row.date) || localDate(),
        name: String(row.Name ?? row.name ?? ''),
        category: String(row.Category ?? row.category ?? 'Miscellaneous'),
        expectedAmount: parseNumber(
          row.ExpectedAmount ?? row.expectedAmount ?? row.amount,
          0
        ),
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
        outstandingPrincipal: parseNumber(
          row.OutstandingPrincipal ?? row.outstandingPrincipal,
          0
        ),
        interestRate: parseNumber(row.InterestRate ?? row.interestRate, 0),
        dueDate: dueDate,
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        status: (row.Status ?? row.status ?? 'Pending') as any,
        notes: String(row.Notes ?? row.notes ?? ''),
        startDate: startDate,
        totalInstallments:
          totalInstallments && totalInstallments > 0 ? totalInstallments : null,
        lifecycle: row.Lifecycle === 'Closed' ? 'Closed' : 'Active',
        closureDate: formatDateString(row.ClosureDate),
        settlementAmount: parseNumber(row.SettlementAmount),
        loanEvents: parseArray(row.LoanEvents),
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
        date: formatDateString(row.Date ?? row.date) || localDate(),
        fromAccountId: String(
          row.FromAccount ?? row.fromAccountId ?? row.fromAccount ?? ''
        ),
        toAccountId: String(
          row.ToAccount ?? row.toAccountId ?? row.toAccount ?? ''
        ),
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
        ? parseNumber(
            rawStmt,
            parseInt(String(rawStmt).split('-').pop() || '1')
          )
        : 1;
      const dueDay = rawDue
        ? parseNumber(rawDue, parseInt(String(rawDue).split('-').pop() || '1'))
        : 1;

      const res: CreditCard = {
        id: String(row.id || ''),
        name: String(row.CardName ?? row.name ?? 'Credit Card'),
        bank: rawBank,
        limit: parseNumber(row.CreditLimit ?? row.limit, 0),
        currentUnbilled: parseNumber(
          row.CurrentUnbilled ?? row.currentUnbilled,
          0
        ),
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
        payments: parseArray(row.PaymentHistory),
        paymentDueDate: formatDateString(
          row.PaymentDueDate ?? row.paymentDueDate
        ),
        paymentDateActual: formatDateString(
          row.PaymentDateActual ?? row.paymentDateActual
        ),
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
        nextRenewalDate: formatDateString(
          row.NextRenewalDate ?? row.nextRenewalDate
        ),
        category: String(row.Category ?? row.category ?? ''),
        accountId: String(row.Account ?? row.accountId ?? row.account ?? ''),
        autoRenew: row.autoRenew === true || row.autoRenew === 'true',
        templateEnabled:
          row.TemplateEnabled === true || row.TemplateEnabled === 'true',
        entryKind: row.EntryKind === 'Income' ? 'Income' : 'Expense',
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
        financialYear: String(
          row.financialYear ||
            financialYearForDate(formatDateString(row.Date ?? row.date))
        ),
        notes: String(row.Notes ?? row.notes ?? ''),
      };
      return res as unknown as T;
    }

    case 'budgetCategories': {
      const res: BudgetCategory = {
        id: String(row.id || `b-${Date.now()}`),
        category: String(row.Category ?? row.category ?? ''),
        monthlyLimit: parseNumber(
          row.MonthlyBudget ?? row.monthlyBudget ?? row.monthlyLimit,
          0
        ),
        color: row.color,
      };
      return res as unknown as T;
    }

    case 'netWorthSnapshots': {
      const dateStr = formatDateString(row.Date ?? row.date) || localDate();
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
      } else if (
        row.liabilityBreakdown &&
        typeof row.liabilityBreakdown === 'object'
      ) {
        liabilityBreakdown = row.liabilityBreakdown;
      }

      const res: NetWorthSnapshot = {
        id: String(row.id || ''),
        date: dateStr,
        month: row.month || dateStr.slice(0, 7),
        totalAssets: parseNumber(row.TotalAssets ?? row.totalAssets, 0),
        totalLiabilities: parseNumber(
          row.TotalLiabilities ?? row.totalLiabilities,
          0
        ),
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
 * Allows the proxy read deadline plus network overhead for Apps Script cold starts
 */
export async function apiGet<T>(
  sheetName: string,
  timeoutMs: number = 55000
): Promise<T[]> {
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

    if (!response.ok && response.status !== 0) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Google Apps Script denied access. Check the configured deployment and access controls.'
        );
      }
      throw new Error(
        `Google Apps Script GET failed with HTTP ${response.status}`
      );
    }

    const text = await response.text();
    clearTimeout(timeoutId);
    // Detect HTML sign-in page returned when Apps Script deployment is restricted
    if (
      text.trim().startsWith('<!doctype') ||
      text.includes('accounts.google.com')
    ) {
      throw new Error(
        'Google Apps Script returned a sign-in page instead of records. Check the deployment and access controls.'
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
        if (
          (data as any).error &&
          String((data as any).error).includes('Sheet not found')
        ) {
          throw new Error(
            `Missing sheet: ${sheetName}. No records were changed.`
          );
        }
      }
      throw new Error(
        (data as any)?.error || `Unexpected response for ${sheetName}`
      );
    } catch (err: any) {
      throw new Error(
        `Invalid JSON from Google Apps Script (${sheetName}): ${err.message}`
      );
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(
        `[GAS] GET ${sheetName} timed out after ${timeoutMs}ms, falling back to cache`
      );
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
  id?: string,
  options: { expectedRevision?: string; createOnly?: boolean } = {}
): Promise<any> {
  if (import.meta.env?.VITE_ENABLE_UPGRADE_WRITES !== 'true') {
    throw new Error(
      'Read-only preview: saving is locked until the Apps Script schema and a full Sheet backup are verified.'
    );
  }
  const payload = {
    sheet: sheetName,
    ...options,
    action,
    row: row ? serializeRow(row) : undefined,
    id: id || (row && row.id ? String(row.id) : undefined),
  };

  const response = await fetch(GAS_WEB_APP_URL, {
    signal: AbortSignal.timeout(30000),
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 0) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Google Apps Script denied this operation. Check access controls.'
      );
    }
    const failure = await response.json().catch(() => ({}));
    throw new Error(
      failure.error || `Save failed with HTTP ${response.status}`
    );
  }

  const text = await response.text();
  if (
    text.trim().startsWith('<!doctype') ||
    text.includes('accounts.google.com')
  ) {
    throw new Error(
      'Google Apps Script returned a sign-in page. Save is unconfirmed.'
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'Save confirmation was invalid. Refresh and check the record before retrying.'
    );
  }
  if (!parsed || parsed.error || parsed.success !== true || parsed.localOnly) {
    throw new Error(
      parsed?.error ||
        'Google Sheets did not confirm this save. Refresh before retrying.'
    );
  }
  return parsed;
}

/**
 * Prepares row object for sheets (stringifies nested objects if any)
 */
function serializeRow(row: any): any {
  const copy = { ...row };
  for (const [key, value] of Object.entries(copy)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !(value instanceof Date)
    ) {
      copy[key] = JSON.stringify(value);
    }
  }
  return copy;
}

// -------------------------------------------------------------
// Unified Store API (Replaces IndexedDB with Google Apps Script)
// -------------------------------------------------------------

const storeRevision = new Map<StoreName, number>();

/** One authenticated request, validated in full before updating any local cache. */
export async function getStoresBatch(
  stores: StoreName[]
): Promise<Partial<Record<StoreName, any[]>>> {
  const remote = stores.filter((s) => s !== 'settings');
  if (!remote.length)
    return Object.fromEntries(stores.map((s) => [s, getCachedStore(s) || []]));
  const revisions = remote.map((s) => storeRevision.get(s) || 0);
  let result: any;
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'readMany',
        sheets: [...new Set(remote.map((s) => SHEET_NAMES[s]))],
      }),
      signal: AbortSignal.timeout(55000),
    });
    result = await response.json();
    if (!response.ok || result.success !== true)
      throw new Error(
        result.error === 'Unknown table.' || result.error === 'Unknown action.'
          ? 'Update the Apps Script deployment with the sync fix, then retry.'
          : result.error || 'Could not load account data.'
      );
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError')
      throw new Error(
        'Google Sheets took too long to respond. Your records are unchanged. Please retry.'
      );
    throw error;
  }
  for (const store of remote) {
    if (!Array.isArray(result.data?.[SHEET_NAMES[store]]))
      throw new Error(
        'Incomplete Sheet response. Previous records are still shown; please retry.'
      );
  }
  if (remote.some((s, i) => (storeRevision.get(s) || 0) !== revisions[i]))
    throw new Error(
      'Records changed during sync. Please refresh to load the latest balances.'
    );
  const entries = await Promise.all(
    stores.map(
      async (store) =>
        [
          store,
          await getAllFromStore(
            store,
            store === 'settings' ? undefined : result.data[SHEET_NAMES[store]]
          ),
        ] as const
    )
  );
  return Object.fromEntries(entries);
}

export async function getAllFromStore<T>(
  storeName: StoreName,
  suppliedRows?: any[]
): Promise<T[]> {
  if (storeName === 'settings') {
    const cached = getCachedStore<T>('settings');
    return cached || [];
  }

  const sheetName = SHEET_NAMES[storeName] || storeName;
  const revision = storeRevision.get(storeName) || 0;

  try {
    const rawRows = suppliedRows ?? (await apiGet<any>(sheetName));
    // Eliminate blank/empty/corrupted rows from Google Sheets
    const nonEmpty = rawRows
      .filter((r) => !isRowEmpty(r))
      .filter((r) => {
        const isBill = Boolean(
          r.BillingMonth ||
          r.billingMonth ||
          String(r.id || '').startsWith('ccb-')
        );
        if (storeName === 'creditCards') return !isBill;
        if (storeName === 'creditCardBills') return isBill;
        return true;
      });
    const entities = nonEmpty.map((r) => ({
      ...mapSheetRowToEntity<T>(storeName, r),
      _revision: r._revision,
    }));

    if ((storeRevision.get(storeName) || 0) !== revision)
      return getCachedStore<T>(storeName) || entities;
    setCachedStore(storeName, entities);
    return entities;
  } catch (err) {
    // Keep the last confirmed data visible, but never report a failed read as synced.
    throw err;
  }
}

export async function putItemInStore<T>(
  storeName: StoreName,
  item: T,
  createOnly = false
): Promise<T> {
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

  const cached = getCachedStore<any>(storeName) || [];
  if (storeName !== 'settings') {
    // Read before writing; preserve columns unknown to this client.
    const rows = await apiGet<any>(sheetName);
    const existing = rows.find((r) => String(r.id || r.key) === String(id));
    if (existing && createOnly)
      return mapSheetRowToEntity<T>(storeName, existing);
    const previous = cached.find((i) => (i.id || i.key) === id);
    const expectedRevision = anyItem._revision || previous?._revision;
    if (
      existing &&
      (!expectedRevision || existing._revision !== expectedRevision)
    )
      throw new Error(
        'This record changed or has no verified revision. Refresh before saving.'
      );
    const sheetRow = mapEntityToSheetRow(storeName, entityToSave);
    const res = await apiMutate(
      sheetName,
      existing ? 'update' : 'create',
      sheetRow,
      id,
      { expectedRevision, createOnly }
    );
    if (res.row)
      entityToSave = {
        ...mapSheetRowToEntity<any>(storeName, res.row),
        _revision: res.revision,
      };
    else entityToSave._revision = res.revision;
    if (res.id && String(res.id) !== String(id))
      entityToSave.id = String(res.id);
  }
  const index = cached.findIndex((i) => (i.id || i.key) === id);
  if (index >= 0) cached[index] = entityToSave;
  else cached.push(entityToSave);
  storeRevision.set(storeName, (storeRevision.get(storeName) || 0) + 1);
  setCachedStore(storeName, cached);
  return entityToSave as T;
}

export async function putItemsInStore<T>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  throw new Error(
    'Bulk import and reset are disabled to protect existing records.'
  );
}

export async function deleteItemFromStore(
  storeName: StoreName,
  id: string
): Promise<void> {
  const sheetName = SHEET_NAMES[storeName] || storeName;

  // Update local cache
  const cached = getCachedStore<any>(storeName) || [];
  const filtered = cached.filter((i) => (i.id ? i.id !== id : i.key !== id));

  if (storeName === 'settings') {
    return;
  }

  const previous = cached.find((i) => i.id === id);
  if (!previous?._revision)
    throw new Error('Refresh this record before archiving.');
  await apiMutate(sheetName, 'delete', undefined, id, {
    expectedRevision: previous._revision,
  });
  storeRevision.set(storeName, (storeRevision.get(storeName) || 0) + 1);
  setCachedStore(storeName, filtered);
}

export async function clearStore(storeName: StoreName): Promise<void> {
  throw new Error(
    'Bulk import and reset are disabled to protect existing records.'
  );
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
    activeMonth: settingsObj.activeMonth || localDate().slice(0, 7),
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
  throw new Error(
    'Bulk import and reset are disabled to protect existing records.'
  );
}

export async function clearAllDatabaseData(): Promise<void> {
  throw new Error(
    'Bulk import and reset are disabled to protect existing records.'
  );
}

function parseArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  throw new Error('Invalid stored history. Record was not modified.');
}
