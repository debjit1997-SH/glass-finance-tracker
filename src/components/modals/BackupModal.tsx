import React, { useState } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { useFinance } from '../../context/FinanceContext';
import {
  Download,
  Upload,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileJson,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const {
    exportJSON,
    importJSON,
    loadSampleDataset,
    resetToEmpty,
    accounts,
    incomes,
    expenses,
    emis,
  } = useFinance();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AuraFinance_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup JSON downloaded successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to export backup.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        await importJSON(content);
        setMessage({
          type: 'success',
          text: 'Data imported successfully! All records restored and synced.',
        });
        setTimeout(() => onClose(), 1200);
      } catch (err: any) {
        setMessage({
          type: 'error',
          text: `Invalid backup file: ${err.message || 'Parse error'}`,
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async () => {
    if (
      window.confirm(
        'Load realistic demo dataset? This will replace current records with a balanced test dataset.'
      )
    ) {
      try {
        setIsProcessing(true);
        await loadSampleDataset();
        setMessage({ type: 'success', text: 'Sample dataset loaded successfully!' });
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Failed to load sample dataset.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        '⚠️ Are you absolutely sure? This will permanently wipe all local IndexedDB financial records.'
      )
    ) {
      try {
        setIsProcessing(true);
        await resetToEmpty();
        setMessage({ type: 'success', text: 'Database completely cleared.' });
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Failed to clear database.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Backup & Safety Net"
      subtitle="Google Sheets cloud synchronization with full offline JSON export & restore"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status notification */}
        {message && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Current Database Summary */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-slate-300">Active Records:</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-mono">
            <span>{accounts.length} Accounts</span>
            <span>•</span>
            <span>{incomes.length} Incomes</span>
            <span>•</span>
            <span>{expenses.length} Expenses</span>
            <span>•</span>
            <span>{emis.length} Loans</span>
          </div>
        </div>

        {/* Export Section */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Export Data Backup
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Download your complete financial dataset as a JSON file to transfer devices or keep cold backups.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>

        {/* Import Section */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Import Data Backup
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Restore an existing JSON backup file into your database.
            </p>
          </div>
          <label className="glass-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span>Select JSON File</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
          </label>
        </div>

        {/* Sample Data & Reset row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="p-3.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 text-left transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Load Realistic Demo Data
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Prefills accounts, salaries, expenses, 80C/80D investments, and runway events to explore all features.
            </p>
          </button>

          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="p-3.5 rounded-xl bg-rose-950/15 hover:bg-rose-950/30 border border-rose-500/20 text-left transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Reset All Records
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Clears all accounts, transactions, and settings from browser IndexedDB.
            </p>
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
