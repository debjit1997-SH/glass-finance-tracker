import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface GlassDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  label,
  error,
  helperText,
  value,
  onChange,
  className = '',
  required,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-400">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 font-normal lowercase">Calendar Picker</span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="date"
          value={value}
          onChange={onChange}
          required={required}
          className={`glass-input w-full pl-10 pr-3 text-sm focus:outline-none ${
            error ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
        <CalendarIcon className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none opacity-80" />
      </div>

      {helperText && !error && <span className="text-[11px] text-slate-400">{helperText}</span>}
      {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
