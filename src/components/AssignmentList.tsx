import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import {
  Clock,
  Phone,
  Send,
  Copy,
  CheckCircle2,
  Trash2,
  Filter
} from 'lucide-react';

export const AssignmentList: React.FC = () => {
  const { requests, samplers, deleteSampleRequest, markSampleCollected } = useApp();
  const [filterSampler, setFilterSampler] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = requests.filter((r) => {
    if (filterSampler !== 'all' && r.assignedSamplerId !== filterSampler) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-5 space-y-3.5">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Today's Assigned Samples</h2>
          <p className="text-xs text-slate-500">
            {requests.length} sample requests logged today
          </p>
        </div>

        {/* Filter by Sampler */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 text-[11px] font-medium">Filter:</span>
          <select
            value={filterSampler}
            onChange={(e) => setFilterSampler(e.target.value)}
            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="all">All Samplers</option>
            {samplers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="text-sm font-bold text-slate-700">No samples assigned yet today</p>
          <p className="text-xs mt-0.5 text-slate-500">Paste a message or add a sample to start assigning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const sampler = samplers.find((s) => s.id === req.assignedSamplerId);
            const dispatchText = sampler
              ? formatWhatsAppDispatchMessage(req, sampler.name)
              : '';

            return (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-50 transition-all text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    {sampler && (
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: sampler.color }}
                      />
                    )}
                    <span className="font-extrabold text-slate-900 text-sm">
                      {req.locationName}
                      {req.subLocation && (
                        <span className="text-slate-500 font-normal"> ({req.subLocation})</span>
                      )}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                      {req.farmerCode}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${
                        req.status === 'collected'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {req.status === 'collected' ? 'Collected' : `Assigned ➔ ${sampler?.name || 'Pending'}`}
                    </span>

                    <button
                      onClick={() => deleteSampleRequest(req.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mb-2">
                  <span>Company: <b>{req.company}</b></span> • <span>Date: <b>{req.harvestDate}</b></span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 mb-3 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Count & Tons:</span>
                    <span className="font-bold text-slate-800">{req.countTons}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Rate / Specs:</span>
                    <span className="font-bold text-slate-800">{req.rateSpecs}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Owner Phone:</span>
                    {req.ownerPhone ? (
                      <a
                        href={`tel:${req.ownerPhone}`}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {req.ownerPhone}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Alt Contact:</span>
                    <span className="font-medium text-slate-700">
                      {req.altContactName || ''} {req.altContactPhone || '-'}
                    </span>
                  </div>
                </div>

                {/* Action buttons (Mobile-friendly thumb grid) */}
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    onClick={() => {
                      if (dispatchText) sendViaWhatsApp(dispatchText, sampler?.phone);
                    }}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (dispatchText) {
                        await copyTextToClipboard(dispatchText);
                        setCopiedId(req.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }
                    }}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === req.id ? 'Copied!' : 'Copy'}</span>
                  </button>

                  {req.status !== 'collected' && (
                    <button
                      onClick={() => markSampleCollected(req.id)}
                      className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 hover:border-emerald-200 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Mark Sample Collected</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
