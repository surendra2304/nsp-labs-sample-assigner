import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Map,
  PlusCircle,
  ListOrdered,
  Sparkles,
  BarChart3,
  Users
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenSamplers: () => void;
  onOpenBatch: () => void;
  onOpenSummary: () => void;
  mobileTab: 'map' | 'dispatch' | 'list';
  setMobileTab: (tab: 'map' | 'dispatch' | 'list') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenSamplers,
  onOpenBatch,
  onOpenSummary,
  mobileTab,
  setMobileTab
}) => {
  const { requests } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-2xl px-2 py-1.5 flex items-center justify-around sm:hidden safe-area-bottom">
      {/* 1. Map Tab */}
      <button
        onClick={() => setMobileTab('map')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          mobileTab === 'map'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all ${
            mobileTab === 'map' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <Map className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Map</span>
      </button>

      {/* 2. Dispatch Form Tab */}
      <button
        onClick={() => setMobileTab('dispatch')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          mobileTab === 'dispatch'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all ${
            mobileTab === 'dispatch' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <PlusCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Dispatch</span>
      </button>

      {/* 3. Assignments List Tab */}
      <button
        onClick={() => setMobileTab('list')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
          mobileTab === 'list'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all ${
            mobileTab === 'list' ? 'bg-blue-100 text-blue-700' : ''
          }`}
        >
          <ListOrdered className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Today</span>
        {requests.length > 0 && (
          <span className="absolute top-1 right-2.5 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
            {requests.length}
          </span>
        )}
      </button>

      {/* 4. Batch Mode Trigger */}
      <button
        onClick={onOpenBatch}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-purple-600 hover:text-purple-800 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-xl bg-purple-50">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Batch</span>
      </button>

      {/* 5. Report Trigger */}
      <button
        onClick={onOpenSummary}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-xl bg-emerald-50">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Report</span>
      </button>

      {/* 6. Samplers Manager Trigger */}
      <button
        onClick={onOpenSamplers}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-xl bg-slate-100">
          <Users className="w-5 h-5 text-slate-700" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Bases</span>
      </button>
    </nav>
  );
};
