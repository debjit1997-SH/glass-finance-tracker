import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { useFinance } from '../../context/FinanceContext';
import { AccountType } from '../../types/finance';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
  const { addAccount, settings } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [color, setColor] = useState('indigo');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    { label: 'Emerald', value: 'emerald' },
    { label: 'Indigo', value: 'indigo' },
    { label: 'Purple', value: 'purple' },
    { label: 'Blue', value: 'blue' },
    { label: 'Cyan', value: 'cyan' },
    { label: 'Amber', value: 'amber' },
    { label: 'Rose', value: 'rose' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || openingBalance === '') return;

    setIsSubmitting(true);
    try {
      await addAccount({
        name,
        type,
        openingBalance: parseFloat(openingBalance),
        color,
        accountNumberLast4: accountNumberLast4 || undefined,
      });

      setName('');
      setOpeningBalance('');
      setAccountNumberLast4('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Account"
      subtitle="Add checking accounts, cash wallets, cards, or investment portfolios"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Account Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. HDFC Salary, ICICI Savings, Cash in Wallet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Account Type <span className="text-rose-400">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="bank">Bank Checking / Savings</option>
              <option value="cash">Cash in Hand</option>
              <option value="credit_card">Credit Card</option>
              <option value="investment">Investment / Demat</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Opening Balance ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Color Theme
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              {colors.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Last 4 Digits (Optional)
            </label>
            <input
              type="text"
              maxLength={4}
              placeholder="1234"
              value={accountNumberLast4}
              onChange={(e) => setAccountNumberLast4(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
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
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
