import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INITIAL_SAMPLERS } from '../context/AppContext';
import {
  Settings,
  X,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Database,
  FileJson,
  CheckCircle2
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { samplers, requests, setAllSamplers, resetAllSamplersToHome } = useApp();

  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  // Build full backup object
  const getBackupData = () => {
    return {
      appName: 'NSP Labs Sample Assigner',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      samplers,
      requests
    };
  };

  // Copy JSON backup to clipboard
  const handleCopyBackup = () => {
    const dataStr = JSON.stringify(getBackupData(), null, 2);
    navigator.clipboard.writeText(dataStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download JSON backup file
  const handleDownloadBackup = () => {
    const dataStr = JSON.stringify(getBackupData(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nsp-labs-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = () => {
    setImportError('');
    setImportSuccess(false);

    try {
      const parsed = JSON.parse(importJson.trim());
      let importedSamplers = null;

      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        // Direct samplers array
        importedSamplers = parsed;
      } else if (parsed.samplers && Array.isArray(parsed.samplers)) {
        // Full backup object
        importedSamplers = parsed.samplers;
      }

      if (importedSamplers) {
        setAllSamplers(importedSamplers);
        setImportSuccess(true);
        setImportJson('');
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError('Invalid format. Could not find valid samplers data.');
      }
    } catch (err: any) {
      setImportError('Invalid JSON format. Please paste valid backup code.');
    }
  };

  // Factory reset to default 3 samplers
  const handleFactoryReset = () => {
    if (
      window.confirm(
        'Restore initial default samplers (Ramesh at Bhimavaram, Suresh at Narasapuram, Naidu at Palakol)? All custom edits will be replaced.'
      )
    ) {
      setAllSamplers(INITIAL_SAMPLERS);
      resetAllSamplersToHome();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Settings & Data Management</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Backup, export, or import samplers & lab configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Export Data */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export & Backup Data</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Export all your configured samplers, phone numbers, and coordinates to transfer to another phone or keep a safe backup.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyBackup}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Backup!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>
            </div>
          </div>

          {/* Section 2: Import Data */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import & Restore Data</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Paste your backup JSON text below to restore samplers on this phone:
            </p>
            <textarea
              rows={3}
              placeholder="Paste exported backup JSON here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none font-mono text-[11px] text-slate-800 resize-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleImportBackup}
              disabled={!importJson.trim()}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Restore from Backup</span>
            </button>

            {importSuccess && (
              <p className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Data restored successfully!
              </p>
            )}

            {importError && (
              <p className="text-red-600 font-bold text-[11px]">{importError}</p>
            )}
          </div>

          {/* Section 3: Factory Reset */}
          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/80 flex items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-red-900 text-xs">Factory Reset</h4>
              <p className="text-[10px] text-red-700">Restore default samplers (Ramesh, Suresh, Naidu)</p>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer active:scale-98"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
