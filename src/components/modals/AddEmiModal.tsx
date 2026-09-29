import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';
import { EmiStatus } from '../../types/finance';
import { Info } from 'lucide-react';

interface AddEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEmiModal: React.FC<AddEmiModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addEmi, settings } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [loanName, setLoanName] = useState('');
  const [lender, setLender] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState(todayStr);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [status, setStatus] = useState<EmiStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName || !lender || !monthlyAmount || !outstandingPrincipal || !interestRate || !accountId)
      return;

    setIsSubmitting(true);
    try {
      let finalStatus = status;
      if (status === 'Pending' && dueDate < todayStr) {
        finalStatus = 'Overdue';
      }

      await addEmi({
        loanName,
        lender,
        monthlyAmount: parseFloat(monthlyAmount),
        outstandingPrincipal: parseFloat(outstandingPrincipal),
        interestRate: parseFloat(interestRate),
        dueDate,
        accountId,
        status: finalStatus,
        notes,
      });

      setLoanName('');
      setLender('');
      setMonthlyAmount('');
      setOutstandingPrincipal('');
      setInterestRate('');
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add EMI Loan"
      subtitle="Track mortgages, vehicle loans, education, and personal debts"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-double counting notice */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Zero Double-Counting:</strong> EMI payments are tracked exclusively in the EMI
            Tracker and factored directly into your net savings and debt payoff planner. Never duplicate
            as an Expense row.
          </span>
        </div>

        {/* Loan Name & Lender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Loan Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Home Loan, EV Car Loan"
              value={loanName}
              onChange={(e) => setLoanName(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Lender / Bank <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SBI, HDFC, ICICI"
              value={lender}
              onChange={(e) => setLender(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>
        </div>

        {/* Monthly EMI & Interest Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Monthly Amount ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="25000"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Interest Rate (% p.a.) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="8.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Outstanding Principal & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Outstanding Principal ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="2500000"
              value={outstandingPrincipal}
              onChange={(e) => setOutstandingPrincipal(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold text-rose-300"
            />
          </div>

          <GlassDatePicker
            label="Monthly Due Date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Debited Account & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Debit Account <span className="text-rose-400">*</span>
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
              Status This Month <span className="text-rose-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmiStatus)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Pending">Pending (Scheduled)</option>
              <option value="Paid">Paid / Debited</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Notes / Loan Account Number (Optional)
          </label>
          <input
            type="text"
            placeholder="Tenure, prepayment terms..."
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
            {isSubmitting ? 'Adding...' : 'Add Loan'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
