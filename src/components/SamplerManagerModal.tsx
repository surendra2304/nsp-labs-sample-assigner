import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { REGIONAL_AQUACULTURE_HUBS, findKnownHubCoordinates } from '../utils/geoUtils';
import { geocodePlace } from '../services/googleMapsService';
import type { Coordinates, Sampler } from '../types';
import {
  Users,
  Building2,
  X,
  MapPin,
  Home,
  RotateCcw,
  Plus,
  Trash2,
  Phone,
  Navigation,
  Pencil,
  Check,
  Palette
} from 'lucide-react';

interface SamplerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: 'Royal Blue', hex: '#2563eb' },
  { label: 'Emerald Green', hex: '#16a34a' },
  { label: 'Vivid Purple', hex: '#9333ea' },
  { label: 'Deep Orange', hex: '#ea580c' },
  { label: 'Cyan Teal', hex: '#0891b2' },
  { label: 'Crimson Red', hex: '#dc2626' },
  { label: 'Amber Gold', hex: '#d97706' },
  { label: 'Indigo', hex: '#4f46e5' }
];

const COMMON_HUBS = [
  'Bhimavaram',
  'Narasapuram',
  'Palakol',
  'Mogalthuru',
  'Vempa',
  'Undi',
  'Kalla',
  'Kuppanapudi',
  'Akividu',
  'Tanuku'
];

export const SamplerManagerModal: React.FC<SamplerManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    samplers,
    companies,
    updateSampler,
    updateSamplerLocation,
    addSampler,
    deleteSampler,
    resetAllSamplersToHome,
    addCompany,
    deleteCompany
  } = useApp();

  const [activeTab, setActiveTab] = useState<'samplers' | 'companies'>('samplers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSamplerId, setEditingSamplerId] = useState<string | null>(null);

  // Add Sampler state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newHomeBase, setNewHomeBase] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0].hex);

  // Edit Sampler state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHomeBase, setEditHomeBase] = useState('');
  const [editColor, setEditColor] = useState('');

  // Location Quick Update state
  const [locationUpdateId, setLocationUpdateId] = useState<string | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  // Company management state
  const [newCompName, setNewCompName] = useState('');
  const [newCompGroup, setNewCompGroup] = useState('');

  if (!isOpen) return null;

  // Add new sampler handler
  const handleAddNewSampler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let coords: Coordinates = REGIONAL_AQUACULTURE_HUBS['bhimavaram'];
    const townName = newHomeBase.trim() || 'Bhimavaram';

    const hubMatch = findKnownHubCoordinates(townName);
    if (hubMatch) {
      coords = hubMatch;
    } else {
      const geo = await geocodePlace(townName);
      if (geo) coords = geo;
    }

    addSampler({
      name: newName.trim(),
      phone: newPhone.trim(),
      homeBase: { name: townName, coords },
      currentLocation: {
        name: townName,
        coords,
        lastUpdated: 'Start of Day'
      },
      color: newColor,
      status: 'available'
    });

    setNewName('');
    setNewPhone('');
    setNewHomeBase('');
    setShowAddForm(false);
  };

  // Start editing sampler
  const handleStartEdit = (sampler: Sampler) => {
    setEditingSamplerId(sampler.id);
    setEditName(sampler.name);
    setEditPhone(sampler.phone || '');
    setEditHomeBase(sampler.homeBase.name);
    setEditColor(sampler.color);
    setShowAddForm(false);
  };

  // Save edited sampler
  const handleSaveEdit = async (samplerId: string) => {
    const existing = samplers.find((s) => s.id === samplerId);
    if (!existing || !editName.trim()) return;

    let coords = existing.homeBase.coords;
    if (editHomeBase.trim() !== existing.homeBase.name) {
      const hubMatch = findKnownHubCoordinates(editHomeBase.trim());
      if (hubMatch) {
        coords = hubMatch;
      } else {
        const geo = await geocodePlace(editHomeBase.trim());
        if (geo) coords = geo;
      }
    }

    updateSampler({
      ...existing,
      name: editName.trim(),
      phone: editPhone.trim(),
      homeBase: { name: editHomeBase.trim(), coords },
      color: editColor
    });

    setEditingSamplerId(null);
  };

  // Quick move location handler
  const handleSaveLocation = async (samplerId: string) => {
    if (!customLocationName.trim()) return;
    const loc = customLocationName.trim();

    let coords: Coordinates = REGIONAL_AQUACULTURE_HUBS['bhimavaram'];
    const hubMatch = findKnownHubCoordinates(loc);
    if (hubMatch) {
      coords = hubMatch;
    } else {
      const geo = await geocodePlace(loc);
      if (geo) coords = geo;
    }

    updateSamplerLocation(samplerId, loc, coords);
    setLocationUpdateId(null);
    setCustomLocationName('');
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    addCompany({
      name: newCompName.trim(),
      whatsappGroup: newCompGroup.trim()
    });
    setNewCompName('');
    setNewCompGroup('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              {activeTab === 'samplers' ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {activeTab === 'samplers' ? 'Manage & Edit Samplers' : 'Manage Companies'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('samplers')}
                  className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer ${
                    activeTab === 'samplers' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Samplers ({samplers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('companies')}
                  className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer ${
                    activeTab === 'companies' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Companies ({companies.length})
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 1: SAMPLERS */}
        {activeTab === 'samplers' && (
          <>
            {/* Global Action Bar */}
            <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2">
              <button
                onClick={resetAllSamplersToHome}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 shadow-xs cursor-pointer active:scale-[0.98]"
                title="Reset all samplers back to home towns (Start of day)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>Morning Reset</span>
              </button>

              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingSamplerId(null);
                }}
                className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : '+ Add Sampler'}</span>
              </button>
            </div>

            {/* Add Sampler Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddNewSampler}
                className="p-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs animate-in fade-in duration-150"
              >
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Home Town</label>
                  <input
                    type="text"
                    value={newHomeBase}
                    onChange={(e) => setNewHomeBase(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
                <div className="flex items-end gap-1.5">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Color</label>
                    <select
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs cursor-pointer font-bold"
                    >
                      {COLOR_PRESETS.map((c) => (
                        <option key={c.hex} value={c.hex}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs"
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
                  className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm hover:border-slate-300 transition-all text-xs"
                >
                  {editingSamplerId === sampler.id ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">Edit Sampler Details</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(sampler.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingSamplerId(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phone Number</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Home Base Village</label>
                          <input
                            type="text"
                            value={editHomeBase}
                            onChange={(e) => setEditHomeBase(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                          />
                        </div>
                      </div>

                      {/* Color Picker */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <Palette className="w-3 h-3 text-slate-400" />
                          <span>Map Marker Color:</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setEditColor(c.hex)}
                              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                                editColor === c.hex ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                            style={{ backgroundColor: sampler.color }}
                          />
                          <h3 className="text-sm font-bold text-slate-900">{sampler.name}</h3>
                          {sampler.phone && (
                            <a
                              href={`tel:${sampler.phone}`}
                              className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 ml-1 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{sampler.phone}</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(sampler)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Edit Sampler Info"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {samplers.length > 1 && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${sampler.name}?`)) {
                                  deleteSampler(sampler.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete Sampler"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Locations Row */}
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl">
                          <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-slate-400">Home Base: </span>
                            <span className="font-bold text-slate-800">{sampler.homeBase.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-xl border border-blue-100/60">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <span className="text-slate-400">Current: </span>
                              <span className="font-bold text-blue-900">{sampler.currentLocation.name}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setLocationUpdateId(locationUpdateId === sampler.id ? null : sampler.id);
                              setCustomLocationName('');
                            }}
                            className="shrink-0 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 cursor-pointer ml-1"
                          >
                            {locationUpdateId === sampler.id ? 'Close' : 'Move'}
                          </button>
                        </div>
                      </div>

                      {/* Quick Set Location Input Panel */}
                      {locationUpdateId === sampler.id && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Update {sampler.name}'s Current Village / Location:
                          </label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={customLocationName}
                              onChange={(e) => setCustomLocationName(e.target.value)}
                              className="flex-1 p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
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
                            {COMMON_HUBS.map((hub) => (
                              <button
                                key={hub}
                                type="button"
                                onClick={() => {
                                  setCustomLocationName(hub);
                                  handleSaveLocation(sampler.id);
                                }}
                                className="px-2 py-0.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 rounded cursor-pointer"
                              >
                                {hub}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: COMPANIES */}
        {activeTab === 'companies' && (
          <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Add Company Form */}
            <form onSubmit={handleAddCompany} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 text-xs">+ Add New Company</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Company Name</label>
                  <input
                    type="text"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">WhatsApp Group (Optional)</label>
                  <input
                    type="text"
                    value={newCompGroup}
                    onChange={(e) => setNewCompGroup(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!newCompName.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 text-xs"
                >
                  Save Company
                </button>
              </div>
            </form>

            {/* Companies List */}
            {companies.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Building2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="font-semibold text-xs">No companies added yet.</p>
                <p className="text-[11px] text-slate-400">You can add your own company above if you want.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {companies.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{comp.name}</h4>
                      {comp.whatsappGroup && (
                        <p className="text-[10px] text-slate-500">Group: {comp.whatsappGroup}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete ${comp.name}?`)) {
                          deleteCompany(comp.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      title="Delete Company"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
