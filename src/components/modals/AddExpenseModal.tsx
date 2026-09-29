import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseStatus } from '../../types/finance';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { accounts, budgetCategories, addExpense, settings } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(budgetCategories[0]?.category || 'Food');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(todayStr);
  const [status, setStatus] = useState<ExpenseStatus>('Paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default account if changed
  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
    if (!category && budgetCategories.length > 0) {
      setCategory(budgetCategories[0].category);
    }
  }, [accounts, budgetCategories, accountId, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !expectedAmount || !accountId) return;

    setIsSubmitting(true);
    try {
      const expAmt = parseFloat(expectedAmount);
      const actAmt = actualAmount ? parseFloat(actualAmount) : status === 'Paid' ? expAmt : 0;

      // Auto check overdue
      let finalStatus = status;
      if (status === 'Pending' && date < todayStr) {
        finalStatus = 'Overdue';
      }

      await addExpense({
        date,
        name,
        category,
        expectedAmount: expAmt,
        actualAmount: actAmt,
        accountId,
        actualDate: status === 'Paid' ? actualDate : '',
        status: finalStatus,
        notes,
      });

      // Reset form
      setName('');
      setExpectedAmount('');
      setActualAmount('');
      setNotes('');
      setStatus('Paid');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Expense"
      subtitle="Track everyday purchases, bills, and outgoing payments"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Expense Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Grocery Supermarket, Uber, Dinner"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        {/* Due/Scheduled Date (Calendar Picker) */}
        <GlassDatePicker
          label="Expense / Due Date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          helperText="Select the date of expense or scheduled bill"
        />

        {/* Category & Account Debited */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
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
              Account Debited <span className="text-rose-400">*</span>
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
        </div>

        {/* Expected Amount & Status */}
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
              value={expectedAmount}
              onChange={(e) => {
                setExpectedAmount(e.target.value);
                if (!actualAmount) setActualAmount(e.target.value);
              }}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Payment Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Paid">Paid / Settled</option>
              <option value="Pending">Pending (Upcoming)</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* If Paid: Actual Payment Date */}
        {status === 'Paid' && (
          <GlassDatePicker
            label="Actual Payment Date"
            value={actualDate}
            onChange={(e) => setActualDate(e.target.value)}
          />
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Notes / Receipt info (Optional)
          </label>
          <input
            type="text"
            placeholder="Add context or tags..."
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
            {isSubmitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
