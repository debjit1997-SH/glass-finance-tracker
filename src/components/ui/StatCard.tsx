import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  subtext?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  icon: React.ReactNode;
  accentColor?: 'emerald' | 'indigo' | 'purple' | 'rose' | 'amber' | 'cyan' | 'blue';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '₹',
  subtext,
  trend,
  icon,
  accentColor = 'indigo',
  className = '',
}) => {
  const accentStyles = {
    emerald: {
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glow: 'emerald' as const,
      highlight: 'from-emerald-500/10 to-transparent',
    },
    indigo: {
      iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      glow: 'indigo' as const,
      highlight: 'from-indigo-500/10 to-transparent',
    },
    purple: {
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      glow: 'purple' as const,
      highlight: 'from-purple-500/10 to-transparent',
    },
    rose: {
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      glow: 'rose' as const,
      highlight: 'from-rose-500/10 to-transparent',
    },
    amber: {
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      glow: 'amber' as const,
      highlight: 'from-amber-500/10 to-transparent',
    },
    cyan: {
      iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      glow: 'none' as const,
      highlight: 'from-cyan-500/10 to-transparent',
    },
    blue: {
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      glow: 'none' as const,
      highlight: 'from-blue-500/10 to-transparent',
    },
  }[accentColor];

  const formattedVal =
    typeof value === 'number'
      ? `${prefix}${value.toLocaleString('en-IN')}`
      : `${prefix}${value}`;

  return (
    <GlassCard
      glow={accentStyles.glow}
      className={`relative overflow-hidden p-5 flex flex-col justify-between ${className}`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentStyles.highlight} rounded-full blur-2xl pointer-events-none -mr-8 -mt-8`}
      />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-sm ${accentStyles.iconBg}`}
        >
          {icon}
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-2xl font-bold tracking-tight text-white mb-1">
          {formattedVal}
        </div>

        {subtext && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            {subtext}
          </div>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`px-1.5 py-0.5 rounded-md ${
                trend.isPositive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {trend.value}
            </span>
            {trend.label && <span className="text-slate-400">{trend.label}</span>}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
