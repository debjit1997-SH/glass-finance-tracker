import {
  useTransactionPage,
  TransactionPagination,
} from '../components/TransactionPagination';
import {
  TransactionFilters,
  emptyTransactionFilter,
  matchesTransaction,
} from '../components/TransactionFilters';
import { localDate } from '../services/financeRules';
import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassModal } from '../components/ui/GlassModal';
import { GlassDatePicker } from '../components/ui/GlassDatePicker';
import {
  TableRowSkeleton,
  StatCardSkeleton,
} from '../components/ui/GlassSkeleton';
import { Income, IncomeStatus } from '../types/finance';
import {
  ArrowDownLeft,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  Wallet,
  Sparkles,
} from 'lucide-react';

interface IncomePageProps {
  onOpenAddIncome: () => void;
}

export const IncomePage: React.FC<IncomePageProps> = ({ onOpenAddIncome }) => {
  const {
    incomes,
    accounts,
    selectedMonth,
    addIncome,
    updateIncome,
    deleteIncome,
    markIncomeReceived,
    settings,
    isStoreLoading,
  } = useFinance();

  const [filters, setFilters] = useState(emptyTransactionFilter);
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Received' | 'Pending'
  >('All');

  // Filter incomes by selected month
  const monthlyIncomes = incomes.filter(
    (i) =>
      (filters.allMonths || i.date.startsWith(selectedMonth)) &&
      matchesTransaction(i, filters)
  );

  const filteredIncomes = monthlyIncomes.filter((i) => {
    if (statusFilter === 'All') return true;
    return i.status === statusFilter;
  });

  const pagination = useTransactionPage(
    filteredIncomes,
    JSON.stringify([selectedMonth, filters, statusFilter])
  );

  const totalExpected = monthlyIncomes.reduce(
    (s, i) => s + i.expectedAmount,
    0
  );
  const totalReceived = monthlyIncomes
    .filter((i) => i.status === 'Received')
    .reduce((s, i) => s + (i.actualAmount ?? i.expectedAmount), 0);
  const totalPending = monthlyIncomes
    .filter((i) => i.status === 'Pending')
    .reduce((s, i) => s + i.expectedAmount, 0);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;
    setFormBusy(true);
    setFormError('');
    try {
      if (editingIncome.id) await updateIncome(editingIncome);
      else await addIncome(editingIncome);
      setEditingIncome(null);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setFormBusy(false);
    }
  };

  const handleDelete = async (id: string, source: string) => {
    if (window.confirm(`Delete income entry "${source}"?`)) {
      await deleteIncome(id);
    }
  };

  if (isStoreLoading('incomes') && incomes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <TransactionFilters
        value={filters}
        onChange={setFilters}
        accounts={accounts}
      />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            Monthly Income Stream
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log salaries, consulting contracts, dividends, and scheduled payouts
          </p>
        </div>

        <button
          onClick={onOpenAddIncome}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Income</span>
        </button>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Expected Income
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {totalExpected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {monthlyIncomes.length} total stream{' '}
            {monthlyIncomes.length === 1 ? 'entry' : 'entries'}
          </div>
        </GlassCard>

        <GlassCard glow="emerald" className="p-4 border-emerald-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Received & Credited
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {settings.currency}
            {totalReceived.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Reflected in live bank balance
          </div>
        </GlassCard>

        <GlassCard glow={totalPending > 0 ? 'amber' : 'none'} className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Pending / Scheduled
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {settings.currency}
            {totalPending.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Awaiting payout clearance
          </div>
        </GlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['All', 'Received', 'Pending'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredIncomes.length} of {monthlyIncomes.length}
        </span>
      </div>

      {/* Incomes Table / Card List */}
      <TransactionPagination pagination={pagination} />
      <GlassCard className="p-0 overflow-hidden">
        {filteredIncomes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No income entries recorded for this month matching the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Account Credited</th>
                  <th className="py-3 px-4">Expected</th>
                  <th className="py-3 px-4">Actual Amount</th>
                  <th className="py-3 px-4">Actual Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pagination.rows.map((inc, rowIndex) => {
                  const isReceived = inc.status === 'Received';
                  const accountName =
                    accountMap.get(inc.accountId) || 'Unknown Account';

                  return (
                    <React.Fragment key={inc.id}>
                      {(rowIndex === 0 ||
                        pagination.rows[rowIndex - 1].date !== inc.date) && (
                        <tr className="bg-white/5">
                          <th
                            scope="rowgroup"
                            colSpan={8}
                            className="px-4 py-2 text-left font-semibold text-slate-300"
                          >
                            {inc.date || 'No date'}
                          </th>
                        </tr>
                      )}
                      <tr
                        key={inc.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {inc.date}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="font-semibold">{inc.source}</div>
                          {inc.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {inc.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-purple-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 opacity-70" />
                            <span>{accountName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300 whitespace-nowrap">
                          {settings.currency}
                          {inc.expectedAmount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {isReceived ? (
                            `${settings.currency}${(
                              inc.actualAmount ?? inc.expectedAmount
                            ).toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {inc.actualDate || '—'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isReceived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Received
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReceived && (
                              <button
                                onClick={() => markIncomeReceived(inc.id)}
                                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Received
                              </button>
                            )}
                            <button
                              type="button"
                              title="Copy as new pending entry"
                              className="text-xs text-indigo-300 px-2"
                              onClick={() => {
                                setFormError('');
                                setEditingIncome({
                                  ...inc,
                                  id: '',
                                  date: localDate(),
                                  actualAmount: 0,
                                  actualDate: '',
                                  status: 'Pending',
                                });
                              }}
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => setEditingIncome(inc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(inc.id, inc.source)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <TransactionPagination pagination={pagination} />

      {/* Edit Income Modal */}
      {editingIncome && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingIncome(null)}
          title={
            editingIncome?.id ? 'Edit Income Record' : 'Copy as new income'
          }
          subtitle="Modify amounts, scheduled date, or account credited"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <p role="alert" className="text-sm text-rose-300">
                {formError}
              </p>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Source
              </label>
              <input
                type="text"
                required
                value={editingIncome.source}
                onChange={(e) =>
                  setEditingIncome({ ...editingIncome, source: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <GlassDatePicker
              label="Scheduled Date"
              required
              value={editingIncome.date}
              onChange={(e) =>
                setEditingIncome({ ...editingIncome, date: e.target.value })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Account Credited
                </label>
                <select
                  value={editingIncome.accountId}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      accountId: e.target.value,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Status
                </label>
                <select
                  value={editingIncome.status}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      status: e.target.value as IncomeStatus,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  <option value="Received">Received</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Expected Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingIncome.expectedAmount}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      expectedAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Actual Amount ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={editingIncome.actualAmount}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      actualAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
                />
              </div>
            </div>

            {editingIncome.status === 'Received' && (
              <GlassDatePicker
                label="Actual Credit Date"
                value={editingIncome.actualDate}
                onChange={(e) =>
                  setEditingIncome({
                    ...editingIncome,
                    actualDate: e.target.value,
                  })
                }
              />
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingIncome(null)}
                className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formBusy}
                className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
};
