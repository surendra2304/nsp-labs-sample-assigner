import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import { SampleRequest } from '../types';
import {
  Clock,
  Phone,
  Send,
  Copy,
  CheckCircle2,
  Trash2,
  MapPin,
  Building2,
  ExternalLink,
  Filter
} from 'lucide-react';

export const AssignmentList: React.FC = () => {
  const { requests, samplers, deleteSampleRequest, markSampleCollected, setSelectedRequest } = useApp();
  const [filterSampler, setFilterSampler] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = requests.filter((r) => {
    if (filterSampler !== 'all' && r.assignedSamplerId !== filterSampler) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800">Today's Assigned Samples</h2>
          <p className="text-xs text-slate-500">
            {requests.length} sample requests logged today
          </p>
        </div>

        {/* Filter by Sampler */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 text-[11px]">Filter:</span>
          <select
            value={filterSampler}
            onChange={(e) => setFilterSampler(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
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
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No samples assigned yet today</p>
          <p className="text-xs mt-0.5">Paste a message or add a sample to start assigning</p>
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
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {sampler && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sampler.color }}
                      />
                    )}
                    <span className="font-bold text-slate-900 text-sm">
                      {req.locationName}
                      {req.subLocation && (
                        <span className="text-slate-500 font-normal"> ({req.subLocation})</span>
                      )}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                      {req.farmerCode}
                    </span>
                    <span className="text-slate-400 text-[11px]">• {req.company}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
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
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 mb-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Count & Tons:</span>
                    <span className="font-semibold text-slate-800">{req.countTons}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Rate / Specs:</span>
                    <span className="font-semibold text-slate-800">{req.rateSpecs}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Owner Phone:</span>
                    {req.ownerPhone ? (
                      <a
                        href={`tel:${req.ownerPhone}`}
                        className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {req.ownerPhone}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Alt Contact:</span>
                    <span className="font-medium text-slate-700">
                      {req.altContactName || ''} {req.altContactPhone || '-'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (dispatchText) sendViaWhatsApp(dispatchText, sampler?.phone);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Resend WhatsApp</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (dispatchText) {
                          await copyTextToClipboard(dispatchText);
                          setCopiedId(req.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === req.id ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div>
                    {req.status !== 'collected' && (
                      <button
                        onClick={() => markSampleCollected(req.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer border border-transparent hover:border-emerald-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Collected</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
