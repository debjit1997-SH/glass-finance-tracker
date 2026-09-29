import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'emerald' | 'indigo' | 'purple' | 'rose' | 'amber';
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  interactive = false,
  ...props
}) => {
  const glowClasses = {
    none: '',
    emerald: 'shadow-glass-glow-emerald border-emerald-500/20',
    indigo: 'shadow-glass-glow-indigo border-indigo-500/20',
    purple: 'shadow-glass-glow-purple border-purple-500/20',
    rose: 'shadow-glass-glow-rose border-rose-500/20',
    amber: 'shadow-glass-glow-amber border-amber-500/20',
  }[glow];

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
        interactive
          ? 'glass-card-interactive cursor-pointer'
          : 'glass-panel'
      } ${glowClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
