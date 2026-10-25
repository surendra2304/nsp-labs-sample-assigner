import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { REGIONAL_AQUACULTURE_HUBS, findKnownHubCoordinates } from '../utils/geoUtils';
import { geocodePlace } from '../services/googleMapsService';
import type { Coordinates, Sampler } from '../types';
import {
  Users,
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
  Copy,
  Download,
  Upload,
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
    updateSampler,
    setAllSamplers,
    updateSamplerLocation,
    addSampler,
    deleteSampler,
    resetAllSamplersToHome
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [copiedSync, setCopiedSync] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');

  // New Sampler Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91');
  const [newHomeBase, setNewHomeBase] = useState('Bhimavaram');
  const [newColor, setNewColor] = useState('#2563eb');

  // Quick Location Update state
  const [locationUpdateId, setLocationUpdateId] = useState<string | null>(null);
  const [customLocationName, setCustomLocationName] = useState('');

  // Full Edit State for an existing sampler
  const [editingSamplerId, setEditingSamplerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHomeBase, setEditHomeBase] = useState('');
  const [editCurrentLocation, setEditCurrentLocation] = useState('');
  const [editColor, setEditColor] = useState('#2563eb');
  const [editStatus, setEditStatus] = useState<'available' | 'busy' | 'off-duty'>('available');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  if (!isOpen) return null;

  // Start editing an existing sampler
  const handleStartEdit = (sampler: Sampler) => {
    setEditingSamplerId(sampler.id);
    setEditName(sampler.name);
    setEditPhone(sampler.phone);
    setEditHomeBase(sampler.homeBase.name);
    setEditCurrentLocation(sampler.currentLocation.name);
    setEditColor(sampler.color);
    setEditStatus(sampler.status);
    setLocationUpdateId(null);
  };

  // Save edits to existing sampler
  const handleSaveEdit = async (sampler: Sampler) => {
    if (!editName.trim()) return;
    setIsSavingEdit(true);

    try {
      let homeCoords = sampler.homeBase.coords;
      if (editHomeBase.trim() !== sampler.homeBase.name) {
        const geo = await geocodePlace(editHomeBase.trim());
        if (geo) {
          homeCoords = geo;
        } else {
          const hub = findKnownHubCoordinates(editHomeBase.trim());
          if (hub) homeCoords = hub;
        }
      }

      let currentCoords = sampler.currentLocation.coords;
      if (editCurrentLocation.trim() !== sampler.currentLocation.name) {
        const geo = await geocodePlace(editCurrentLocation.trim());
        if (geo) {
          currentCoords = geo;
        } else {
          const hub = findKnownHubCoordinates(editCurrentLocation.trim());
          if (hub) currentCoords = hub;
        }
      }

      const updated: Sampler = {
        ...sampler,
        name: editName.trim(),
        phone: editPhone.trim(),
        homeBase: {
          name: editHomeBase.trim(),
          coords: homeCoords
        },
        currentLocation: {
          ...sampler.currentLocation,
          name: editCurrentLocation.trim(),
          coords: currentCoords,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        color: editColor,
        status: editStatus
      };

      updateSampler(updated);
      setEditingSamplerId(null);
    } catch (err) {
      console.error('Error saving sampler edits:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Location Update
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

  // Add New Sampler
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

  // Export samplers to JSON
  const handleExportConfig = () => {
    const dataStr = JSON.stringify(samplers, null, 2);
    navigator.clipboard.writeText(dataStr);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2500);
  };

  // Import samplers from JSON
  const handleImportConfig = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].homeBase) {
        setAllSamplers(parsed);
        setShowSyncPanel(false);
        setImportJsonText('');
      } else {
        setImportError('Invalid format. Must be an array of samplers.');
      }
    } catch (err) {
      setImportError('Invalid JSON. Please paste valid configuration text.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Manage & Edit Samplers</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Edit names, phone numbers, home bases, or reset locations for the day
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={resetAllSamplersToHome}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 shadow-xs cursor-pointer active:scale-[0.98]"
              title="Reset all samplers back to home towns (Start of day)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>🌅 Morning Reset</span>
            </button>

            <button
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs cursor-pointer active:scale-[0.98]"
              title="Share or backup sampler configuration"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Sync / Share</span>
            </button>
          </div>

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

        {/* Share / Sync Panel (Export / Import JSON) */}
        {showSyncPanel && (
          <div className="p-3.5 bg-amber-50/80 border-b border-amber-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">📋 Transfer Setup Between Phones & Laptop</span>
              <button
                onClick={handleExportConfig}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiedSync ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSync ? 'Copied to Clipboard!' : 'Copy Samplers Config'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              You can configure the samplers once here, click <b>Copy Samplers Config</b>, and paste it into your father's phone so he doesn't have to type anything.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste config JSON here to import on this device..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="flex-1 p-2 bg-white border border-amber-300 rounded-lg outline-none text-xs"
              />
              <button
                onClick={handleImportConfig}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1 text-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>
            {importError && <p className="text-[11px] text-red-600 font-bold">{importError}</p>}
          </div>
        )}

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
                placeholder="e.g. Ramesh"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone (for WhatsApp/Call)</label>
              <input
                type="text"
                placeholder="+9198480..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Home Town</label>
              <input
                type="text"
                placeholder="e.g. Bhimavaram"
                value={newHomeBase}
                onChange={(e) => setNewHomeBase(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
              />
            </div>
            <div className="flex items-end gap-1.5">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Save New
              </button>
            </div>
          </form>
        )}

        {/* Samplers List */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
          {samplers.map((sampler) => {
            const isEditing = editingSamplerId === sampler.id;

            return (
              <div
                key={sampler.id}
                className={`p-3.5 rounded-xl border transition-all shadow-xs ${
                  isEditing
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* 1. EDIT MODE FORM */}
                {isEditing ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editing Sampler: {sampler.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingSamplerId(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Sampler Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs font-semibold"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Phone Number (WhatsApp & Direct Call)
                        </label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+91..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs font-semibold"
                        />
                      </div>

                      {/* Home Base Town */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Home Base Village / Town (Morning Starting Point)
                        </label>
                        <input
                          type="text"
                          value={editHomeBase}
                          onChange={(e) => setEditHomeBase(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                        />
                      </div>

                      {/* Current Location */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Current Location (Active Village / Pond)
                        </label>
                        <input
                          type="text"
                          value={editCurrentLocation}
                          onChange={(e) => setEditCurrentLocation(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                        />
                      </div>
                    </div>

                    {/* Color Preset Palette */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <Palette className="w-3 h-3 text-slate-500" />
                        <span>Map Marker Pin Color</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setEditColor(c.hex)}
                            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                              editColor === c.hex
                                ? 'border-slate-900 scale-110 shadow-sm'
                                : 'border-white hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Duty Status
                      </label>
                      <div className="flex gap-2">
                        {(['available', 'busy', 'off-duty'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setEditStatus(st)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                              editStatus === st
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Save or Cancel buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                      <button
                        type="button"
                        onClick={() => setEditingSamplerId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(sampler)}
                        disabled={isSavingEdit}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 2. REGULAR VIEW MODE */
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                          style={{ backgroundColor: sampler.color }}
                        />
                        <h3 className="font-extrabold text-sm text-slate-900">{sampler.name}</h3>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            sampler.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sampler.status === 'busy'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sampler.status}
                        </span>

                        {sampler.phone && (
                          <a
                            href={`tel:${sampler.phone}`}
                            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 ml-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{sampler.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {/* EDIT BUTTON */}
                        <button
                          onClick={() => handleStartEdit(sampler)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer"
                          title="Edit name, phone, home base, or color"
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            updateSamplerLocation(
                              sampler.id,
                              sampler.homeBase.name,
                              sampler.homeBase.coords
                            );
                          }}
                          title="Reset back to Home Base"
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          <Home className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">To Base</span>
                        </button>

                        <button
                          onClick={() =>
                            setLocationUpdateId(locationUpdateId === sampler.id ? null : sampler.id)
                          }
                          className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Location</span>
                        </button>

                        {samplers.length > 1 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete sampler ${sampler.name}?`)) {
                                deleteSampler(sampler.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer ml-1"
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

                    {/* Quick Set Location Input Panel */}
                    {locationUpdateId === sampler.id && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Update {sampler.name}'s Current Village / Location:
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Type village name (e.g. Mogalthuru, Vempa)"
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
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {samplers.length} active field samplers registered
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
