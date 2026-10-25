import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MapView } from './components/MapView';
import { NewSamplePanel } from './components/NewSamplePanel';
import { AssignmentList } from './components/AssignmentList';
import { SamplerManagerModal } from './components/SamplerManagerModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { SettingsModal } from './components/SettingsModal';
import { DailySummaryModal } from './components/DailySummaryModal';
import type { Coordinates } from './types';
import {
  FlaskConical,
  RotateCcw,
  Settings,
  Sparkles,
  ArrowRight,
  Send,
  Navigation,
  Phone
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeView, samplers, resetAllSamplersToHome } = useApp();

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'map' | 'dispatch' | 'list'>('map');

  // Modals state
  const [isSamplersOpen, setIsSamplersOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Synchronized map coordinates & target highlight
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>(null);
  const [targetSamplerId, setTargetSamplerId] = useState<string | null>(null);

  const targetSampler = samplers.find((s) => s.id === targetSamplerId) || samplers[0];

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col pb-16 sm:pb-0 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Desktop & Tablet Top Navbar (Hidden on Small Mobile Phones) */}
      <div className="hidden sm:block">
        <Navbar
          onOpenSamplers={() => setIsSamplersOpen(true)}
          onOpenBatch={() => setIsBatchOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSummary={() => setIsSummaryOpen(true)}
        />
      </div>

      {/* 2. Mobile Compact Top Header (Only on Phones) */}
      <header className="sm:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 py-2 flex items-center justify-between shadow-2xs safe-area-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">
              NSP Labs
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Sample Assigner</p>
          </div>
        </div>

        {/* Header Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetAllSamplersToHome}
            className="p-1.5 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 transition-all"
            title="Reset to Bases"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold hidden xs:inline">Reset</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-5">
        {/* ================= DESKTOP / TABLET LAYOUT (sm and up) ================= */}
        <div className="hidden sm:block">
          {activeView === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Dispatcher Input & Nearest Sampler Selection */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <NewSamplePanel
                  onLocationChange={(coords) => setPendingCoords(coords)}
                  onTargetSamplerChange={(samplerId) => setTargetSamplerId(samplerId)}
                />
              </div>

              {/* Right Column: Full Interactive Google Map */}
              <div className="lg:col-span-7 order-1 lg:order-2 h-[450px] lg:h-[calc(100vh-105px)] lg:sticky lg:top-20">
                <MapView
                  pendingCoords={pendingCoords}
                  targetSamplerId={targetSamplerId}
                  onMapClick={(clickedCoords) => {
                    setPendingCoords(clickedCoords);
                  }}
                />
              </div>
            </div>
          )}

          {activeView === 'list' && (
            <div className="max-w-4xl mx-auto">
              <AssignmentList />
            </div>
          )}
        </div>

        {/* ================= MOBILE PHONE LAYOUT (under sm) ================= */}
        <div className="sm:hidden">
          {/* TAB 1: Mobile Fullscreen Map with Floating Quick Card */}
          {mobileTab === 'map' && (
            <div className="relative h-[calc(100dvh-112px)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {/* Map Canvas */}
              <div className="flex-1 w-full h-full">
                <MapView
                  pendingCoords={pendingCoords}
                  targetSamplerId={targetSamplerId}
                  onMapClick={(clickedCoords) => {
                    setPendingCoords(clickedCoords);
                  }}
                />
              </div>

              {/* Floating Bottom Quick Action Card */}
              <div className="absolute bottom-2 left-2 right-2 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: targetSampler?.color || '#2563eb' }}
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Nearest: <span className="text-blue-700">{targetSampler?.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      at {targetSampler?.currentLocation.name}
                    </span>
                  </div>

                  <button
                    onClick={() => setMobileTab('dispatch')}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Full Form</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Big Thumb Button to Open/Dispatch */}
                <button
                  onClick={() => setMobileTab('dispatch')}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Paste Message & Dispatch to {targetSampler?.name}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Mobile Dispatch Form */}
          {mobileTab === 'dispatch' && (
            <div className="pb-4">
              <NewSamplePanel
                onLocationChange={(coords) => setPendingCoords(coords)}
                onTargetSamplerChange={(samplerId) => setTargetSamplerId(samplerId)}
              />
            </div>
          )}

          {/* TAB 3: Mobile Today's Assignments */}
          {mobileTab === 'list' && (
            <div className="pb-4">
              <AssignmentList />
            </div>
          )}
        </div>
      </main>

      {/* 4. Mobile Bottom Navigation Bar (Fixed at bottom on phones) */}
      <MobileBottomNav
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        onOpenSamplers={() => setIsSamplersOpen(true)}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenSummary={() => setIsSummaryOpen(true)}
      />

      {/* Modals */}
      <SamplerManagerModal
        isOpen={isSamplersOpen}
        onClose={() => setIsSamplersOpen(false)}
      />

      <BatchAssignModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />

      <DailySummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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
