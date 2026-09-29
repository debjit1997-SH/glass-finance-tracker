import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';

interface AddTaxSavingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTaxSavingModal: React.FC<AddTaxSavingModalProps> = ({ isOpen, onClose }) => {
  const { addTaxSaving, taxMetrics, settings } = useFinance();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [section, setSection] = useState<'80C' | '80D'>('80C');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    setIsSubmitting(true);
    try {
      await addTaxSaving({
        financialYear: taxMetrics.currentFY,
        name,
        section,
        amount: parseFloat(amount),
        date,
        notes,
      });

      setName('');
      setAmount('');
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
      title="Add Tax-Saving Investment (FY)"
      subtitle={`Track Section 80C & 80D tax deductions for FY ${taxMetrics.currentFY}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Investment / Premium Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. PPF Deposit, ELSS Tax Saver, Health Mediclaim"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Tax Section <span className="text-rose-400">*</span>
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as '80C' | '80D')}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="80C">Section 80C (PPF, ELSS, EPF, Life Ins - ₹1.5L cap)</option>
              <option value="80D">Section 80D (Health Insurance Premium)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Amount ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>
        </div>

        <GlassDatePicker
          label="Deposit / Premium Date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Policy / Folio Reference (Optional)
          </label>
          <input
            type="text"
            placeholder="Receipt or folio number..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
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
            {isSubmitting ? 'Saving...' : 'Add Investment'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
