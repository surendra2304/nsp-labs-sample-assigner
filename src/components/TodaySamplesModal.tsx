import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import type { SampleRequest } from '../types';
import {
  ClipboardList,
  X,
  Phone,
  Send,
  Copy,
  CheckCircle2,
  Trash2,
  MapPin,
  Filter,
  Check
} from 'lucide-react';

interface TodaySamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<SampleRequest['status'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-800' },
  collected: { label: 'Collected', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-200 text-slate-600' }
};

/**
 * Lists every sample dispatched today so a WhatsApp message can be re-sent,
 * a sample marked collected, or a mistake removed — even after the dispatch
 * box has moved on to the next request.
 */
export const TodaySamplesModal: React.FC<TodaySamplesModalProps> = ({ isOpen, onClose }) => {
  const { requests, samplers, deleteSampleRequest, markSampleCollected } = useApp();

  const [filterSamplerId, setFilterSamplerId] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = requests.filter(
    (r) => filterSamplerId === 'all' || r.assignedSamplerId === filterSamplerId
  );

  const totalTons = filtered.reduce((sum, r) => sum + (r.tonnageNumber || 0), 0);
  const collectedCount = filtered.filter((r) => r.status === 'collected').length;

  const handleSend = (req: SampleRequest) => {
    const sampler = samplers.find((s) => s.id === req.assignedSamplerId);
    const text = formatWhatsAppDispatchMessage(req, sampler?.name || 'Sampler');
    sendViaWhatsApp(text, sampler?.phone);
  };

  const handleCopy = async (req: SampleRequest) => {
    const sampler = samplers.find((s) => s.id === req.assignedSamplerId);
    const text = formatWhatsAppDispatchMessage(req, sampler?.name || 'Sampler');
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedId(req.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Today's Samples</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                {filtered.length} sample{filtered.length === 1 ? '' : 's'} &middot;{' '}
                {totalTons.toFixed(1).replace(/\.0$/, '')} tons &middot; {collectedCount} collected
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

        {/* Sampler filter */}
        {samplers.length > 1 && (
          <div className="px-3 sm:px-4 pt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setFilterSamplerId('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                filterSamplerId === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              All ({requests.length})
            </button>
            {samplers.map((s) => {
              const count = requests.filter((r) => r.assignedSamplerId === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setFilterSamplerId(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    filterSamplerId === s.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No samples yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Assign a sample from the bottom box and it will show up here.
              </p>
            </div>
          ) : (
            filtered.map((req) => {
              const sampler = samplers.find((s) => s.id === req.assignedSamplerId);
              const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending;

              return (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-extrabold text-sm text-slate-900 truncate">
                          {req.locationName}
                        </span>
                        {req.subLocation && (
                          <span className="text-[11px] text-slate-500">({req.subLocation})</span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {req.farmerCode !== 'General' && <span className="font-semibold">{req.farmerCode} &middot; </span>}
                        {req.countTons !== 'Standard' && <span>{req.countTons} &middot; </span>}
                        {req.company && <span className="font-semibold">{req.company}</span>}
                      </p>
                    </div>

                    {/* Sampler badge */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: sampler?.color || '#94a3b8' }}
                      />
                      <span className="text-[11px] font-bold text-slate-800">
                        {sampler?.name || 'Unassigned'}
                      </span>
                      {req.distanceKm ? (
                        <span className="text-[10px] text-slate-400">{req.distanceKm} km</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Owner phone + call */}
                  {req.ownerPhone && (
                    <a
                      href={`tel:${req.ownerPhone}`}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200"
                    >
                      <Phone className="w-3 h-3" />
                      Call {req.ownerPhone}
                    </a>
                  )}

                  {/* Actions */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleSend(req)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Send className="w-3 h-3" /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleCopy(req)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedId === req.id ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedId === req.id ? 'Copied!' : 'Copy'}
                    </button>

                    {req.status !== 'collected' && (
                      <button
                        onClick={() => markSampleCollected(req.id)}
                        className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Collected
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${req.locationName} from today's list?`)) {
                          deleteSampleRequest(req.id);
                        }
                      }}
                      className="ml-auto p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Remove sample"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
