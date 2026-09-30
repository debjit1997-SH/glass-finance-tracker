import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';
import { IncomeStatus } from '../../types/finance';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addIncome, settings } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [source, setSource] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(todayStr);
  const [status, setStatus] = useState<IncomeStatus>('Received');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !expectedAmount || !accountId) return;

    setIsSubmitting(true);
    try {
      const expAmt = parseFloat(expectedAmount) || 0;
      const actAmt =
        actualAmount !== ''
          ? parseFloat(actualAmount) || 0
          : status === 'Received'
          ? expAmt
          : 0;

      await addIncome({
        date,
        source,
        expectedAmount: expAmt,
        actualAmount: actAmt,
        accountId,
        actualDate: status === 'Received' ? actualDate : '',
        status,
        notes,
      });

      // Reset
      setSource('');
      setExpectedAmount('');
      setActualAmount('');
      setNotes('');
      setStatus('Received');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Income"
      subtitle="Track salary, freelance client payments, dividends, and bonuses"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Income Source / Client <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Monthly Salary, Freelance Sprint, Dividends"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        {/* Date (Real Calendar Picker) */}
        <GlassDatePicker
          label="Income / Expected Date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          helperText="Select payment or scheduled direct deposit date"
        />

        {/* Account Credited & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Account Credited <span className="text-rose-400">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name || 'Account'} ({(acc.type || 'bank').toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IncomeStatus)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Received">Received (Credited)</option>
              <option value="Pending">Pending (Scheduled)</option>
            </select>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Expected Amount ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="0.00"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Actual Amount Received ({settings.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={
                status === 'Received'
                  ? expectedAmount
                    ? expectedAmount
                    : '0.00'
                  : '0.00 (Pending)'
              }
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
            />
          </div>
        </div>

        {/* If Received: Actual Date */}
        {status === 'Received' && (
          <GlassDatePicker
            label="Actual Credit Date"
            value={actualDate}
            onChange={(e) => setActualDate(e.target.value)}
          />
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="Invoice number, tax deductions withheld..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="glass-btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
          >
            {isSubmitting ? 'Saving...' : 'Save Income'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
