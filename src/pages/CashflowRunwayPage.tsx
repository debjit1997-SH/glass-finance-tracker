import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCardSkeleton, ChartSkeleton } from '../components/ui/GlassSkeleton';
import { calculateCashflowRunway } from '../services/calculations';
import {
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const CashflowRunwayPage: React.FC = () => {
  const {
    dashboardMetrics,
    selectedMonth,
    incomes,
    expenses,
    emis,
    emiPayments,
    settings,
    isPageLoading,
  } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Compute runway starting from current liquid balance
  const runway = useMemo(() => {
    return calculateCashflowRunway(
      dashboardMetrics.netBalanceInHand,
      selectedMonth,
      incomes,
      expenses,
      emis,
      todayStr,
      emiPayments
    );
  }, [
    dashboardMetrics.netBalanceInHand,
    selectedMonth,
    incomes,
    expenses,
    emis,
    todayStr,
    emiPayments,
  ]);

  if (isPageLoading('runway') && incomes.length === 0 && expenses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton height="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-400" />
          Cash-flow Runway Calendar ({selectedMonth})
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Day-by-day simulated balance forward: Starting with today&apos;s live liquid cash, adding scheduled
          pending incomes, and subtracting pending expenses &amp; EMIs
        </p>
      </div>

      {/* Negative Balance Alert / Clean Runway Alert */}
      {runway.hasNegativeDip ? (
        <GlassCard
          glow="rose"
          className="p-5 border-rose-500/40 bg-rose-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-200">
                Cash-flow Deficit Warning Ahead!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Your projected cash balance dips negative on {runway.negativeDaysCount}{' '}
                {runway.negativeDaysCount === 1 ? 'day' : 'days'} before incoming payday clearances.
                Consider rescheduling expenses or transferring buffer funds.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 text-right self-start sm:self-auto">
            <div className="text-[11px] text-slate-400">Lowest Dip Point:</div>
            <div className="text-lg font-bold font-mono text-rose-400">
              {settings.currency}
              {runway.lowestBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-rose-300 font-mono">{runway.lowestDate}</div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard
          glow="emerald"
          className="p-4 border-emerald-500/25 bg-emerald-950/15 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-200">
                Healthy Positive Cash Runway
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Your liquid balance is projected to stay positive on every day throughout {selectedMonth}.
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400">Minimum Projected Dip:</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              {settings.currency}
              {runway.lowestBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Runway Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Starting Liquid Balance Today
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {settings.currency}
            {dashboardMetrics.netBalanceInHand.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Live checking, savings &amp; cash wallets
          </div>
        </GlassCard>

        <GlassCard
          glow={runway.lowestBalance < 0 ? 'rose' : 'amber'}
          className="p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lowest Projected Point
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              runway.lowestBalance < 0 ? 'text-rose-400' : 'text-amber-300'
            }`}
          >
            {settings.currency}
            {runway.lowestBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Forecasted on {runway.lowestDate || 'Month end'}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Month Runway Horizon
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            {runway.days.length} Days
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Complete daily trajectory model
          </div>
        </GlassCard>
      </div>

      {/* Day by Day Calendar Grid & List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
          <span>Day-by-Day Balance Projection</span>
          <span className="text-xs text-slate-400 font-normal">
            Highlighted ring indicates lowest projected dip
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {runway.days.map((day) => {
            const hasInflow = day.incomingTotal > 0;
            const hasOutflow = day.outgoingTotal > 0;

            return (
              <GlassCard
                key={day.date}
                glow={day.isLowestPoint ? 'amber' : day.isNegative ? 'rose' : 'none'}
                className={`p-3.5 flex flex-col justify-between transition-all ${
                  day.isToday
                    ? 'border-purple-400/60 ring-2 ring-purple-500/30 bg-purple-950/20'
                    : day.isLowestPoint
                    ? 'border-amber-400/50 bg-amber-950/20'
                    : day.isNegative
                    ? 'border-rose-500/40 bg-rose-950/20'
                    : 'bg-slate-900/40'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold ${
                        day.isToday ? 'text-purple-300 font-extrabold' : 'text-slate-300'
                      }`}
                    >
                      {day.dayName} {day.dayNumber}
                    </span>

                    {day.isToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500 text-white">
                        Today
                      </span>
                    )}

                    {day.isLowestPoint && !day.isToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Lowest
                      </span>
                    )}
                  </div>

                  {/* Projected Balance */}
                  <div className="my-1.5">
                    <div className="text-[10px] text-slate-400">Projected:</div>
                    <div
                      className={`text-sm font-bold font-mono tracking-tight ${
                        day.isNegative
                          ? 'text-rose-400'
                          : day.isLowestPoint
                          ? 'text-amber-300'
                          : 'text-white'
                      }`}
                    >
                      {settings.currency}
                      {day.projectedBalance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Daily Flows */}
                  <div className="space-y-1 text-[11px] pt-1.5 border-t border-white/5">
                    {hasInflow && (
                      <div className="flex items-center justify-between text-emerald-400 font-mono">
                        <span className="flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> In:
                        </span>
                        <span>+{settings.currency}{day.incomingTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {hasOutflow && (
                      <div className="flex items-center justify-between text-rose-400 font-mono">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> Out:
                        </span>
                        <span>-{settings.currency}{day.outgoingTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {!hasInflow && !hasOutflow && (
                      <div className="text-[10px] text-slate-500 italic">No scheduled dues</div>
                    )}
                  </div>
                </div>

                {/* Events count */}
                {day.events.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 truncate">
                    {day.events.map((e, i) => (
                      <div key={i} className="truncate" title={`${e.title}: ${settings.currency}${e.amount}`}>
                        • {e.title}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
