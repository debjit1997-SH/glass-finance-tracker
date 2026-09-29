import {
  Account,
  Income,
  Expense,
  EmiLoan,
  AccountTransfer,
  CreditCard,
  SavingsGoal,
  RecurringBill,
  TaxSavingItem,
  BudgetCategory,
  DueSoonItem,
} from '../types/finance';

/**
 * Computes live balances for all accounts reactively.
 * Strict rules:
 * - Transfers between accounts update balances without affecting income or expense totals.
 * - Regular accounts increase with income received & incoming transfers, decrease with expenses, outgoing transfers, and EMIs paid.
 * - Credit card accounts track outstanding liability (expenses increase card balance/liability, transfers in reduce it).
 */
export function calculateLiveBalances(
  accounts: Account[],
  incomes: Income[],
  expenses: Expense[],
  transfers: AccountTransfer[],
  emis: EmiLoan[]
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  accounts.forEach((acc) => {
    balanceMap.set(acc.id, acc.openingBalance);
  });

  // Income credited to accounts
  incomes.forEach((inc) => {
    if (inc.status === 'Received' && balanceMap.has(inc.accountId)) {
      const current = balanceMap.get(inc.accountId) || 0;
      balanceMap.set(inc.accountId, current + (inc.actualAmount || inc.expectedAmount));
    }
  });

  // Transfers: strictly from one account to another
  transfers.forEach((tr) => {
    if (tr.status === 'Completed') {
      if (balanceMap.has(tr.fromAccountId)) {
        const currentFrom = balanceMap.get(tr.fromAccountId) || 0;
        balanceMap.set(tr.fromAccountId, currentFrom - tr.amount);
      }
      if (balanceMap.has(tr.toAccountId)) {
        const currentTo = balanceMap.get(tr.toAccountId) || 0;
        balanceMap.set(tr.toAccountId, currentTo + tr.amount);
      }
    }
  });

  // Expenses debited from accounts
  expenses.forEach((exp) => {
    if (exp.status === 'Paid' && balanceMap.has(exp.accountId)) {
      const current = balanceMap.get(exp.accountId) || 0;
      const account = accounts.find((a) => a.id === exp.accountId);
      if (account?.type === 'credit_card') {
        // Debiting a credit card increases its outstanding liability
        balanceMap.set(exp.accountId, current - (exp.actualAmount || exp.expectedAmount));
      } else {
        // Regular account balance decreases
        balanceMap.set(exp.accountId, current - (exp.actualAmount || exp.expectedAmount));
      }
    }
  });

  // EMI paid debited from accounts
  emis.forEach((emi) => {
    if (emi.status === 'Paid' && balanceMap.has(emi.accountId)) {
      const current = balanceMap.get(emi.accountId) || 0;
      balanceMap.set(emi.accountId, current - emi.monthlyAmount);
    }
  });

  return balanceMap;
}

/**
 * Calculates monthly dashboard metrics
 */
export function calculateDashboardMetrics(
  month: string, // YYYY-MM
  accounts: Account[],
  liveBalances: Map<string, number>,
  incomes: Income[],
  expenses: Expense[],
  emis: EmiLoan[],
  creditCards: CreditCard[]
) {
  // Total Income this month
  const monthlyIncomes = incomes.filter((i) => i.date.startsWith(month));
  const totalIncome = monthlyIncomes.reduce(
    (sum, i) => sum + (i.status === 'Received' ? i.actualAmount || i.expectedAmount : i.expectedAmount),
    0
  );
  const receivedIncome = monthlyIncomes
    .filter((i) => i.status === 'Received')
    .reduce((sum, i) => sum + (i.actualAmount || i.expectedAmount), 0);

  // Total Expense excl. EMI this month
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(month));
  const totalExpense = monthlyExpenses.reduce(
    (sum, e) => sum + (e.status === 'Paid' ? e.actualAmount || e.expectedAmount : e.expectedAmount),
    0
  );
  const paidExpense = monthlyExpenses
    .filter((e) => e.status === 'Paid')
    .reduce((sum, e) => sum + (e.actualAmount || e.expectedAmount), 0);

  // Total EMI this month
  const monthlyEmis = emis.filter((e) => !e.dueDate || e.dueDate.startsWith(month));
  const totalEmi = monthlyEmis.reduce((sum, e) => sum + e.monthlyAmount, 0);

  // Opening Balance across liquid accounts (Bank + Cash + Wallet)
  const liquidAccounts = accounts.filter((a) => ['bank', 'cash', 'wallet'].includes(a.type));
  const openingBalance = liquidAccounts.reduce((sum, a) => sum + a.openingBalance, 0);

  // Net Balance in Hand (current live balances of liquid accounts)
  const netBalanceInHand = liquidAccounts.reduce((sum, a) => sum + (liveBalances.get(a.id) || 0), 0);

  // Total Outstanding Credit Card Balance
  // Sum of unbilled + any statement dues or absolute negative balances on card accounts
  const totalCardOutstanding = creditCards.reduce((sum, card) => {
    const cardAccountBalance = liveBalances.get(card.accountId) || 0;
    // If account balance is negative, that's debt; plus manual unbilled
    const liabilityFromAccount = cardAccountBalance < 0 ? Math.abs(cardAccountBalance) : 0;
    return sum + liabilityFromAccount + (card.currentUnbilled || 0);
  }, 0);

  // Savings Rate % = (Total Income − Total Expense − Total EMI) ÷ Total Income
  const netSavings = totalIncome - totalExpense - totalEmi;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return {
    totalIncome,
    receivedIncome,
    totalExpense,
    paidExpense,
    totalEmi,
    openingBalance,
    netBalanceInHand,
    totalCardOutstanding,
    savingsRate,
    netSavings,
  };
}

/**
 * Calculates "Due Soon" items due within next 3 days or overdue
 */
export function getDueSoonItems(
  expenses: Expense[],
  emis: EmiLoan[],
  recurringBills: RecurringBill[],
  accounts: Account[],
  currentDateStr: string = new Date().toISOString().slice(0, 10)
): DueSoonItem[] {
  const today = new Date(currentDateStr);
  today.setHours(0, 0, 0, 0);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const items: DueSoonItem[] = [];

  // Expenses pending
  expenses.forEach((exp) => {
    if (exp.status === 'Pending' || exp.status === 'Overdue') {
      const due = new Date(exp.date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue (diffDays < 0) or due within next 3 days (0 <= diffDays <= 3)
      if (diffDays <= 3) {
        items.push({
          id: exp.id,
          source: 'Expense',
          title: exp.name,
          amount: exp.expectedAmount,
          dueDate: exp.date,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
          accountId: exp.accountId,
          accountName: accountMap.get(exp.accountId) || 'Unknown Account',
          category: exp.category,
          rawItem: exp,
        });
      }
    }
  });

  // EMIs pending
  emis.forEach((emi) => {
    if (emi.status === 'Pending' || emi.status === 'Overdue') {
      const due = new Date(emi.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        items.push({
          id: emi.id,
          source: 'EMI',
          title: `${emi.loanName} (${emi.lender})`,
          amount: emi.monthlyAmount,
          dueDate: emi.dueDate,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
          accountId: emi.accountId,
          accountName: accountMap.get(emi.accountId) || 'Unknown Account',
          category: 'EMI Loan',
          rawItem: emi,
        });
      }
    }
  });

  // Recurring Bills
  recurringBills.forEach((bill) => {
    const due = new Date(bill.nextRenewalDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      items.push({
        id: bill.id,
        source: 'RecurringBill',
        title: bill.name,
        amount: bill.amount,
        dueDate: bill.nextRenewalDate,
        daysRemaining: diffDays,
        isOverdue: diffDays < 0,
        accountId: bill.accountId,
        accountName: accountMap.get(bill.accountId) || 'Unknown Account',
        category: bill.category,
        rawItem: bill,
      });
    }
  });

  // Sort: overdue first (ascending negative numbers), then closest due date (0, 1, 2, 3)
  return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculates Emergency Fund Health Check:
 * current Emergency Fund balance ÷ average of last 3 months Total Expense (excl. EMI)
 */
export function calculateEmergencyFundHealth(
  savingsGoals: SavingsGoal[],
  expenses: Expense[],
  currentMonth: string
) {
  // Find Emergency Fund goal
  const efGoal = savingsGoals.find(
    (g) =>
      g.name.toLowerCase().includes('emergency') ||
      g.category.toLowerCase().includes('emergency')
  );
  const currentEmergencyFund = efGoal ? efGoal.currentSaved : 0;

  // Calculate past 3 months total expense
  const [yearStr, monthStr] = currentMonth.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentM = parseInt(monthStr, 10);

  const pastMonths: string[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = currentM - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    pastMonths.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  const monthlyTotals = pastMonths.map((m) => {
    return expenses
      .filter((e) => e.date.startsWith(m) && e.status === 'Paid')
      .reduce((sum, e) => sum + (e.actualAmount || e.expectedAmount), 0);
  });

  const sumExpenses = monthlyTotals.reduce((a, b) => a + b, 0);
  // If no past 3 months data yet, fallback to current month or reasonable benchmark
  const currentMonthExpense = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + (e.actualAmount || e.expectedAmount), 0);

  const avgExpense = sumExpenses > 0 ? sumExpenses / 3 : Math.max(currentMonthExpense, 1);
  const monthsCovered = avgExpense > 0 ? currentEmergencyFund / avgExpense : 0;

  return {
    currentEmergencyFund,
    avgExpense,
    monthsCovered: Number(monthsCovered.toFixed(1)),
    targetMin: 3,
    targetMax: 6,
    isHealthy: monthsCovered >= 3,
    statusText:
      monthsCovered >= 6
        ? 'Excellent (6+ months)'
        : monthsCovered >= 3
        ? 'Healthy (3-6 months)'
        : monthsCovered >= 1
        ? 'Building Up (<3 months)'
        : 'Critical Underfunded',
  };
}

/**
 * Simulates Debt Payoff Planner:
 * Avalanche (Highest Interest First) vs Snowball (Lowest Balance First)
 */
export interface PayoffPlanResult {
  strategy: 'Avalanche' | 'Snowball';
  totalMonths: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: {
    loanId: string;
    loanName: string;
    initialBalance: number;
    interestRate: number;
    payoffMonth: number;
    payoffDate: string;
    totalInterest: number;
  }[];
}

export function calculateDebtPayoff(
  loans: EmiLoan[],
  extraMonthlyPayment: number = 0,
  startDateStr: string = new Date().toISOString().slice(0, 10)
): { avalanche: PayoffPlanResult; snowball: PayoffPlanResult } {
  const runSimulation = (strategy: 'Avalanche' | 'Snowball'): PayoffPlanResult => {
    if (!loans.length) {
      return {
        strategy,
        totalMonths: 0,
        debtFreeDate: startDateStr,
        totalInterestPaid: 0,
        totalPaid: 0,
        payoffOrder: [],
      };
    }

    // Clone loans
    const loanStates = loans.map((l) => ({
      id: l.id,
      name: l.loanName,
      principal: l.outstandingPrincipal,
      rate: l.interestRate,
      emi: l.monthlyAmount,
      totalInterest: 0,
      payoffMonth: 0,
    }));

    // Sort order
    if (strategy === 'Avalanche') {
      loanStates.sort((a, b) => b.rate - a.rate);
    } else {
      loanStates.sort((a, b) => a.principal - b.principal);
    }

    let month = 0;
    const maxMonths = 360; // 30 year safety cap
    let rolledOverBudget = extraMonthlyPayment;

    while (month < maxMonths) {
      const activeLoans = loanStates.filter((l) => l.principal > 0.01);
      if (activeLoans.length === 0) break;

      month++;

      // 1. Accrue monthly interest for each loan
      activeLoans.forEach((l) => {
        const monthlyRate = l.rate / 100 / 12;
        const interest = l.principal * monthlyRate;
        l.principal += interest;
        l.totalInterest += interest;
      });

      // 2. Pay minimum EMIs
      activeLoans.forEach((l) => {
        const payment = Math.min(l.principal, l.emi);
        l.principal -= payment;
        if (l.principal <= 0.01 && l.payoffMonth === 0) {
          l.payoffMonth = month;
          rolledOverBudget += l.emi; // Snowball/Avalanche roll into priority
        }
      });

      // 3. Apply extra and rolled-over budget to the highest priority active loan
      const priorityLoan = loanStates.find((l) => l.principal > 0.01);
      if (priorityLoan && rolledOverBudget > 0) {
        const extraPayment = Math.min(priorityLoan.principal, rolledOverBudget);
        priorityLoan.principal -= extraPayment;
        if (priorityLoan.principal <= 0.01 && priorityLoan.payoffMonth === 0) {
          priorityLoan.payoffMonth = month;
        }
      }
    }

    // Calculate dates
    const startDate = new Date(startDateStr);
    const debtFreeDate = new Date(startDate);
    debtFreeDate.setMonth(debtFreeDate.getMonth() + month);

    const totalInterestPaid = loanStates.reduce((sum, l) => sum + l.totalInterest, 0);
    const initialTotalPrincipal = loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);

    const payoffOrder = loanStates.map((l) => {
      const pDate = new Date(startDate);
      pDate.setMonth(pDate.getMonth() + (l.payoffMonth || month));
      return {
        loanId: l.id,
        loanName: l.name,
        initialBalance: loans.find((x) => x.id === l.id)?.outstandingPrincipal || 0,
        interestRate: l.rate,
        payoffMonth: l.payoffMonth || month,
        payoffDate: pDate.toISOString().slice(0, 7),
        totalInterest: Math.round(l.totalInterest),
      };
    });

    return {
      strategy,
      totalMonths: month,
      debtFreeDate: debtFreeDate.toISOString().slice(0, 7),
      totalInterestPaid: Math.round(totalInterestPaid),
      totalPaid: Math.round(initialTotalPrincipal + totalInterestPaid),
      payoffOrder,
    };
  };

  return {
    avalanche: runSimulation('Avalanche'),
    snowball: runSimulation('Snowball'),
  };
}

/**
 * Cash-flow Runway Calendar
 * Simulates day-by-day projected balance for the current month.
 */
export interface RunwayDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  incomingTotal: number;
  outgoingTotal: number;
  projectedBalance: number;
  isLowestPoint: boolean;
  isNegative: boolean;
  events: {
    type: 'income' | 'expense' | 'emi';
    title: string;
    amount: number;
    status: string;
  }[];
}

export function calculateCashflowRunway(
  currentLiquidBalance: number,
  currentMonth: string, // YYYY-MM
  incomes: Income[],
  expenses: Expense[],
  emis: EmiLoan[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): {
  days: RunwayDay[];
  lowestBalance: number;
  lowestDate: string;
  hasNegativeDip: boolean;
  negativeDaysCount: number;
} {
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Number of days in currentMonth
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: RunwayDay[] = [];
  let runningBalance = currentLiquidBalance;
  let lowestBalance = Infinity;
  let lowestDate = '';
  let negativeDaysCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const isToday = dayStr === todayStr;
    const isPast = dayStr < todayStr;

    // Events for this day
    const dayIncomes = incomes.filter((i) => i.date === dayStr);
    const dayExpenses = expenses.filter((e) => e.date === dayStr);
    const dayEmis = emis.filter((e) => e.dueDate === dayStr);

    let incomingTotal = 0;
    let outgoingTotal = 0;

    const events: RunwayDay['events'] = [];

    dayIncomes.forEach((i) => {
      const amt = i.status === 'Received' ? i.actualAmount || i.expectedAmount : i.expectedAmount;
      incomingTotal += amt;
      events.push({ type: 'income', title: i.source, amount: amt, status: i.status });
    });

    dayExpenses.forEach((e) => {
      const amt = e.status === 'Paid' ? e.actualAmount || e.expectedAmount : e.expectedAmount;
      outgoingTotal += amt;
      events.push({ type: 'expense', title: e.name, amount: amt, status: e.status });
    });

    dayEmis.forEach((emi) => {
      outgoingTotal += emi.monthlyAmount;
      events.push({
        type: 'emi',
        title: `EMI: ${emi.loanName}`,
        amount: emi.monthlyAmount,
        status: emi.status,
      });
    });

    // Roll forward from today onwards (for past days, keep running or baseline)
    if (!isPast || isToday) {
      // Pending incoming adds to runway
      const pendingIn = dayIncomes
        .filter((i) => i.status === 'Pending')
        .reduce((s, i) => s + i.expectedAmount, 0);

      // Pending outgoing subtracts from runway
      const pendingOut =
        dayExpenses
          .filter((e) => e.status === 'Pending' || e.status === 'Overdue')
          .reduce((s, e) => s + e.expectedAmount, 0) +
        dayEmis
          .filter((e) => e.status === 'Pending' || e.status === 'Overdue')
          .reduce((s, e) => s + e.monthlyAmount, 0);

      runningBalance = runningBalance + pendingIn - pendingOut;

      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
        lowestDate = dayStr;
      }
      if (runningBalance < 0) {
        negativeDaysCount++;
      }
    }

    days.push({
      date: dayStr,
      dayNumber: d,
      dayName,
      isToday,
      isPast,
      incomingTotal,
      outgoingTotal,
      projectedBalance: Math.round(runningBalance),
      isLowestPoint: false,
      isNegative: runningBalance < 0,
      events,
    });
  }

  // Mark the lowest point
  days.forEach((day) => {
    if (day.date === lowestDate) {
      day.isLowestPoint = true;
    }
  });

  return {
    days,
    lowestBalance: lowestBalance === Infinity ? currentLiquidBalance : Math.round(lowestBalance),
    lowestDate,
    hasNegativeDip: negativeDaysCount > 0,
    negativeDaysCount,
  };
}

/**
 * 80C & 80D Tax Savings calculations (India FY April 1 - March 31)
 */
export function calculateTaxSavings(
  items: TaxSavingItem[],
  currentDateStr: string = new Date().toISOString().slice(0, 10),
  limit80c: number = 150000,
  limit80d: number = 25000
) {
  const today = new Date(currentDateStr);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  // Determine current Indian Financial Year (April - March)
  let fyStartYear = currentYear;
  let fyEndYear = currentYear + 1;
  if (currentMonth < 4) {
    fyStartYear = currentYear - 1;
    fyEndYear = currentYear;
  }
  const currentFY = `${fyStartYear}-${fyEndYear}`;

  // Filter items in current FY
  const fyItems = items.filter((item) => item.financialYear === currentFY);

  const total80c = fyItems
    .filter((i) => i.section === '80C')
    .reduce((sum, i) => sum + i.amount, 0);

  const total80d = fyItems
    .filter((i) => i.section === '80D')
    .reduce((sum, i) => sum + i.amount, 0);

  const remaining80c = Math.max(0, limit80c - total80c);
  const remaining80d = Math.max(0, limit80d - total80d);

  // Countdown to March 31 of fyEndYear
  const march31 = new Date(fyEndYear, 2, 31, 23, 59, 59); // Month is 0-indexed (2 = March)
  const diffTime = march31.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    currentFY,
    total80c,
    limit80c,
    percent80c: Math.min(100, Math.round((total80c / limit80c) * 100)),
    remaining80c,
    total80d,
    limit80d,
    percent80d: Math.min(100, Math.round((total80d / limit80d) * 100)),
    remaining80d,
    daysRemaining,
    march31Date: `${fyEndYear}-03-31`,
  };
}
