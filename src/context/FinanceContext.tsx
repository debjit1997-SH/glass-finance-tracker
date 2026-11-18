import { localDate } from '../services/financeRules';
import {
  addMonthsClamped,
  applyBillPayment,
  outstandingPrincipal,
} from '../services/financeRules';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Account,
  Income,
  Expense,
  EmiLoan,
  EmiPayment,
  MonthlyEmiInstance,
  AccountTransfer,
  CreditCard,
  CreditCardBill,
  SavingsGoal,
  RecurringBill,
  TaxSavingItem,
  BudgetCategory,
  NetWorthSnapshot,
  UserSettings,
  DueSoonItem,
} from '../types/finance';
import * as db from '../services/db';
import { getSampleDatabase } from '../services/sampleData';
import {
  calculateLiveBalances,
  calculateDashboardMetrics,
  getDueSoonItems,
  calculateEmergencyFundHealth,
  calculateTaxSavings,
  deriveDueDateForMonth,
  getMonthlyEmiInstances,
} from '../services/calculations';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface FinanceContextType {
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  refreshAllFromDB: () => Promise<void>;
  loadPageData: (page: string, force?: boolean) => Promise<void>;
  isPageLoading: (page: string) => boolean;
  isStoreLoading: (store: db.StoreName) => boolean;
  dismissSyncError: () => void;

  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => Promise<void>;
  prevMonth: () => Promise<void>;
  nextMonth: () => Promise<void>;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Data
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

  // Derived Reactive Data
  monthlyEmiInstances: MonthlyEmiInstance[];
  liveBalances: Map<string, number>;
  dashboardMetrics: ReturnType<typeof calculateDashboardMetrics>;
  dueSoonItems: DueSoonItem[];
  emergencyHealth: ReturnType<typeof calculateEmergencyFundHealth>;
  taxMetrics: ReturnType<typeof calculateTaxSavings>;

  // Mutators
  addAccount: (
    account: Omit<Account, 'id' | 'createdAt'> & { id?: string }
  ) => Promise<Account>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addIncome: (income: Omit<Income, 'id'>) => Promise<void>;
  updateIncome: (income: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  markIncomeReceived: (id: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markExpensePaid: (id: string) => Promise<void>;

  addEmi: (emi: Omit<EmiLoan, 'id'>) => Promise<void>;
  updateEmi: (emi: EmiLoan) => Promise<void>;
  deleteEmi: (id: string) => Promise<void>;
  markEmiPaid: (
    loanId: string,
    month?: string,
    paidAmount?: number,
    paidDate?: string,
    accountId?: string
  ) => Promise<void>;
  markEmiUnpaid: (loanId: string, month?: string) => Promise<void>;
  updateEmiPayment: (payment: EmiPayment) => Promise<void>;

  addTransfer: (transfer: Omit<AccountTransfer, 'id'>) => Promise<void>;
  updateTransfer: (transfer: AccountTransfer) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (card: CreditCard) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  addCreditCardBill: (bill: Omit<CreditCardBill, 'id'>) => Promise<void>;
  payCreditCardBill: (
    billId: string,
    paymentDate: string,
    amount: number
  ) => Promise<void>;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  contributeToGoal: (
    goalId: string,
    amount: number,
    fromAccountId: string
  ) => Promise<void>;

  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<void>;
  updateRecurringBill: (bill: RecurringBill) => Promise<void>;
  deleteRecurringBill: (id: string) => Promise<void>;
  markRecurringBillPaid: (billId: string) => Promise<void>;

  addTaxSaving: (item: Omit<TaxSavingItem, 'id'>) => Promise<void>;
  updateTaxSaving: (item: TaxSavingItem) => Promise<void>;
  deleteTaxSaving: (id: string) => Promise<void>;

  updateBudgetCategoryLimit: (
    categoryName: string,
    limit: number
  ) => Promise<void>;
  createMonthlyNetWorthSnapshot: () => Promise<void>;

  // Backup & Presets
  loadSampleDataset: () => Promise<void>;
  resetToEmpty: () => Promise<void>;
  exportJSON: () => Promise<string>;
  importJSON: (jsonString: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const PAGE_STORE_MAP: Record<string, db.StoreName[]> = {
  dashboard: [
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
    'budgetCategories',
  ],
  accounts: ['accounts', 'transfers'],
  'account-adjustment': [
    'accounts',
    'incomes',
    'expenses',
    'transfers',
    'emis',
    'emiPayments',
  ],
  income: ['incomes', 'accounts'],
  expenses: ['expenses', 'accounts', 'creditCards', 'budgetCategories'],
  budget: ['budgetCategories', 'expenses'],
  emi: ['emis', 'emiPayments', 'accounts'],
  transfers: ['transfers', 'accounts'],
  'credit-cards': ['creditCards', 'creditCardBills', 'accounts'],
  'savings-goals': ['savingsGoals', 'accounts', 'expenses'],
  'net-worth': [
    'netWorthSnapshots',
    'accounts',
    'emis',
    'emiPayments',
    'creditCards',
    'creditCardBills',
    'incomes',
    'expenses',
    'transfers',
  ],
  'recurring-bills': ['recurringBills', 'accounts'],
  'tax-saver': ['taxSavings'],
  runway: ['accounts', 'expenses', 'incomes', 'emis', 'emiPayments'],
};

PAGE_STORE_MAP.all = db.STORES.filter((s) => s !== 'settings');

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const currentMonthInitial = localDate().slice(0, 7);

  // Clean initial state: hydrated ONLY from sanitized local cache or empty arrays.
  // Zero fabricated/dummy entries!
  const [accounts, setAccounts] = useState<Account[]>(
    () => db.getCachedStore<Account>('accounts') || []
  );
  const [incomes, setIncomes] = useState<Income[]>(
    () => db.getCachedStore<Income>('incomes') || []
  );
  const [expenses, setExpenses] = useState<Expense[]>(
    () => db.getCachedStore<Expense>('expenses') || []
  );
  const [emis, setEmis] = useState<EmiLoan[]>(
    () => db.getCachedStore<EmiLoan>('emis') || []
  );
  const [emiPayments, setEmiPayments] = useState<EmiPayment[]>(
    () => db.getCachedStore<EmiPayment>('emiPayments') || []
  );
  const [transfers, setTransfers] = useState<AccountTransfer[]>(
    () => db.getCachedStore<AccountTransfer>('transfers') || []
  );
  const [creditCards, setCreditCards] = useState<CreditCard[]>(
    () => db.getCachedStore<CreditCard>('creditCards') || []
  );
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBill[]>(
    () => db.getCachedStore<CreditCardBill>('creditCardBills') || []
  );
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(
    () => db.getCachedStore<SavingsGoal>('savingsGoals') || []
  );
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(
    () => db.getCachedStore<RecurringBill>('recurringBills') || []
  );
  const [taxSavings, setTaxSavings] = useState<TaxSavingItem[]>(
    () => db.getCachedStore<TaxSavingItem>('taxSavings') || []
  );
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(
    () =>
      db.getCachedStore<BudgetCategory>('budgetCategories') ||
      db.DEFAULT_BUDGET_CATEGORIES
  );
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<
    NetWorthSnapshot[]
  >(() => db.getCachedStore<NetWorthSnapshot>('netWorthSnapshots') || []);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const cached = db.getCachedStore<any>('settings');
    const map = new Map<string, any>();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      cached.forEach((s: any) => map.set(s.key, s.value));
    }
    return {
      currency: map.get('currency') || '₹',
      savingsRateTarget: map.get('savingsRateTarget') ?? 20,
      emergencyFundTargetMonths: map.get('emergencyFundTargetMonths') ?? 6,
      section80cLimit: map.get('section80cLimit') ?? 150000,
      section80dLimit: map.get('section80dLimit') ?? 25000,
      activeMonth: map.get('activeMonth') || currentMonthInitial,
    };
  });

  const [selectedMonth, setSelectedMonth] = useState(
    () => settings.activeMonth || currentMonthInitial
  );

  // Loading and Sync States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Per-store loading tracking for progressive rendering
  const [loadingStores, setLoadingStores] = useState<Record<string, boolean>>(
    {}
  );
  const fetchedStoresRef = useRef<Set<db.StoreName>>(new Set());
  const mutationCount = useRef(0);
  const inFlightStoresRef = useRef<Set<db.StoreName>>(new Set());

  // Applies fetched sheet data directly, fully replacing state even when a sheet is empty
  const applyStoreData = useCallback((storeName: db.StoreName, data: any[]) => {
    if (!Array.isArray(data)) return;
    switch (storeName) {
      case 'accounts':
        setAccounts(data);
        break;
      case 'incomes':
        setIncomes(data);
        break;
      case 'expenses':
        setExpenses(data);
        break;
      case 'emis':
        setEmis(data);
        break;
      case 'emiPayments':
        setEmiPayments(data);
        break;
      case 'transfers':
        setTransfers(data);
        break;
      case 'creditCards':
        setCreditCards(data);
        break;
      case 'creditCardBills':
        setCreditCardBills(data);
        break;
      case 'savingsGoals':
        setSavingsGoals(data);
        break;
      case 'recurringBills':
        setRecurringBills(data);
        break;
      case 'taxSavings':
        setTaxSavings(data);
        break;
      case 'budgetCategories':
        setBudgetCategories(
          data.length > 0 ? data : db.DEFAULT_BUDGET_CATEGORIES
        );
        break;
      case 'netWorthSnapshots':
        setNetWorthSnapshots(data);
        break;
    }
  }, []);

  const isStoreLoading = useCallback(
    (store: db.StoreName) => !!loadingStores[store],
    [loadingStores]
  );

  const isPageLoading = useCallback(
    (tab: string) => {
      const reqStores = PAGE_STORE_MAP[tab] || [];
      return reqStores.some(
        (s) => loadingStores[s] && !fetchedStoresRef.current.has(s)
      );
    },
    [loadingStores]
  );

  // Lazy, per-page loader parallelized with Promise.all
  // Total wait time is bounded by the single slowest sheet required by the current page
  const loadPageData = useCallback(
    async (page: string, force = false) => {
      const requiredStores = PAGE_STORE_MAP[page] || ['accounts', 'expenses'];
      const storesToFetch = requiredStores.filter(
        (s) =>
          !inFlightStoresRef.current.has(s) &&
          (force || !fetchedStoresRef.current.has(s))
      );

      if (storesToFetch.length === 0) return;

      // Mark stores as in-flight immediately to prevent concurrent re-fetches
      storesToFetch.forEach((s) => inFlightStoresRef.current.add(s));

      setLoadingStores((prev) => {
        const next = { ...prev };
        storesToFetch.forEach((s) => {
          next[s] = true;
        });
        return next;
      });
      setIsSyncing(true);
      setSyncStatus('syncing');

      const errors: string[] = [];
      try {
        await Promise.all(
          storesToFetch.map(async (store) => {
            try {
              const data = await db.getAllFromStore<any>(store);
              fetchedStoresRef.current.add(store);
              // Do not replace a form's pending mutation with an older GET.
              if (mutationCount.current === 0) applyStoreData(store, data);
            } catch (err: any) {
              errors.push(`${store}: ${err.message}`);
            } finally {
              inFlightStoresRef.current.delete(store);
              setLoadingStores((prev) => ({ ...prev, [store]: false }));
            }
          })
        );

        if (errors.length) throw new Error(errors.join(' • '));
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err: any) {
        console.warn('[GAS] Load page data error:', err);
        setSyncStatus('error');
        setSyncError(err.message || 'Failed to sync with Google Sheets');
      } finally {
        setIsSyncing(false);
        setIsLoading(false);
      }
    },
    [applyStoreData]
  );

  // Refresh all stores or current active page
  const refreshAllFromDB = useCallback(async () => {
    fetchedStoresRef.current.clear();
    await loadPageData('all', true);
  }, [loadPageData]);

  // Derived Calculations
  const monthlyEmiInstances = useMemo(() => {
    return getMonthlyEmiInstances(emis, emiPayments, selectedMonth);
  }, [emis, emiPayments, selectedMonth]);

  const liveBalances = useMemo(() => {
    return calculateLiveBalances(
      accounts,
      incomes,
      expenses,
      transfers,
      emis,
      emiPayments
    );
  }, [accounts, incomes, expenses, transfers, emis, emiPayments]);

  const dashboardMetrics = useMemo(() => {
    return calculateDashboardMetrics(
      selectedMonth,
      accounts,
      liveBalances,
      incomes,
      expenses,
      emis,
      creditCards,
      emiPayments,
      creditCardBills
    );
  }, [
    selectedMonth,
    accounts,
    liveBalances,
    incomes,
    expenses,
    emis,
    creditCards,
    emiPayments,
    creditCardBills,
  ]);

  const dueSoonItems = useMemo(() => {
    return getDueSoonItems(
      expenses,
      emis,
      recurringBills,
      accounts,
      undefined,
      emiPayments
    );
  }, [expenses, emis, recurringBills, accounts, emiPayments]);

  const emergencyHealth = useMemo(() => {
    return calculateEmergencyFundHealth(savingsGoals, expenses, selectedMonth);
  }, [savingsGoals, expenses, selectedMonth]);

  const taxMetrics = useMemo(() => {
    return calculateTaxSavings(
      taxSavings,
      undefined,
      settings.section80cLimit,
      settings.section80dLimit
    );
  }, [taxSavings, settings.section80cLimit, settings.section80dLimit]);

  // Helper for background mutation sync with optimistic local state
  const runMutationWithSync = async <T,>(
    operation: () => Promise<T>
  ): Promise<T> => {
    mutationCount.current++;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const res = await operation();
      for (const store of db.STORES) {
        const confirmed = db.getCachedStore<any>(store);
        if (confirmed) applyStoreData(store, confirmed);
      }
      setSyncStatus('synced');
      setSyncError(null);
      return res;
    } catch (err: any) {
      console.warn('[GAS Mutation Warning]:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Failed to sync with Google Sheets');
      for (const store of db.STORES) {
        const committed = db.getCachedStore<any>(store);
        applyStoreData(store, committed || []);
      }
      throw err;
    } finally {
      mutationCount.current--;
      setIsSyncing(mutationCount.current > 0);
    }
  };

  const dismissSyncError = () => {
    setSyncError(null);
  };

  // Month navigation with persistent settings sync
  const changeSelectedMonth = async (newMonth: string) => {
    setSelectedMonth(newMonth);
    await db.putItemInStore('settings', {
      key: 'activeMonth',
      value: newMonth,
    });
  };

  const prevMonth = async () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let newM = m - 1;
    let newY = y;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    await changeSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const nextMonth = async () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let newM = m + 1;
    let newY = y;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    await changeSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  // Mutator actions
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    setSettings((current) => ({ ...current, ...newSettings }));
    for (const [key, value] of Object.entries(newSettings)) {
      await db.putItemInStore('settings', { key, value });
    }
  };

  // Accounts
  const addAccount = async (
    data: Omit<Account, 'id' | 'createdAt'> & { id?: string }
  ): Promise<Account> => {
    const tempId =
      data.id || `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newAcc: Account = {
      ...data,
      id: tempId,
      createdAt: localDate(),
    };
    setAccounts((prev) => [...prev, newAcc]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('accounts', newAcc);
      if (saved && saved.id && saved.id !== tempId) {
        newAcc = saved;
        setAccounts((prev) => prev.map((a) => (a.id === tempId ? saved : a)));
      }
    });
    return newAcc;
  };

  const updateAccount = async (account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    await runMutationWithSync(() => db.putItemInStore('accounts', account));
  };

  const deleteAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('accounts', id));
  };

  // Income
  const addIncome = async (data: Omit<Income, 'id'>) => {
    const tempId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newInc: Income = {
      ...data,
      id: tempId,
    };
    setIncomes((prev) => [newInc, ...prev]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('incomes', newInc);
      if (saved && saved.id && saved.id !== tempId) {
        newInc = saved;
        setIncomes((prev) => prev.map((i) => (i.id === tempId ? saved : i)));
      }
    });
  };

  const updateIncome = async (income: Income) => {
    setIncomes((prev) => prev.map((i) => (i.id === income.id ? income : i)));
    await runMutationWithSync(() => db.putItemInStore('incomes', income));
  };

  const deleteIncome = async (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('incomes', id));
  };

  const markIncomeReceived = async (id: string) => {
    const target = incomes.find((i) => i.id === id);
    if (!target) return;
    const updated: Income = {
      ...target,
      status: 'Received',
      actualAmount: target.expectedAmount,
      actualDate: localDate(),
    };
    await updateIncome(updated);
  };

  // Expenses
  const addExpense = async (data: Omit<Expense, 'id'>) => {
    const tempId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newExp: Expense = {
      ...data,
      id: tempId,
    };
    setExpenses((prev) => [newExp, ...prev]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('expenses', newExp);
      if (saved && saved.id && saved.id !== tempId) {
        newExp = saved;
        setExpenses((prev) => prev.map((e) => (e.id === tempId ? saved : e)));
      }
    });
  };

  const updateExpense = async (expense: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));
    await runMutationWithSync(() => db.putItemInStore('expenses', expense));
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('expenses', id));
  };

  const markExpensePaid = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;
    const updated: Expense = {
      ...target,
      status: 'Paid',
      actualAmount: target.expectedAmount,
      actualDate: localDate(),
    };
    await updateExpense(updated);
  };

  // EMIs
  const addEmi = async (data: Omit<EmiLoan, 'id'>) => {
    const tempId = `emi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const startDate = data.startDate || data.dueDate || localDate();
    let newEmi: EmiLoan = {
      ...data,
      id: tempId,
      startDate,
    };
    setEmis((prev) => [...prev, newEmi]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('emis', newEmi);
      if (saved && saved.id && saved.id !== tempId) {
        newEmi = saved;
        setEmis((prev) => prev.map((e) => (e.id === tempId ? saved : e)));
      }
    });

    // If marked Paid upon creation, record the payment row for the initial month
    if (data.status === 'Paid') {
      const initialMonth = startDate.slice(0, 7) || selectedMonth;
      await markEmiPaid(
        newEmi.id,
        initialMonth,
        newEmi.monthlyAmount,
        startDate,
        newEmi.accountId
      );
    }
  };

  const updateEmi = async (emi: EmiLoan) => {
    setEmis((prev) => prev.map((e) => (e.id === emi.id ? emi : e)));
    await runMutationWithSync(() => db.putItemInStore('emis', emi));
  };

  const deleteEmi = async (id: string) => {
    setEmis((prev) => prev.filter((e) => e.id !== id));
    const relatedPayments = emiPayments.filter((p) => p.loanId === id);
    setEmiPayments((prev) => prev.filter((p) => p.loanId !== id));

    await runMutationWithSync(async () => {
      await db.deleteItemFromStore('emis', id);
      for (const p of relatedPayments) {
        await db.deleteItemFromStore('emiPayments', p.id);
      }
    });
  };

  const markEmiPaid = async (
    loanId: string,
    targetMonth: string = selectedMonth,
    paidAmount?: number,
    paidDate?: string,
    accountId?: string
  ) => {
    const targetLoan = emis.find((e) => e.id === loanId);
    if (!targetLoan) return;

    const existingPayment = emiPayments.find(
      (p) => p.loanId === loanId && p.month === targetMonth
    );

    const actualPaidAmount =
      paidAmount !== undefined ? paidAmount : targetLoan.monthlyAmount;
    const actualPaidDate = paidDate || localDate();
    const actualAccountId = accountId || targetLoan.accountId;

    if (existingPayment) {
      const updatedPayment: EmiPayment = {
        ...existingPayment,
        status: 'Paid',
        paidAmount: actualPaidAmount,
        paidDate: actualPaidDate,
        accountId: actualAccountId,
      };
      setEmiPayments((prev) =>
        prev.map((p) => (p.id === existingPayment.id ? updatedPayment : p))
      );
      await runMutationWithSync(() =>
        db.putItemInStore('emiPayments', updatedPayment)
      );
    } else {
      const derivedDueDate = deriveDueDateForMonth(
        targetLoan.dueDate || targetLoan.startDate || `${targetMonth}-01`,
        targetMonth
      );
      const tempId = `emip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      let newPayment: EmiPayment = {
        id: tempId,
        loanId,
        month: targetMonth,
        dueDate: derivedDueDate,
        amount: targetLoan.monthlyAmount,
        status: 'Paid',
        paidDate: actualPaidDate,
        paidAmount: actualPaidAmount,
        accountId: actualAccountId,
      };

      setEmiPayments((prev) => [...prev, newPayment]);
      await runMutationWithSync(async () => {
        const saved = await db.putItemInStore('emiPayments', newPayment);
        if (saved && saved.id && saved.id !== tempId) {
          newPayment = saved;
          setEmiPayments((prev) =>
            prev.map((p) => (p.id === tempId ? saved : p))
          );
        }
      });
    }
  };

  const markEmiUnpaid = async (
    loanId: string,
    targetMonth: string = selectedMonth
  ) => {
    const existingPayment = emiPayments.find(
      (p) => p.loanId === loanId && p.month === targetMonth
    );
    if (existingPayment) {
      const updatedPayment: EmiPayment = {
        ...existingPayment,
        status: 'Pending',
        paidDate: undefined,
        paidAmount: 0,
      };
      setEmiPayments((prev) =>
        prev.map((p) => (p.id === existingPayment.id ? updatedPayment : p))
      );
      await runMutationWithSync(() =>
        db.putItemInStore('emiPayments', updatedPayment)
      );
    } else {
      const targetLoan = emis.find((e) => e.id === loanId);
      if (!targetLoan) return;
      const derivedDueDate = deriveDueDateForMonth(
        targetLoan.dueDate || targetLoan.startDate || `${targetMonth}-01`,
        targetMonth
      );
      const tempId = `emip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newPayment: EmiPayment = {
        id: tempId,
        loanId,
        month: targetMonth,
        dueDate: derivedDueDate,
        amount: targetLoan.monthlyAmount,
        status: 'Pending',
        accountId: targetLoan.accountId,
      };
      setEmiPayments((prev) => [...prev, newPayment]);
      await runMutationWithSync(() =>
        db.putItemInStore('emiPayments', newPayment)
      );
    }
  };

  const updateEmiPayment = async (payment: EmiPayment) => {
    setEmiPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? payment : p))
    );
    await runMutationWithSync(() => db.putItemInStore('emiPayments', payment));
  };

  // Transfers
  const addTransfer = async (data: Omit<AccountTransfer, 'id'>) => {
    const tempId = `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newTr: AccountTransfer = {
      ...data,
      id: tempId,
    };
    setTransfers((prev) => [newTr, ...prev]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('transfers', newTr);
      if (saved && saved.id && saved.id !== tempId) {
        newTr = saved;
        setTransfers((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      }
    });
  };

  const updateTransfer = async (transfer: AccountTransfer) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transfer.id ? transfer : t))
    );
    await runMutationWithSync(() => db.putItemInStore('transfers', transfer));
  };

  const deleteTransfer = async (id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('transfers', id));
  };

  // Credit Cards
  const addCreditCard = async (data: Omit<CreditCard, 'id'>) => {
    const tempId = `cc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newCard: CreditCard = {
      ...data,
      id: tempId,
    };
    setCreditCards((prev) => [...prev, newCard]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('creditCards', newCard);
      if (saved && saved.id && saved.id !== tempId) {
        newCard = saved;
        setCreditCards((prev) =>
          prev.map((c) => (c.id === tempId ? saved : c))
        );
      }
    });
  };

  const updateCreditCard = async (card: CreditCard) => {
    setCreditCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    await runMutationWithSync(() => db.putItemInStore('creditCards', card));
  };

  const deleteCreditCard = async (id: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('creditCards', id));
  };

  const addCreditCardBill = async (data: Omit<CreditCardBill, 'id'>) => {
    const tempId = `ccb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newBill: CreditCardBill = {
      ...data,
      id: tempId,
    };
    setCreditCardBills((prev) => [newBill, ...prev]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('creditCardBills', newBill);
      if (saved && saved.id && saved.id !== tempId) {
        newBill = saved;
        setCreditCardBills((prev) =>
          prev.map((b) => (b.id === tempId ? saved : b))
        );
      }
    });
  };

  const payCreditCardBill = async (
    billId: string,
    paymentDate: string,
    amount: number
  ) => {
    const bill = creditCardBills.find((b) => b.id === billId);
    if (!bill) throw new Error('Bill not found. Refresh and try again.');
    const updated = applyBillPayment(bill, amount, paymentDate);
    await runMutationWithSync(async () => {
      await db.putItemInStore('creditCardBills', updated);
      setCreditCardBills((prev) =>
        prev.map((b) => (b.id === billId ? updated : b))
      );
    });
    // A card payment is tracking-only. It never creates a bank transfer.
  };

  // Savings Goals
  const addSavingsGoal = async (data: Omit<SavingsGoal, 'id'>) => {
    const tempId = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newGoal: SavingsGoal = {
      ...data,
      id: tempId,
    };
    setSavingsGoals((prev) => [...prev, newGoal]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('savingsGoals', newGoal);
      if (saved && saved.id && saved.id !== tempId) {
        newGoal = saved;
        setSavingsGoals((prev) =>
          prev.map((g) => (g.id === tempId ? saved : g))
        );
      }
    });
  };

  const updateSavingsGoal = async (goal: SavingsGoal) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    await runMutationWithSync(() => db.putItemInStore('savingsGoals', goal));
  };

  const deleteSavingsGoal = async (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('savingsGoals', id));
  };

  const contributeToGoal = async (
    goalId: string,
    amount: number,
    fromAccountId: string
  ) => {
    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;
    const updatedGoal: SavingsGoal = {
      ...targetGoal,
      currentSaved: targetGoal.currentSaved + amount,
    };
    await updateSavingsGoal(updatedGoal);

    // Optional transfer to savings bank account if exists
    const emergencyAccount = accounts.find(
      (a) =>
        a.name.toLowerCase().includes('saving') ||
        a.name.toLowerCase().includes('emergency')
    );
    if (emergencyAccount && fromAccountId !== emergencyAccount.id) {
      await addTransfer({
        date: localDate(),
        fromAccountId,
        toAccountId: emergencyAccount.id,
        amount,
        reason: `Contribution towards goal: ${targetGoal.name}`,
        status: 'Completed',
      });
    }
  };

  // Recurring Bills
  const addRecurringBill = async (data: Omit<RecurringBill, 'id'>) => {
    const tempId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newBill: RecurringBill = {
      ...data,
      id: tempId,
    };
    setRecurringBills((prev) => [...prev, newBill]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('recurringBills', newBill);
      if (saved && saved.id && saved.id !== tempId) {
        newBill = saved;
        setRecurringBills((prev) =>
          prev.map((b) => (b.id === tempId ? saved : b))
        );
      }
    });
  };

  const updateRecurringBill = async (bill: RecurringBill) => {
    setRecurringBills((prev) => prev.map((b) => (b.id === bill.id ? bill : b)));
    await runMutationWithSync(() => db.putItemInStore('recurringBills', bill));
  };

  const deleteRecurringBill = async (id: string) => {
    setRecurringBills((prev) => prev.filter((b) => b.id !== id));
    await runMutationWithSync(() =>
      db.deleteItemFromStore('recurringBills', id)
    );
  };

  const markRecurringBillPaid = async (billId: string) => {
    const bill = recurringBills.find((b) => b.id === billId);
    if (!bill) return;

    const updated: RecurringBill = {
      ...bill,
      nextRenewalDate: addMonthsClamped(
        bill.nextRenewalDate,
        bill.frequency === 'Yearly'
          ? 12
          : bill.frequency === 'Quarterly'
            ? 3
            : 1
      ),
    };
    await updateRecurringBill(updated);
  };

  // Tax Savings
  const addTaxSaving = async (data: Omit<TaxSavingItem, 'id'>) => {
    const tempId = `tax-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newItem: TaxSavingItem = {
      ...data,
      id: tempId,
    };
    setTaxSavings((prev) => [...prev, newItem]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('taxSavings', newItem);
      if (saved && saved.id && saved.id !== tempId) {
        newItem = saved;
        setTaxSavings((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      }
    });
  };

  const updateTaxSaving = async (item: TaxSavingItem) => {
    setTaxSavings((prev) => prev.map((t) => (t.id === item.id ? item : t)));
    await runMutationWithSync(() => db.putItemInStore('taxSavings', item));
  };

  const deleteTaxSaving = async (id: string) => {
    setTaxSavings((prev) => prev.filter((t) => t.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('taxSavings', id));
  };

  // Budgets
  const updateBudgetCategoryLimit = async (
    categoryName: string,
    limit: number
  ) => {
    const existing = budgetCategories.find((b) => b.category === categoryName);
    if (existing) {
      const updated: BudgetCategory = { ...existing, monthlyLimit: limit };
      setBudgetCategories((prev) =>
        prev.map((b) => (b.id === existing.id ? updated : b))
      );
      await runMutationWithSync(() =>
        db.putItemInStore('budgetCategories', updated)
      );
    } else {
      const newCat: BudgetCategory = {
        id: `b-${Date.now()}`,
        category: categoryName,
        monthlyLimit: limit,
      };
      setBudgetCategories((prev) => [...prev, newCat]);
      await runMutationWithSync(() =>
        db.putItemInStore('budgetCategories', newCat)
      );
    }
  };

  // Net Worth Snapshot
  const createMonthlyNetWorthSnapshot = async () => {
    const liquidTotal = accounts
      .filter((a) => a.type === 'bank' || a.type === 'wallet')
      .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);
    const cashTotal = accounts
      .filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);
    const investTotal = accounts
      .filter((a) => a.type === 'investment')
      .reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);

    const totalAssets = liquidTotal + cashTotal + investTotal;

    const emiPrincipal = emis.reduce(
      (sum, e) => sum + outstandingPrincipal(e),
      0
    );
    const creditCardsDebt = dashboardMetrics.totalCardOutstanding;
    const totalLiabilities = emiPrincipal + creditCardsDebt;

    const netWorth = totalAssets - totalLiabilities;

    const snapshot: NetWorthSnapshot = {
      id:
        netWorthSnapshots.find((p) => p.month === selectedMonth)?.id ||
        `nw-${selectedMonth}`,
      month: selectedMonth,
      date: localDate(),
      totalAssets,
      totalLiabilities,
      netWorth,
      assetBreakdown: {
        liquidAccounts: liquidTotal,
        investments: investTotal,
        cash: cashTotal,
      },
      liabilityBreakdown: {
        emiPrincipal,
        creditCards: creditCardsDebt,
      },
    };

    setNetWorthSnapshots((prev) => {
      const filtered = prev.filter((p) => p.month !== selectedMonth);
      return [...filtered, snapshot].sort((a, b) =>
        a.month.localeCompare(b.month)
      );
    });
    await runMutationWithSync(() =>
      db.putItemInStore('netWorthSnapshots', snapshot)
    );
  };

  // Presets & Backups
  const loadSampleDataset = async () => {
    setIsLoading(true);
    const sample = getSampleDatabase();
    await runMutationWithSync(() => db.importDatabase(sample));
    await refreshAllFromDB();
  };

  const resetToEmpty = async () => {
    setIsLoading(true);
    await runMutationWithSync(() => db.clearAllDatabaseData());
    setAccounts([]);
    setIncomes([]);
    setExpenses([]);
    setEmis([]);
    setTransfers([]);
    setCreditCards([]);
    setCreditCardBills([]);
    setSavingsGoals([]);
    setRecurringBills([]);
    setTaxSavings([]);
    setBudgetCategories([]);
    setNetWorthSnapshots([]);
    setIsLoading(false);
  };

  const exportJSON = async (): Promise<string> => {
    const backup = await db.exportDatabase();
    return JSON.stringify(backup, null, 2);
  };

  const importJSON = async (jsonString: string): Promise<void> => {
    setIsLoading(true);
    try {
      const parsed = JSON.parse(jsonString);
      await runMutationWithSync(() => db.importDatabase(parsed));
      await refreshAllFromDB();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        isLoading,
        isSyncing,
        syncStatus,
        syncError,
        refreshAllFromDB,
        loadPageData,
        isPageLoading,
        isStoreLoading,
        dismissSyncError,
        selectedMonth,
        setSelectedMonth: changeSelectedMonth,
        prevMonth,
        nextMonth,
        settings,
        updateSettings,
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
        monthlyEmiInstances,
        liveBalances,
        dashboardMetrics,
        dueSoonItems,
        emergencyHealth,
        taxMetrics,
        addAccount,
        updateAccount,
        deleteAccount,
        addIncome,
        updateIncome,
        deleteIncome,
        markIncomeReceived,
        addExpense,
        updateExpense,
        deleteExpense,
        markExpensePaid,
        addEmi,
        updateEmi,
        deleteEmi,
        markEmiPaid,
        markEmiUnpaid,
        updateEmiPayment,
        addTransfer,
        updateTransfer,
        deleteTransfer,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        addCreditCardBill,
        payCreditCardBill,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        contributeToGoal,
        addRecurringBill,
        updateRecurringBill,
        deleteRecurringBill,
        markRecurringBillPaid,
        addTaxSaving,
        updateTaxSaving,
        deleteTaxSaving,
        updateBudgetCategoryLimit,
        createMonthlyNetWorthSnapshot,
        loadSampleDataset,
        resetToEmpty,
        exportJSON,
        importJSON,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
