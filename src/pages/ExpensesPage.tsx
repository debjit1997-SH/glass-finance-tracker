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
import { Expense, ExpenseStatus } from '../types/finance';
import {
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Wallet,
  Tag,
  Filter,
} from 'lucide-react';

interface ExpensesPageProps {
  onOpenAddExpense: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onOpenAddExpense,
}) => {
  const {
    expenses,
    accounts,
    budgetCategories,
    selectedMonth,
    addExpense,
    updateExpense,
    deleteExpense,
    markExpensePaid,
    settings,
    isStoreLoading,
  } = useFinance();

  const [filters, setFilters] = useState(emptyTransactionFilter);
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Paid' | 'Pending' | 'Overdue'
  >('All');

  const todayStr = localDate();

  // Filter by month
  const monthlyExpenses = expenses.filter(
    (e) =>
      (filters.allMonths || e.date.startsWith(selectedMonth)) &&
      matchesTransaction(e, filters)
  );

  // Category & Status filter
  const filteredExpenses = monthlyExpenses.filter((e) => {
    if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    return true;
  });

  const pagination = useTransactionPage(
    filteredExpenses,
    JSON.stringify([selectedMonth, filters, statusFilter, categoryFilter])
  );

  const totalExpected = monthlyExpenses.reduce(
    (s, e) => s + e.expectedAmount,
    0
  );
  const totalPaid = monthlyExpenses
    .filter((e) => e.status === 'Paid')
    .reduce((s, e) => s + (e.actualAmount ?? e.expectedAmount), 0);
  const totalPending = monthlyExpenses
    .filter((e) => e.status === 'Pending' || e.status === 'Overdue')
    .reduce((s, e) => s + e.expectedAmount, 0);

  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setFormBusy(true);
    setFormError('');
    try {
      if (editingExpense.id) await updateExpense(editingExpense);
      else await addExpense(editingExpense);
      setEditingExpense(null);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setFormBusy(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete expense "${name}"?`)) {
      await deleteExpense(id);
    }
  };

  if (isStoreLoading('expenses') && expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-rose-400" />
            Monthly Expenses
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log routine expenditures, utilities, dining, and auto-flagged
            overdue payments
          </p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Expected Expenses
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {totalExpected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {monthlyExpenses.length} logged{' '}
            {monthlyExpenses.length === 1 ? 'item' : 'items'} this month
          </div>
        </GlassCard>

        <GlassCard glow="rose" className="p-4 border-rose-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            Total Settled & Paid
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">
            {settings.currency}
            {totalPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Debited from live account balances
          </div>
        </GlassCard>

        <GlassCard glow={totalPending > 0 ? 'amber' : 'none'} className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Pending / Overdue
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {settings.currency}
            {totalPending.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Upcoming payments due
          </div>
        </GlassCard>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['All', 'Paid', 'Pending', 'Overdue'] as const).map((st) => (
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

        {/* Category dropdown filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="glass-input py-1 px-3 text-xs bg-slate-900"
          >
            <option value="All">All Categories</option>
            {budgetCategories.map((c) => (
              <option key={c.id} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <TransactionPagination pagination={pagination} />
      <GlassCard className="p-0 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No expenses recorded for this month matching the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Expense Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account Debited</th>
                  <th className="py-3 px-4">Expected</th>
                  <th className="py-3 px-4">Actual Amount</th>
                  <th className="py-3 px-4">Actual Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pagination.rows.map((exp, rowIndex) => {
                  const isPaid = exp.status === 'Paid';
                  const isOverdue =
                    exp.status === 'Overdue' ||
                    (exp.status === 'Pending' && exp.date < todayStr);
                  const accountName =
                    accountMap.get(exp.accountId) || 'Unknown Account';

                  return (
                    <React.Fragment key={exp.id}>
                      {(rowIndex === 0 ||
                        pagination.rows[rowIndex - 1].date !== exp.date) && (
                        <tr className="bg-white/5">
                          <th
                            scope="rowgroup"
                            colSpan={9}
                            className="px-4 py-2 text-left font-semibold text-slate-300"
                          >
                            {exp.date || 'No date'}
                          </th>
                        </tr>
                      )}
                      <tr
                        key={exp.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {exp.date}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="font-semibold">{exp.name}</div>
                          {exp.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {exp.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/10">
                            <Tag className="w-3 h-3 text-purple-400" />
                            {exp.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-purple-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 opacity-70" />
                            <span>{accountName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300 whitespace-nowrap">
                          {settings.currency}
                          {exp.expectedAmount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-rose-400 whitespace-nowrap">
                          {isPaid ? (
                            `${settings.currency}${(
                              exp.actualAmount ?? exp.expectedAmount
                            ).toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {exp.actualDate || '—'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-rose-400" />{' '}
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
                              <button
                                onClick={() => markExpensePaid(exp.id)}
                                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Mark Paid
                              </button>
                            )}
                            <button
                              type="button"
                              title="Copy as new pending entry"
                              className="text-xs text-indigo-300 px-2"
                              onClick={() => {
                                setFormError('');
                                setEditingExpense({
                                  ...exp,
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
                              onClick={() => setEditingExpense(exp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id, exp.name)}
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <GlassModal
          isOpen={true}
          onClose={() => setEditingExpense(null)}
          title={
            editingExpense?.id ? 'Edit Expense Record' : 'Copy as new expense'
          }
          subtitle="Modify details, account debited, or mark as paid"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <p role="alert" className="text-sm text-rose-300">
                {formError}
              </p>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Expense Name
              </label>
              <input
                type="text"
                required
                value={editingExpense.name}
                onChange={(e) =>
                  setEditingExpense({ ...editingExpense, name: e.target.value })
                }
                className="glass-input w-full mt-1 text-sm"
              />
            </div>

            <GlassDatePicker
              label="Due / Expense Date"
              required
              value={editingExpense.date}
              onChange={(e) =>
                setEditingExpense({ ...editingExpense, date: e.target.value })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Category
                </label>
                <select
                  value={editingExpense.category}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      category: e.target.value,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  {budgetCategories.map((c) => (
                    <option key={c.id} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Account Debited
                </label>
                <select
                  value={editingExpense.accountId}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Expected Amount ({settings.currency}){' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingExpense.expectedAmount}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      expectedAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Actual Amount Paid ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editingExpense.actualAmount ?? ''}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      actualAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="glass-input w-full mt-1 text-sm font-semibold text-rose-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Payment Status
                </label>
                <select
                  value={editingExpense.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as ExpenseStatus;
                    setEditingExpense({
                      ...editingExpense,
                      status: newStatus,
                      actualAmount:
                        newStatus === 'Paid' && !editingExpense.actualAmount
                          ? editingExpense.expectedAmount
                          : editingExpense.actualAmount,
                    });
                  }}
                  className="glass-input w-full mt-1 text-sm bg-slate-900"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {editingExpense.status === 'Paid' ? (
                <GlassDatePicker
                  label="Actual Payment Date"
                  value={editingExpense.actualDate}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      actualDate: e.target.value,
                    })
                  }
                />
              ) : (
                <div className="flex items-end pb-2 text-xs text-slate-400 italic">
                  Status is {editingExpense.status}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
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
