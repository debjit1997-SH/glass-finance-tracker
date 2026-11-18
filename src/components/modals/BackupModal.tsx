import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { useFinance } from '../../context/FinanceContext';
export const BackupModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { exportJSON } = useFinance();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const download = async () => {
    setBusy(true);
    setMessage('');
    try {
      const json = await exportJSON();
      const url = URL.createObjectURL(
        new Blob([json], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `AuraFinance-records-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        'All supported datasets were fetched successfully and exported.'
      );
    } catch (e: any) {
      setMessage(`Export incomplete: ${e.message}. No backup was downloaded.`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export your records"
      subtitle="Read-only export. Existing records stay untouched."
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Export the app’s supported records as JSON. For a full backup
          including formulas, formatting and extra columns, also make a copy of
          the original Google Sheet.
        </p>
        <button
          disabled={busy}
          onClick={download}
          className="glass-btn-primary px-4 py-3 rounded-xl"
        >
          {busy ? 'Verifying all datasets…' : 'Download JSON export'}
        </button>
        <p role="status" className="text-sm">
          {message}
        </p>
        <p className="text-xs text-slate-400">
          Bulk restore, reset and demo-data insertion are disabled.
        </p>
      </div>
    </GlassModal>
  );
};
