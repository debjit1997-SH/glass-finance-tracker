export type AccountType = 'bank' | 'cash' | 'credit_card' | 'investment' | 'wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  accountNumberLast4?: string;
  isArchived?: boolean;
  createdAt: string;
}

export type IncomeStatus = 'Pending' | 'Received';

export interface Income {
  id: string;
  date: string; // YYYY-MM-DD
  source: string;
  expectedAmount: number;
  actualAmount: number;
  accountId: string; // Account Credited
  actualDate: string; // YYYY-MM-DD
  status: IncomeStatus;
  notes?: string;
}

export type ExpenseStatus = 'Pending' | 'Paid' | 'Overdue';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: string;
  expectedAmount: number;
  actualAmount: number;
  accountId: string; // Account Debited
  actualDate: string; // YYYY-MM-DD
  status: ExpenseStatus;
  notes?: string;
}

export type EmiStatus = 'Pending' | 'Paid' | 'Overdue';

export interface LoanEvent {
  id: string;
  kind: 'Foreclosure' | 'Part-payment';
  date: string;
  amount: number;
  accountId: string;
  note: string;
  revisedPrincipal?: number;
  previousPrincipal: number;
  previousMonthlyAmount: number;
  previousTotalInstallments?: number | null;
}

export interface EmiLoan {
  lifecycle?: 'Active' | 'Closed';
  closureDate?: string;
  settlementAmount?: number;
  loanEvents?: LoanEvent[];
  id: string;
  loanName: string;
  lender: string;
  monthlyAmount: number;
  outstandingPrincipal: number;
  interestRate: number; // Annual %
  dueDate: string; // YYYY-MM-DD
  accountId: string; // Account Debited
  status: EmiStatus;
  notes?: string;
  startDate?: string; // YYYY-MM-DD (first instalment date; defaults to dueDate)
  totalInstallments?: number | null; // optional; null/undefined/blank means ongoing loan
}

export interface EmiPayment {
  id: string;
  loanId: string;
  month: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  amount: number;
  status: EmiStatus;
  paidDate?: string; // YYYY-MM-DD
  paidAmount?: number;
  accountId: string; // Account Debited
}

export interface MonthlyEmiInstance {
  id: string;
  loanId: string;
  loan: EmiLoan;
  month: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  amount: number;
  status: EmiStatus;
  paidDate?: string;
  paidAmount?: number;
  accountId: string;
  paymentId?: string;
  installmentNumber?: number;
  totalInstallments?: number | null;
  installmentsPaid?: number;
  installmentsRemaining?: number;
}

export interface AccountTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason: string;
  status: 'Pending' | 'Completed';
  notes?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  limit: number;
  currentUnbilled: number;
  accountId: string; // Linked card account
  color: string;
  statementDay: number;
  dueDay: number;
}

export type CreditCardBillStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue';

export interface CreditCardBill {
  payments?: { id: string; date: string; amount: number }[];
  id: string;
  cardId: string;
  billingMonth: string; // YYYY-MM
  statementDate: string; // YYYY-MM-DD
  billAmount: number;
  amountPaid: number;
  paymentDueDate: string; // YYYY-MM-DD
  paymentDateActual: string; // YYYY-MM-DD
  status: CreditCardBillStatus;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
  currentSaved: number;
  category: string;
  icon: string;
  color: string;
  notes?: string;
}

export type BillFrequency = 'Monthly' | 'Quarterly' | 'Yearly';

export interface RecurringBill {
  templateEnabled?: boolean;
  entryKind?: 'Income' | 'Expense';
  id: string;
  name: string;
  amount: number;
  frequency: BillFrequency;
  nextRenewalDate: string; // YYYY-MM-DD
  category: string;
  accountId: string;
  autoRenew: boolean;
  notes?: string;
}

export interface TaxSavingItem {
  id: string;
  financialYear: string; // e.g. "2026-2027"
  name: string;
  section: '80C' | '80D';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  category: string;
  monthlyLimit: number;
  color?: string;
}

export interface NetWorthSnapshot {
  id: string;
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: {
    liquidAccounts: number;
    investments: number;
    cash: number;
  };
  liabilityBreakdown: {
    emiPrincipal: number;
    creditCards: number;
  };
}

export interface UserSettings {
  currency: string;
  savingsRateTarget: number; // in percentage e.g. 20
  emergencyFundTargetMonths: number; // e.g. 6
  section80cLimit: number; // 150000
  section80dLimit: number; // 25000
  activeMonth: string; // YYYY-MM
}

export interface AppDatabaseSchema {
  version: number;
  exportedAt: string;
  accounts: Account[];
  incomes: Income[];
  expenses: Expense[];
  emis: EmiLoan[];
  emiPayments: EmiPayment[];
  transfers: AccountTransfer[];
  creditCards: CreditCard[];
  creditCardBills: CreditCardBill[];
  savingsGoals: SavingsGoal[];
  recurringBills: RecurringBill[];
  taxSavings: TaxSavingItem[];
  budgetCategories: BudgetCategory[];
  netWorthSnapshots: NetWorthSnapshot[];
  settings: UserSettings;
}

export interface DueSoonItem {
  id: string;
  source: 'Expense' | 'EMI' | 'RecurringBill';
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  daysRemaining: number;
  isOverdue: boolean;
  accountId?: string;
  accountName?: string;
  category?: string;
  rawItem: Expense | EmiLoan | RecurringBill;
}
