import React, { useState, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MapView } from './components/MapView';
import { BottomDispatchBox } from './components/BottomDispatchBox';
import { SamplerManagerModal } from './components/SamplerManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { TodaySamplesModal } from './components/TodaySamplesModal';
import type { Coordinates } from './types';
import {
  FlaskConical,
  RotateCcw,
  Users,
  Settings,
  Route,
  ClipboardList
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { resetAllSamplersToHome, requests } = useApp();

  // Modals state
  const [isSamplersOpen, setIsSamplersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isTodayOpen, setIsTodayOpen] = useState(false);

  // Synchronized map coordinates & target highlight
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>(null);
  const [targetSamplerId, setTargetSamplerId] = useState<string | null>(null);

  // When zooming on the map, dismiss the soft mobile keyboard so user can view the map clearly
  const handleMapZoom = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden font-sans select-none bg-slate-900">
      {/* 1. FULL-SCREEN GOOGLE MAP IN THE BACKGROUND (Default: Bhimavaram) */}
      <div className="absolute inset-0 z-0">
        <MapView
          pendingCoords={pendingCoords}
          targetSamplerId={targetSamplerId}
          onMapClick={(coords) => {
            setPendingCoords(coords);
          }}
          onMapZoom={handleMapZoom}
        />
      </div>

      {/* 2. TOP FLOATING APP BAR */}
      <header className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Brand */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            <FlaskConical className="w-3.5 h-3.5" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide leading-none">
              NSP LABS
            </h1>
            <p className="text-[9px] text-slate-400 leading-tight">Sample Assigner</p>
          </div>
        </div>

        {/* Quick Actions: Reset Samplers to Base, Samplers, Today, Batch, Settings */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg text-white">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all samplers back to their home bases for the start of the day?')) {
                resetAllSamplersToHome();
              }
            }}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Reset All Samplers to Home Bases (Start of Day)"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] hidden min-[360px]:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSamplersOpen(true)}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Manage and Edit Samplers"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] hidden min-[400px]:inline">Samplers</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTodayOpen(true)}
            className="relative px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Today's Samples (re-send WhatsApp, mark collected, remove)"
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] hidden min-[440px]:inline">Today</span>
            {requests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Batch Multi-Sample Route Optimizer (TSP / VRP)"
          >
            <Route className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] hidden min-[480px]:inline">Batch</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Settings & Data Backup / Export / Import"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </header>

      {/* 3. THE SINGLE FLOATING BOTTOM BOX */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex justify-center">
        <div className="w-full max-w-xl pointer-events-auto">
          <BottomDispatchBox
            onLocationChange={(coords) => setPendingCoords(coords)}
            onTargetSamplerChange={(samplerId) => setTargetSamplerId(samplerId)}
            targetSamplerId={targetSamplerId}
          />
        </div>
      </div>

      {/* Sampler Manager Modal */}
      <SamplerManagerModal
        isOpen={isSamplersOpen}
        onClose={() => setIsSamplersOpen(false)}
      />

      {/* Settings & Data Import/Export Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Today's Samples Modal */}
      <TodaySamplesModal
        isOpen={isTodayOpen}
        onClose={() => setIsTodayOpen(false)}
      />

      {/* Batch Multi-Sample Route Optimizer Modal */}
      <BatchAssignModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
