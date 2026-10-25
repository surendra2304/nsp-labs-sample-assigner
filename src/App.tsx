import React, { useState, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MapView } from './components/MapView';
import { BottomDispatchBox } from './components/BottomDispatchBox';
import { SamplerManagerModal } from './components/SamplerManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import type { Coordinates } from './types';
import {
  FlaskConical,
  RotateCcw,
  Users,
  Settings,
  Route
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { resetAllSamplersToHome } = useApp();

  // Modals state
  const [isSamplersOpen, setIsSamplersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Synchronized map coordinates & target highlight
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>(null);
  const [targetSamplerId, setTargetSamplerId] = useState<string | null>(null);

  // Ref to hold the textarea focus restore function
  const focusRestoreRef = useRef<() => void>(() => {});
  // Ref to hold the "dismiss keyboard" function (fired on map zoom)
  const blurRestoreRef = useRef<() => void>(() => {});

  const handleRegisterFocus = useCallback((fn: () => void) => {
    focusRestoreRef.current = fn;
  }, []);

  const handleRegisterBlur = useCallback((fn: () => void) => {
    blurRestoreRef.current = fn;
  }, []);

  // A plain map tap/drag keeps the cursor (and keyboard) where it was
  const handleMapInteraction = useCallback(() => {
    focusRestoreRef.current();
  }, []);

  // Zooming in/out is a deliberate "let me look at the map" gesture → hide the keyboard
  const handleMapZoom = useCallback(() => {
    blurRestoreRef.current();
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
          onMapInteraction={handleMapInteraction}
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

        {/* Quick Actions: Reset Samplers to Base & Manage Samplers */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg text-white">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (window.confirm('Reset all samplers back to their home bases for the start of the day?')) {
                resetAllSamplersToHome();
              }
            }}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Reset All Samplers to Home Bases (Start of Day)"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span className="text-[11px]">Reset Bases</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsSamplersOpen(true)}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Manage and Edit Samplers"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px]">Samplers</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsBatchOpen(true)}
            className="px-2.5 py-1 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Batch Multi-Sample Route Optimizer (TSP / VRP)"
          >
            <Route className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] hidden min-[400px]:inline">Batch</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
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
            onRegisterFocusHandler={handleRegisterFocus}
            onRegisterBlurHandler={handleRegisterBlur}
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
