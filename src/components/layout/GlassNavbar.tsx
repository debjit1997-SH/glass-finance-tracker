import { localDate } from '../../services/financeRules';
import { ThemeToggle } from './ThemeToggle';
import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  X,
} from 'lucide-react';
import { GlassModal } from '../ui/GlassModal';

interface GlassNavbarProps {
  onOpenBackup: () => void;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenAddTransfer: () => void;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  onOpenBackup,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenAddTransfer,
}) => {
  const {
    selectedMonth,
    setSelectedMonth,
    prevMonth,
    nextMonth,
    isSyncing,
    syncStatus,
    syncError,
    refreshAllFromDB,
    dismissSyncError,
  } = useFinance();

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Format YYYY-MM to human readable "September 2026"
  const formattedMonth = (() => {
    try {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonth;
    }
  })();

  const isCurrentActualMonth =
    selectedMonth === localDate().slice(0, 7);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-4 lg:px-8 py-3 transition-all shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/25 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
                  AuraFinance
                </span>
                <span className="hidden md:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Personal finance
                </span>
              </div>
            </div>

            <ThemeToggle />
            {/* Mobile Actions */}
            <div className="sm:hidden flex items-center gap-2">
              <button
                onClick={() => refreshAllFromDB()}
                disabled={isSyncing}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                title="Sync from Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
              </button>
              <button
                onClick={onOpenBackup}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300"
                title="Backup & Data"
              >
                <Database className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="p-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Global Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/70 border border-white/10 rounded-xl p-1 shadow-inner backdrop-blur-md">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center gap-2 px-3 py-1">
              <Calendar className="w-4 h-4 text-purple-400 opacity-90" />
              <span className="text-xs sm:text-sm font-semibold text-slate-100 min-w-[130px] text-center select-none">
                {formattedMonth}
              </span>

              {/* Native month picker underneath */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                title="Click to jump to another month"
              />
            </div>

            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrentActualMonth && (
              <button
                onClick={() => setSelectedMonth(localDate().slice(0, 7))}
                className="ml-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
              >
                Current
              </button>
            )}
          </div>

          {/* Right Header Actions: Google Sheets Status + Quick Menu + Backup */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Google Sheets Sync Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 text-purple-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span className="text-[11px] font-medium">Syncing Sheets...</span>
                </div>
              ) : syncStatus === 'error' ? (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors"
                  title="Click for Google Apps Script authorization help"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold underline decoration-amber-400/50">
                    Sync needs attention
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-medium">{syncStatus === 'synced' ? 'Up to date' : 'Not yet verified'}</span>
                </div>
              )}

              {/* Manual Re-sync button */}
              <button
                onClick={() => refreshAllFromDB()}
                disabled={isSyncing}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title="Refresh all data from Google Sheets"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Action Button */}
            <div className="relative">
              <button
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                className="glass-btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Log Action</span>
              </button>

              {showQuickMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowQuickMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setShowQuickMenu(false);
                        onOpenAddExpense();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <div className="p-1 rounded bg-rose-500/20 text-rose-300">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <span>Record Expense</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickMenu(false);
                        onOpenAddIncome();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <div className="p-1 rounded bg-emerald-500/20 text-emerald-300">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      </div>
                      <span>Record Income</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickMenu(false);
                        onOpenAddTransfer();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
                    >
                      <div className="p-1 rounded bg-cyan-500/20 text-cyan-300">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </div>
                      <span>Internal Transfer</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Backup / Export / Import */}
            <button
              onClick={onOpenBackup}
              className="glass-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              title="JSON Backup & Restore"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Backup</span>
            </button>
          </div>
        </div>

        {/* Global Sync Error Warning Ribbon if unauthorized */}
        {syncStatus === 'error' && syncError && (
          <div className="max-w-7xl mx-auto mt-2.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Google Sheets Access Notice:</strong> {syncError}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowHelpModal(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 font-medium transition-colors"
              >
                How to Fix
              </button>
              <button
                onClick={() => refreshAllFromDB()}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Retry
              </button>
              <button
                onClick={dismissSyncError}
                className="p-1 text-amber-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <GlassModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} title="Sync status" subtitle="Your last confirmed records stay visible." maxWidth="lg">
        <div className="space-y-4 text-sm"><p>{syncError || 'Refresh to check your Google Sheets connection.'}</p><p className="text-slate-400">A failed connection is not a successful save. If a save timed out, refresh and check the record before retrying. Do not change sharing permissions as a general fix.</p><button onClick={() => { setShowHelpModal(false); void refreshAllFromDB(); }} className="glass-btn-primary px-4 py-2 rounded-xl">Refresh records</button></div>
      </GlassModal>
    </>
  );
};
