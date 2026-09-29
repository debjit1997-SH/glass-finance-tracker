import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useFinance } from '../../context/FinanceContext';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose }) => {
  const { addSavingsGoal, settings } = useFinance();

  const nextYearDate = new Date();
  nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
  const defaultTargetDate = nextYearDate.toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [currentSaved, setCurrentSaved] = useState('0');
  const [category, setCategory] = useState('Safety');
  const [color, setColor] = useState('emerald');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    setIsSubmitting(true);
    try {
      await addSavingsGoal({
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate,
        currentSaved: parseFloat(currentSaved || '0'),
        category,
        icon: 'Target',
        color,
      });

      setName('');
      setTargetAmount('');
      setCurrentSaved('0');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Savings Goal / Sinking Fund"
      subtitle="Establish dedicated funds for emergencies, travel, gadgets, and life goals"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Goal Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Emergency Fund, Japan Trip, Macbook Pro"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full mt-1 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Target Amount ({settings.currency}) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="300000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Current Saved ({settings.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={currentSaved}
              onChange={(e) => setCurrentSaved(e.target.value)}
              className="glass-input w-full mt-1 text-sm font-semibold text-emerald-400"
            />
          </div>
        </div>

        <GlassDatePicker
          label="Target Completion Date"
          required
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          helperText="Monthly requirement will be calculated based on months remaining"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="Safety">Emergency & Safety</option>
              <option value="Travel">Travel & Vacation</option>
              <option value="Tech">Gadgets & Tech</option>
              <option value="Vehicle">Vehicle Downpayment</option>
              <option value="Education">Education & Courses</option>
              <option value="Other">Other Milestone</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Accent Color
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="glass-input w-full mt-1 text-sm bg-slate-900"
            >
              <option value="emerald">Emerald Green</option>
              <option value="blue">Sapphire Blue</option>
              <option value="purple">Amethyst Purple</option>
              <option value="rose">Ruby Rose</option>
              <option value="amber">Warm Amber</option>
              <option value="cyan">Electric Cyan</option>
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
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};
