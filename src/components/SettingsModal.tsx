import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, X, Key, Building2, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, companies, updateSettings, addCompany } = useApp();

  const [apiKey, setApiKey] = useState(settings.googleMapsApiKey);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyGroup, setNewCompanyGroup] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ googleMapsApiKey: apiKey.trim() });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    addCompany(newCompanyName.trim(), newCompanyGroup.trim());
    setNewCompanyName('');
    setNewCompanyGroup('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">App Settings</h2>
              <p className="text-[11px] text-slate-500">Configure Google Maps API & Companies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 text-xs">
          {/* Google Maps API Key Form */}
          <form onSubmit={handleSaveApiKey} className="space-y-2">
            <label className="block font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Maps JavaScript API Key:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs outline-none focus:bg-white focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Save
              </button>
            </div>
            {savedNotice && (
              <p className="text-emerald-600 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> API Key saved successfully!
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Your key is securely stored in local storage and used for Google Maps JS, Places, and Distance Matrix.
            </p>
          </form>

          {/* Companies Management */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Harvesting Companies & Groups:</span>
            </h3>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {c.whatsappGroup || 'Default Group'}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Company Form */}
            <form onSubmit={handleAddCompany} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="New Company (e.g. Apex Aqua)"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
