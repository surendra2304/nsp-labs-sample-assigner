import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Map,
  ListOrdered,
  Users,
  Settings,
  RotateCcw,
  Sparkles,
  FlaskConical,
  BarChart3
} from 'lucide-react';

interface NavbarProps {
  onOpenSamplers: () => void;
  onOpenBatch: () => void;
  onOpenSettings: () => void;
  onOpenSummary: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSamplers,
  onOpenBatch,
  onOpenSettings,
  onOpenSummary
}) => {
  const { activeView, setActiveView, resetAllSamplersToHome, samplers, requests } = useApp();

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                NSP Labs
              </h1>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase">
                Dispatcher
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5 hidden xs:block">
              {todayStr} • Aquaculture Sample Assigner
            </p>
          </div>
        </div>

        {/* Center: Navigation View Tabs */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'map'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map & Dispatch</span>
          </button>

          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer relative ${
              activeView === 'list'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Assignments</span>
            {requests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* Daily Report Trigger */}
          <button
            onClick={onOpenSummary}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Daily Summary & Report"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Report</span>
          </button>

          {/* Quick Batch Routing Modal Trigger */}
          <button
            onClick={onOpenBatch}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Batch Multi-Route Optimizer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Batch Mode</span>
          </button>

          {/* Manage Samplers */}
          <button
            onClick={onOpenSamplers}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            title="Manage Samplers & Locations"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Samplers</span>
          </button>

          {/* Morning Reset Button */}
          <button
            onClick={resetAllSamplersToHome}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-200"
            title="Reset All Samplers to Home Base"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="App Settings & API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
