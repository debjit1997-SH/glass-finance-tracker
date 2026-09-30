import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Account,
  Income,
  Expense,
  EmiLoan,
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
  transfers: AccountTransfer[];
  creditCards: CreditCard[];
  creditCardBills: CreditCardBill[];
  savingsGoals: SavingsGoal[];
  recurringBills: RecurringBill[];
  taxSavings: TaxSavingItem[];
  budgetCategories: BudgetCategory[];
  netWorthSnapshots: NetWorthSnapshot[];

  // Derived Reactive Data
  liveBalances: Map<string, number>;
  dashboardMetrics: ReturnType<typeof calculateDashboardMetrics>;
  dueSoonItems: DueSoonItem[];
  emergencyHealth: ReturnType<typeof calculateEmergencyFundHealth>;
  taxMetrics: ReturnType<typeof calculateTaxSavings>;

  // Mutators
  addAccount: (account: Omit<Account, 'id' | 'createdAt'> & { id?: string }) => Promise<Account>;
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
  markEmiPaid: (id: string) => Promise<void>;

  addTransfer: (transfer: Omit<AccountTransfer, 'id'>) => Promise<void>;
  updateTransfer: (transfer: AccountTransfer) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (card: CreditCard) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  addCreditCardBill: (bill: Omit<CreditCardBill, 'id'>) => Promise<void>;
  payCreditCardBill: (billId: string, fromBankAccountId: string, amount: number) => Promise<void>;

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number, fromAccountId: string) => Promise<void>;

  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<void>;
  updateRecurringBill: (bill: RecurringBill) => Promise<void>;
  deleteRecurringBill: (id: string) => Promise<void>;
  markRecurringBillPaid: (billId: string) => Promise<void>;

  addTaxSaving: (item: Omit<TaxSavingItem, 'id'>) => Promise<void>;
  updateTaxSaving: (item: TaxSavingItem) => Promise<void>;
  deleteTaxSaving: (id: string) => Promise<void>;

  updateBudgetCategoryLimit: (categoryName: string, limit: number) => Promise<void>;
  createMonthlyNetWorthSnapshot: () => Promise<void>;

  // Backup & Presets
  loadSampleDataset: () => Promise<void>;
  resetToEmpty: () => Promise<void>;
  exportJSON: () => Promise<string>;
  importJSON: (jsonString: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const PAGE_STORE_MAP: Record<string, db.StoreName[]> = {
  dashboard: ['accounts', 'incomes', 'expenses', 'emis', 'transfers', 'creditCards'],
  accounts: ['accounts', 'transfers'],
  income: ['incomes', 'accounts'],
  expenses: ['expenses', 'accounts', 'creditCards'],
  budget: ['budgetCategories', 'expenses'],
  emi: ['emis', 'accounts'],
  transfers: ['transfers', 'accounts'],
  'credit-cards': ['creditCards', 'creditCardBills', 'accounts'],
  'savings-goals': ['savingsGoals', 'accounts', 'expenses'],
  'net-worth': ['netWorthSnapshots', 'accounts', 'emis', 'creditCards'],
  'recurring-bills': ['recurringBills', 'accounts'],
  'tax-saver': ['taxSavings'],
  runway: ['accounts', 'expenses', 'incomes', 'emis'],
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentMonthInitial = new Date().toISOString().slice(0, 7);
  const sample = useMemo(() => getSampleDatabase(), []);

  const getInitialStore = <T,>(store: db.StoreName, fallback: T[]): T[] => {
    const cached = db.getCachedStore<T>(store);
    return cached && Array.isArray(cached) && cached.length > 0 ? cached : fallback;
  };

  // Hydrate immediately from local cache or fallback to sample data
  // Guarantees 0ms initial paint — zero blank or black screen!
  const [accounts, setAccounts] = useState<Account[]>(() =>
    getInitialStore<Account>('accounts', sample.accounts)
  );
  const [incomes, setIncomes] = useState<Income[]>(() =>
    getInitialStore<Income>('incomes', sample.incomes)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getInitialStore<Expense>('expenses', sample.expenses)
  );
  const [emis, setEmis] = useState<EmiLoan[]>(() =>
    getInitialStore<EmiLoan>('emis', sample.emis)
  );
  const [transfers, setTransfers] = useState<AccountTransfer[]>(() =>
    getInitialStore<AccountTransfer>('transfers', sample.transfers)
  );
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() =>
    getInitialStore<CreditCard>('creditCards', sample.creditCards)
  );
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBill[]>(() =>
    getInitialStore<CreditCardBill>('creditCardBills', sample.creditCardBills)
  );
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() =>
    getInitialStore<SavingsGoal>('savingsGoals', sample.savingsGoals)
  );
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(() =>
    getInitialStore<RecurringBill>('recurringBills', sample.recurringBills)
  );
  const [taxSavings, setTaxSavings] = useState<TaxSavingItem[]>(() =>
    getInitialStore<TaxSavingItem>('taxSavings', sample.taxSavings)
  );
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(() =>
    getInitialStore<BudgetCategory>('budgetCategories', db.DEFAULT_BUDGET_CATEGORIES)
  );
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>(() =>
    getInitialStore<NetWorthSnapshot>('netWorthSnapshots', sample.netWorthSnapshots)
  );

  const [settings, setSettings] = useState<UserSettings>(() => {
    const cached = db.getCachedStore<any>('settings');
    if (cached && cached.length > 0) {
      const map = new Map<string, any>();
      cached.forEach((s: any) => map.set(s.key, s.value));
      return {
        currency: map.get('currency') || '₹',
        savingsRateTarget: map.get('savingsRateTarget') ?? 20,
        emergencyFundTargetMonths: map.get('emergencyFundTargetMonths') ?? 6,
        section80cLimit: map.get('section80cLimit') ?? 150000,
        section80dLimit: map.get('section80dLimit') ?? 25000,
        activeMonth: map.get('activeMonth') || currentMonthInitial,
      };
    }
    return sample.settings;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => settings.activeMonth || currentMonthInitial);

  // Loading and Sync States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Per-store loading tracking for progressive rendering
  const [loadingStores, setLoadingStores] = useState<Record<string, boolean>>({});
  const fetchedStoresRef = useRef<Set<db.StoreName>>(new Set());
  const inFlightStoresRef = useRef<Set<db.StoreName>>(new Set());

  const applyStoreData = useCallback((storeName: db.StoreName, data: any[]) => {
    if (!Array.isArray(data)) return;
    switch (storeName) {
      case 'accounts':
        if (data.length > 0) setAccounts(data);
        break;
      case 'incomes':
        if (data.length > 0) setIncomes(data);
        break;
      case 'expenses':
        if (data.length > 0) setExpenses(data);
        break;
      case 'emis':
        if (data.length > 0) setEmis(data);
        break;
      case 'transfers':
        if (data.length > 0) setTransfers(data);
        break;
      case 'creditCards':
        if (data.length > 0) setCreditCards(data);
        break;
      case 'creditCardBills':
        if (data.length > 0) setCreditCardBills(data);
        break;
      case 'savingsGoals':
        if (data.length > 0) setSavingsGoals(data);
        break;
      case 'recurringBills':
        if (data.length > 0) setRecurringBills(data);
        break;
      case 'taxSavings':
        if (data.length > 0) setTaxSavings(data);
        break;
      case 'budgetCategories':
        setBudgetCategories(data.length > 0 ? data : db.DEFAULT_BUDGET_CATEGORIES);
        break;
      case 'netWorthSnapshots':
        if (data.length > 0) setNetWorthSnapshots(data);
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
      return reqStores.some((s) => loadingStores[s] && !fetchedStoresRef.current.has(s));
    },
    [loadingStores]
  );

  // Lazy, per-page loader parallelized with Promise.all
  // Total wait time is bounded by the single slowest sheet required by the current page
  const loadPageData = useCallback(
    async (page: string, force = false) => {
      const requiredStores = PAGE_STORE_MAP[page] || ['accounts', 'expenses'];
      const storesToFetch = requiredStores.filter(
        (s) => force || (!fetchedStoresRef.current.has(s) && !inFlightStoresRef.current.has(s))
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

      try {
        await Promise.all(
          storesToFetch.map(async (store) => {
            try {
              const data = await db.getAllFromStore<any>(store);
              fetchedStoresRef.current.add(store);
              // Progressively update individual state as each sheet returns
              applyStoreData(store, data);
            } catch (err: any) {
              console.warn(`[GAS] Store ${store} fetch error:`, err);
            } finally {
              inFlightStoresRef.current.delete(store);
              setLoadingStores((prev) => ({ ...prev, [store]: false }));
            }
          })
        );

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
    inFlightStoresRef.current.clear();
    await loadPageData('dashboard', true);
  }, [loadPageData]);

  // Derived Calculations
  const liveBalances = useMemo(() => {
    return calculateLiveBalances(accounts, incomes, expenses, transfers, emis);
  }, [accounts, incomes, expenses, transfers, emis]);

  const dashboardMetrics = useMemo(() => {
    return calculateDashboardMetrics(
      selectedMonth,
      accounts,
      liveBalances,
      incomes,
      expenses,
      emis,
      creditCards
    );
  }, [selectedMonth, accounts, liveBalances, incomes, expenses, emis, creditCards]);

  const dueSoonItems = useMemo(() => {
    return getDueSoonItems(expenses, emis, recurringBills, accounts);
  }, [expenses, emis, recurringBills, accounts]);

  const emergencyHealth = useMemo(() => {
    return calculateEmergencyFundHealth(savingsGoals, expenses, selectedMonth);
  }, [savingsGoals, expenses, selectedMonth]);

  const taxMetrics = useMemo(() => {
    return calculateTaxSavings(taxSavings, undefined, settings.section80cLimit, settings.section80dLimit);
  }, [taxSavings, settings.section80cLimit, settings.section80dLimit]);

  // Helper for background mutation sync with optimistic local state
  const runMutationWithSync = async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsSyncing(true);
    try {
      const res = await operation();
      setSyncStatus('synced');
      setSyncError(null);
      return res;
    } catch (err: any) {
      console.warn('[GAS Mutation Warning]:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Failed to sync with Google Sheets');
      return undefined as any;
    } finally {
      setIsSyncing(false);
    }
  };

  const dismissSyncError = () => {
    setSyncError(null);
  };

  // Month navigation with persistent settings sync
  const changeSelectedMonth = async (newMonth: string) => {
    setSelectedMonth(newMonth);
    await runMutationWithSync(() =>
      db.putItemInStore('settings', { key: 'activeMonth', value: newMonth })
    );
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
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await runMutationWithSync(async () => {
      for (const [key, value] of Object.entries(newSettings)) {
        await db.putItemInStore('settings', { key, value });
      }
    });
  };

  // Accounts
  const addAccount = async (data: Omit<Account, 'id' | 'createdAt'> & { id?: string }): Promise<Account> => {
    const tempId = data.id || `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newAcc: Account = {
      ...data,
      id: tempId,
      createdAt: new Date().toISOString().slice(0, 10),
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
      actualAmount: target.actualAmount || target.expectedAmount,
      actualDate: new Date().toISOString().slice(0, 10),
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
      actualAmount: target.actualAmount || target.expectedAmount,
      actualDate: new Date().toISOString().slice(0, 10),
    };
    await updateExpense(updated);
  };

  // EMIs
  const addEmi = async (data: Omit<EmiLoan, 'id'>) => {
    const tempId = `emi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newEmi: EmiLoan = {
      ...data,
      id: tempId,
    };
    setEmis((prev) => [...prev, newEmi]);
    await runMutationWithSync(async () => {
      const saved = await db.putItemInStore('emis', newEmi);
      if (saved && saved.id && saved.id !== tempId) {
        newEmi = saved;
        setEmis((prev) => prev.map((e) => (e.id === tempId ? saved : e)));
      }
    });
  };

  const updateEmi = async (emi: EmiLoan) => {
    setEmis((prev) => prev.map((e) => (e.id === emi.id ? emi : e)));
    await runMutationWithSync(() => db.putItemInStore('emis', emi));
  };

  const deleteEmi = async (id: string) => {
    setEmis((prev) => prev.filter((e) => e.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('emis', id));
  };

  const markEmiPaid = async (id: string) => {
    const target = emis.find((e) => e.id === id);
    if (!target) return;
    const updated: EmiLoan = {
      ...target,
      status: 'Paid',
    };
    await updateEmi(updated);
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
    setTransfers((prev) => prev.map((t) => (t.id === transfer.id ? transfer : t)));
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
        setCreditCards((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
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
        setCreditCardBills((prev) => prev.map((b) => (b.id === tempId ? saved : b)));
      }
    });
  };

  const payCreditCardBill = async (billId: string, fromBankAccountId: string, amount: number) => {
    const targetBill = creditCardBills.find((b) => b.id === billId);
    if (!targetBill) return;
    const targetCard = creditCards.find((c) => c.id === targetBill.cardId);
    if (!targetCard) return;

    // 1. Update bill status
    const updatedBill: CreditCardBill = {
      ...targetBill,
      amountPaid: amount,
      paymentDateActual: new Date().toISOString().slice(0, 10),
      status: amount >= targetBill.billAmount ? 'Paid' : 'Partial',
    };
    setCreditCardBills((prev) => prev.map((b) => (b.id === billId ? updatedBill : b)));
    await runMutationWithSync(() => db.putItemInStore('creditCardBills', updatedBill));

    // 2. Log transfer from Bank to Card Account
    await addTransfer({
      date: new Date().toISOString().slice(0, 10),
      fromAccountId: fromBankAccountId,
      toAccountId: targetCard.accountId,
      amount,
      reason: `Settlement for ${targetCard.name} (${targetBill.billingMonth})`,
      status: 'Completed',
    });
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
        setSavingsGoals((prev) => prev.map((g) => (g.id === tempId ? saved : g)));
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

  const contributeToGoal = async (goalId: string, amount: number, fromAccountId: string) => {
    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;
    const updatedGoal: SavingsGoal = {
      ...targetGoal,
      currentSaved: targetGoal.currentSaved + amount,
    };
    await updateSavingsGoal(updatedGoal);

    // Optional transfer to savings bank account if exists
    const emergencyAccount = accounts.find(
      (a) => a.name.toLowerCase().includes('saving') || a.name.toLowerCase().includes('emergency')
    );
    if (emergencyAccount && fromAccountId !== emergencyAccount.id) {
      await addTransfer({
        date: new Date().toISOString().slice(0, 10),
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
        setRecurringBills((prev) => prev.map((b) => (b.id === tempId ? saved : b)));
      }
    });
  };

  const updateRecurringBill = async (bill: RecurringBill) => {
    setRecurringBills((prev) => prev.map((b) => (b.id === bill.id ? bill : b)));
    await runMutationWithSync(() => db.putItemInStore('recurringBills', bill));
  };

  const deleteRecurringBill = async (id: string) => {
    setRecurringBills((prev) => prev.filter((b) => b.id !== id));
    await runMutationWithSync(() => db.deleteItemFromStore('recurringBills', id));
  };

  const markRecurringBillPaid = async (billId: string) => {
    const bill = recurringBills.find((b) => b.id === billId);
    if (!bill) return;

    const d = new Date(bill.nextRenewalDate);
    if (bill.frequency === 'Yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    const updated: RecurringBill = {
      ...bill,
      nextRenewalDate: d.toISOString().slice(0, 10),
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
  const updateBudgetCategoryLimit = async (categoryName: string, limit: number) => {
    const existing = budgetCategories.find((b) => b.category === categoryName);
    if (existing) {
      const updated: BudgetCategory = { ...existing, monthlyLimit: limit };
      setBudgetCategories((prev) => prev.map((b) => (b.id === existing.id ? updated : b)));
      await runMutationWithSync(() => db.putItemInStore('budgetCategories', updated));
    } else {
      const newCat: BudgetCategory = {
        id: `b-${Date.now()}`,
        category: categoryName,
        monthlyLimit: limit,
      };
      setBudgetCategories((prev) => [...prev, newCat]);
      await runMutationWithSync(() => db.putItemInStore('budgetCategories', newCat));
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

    const emiPrincipal = emis.reduce((sum, e) => sum + e.outstandingPrincipal, 0);
    const creditCardsDebt = dashboardMetrics.totalCardOutstanding;
    const totalLiabilities = emiPrincipal + creditCardsDebt;

    const netWorth = totalAssets - totalLiabilities;

    const snapshot: NetWorthSnapshot = {
      id: `nw-${Date.now()}`,
      month: selectedMonth,
      date: new Date().toISOString().slice(0, 10),
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
      return [...filtered, snapshot].sort((a, b) => a.month.localeCompare(b.month));
    });
    await runMutationWithSync(() => db.putItemInStore('netWorthSnapshots', snapshot));
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
        transfers,
        creditCards,
        creditCardBills,
        savingsGoals,
        recurringBills,
        taxSavings,
        budgetCategories,
        netWorthSnapshots,
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
