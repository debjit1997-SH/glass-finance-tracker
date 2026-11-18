import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { useFinance } from '../../context/FinanceContext';
export const AddCreditCardModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { addCreditCard } = useFinance();
  const [name, setName] = useState('');
  const [statementDay, setStatementDay] = useState(17);
  const [dueDay, setDueDay] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addCreditCard({
        name: name.trim(),
        statementDay,
        dueDay,
        bank: '',
        accountId: '',
        limit: 0,
        currentUnbilled: 0,
        color: 'indigo',
      });
      setName('');
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add a card"
      subtitle="Just your statement and payment dates. No bank linking."
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          Card name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC Millennia"
            className="glass-input w-full mt-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            Statement day
            <input
              type="number"
              min="1"
              max="31"
              required
              value={statementDay}
              onChange={(e) => setStatementDay(Number(e.target.value))}
              className="glass-input w-full mt-2"
            />
          </label>
          <label className="text-sm">
            Due day · next month
            <input
              type="number"
              min="1"
              max="31"
              required
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value))}
              className="glass-input w-full mt-2"
            />
          </label>
        </div>
        <p className="text-xs text-slate-400">
          For short months, the last valid day is used. Changing a cycle does
          not rewrite old bills.
        </p>
        {error && (
          <p role="alert" className="text-rose-300 text-sm">
            {error}
          </p>
        )}
        <button
          disabled={busy || !name.trim()}
          className="glass-btn-primary px-5 py-3 rounded-xl"
        >
          {busy ? 'Saving…' : 'Add card'}
        </button>
      </form>
    </GlassModal>
  );
};
