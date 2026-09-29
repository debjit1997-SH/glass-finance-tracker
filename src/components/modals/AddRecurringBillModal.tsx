import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';
import { BillFrequency } from '../../types/finance';

interface AddRecurringBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRecurringBillModal: React.FC<AddRecurringBillModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accounts, budgetCategories, addRecurringBill, settings } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('Monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState(todayStr);
  const [category, setCategory] = useState(budgetCategories[0]?.category || 'Utilities');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [autoRenew, setAutoRenew] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
    if (!category && budgetCategories.length > 0) setCategory(budgetCategories[0].category);
  }, [accounts, budgetCategories, accountId, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !accountId) return;

    setIsSubmitting(true);
    try {
      await addRecurringBill({
        name,
        amount: parseFloat(amount),
        frequency,
        nextRenewalDate,
        category,
        accountId,
        autoRenew,
      });

      setName('');
      setAmount('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subscription / Recurring Bill"
      subtitle="Track recurring memberships and streaming subscriptions feeding Due Soon alerts"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Subscription / Bill Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Netflix, Spotify, AWS, Gym"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

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
              placeholder="649"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Billing Frequency <span className="text-rose-400">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BillFrequency)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly (Annual)</option>
            </select>
          </div>
        </div>

        <GlassDatePicker
          label="Next Renewal Date"
          required
          value={nextRenewalDate}
          onChange={(e) => setNextRenewalDate(e.target.value)}
          helperText="Feeds the Dashboard Due Soon banner automatically"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              {budgetCategories.map((cat) => (
                <option key={cat.id} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Auto-debit Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
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
            {isSubmitting ? 'Saving...' : 'Add Subscription'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
