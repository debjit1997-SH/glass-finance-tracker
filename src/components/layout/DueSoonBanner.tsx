import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AlertCircle, Clock, CheckCircle2, ChevronRight, Bell } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const DueSoonBanner: React.FC = () => {
  const { dueSoonItems, markExpensePaid, markEmiPaid, markRecurringBillPaid, settings } =
    useFinance();

  if (dueSoonItems.length === 0) {
    return (
      <GlassCard className="p-4 flex items-center justify-between border-emerald-500/20 bg-emerald-950/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-200">All Clear on Upcoming Dues!</h4>
            <p className="text-xs text-slate-400">
              No pending expenses, EMIs, or recurring subscriptions due within the next 3 days.
            </p>
          </div>
        </div>
        <div className="text-xs font-medium text-emerald-400/80 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          Clean Runway
        </div>
      </GlassCard>
    );
  }

  const overdueCount = dueSoonItems.filter((i) => i.isOverdue).length;

  const handleQuickPay = async (item: (typeof dueSoonItems)[0]) => {
    if (item.source === 'Expense') {
      await markExpensePaid(item.id);
    } else if (item.source === 'EMI') {
      const targetMonth = item.dueDate ? item.dueDate.slice(0, 7) : undefined;
      await markEmiPaid(item.id, targetMonth);
    } else if (item.source === 'RecurringBill') {
      await markRecurringBillPaid(item.id);
    }
  };

  return (
    <GlassCard
      glow={overdueCount > 0 ? 'rose' : 'amber'}
      className={`p-4 mb-6 relative overflow-hidden ${
        overdueCount > 0
          ? 'bg-rose-950/20 border-rose-500/30'
          : 'bg-amber-950/20 border-amber-500/30'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border backdrop-blur-md ${
              overdueCount > 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {overdueCount > 0 ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Due Soon & Pending Alert
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    overdueCount > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {dueSoonItems.length} {dueSoonItems.length === 1 ? 'item' : 'items'}
                </span>
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pending obligations due within the next 3 days across Expenses, EMIs, and Subscriptions.
            </p>
          </div>
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-500/30 w-fit">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            {overdueCount} {overdueCount === 1 ? 'payment is overdue' : 'payments are overdue'}!
          </div>
        )}
      </div>

      {/* Due Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dueSoonItems.map((item) => {
          const badgeStyle = {
            Expense: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            EMI: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
            RecurringBill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          }[item.source];

          const countdownBadge = item.isOverdue ? (
            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Overdue {Math.abs(item.daysRemaining)}d
            </span>
          ) : item.daysRemaining === 0 ? (
            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due Today
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-200 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/25 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              In {item.daysRemaining} {item.daysRemaining === 1 ? 'day' : 'days'}
            </span>
          );

          return (
            <div
              key={`${item.source}-${item.id}`}
              className="p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${badgeStyle}`}
                    >
                      {item.source}
                    </span>
                    {countdownBadge}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-100 truncate" title={item.title}>
                    {item.title}
                  </h5>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <span>Due: {item.dueDate}</span>
                    <span>•</span>
                    <span className="truncate">{item.accountName}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-white">
                    {settings.currency}
                    {item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {item.category ? `Category: ${item.category}` : ''}
                </span>
                <button
                  onClick={() => handleQuickPay(item)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Paid
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};
