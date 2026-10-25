import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { NewSamplePanel } from './components/NewSamplePanel';
import { AssignmentList } from './components/AssignmentList';
import { SamplerManagerModal } from './components/SamplerManagerModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { SettingsModal } from './components/SettingsModal';
import { Coordinates } from './types';

const MainLayout: React.FC = () => {
  const { activeView } = useApp();

  // Modals state
  const [isSamplersOpen, setIsSamplersOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Synchronized map coordinates & target highlight
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>({
    lat: 16.5144,
    lng: 81.4286 // Default Kuppanapudi
  });
  const [targetSamplerId, setTargetSamplerId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        onOpenSamplers={() => setIsSamplersOpen(true)}
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
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
            <div className="lg:col-span-7 order-1 lg:order-2 h-[420px] lg:h-[calc(100vh-110px)] lg:sticky lg:top-20">
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
      </main>

      {/* Modals */}
      <SamplerManagerModal
        isOpen={isSamplersOpen}
        onClose={() => setIsSamplersOpen(false)}
      />

      <BatchAssignModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
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
