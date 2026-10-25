import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { REGIONAL_AQUACULTURE_HUBS, findKnownHubCoordinates } from '../utils/geoUtils';
import type { Coordinates } from '../types';
import {
  Users,
  X,
  MapPin,
  Home,
  RotateCcw,
  Plus,
  Trash2,
  Phone,
  Navigation
} from 'lucide-react';

interface SamplerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SamplerManagerModal: React.FC<SamplerManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    samplers,
    updateSamplerLocation,
    addSampler,
    deleteSampler,
    resetAllSamplersToHome
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);

  // New Sampler Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91');
  const [newHomeBase, setNewHomeBase] = useState('Bhimavaram');
  const [newColor, setNewColor] = useState('#2563eb');

  // Quick Location Update state
  const [locationUpdateId, setLocationUpdateId] = useState<string | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  if (!isOpen) return null;

  const handleSaveLocation = (samplerId: string) => {
    if (!customLocationName.trim()) return;

    let coords: Coordinates = { lat: 16.5449, lng: 81.5212 };
    const found = findKnownHubCoordinates(customLocationName);
    if (found) {
      coords = found;
    }

    updateSamplerLocation(samplerId, customLocationName.trim(), coords);
    setLocationUpdateId(null);
    setCustomLocationName('');
  };

  const handleAddNewSampler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let coords = REGIONAL_AQUACULTURE_HUBS['bhimavaram'];
    const found = findKnownHubCoordinates(newHomeBase);
    if (found) coords = found;

    addSampler({
      name: newName.trim(),
      phone: newPhone.trim(),
      homeBase: {
        name: newHomeBase.trim(),
        coords
      },
      currentLocation: {
        name: newHomeBase.trim(),
        coords
      },
      color: newColor,
      status: 'available'
    });

    setNewName('');
    setNewPhone('+91');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Manage Samplers & Locations</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Update locations, home bases, or reset at the start of the day
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

        {/* Global Action Bar */}
        <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={resetAllSamplersToHome}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>🌅 Reset All to Home (Morning)</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancel' : 'Add Sampler'}</span>
          </button>
        </div>

        {/* Add Sampler Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewSampler}
            className="p-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs"
          >
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none text-base sm:text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone</label>
              <input
                type="text"
                placeholder="+9198480..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none text-base sm:text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Home Town</label>
              <input
                type="text"
                placeholder="e.g. Bhimavaram"
                value={newHomeBase}
                onChange={(e) => setNewHomeBase(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none text-base sm:text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Samplers List */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
          {samplers.map((sampler) => (
            <div
              key={sampler.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs"
                    style={{ backgroundColor: sampler.color }}
                  />
                  <h3 className="font-extrabold text-sm text-slate-900">{sampler.name}</h3>
                  <a
                    href={`tel:${sampler.phone}`}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{sampler.phone}</span>
                  </a>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      updateSamplerLocation(
                        sampler.id,
                        sampler.homeBase.name,
                        sampler.homeBase.coords
                      );
                    }}
                    title="Send back to Home Base"
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    <Home className="w-3 h-3 text-slate-500" />
                    <span>To Base</span>
                  </button>

                  <button
                    onClick={() =>
                      setLocationUpdateId(locationUpdateId === sampler.id ? null : sampler.id)
                    }
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Set Location</span>
                  </button>

                  {samplers.length > 1 && (
                    <button
                      onClick={() => deleteSampler(sampler.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                      title="Remove sampler"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Location details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Home Base: <b>{sampler.homeBase.name}</b>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Current Location: <b className="text-emerald-700 font-extrabold">{sampler.currentLocation.name}</b>
                    {sampler.currentLocation.subLocation && (
                      <span className="text-slate-500"> ({sampler.currentLocation.subLocation})</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Set Location Input Panel */}
              {locationUpdateId === sampler.id && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Update {sampler.name}'s Current Location:
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Type village name (e.g. Mogalthuru, Vempa)"
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-lg outline-none text-base sm:text-xs"
                    />
                    <button
                      onClick={() => handleSaveLocation(sampler.id)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Update
                    </button>
                  </div>

                  {/* Quick Pick Regional Villages */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="text-slate-500 self-center">Quick pick:</span>
                    {['Bhimavaram', 'Narasapuram', 'Palakol', 'Mogalthuru', 'Vempa', 'Undi', 'Kalla', 'Kuppanapudi'].map(
                      (hub) => (
                        <button
                          key={hub}
                          type="button"
                          onClick={() => {
                            setCustomLocationName(hub);
                            const found = findKnownHubCoordinates(hub);
                            if (found) {
                              updateSamplerLocation(sampler.id, hub, found);
                              setLocationUpdateId(null);
                              setCustomLocationName('');
                            }
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded text-slate-800 font-medium cursor-pointer"
                        >
                          {hub}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
