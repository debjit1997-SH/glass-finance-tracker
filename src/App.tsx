import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { GlassNavbar } from './components/layout/GlassNavbar';
import { GlassSidebar, NavTab } from './components/layout/GlassSidebar';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/AccountsPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetVsActualPage } from './pages/BudgetVsActualPage';
import { EmiTrackerPage } from './pages/EmiTrackerPage';
import { TransfersPage } from './pages/TransfersPage';
import { CreditCardPage } from './pages/CreditCardPage';
import { SavingsGoalsPage } from './pages/SavingsGoalsPage';
import { NetWorthPage } from './pages/NetWorthPage';
import { RecurringBillsPage } from './pages/RecurringBillsPage';
import { TaxSaverPage } from './pages/TaxSaverPage';
import { CashflowRunwayPage } from './pages/CashflowRunwayPage';

// Modals
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { AddIncomeModal } from './components/modals/AddIncomeModal';
import { AddTransferModal } from './components/modals/AddTransferModal';
import { AddEmiModal } from './components/modals/AddEmiModal';
import { AddAccountModal } from './components/modals/AddAccountModal';
import { AddGoalModal } from './components/modals/AddGoalModal';
import { AddCreditCardModal } from './components/modals/AddCreditCardModal';
import { AddRecurringBillModal } from './components/modals/AddRecurringBillModal';
import { AddTaxSavingModal } from './components/modals/AddTaxSavingModal';
import { BackupModal } from './components/modals/BackupModal';

import { Sparkles, Menu, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

const MainApp: React.FC = () => {
  const { loadPageData } = useFinance();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Lazy load sheet data only when the user navigates to a tab
  React.useEffect(() => {
    loadPageData(activeTab);
  }, [activeTab, loadPageData]);

  // Modals state
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);
  const [isAddEmiOpen, setIsAddEmiOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isAddTaxOpen, setIsAddTaxOpen] = useState(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setActiveTab}
            onOpenExpense={() => setIsAddExpenseOpen(true)}
            onOpenIncome={() => setIsAddIncomeOpen(true)}
            onOpenTransfer={() => setIsAddTransferOpen(true)}
          />
        );
      case 'accounts':
        return (
          <AccountsPage
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onOpenTransfer={() => setIsAddTransferOpen(true)}
          />
        );
      case 'income':
        return <IncomePage onOpenAddIncome={() => setIsAddIncomeOpen(true)} />;
      case 'expenses':
        return <ExpensesPage onOpenAddExpense={() => setIsAddExpenseOpen(true)} />;
      case 'budget':
        return <BudgetVsActualPage />;
      case 'emi':
        return <EmiTrackerPage onOpenAddEmi={() => setIsAddEmiOpen(true)} />;
      case 'transfers':
        return <TransfersPage onOpenAddTransfer={() => setIsAddTransferOpen(true)} />;
      case 'credit-cards':
        return <CreditCardPage onOpenAddCard={() => setIsAddCardOpen(true)} />;
      case 'savings-goals':
        return <SavingsGoalsPage onOpenAddGoal={() => setIsAddGoalOpen(true)} />;
      case 'net-worth':
        return <NetWorthPage />;
      case 'recurring-bills':
        return (
          <RecurringBillsPage onOpenAddRecurring={() => setIsAddRecurringOpen(true)} />
        );
      case 'tax-saver':
        return <TaxSaverPage onOpenAddTax={() => setIsAddTaxOpen(true)} />;
      case 'runway':
        return <CashflowRunwayPage />;
      default:
        return <DashboardPage onNavigate={setActiveTab} onOpenExpense={() => setIsAddExpenseOpen(true)} onOpenIncome={() => setIsAddIncomeOpen(true)} onOpenTransfer={() => setIsAddTransferOpen(true)} />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070913] text-slate-100 flex flex-col overflow-x-hidden font-sans">
      {/* Dynamic Vibrant Gradient Glass Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-right violet orb */}
        <div className="absolute -top-[15%] -right-[10%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-purple-600/25 via-indigo-600/15 to-transparent blur-[120px]" />
        {/* Center cyan-blue orb */}
        <div className="absolute top-[35%] -left-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-600/20 via-blue-600/15 to-transparent blur-[130px]" />
        {/* Bottom rose-magenta orb */}
        <div className="absolute -bottom-[10%] right-[20%] w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-rose-600/15 via-purple-600/10 to-transparent blur-[120px]" />
        {/* Ambient indigo wash */}
        <div className="absolute top-[60%] left-[30%] w-[500px] h-[500px] rounded-full bg-indigo-900/15 blur-[140px]" />
      </div>

      {/* Glass Top Navigation */}
      <GlassNavbar
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenAddIncome={() => setIsAddIncomeOpen(true)}
        onOpenAddTransfer={() => setIsAddTransferOpen(true)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        {/* Sidebar */}
        <GlassSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileNavOpen}
          setIsOpenMobile={setIsMobileNavOpen}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-20 lg:pb-8">
          {/* Mobile hamburger menu bar */}
          <div className="lg:hidden flex items-center justify-between mb-4 p-3 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-purple-300"
            >
              {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{isMobileNavOpen ? 'Close Menu' : 'Browse All Pages'}</span>
            </button>
            <span className="text-xs font-bold text-white capitalize">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          {/* Active View Component */}
          {renderActivePage()}
        </main>
      </div>

      {/* All Application Modals */}
      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
      <AddIncomeModal
        isOpen={isAddIncomeOpen}
        onClose={() => setIsAddIncomeOpen(false)}
      />
      <AddTransferModal
        isOpen={isAddTransferOpen}
        onClose={() => setIsAddTransferOpen(false)}
      />
      <AddEmiModal isOpen={isAddEmiOpen} onClose={() => setIsAddEmiOpen(false)} />
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
      />
      <AddGoalModal isOpen={isAddGoalOpen} onClose={() => setIsAddGoalOpen(false)} />
      <AddCreditCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
      />
      <AddRecurringBillModal
        isOpen={isAddRecurringOpen}
        onClose={() => setIsAddRecurringOpen(false)}
      />
      <AddTaxSavingModal
        isOpen={isAddTaxOpen}
        onClose={() => setIsAddTaxOpen(false)}
      />
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070913] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl border border-rose-500/30">
              !
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </ErrorBoundary>
  );
}
