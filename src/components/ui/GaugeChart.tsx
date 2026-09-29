import React from 'react';

interface GaugeChartProps {
  value: number; // e.g. months covered
  targetMin?: number; // e.g. 3
  targetMax?: number; // e.g. 6
  maxScale?: number; // e.g. 10
  size?: number;
  label?: string;
  subtext?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  targetMin = 3,
  targetMax = 6,
  maxScale = 9,
  size = 190,
  label = 'Months Covered',
  subtext,
}) => {
  // Semi-circle gauge (180 degrees from -180 to 0)
  const radius = size * 0.38;
  const strokeWidth = 14;
  const center = size / 2;

  // Clamped value for visual needle
  const clamped = Math.max(0, Math.min(value, maxScale));
  const percent = clamped / maxScale;

  // Arc math: from 180 to 0 degrees (left to right)
  const angle = Math.PI - percent * Math.PI;
  const needleX = center + radius * 0.7 * Math.cos(angle);
  const needleY = center - radius * 0.7 * Math.sin(angle);

  // Status color
  const statusColor =
    value >= targetMax
      ? '#10b981' // emerald
      : value >= targetMin
      ? '#3b82f6' // blue
      : value >= 1.5
      ? '#f59e0b' // amber
      : '#f43f5e'; // rose

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background Arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active Arc */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${
            center + radius * Math.cos(angle)
          } ${center - radius * Math.sin(angle)}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />

        {/* Target Band Indicator: 3 to 6 months */}
        {/* Needle / Value Pointer */}
        <circle cx={needleX} cy={needleY} r={4.5} fill={statusColor} />
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke={statusColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={center} cy={center} r={6} fill="#1e1b4b" stroke={statusColor} strokeWidth={2} />
      </svg>

      {/* Value Overlay */}
      <div className="text-center -mt-6">
        <div className="text-2xl font-black tracking-tight" style={{ color: statusColor }}>
          {value.toFixed(1)} <span className="text-xs font-semibold text-slate-400">mo</span>
        </div>
        <div className="text-[11px] font-medium text-slate-300">{label}</div>
        {subtext && (
          <div className="text-[10px] text-slate-400 mt-0.5 max-w-[170px] truncate">
            {subtext}
          </div>
        )}
      </div>

      {/* Target range marker badges */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
        <span>0m</span>
        <span className="text-purple-300 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
          Target: {targetMin}-{targetMax} mo
        </span>
        <span>{maxScale}m+</span>
      </div>
    </div>
  );
};
