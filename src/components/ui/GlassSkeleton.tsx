import React from 'react';

interface GlassSkeletonProps {
  className?: string;
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <GlassSkeleton className="h-3 w-28" />
        <GlassSkeleton className="h-8 w-8 rounded-xl" />
      </div>
      <GlassSkeleton className="h-7 w-36" />
      <GlassSkeleton className="h-3 w-48" />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 border-b border-white/5">
      <GlassSkeleton className="h-4 w-20" />
      <GlassSkeleton className="h-4 w-32 flex-1" />
      <GlassSkeleton className="h-4 w-24 hidden sm:block" />
      <GlassSkeleton className="h-4 w-20" />
      <GlassSkeleton className="h-6 w-16 rounded-full" />
    </div>
  );
};

export const AccountCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <GlassSkeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <GlassSkeleton className="h-4 w-32" />
          <GlassSkeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="pt-2">
        <GlassSkeleton className="h-3 w-24 mb-1" />
        <GlassSkeleton className="h-6 w-36" />
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-6 ${height} flex flex-col justify-between`}>
      <div className="flex justify-between items-center mb-4">
        <GlassSkeleton className="h-4 w-40" />
        <GlassSkeleton className="h-3 w-24" />
      </div>
      <div className="flex items-end gap-3 h-full pt-4">
        {[40, 70, 55, 90, 65, 80, 50, 75, 95, 60, 85, 70].map((h, i) => (
          <div key={i} className="flex-1 bg-white/5 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
};
