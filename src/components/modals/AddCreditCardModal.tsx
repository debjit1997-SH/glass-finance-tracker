import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { useFinance } from '../../context/FinanceContext';

interface AddCreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCreditCardModal: React.FC<AddCreditCardModalProps> = ({ isOpen, onClose }) => {
  const { addCreditCard, accounts, addAccount, settings } = useFinance();

  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [limit, setLimit] = useState('');
  const [currentUnbilled, setCurrentUnbilled] = useState('0');
  const [statementDay, setStatementDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState('purple');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bank || !limit) return;

    setIsSubmitting(true);
    try {
      // 1. Create a linked credit_card Account
      const accountId = `acc-card-${Date.now()}`;
      await addAccount({
        id: accountId,
        name: `${name} (${bank})`,
        type: 'credit_card',
        openingBalance: 0,
        color,
      });

      // 2. Add credit card record
      await addCreditCard({
        name,
        bank,
        limit: parseFloat(limit),
        currentUnbilled: parseFloat(currentUnbilled || '0'),
        accountId,
        color,
        statementDay: parseInt(statementDay, 10),
        dueDay: parseInt(dueDay, 10),
      });

      setName('');
      setBank('');
      setLimit('');
      setCurrentUnbilled('0');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Credit Card"
      subtitle="Track card limits, unbilled cycle transactions, and billing statements"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Card Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Regalia Gold, Infinia, Millennia"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Bank / Issuer <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Bank, ICICI, SBI"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Credit Limit ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="300000"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Current Unbilled ({settings.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={currentUnbilled}
              onChange={(e) => setCurrentUnbilled(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Statement Day (1-31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={statementDay}
              onChange={(e) => setStatementDay(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Payment Due Day
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="glass-input w-full mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Card Color
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="purple">Purple</option>
              <option value="indigo">Indigo</option>
              <option value="emerald">Emerald</option>
              <option value="rose">Rose</option>
              <option value="amber">Amber</option>
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
            {isSubmitting ? 'Adding...' : 'Add Credit Card'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
