import { localDate } from '../../services/financeRules';
import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';
import { Info, ArrowRight } from 'lucide-react';

interface AddTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransferModal: React.FC<AddTransferModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addTransfer, settings } = useFinance();

  const todayStr = localDate();
  const [date, setDate] = useState(todayStr);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Completed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!fromAccountId && accounts.length > 0) setFromAccountId(accounts[0].id);
    if (!toAccountId && accounts.length > 1) setToAccountId(accounts[1].id);
  }, [accounts, fromAccountId, toAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !amount) return;

    if (fromAccountId === toAccountId) {
      setError('Origin and destination accounts cannot be identical.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await addTransfer({
        date,
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        reason: reason || 'Internal Account Transfer',
        status,
      });

      setAmount('');
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Internal Transfer"
      subtitle="Move money between your own accounts without affecting income or expense totals"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Box: Non-income/expense rule */}
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Global Rule:</strong> Transfers between your own accounts adjust respective live
            balances only and are strictly excluded from monthly Income and Expense calculations.
          </span>
        </div>

        {/* Date (Real Calendar Picker) */}
        <GlassDatePicker
          label="Transfer Date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* From & To Accounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              From Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
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
              To Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
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
        </div>

        {error && <div className="text-xs text-rose-400 font-medium">{error}</div>}

        {/* Amount & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Amount ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Transfer Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Pending' | 'Completed')}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Completed">Completed (Immediate)</option>
              <option value="Pending">Pending (Scheduled)</option>
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Transfer Purpose / Reason
          </label>
          <input
            type="text"
            placeholder="e.g. Sinking fund allocation, Cash withdrawal, CC bill settlement"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
