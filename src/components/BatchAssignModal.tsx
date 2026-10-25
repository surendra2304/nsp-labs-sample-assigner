import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { parseMultipleCompanyMessages, ParsedCompanyMessage } from '../utils/messageParser';
import { calculateHaversineDistanceKm } from '../utils/geoUtils';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import type { Sampler, SampleRequest } from '../types';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Copy,
  Send,
  X,
  Route,
  Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SamplerRoutePlan {
  sampler: Sampler;
  items: ParsedCompanyMessage[];
  totalDistanceKm: number;
  dispatchTexts: string[];
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = ({ isOpen, onClose }) => {
  const { samplers, companies, createAndAssignSample } = useApp();

  const [bulkInput, setBulkInput] = useState(`Harvest date 26/10/26
Gnr
90c-2tons
255+
Narasapuram
+919014747367

Harvest date 26/10/26
Gnr
80c-6tons
290+
Mogalthuru
9703051223

Harvest date 26/10/26
Gnr
70c-3tons
270+
Vempa
9848011223

Harvest date 26/10/26
Gnr
100c-4tons
240+
Bhimavaram
9440123456

Harvest date 26/10/26
Gnr
85c-5tons
285+
Undi
9988776655`);

  const [company, setCompany] = useState(companies[0]?.name || 'Sigma sea foods');
  const [plans, setPlans] = useState<SamplerRoutePlan[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  // Multi-sampler nearest neighbor route optimizer
  const handleOptimizeRoutes = () => {
    if (!bulkInput.trim()) return;

    const parsedItems = parseMultipleCompanyMessages(bulkInput, company);
    if (parsedItems.length === 0) return;

    const activeSamplers = samplers.map((s) => ({
      sampler: s,
      currentCoords: { ...s.currentLocation.coords },
      assignedItems: [] as ParsedCompanyMessage[],
      totalDistance: 0
    }));

    const unassigned = [...parsedItems];

    while (unassigned.length > 0) {
      let bestSamplerIdx = 0;
      let bestItemIdx = 0;
      let minDistance = Infinity;

      for (let sIdx = 0; sIdx < activeSamplers.length; sIdx++) {
        const s = activeSamplers[sIdx];
        for (let iIdx = 0; iIdx < unassigned.length; iIdx++) {
          const item = unassigned[iIdx];
          const dist = calculateHaversineDistanceKm(s.currentCoords, item.coords || { lat: 16.5449, lng: 81.5212 });
          
          if (dist < minDistance) {
            minDistance = dist;
            bestSamplerIdx = sIdx;
            bestItemIdx = iIdx;
          }
        }
      }

      const targetSampler = activeSamplers[bestSamplerIdx];
      const selectedItem = unassigned[bestItemIdx];
      
      targetSampler.assignedItems.push(selectedItem);
      targetSampler.totalDistance += minDistance;
      
      if (selectedItem.coords) {
        targetSampler.currentCoords = { ...selectedItem.coords };
      }

      unassigned.splice(bestItemIdx, 1);
    }

    const routePlans: SamplerRoutePlan[] = activeSamplers.map((s) => {
      const dispatches = s.assignedItems.map((item) => {
        const dummyReq: SampleRequest = {
          id: 'temp',
          harvestDate: item.harvestDate,
          farmerCode: item.farmerCode,
          countTons: item.countTons,
          tonnageNumber: item.tonnageNumber,
          rateSpecs: item.rateSpecs,
          locationName: item.locationName,
          subLocation: item.subLocation,
          coords: item.coords || { lat: 16.5449, lng: 81.5212 },
          googleMapsUrl: item.googleMapsUrl,
          ownerPhone: item.ownerPhone,
          company,
          status: 'assigned',
          createdAt: new Date().toISOString()
        };
        return formatWhatsAppDispatchMessage(dummyReq, s.sampler.name);
      });

      return {
        sampler: s.sampler,
        items: s.assignedItems,
        totalDistanceKm: Number(s.totalDistance.toFixed(1)),
        dispatchTexts: dispatches
      };
    });

    setPlans(routePlans);
    setApplied(false);
  };

  const handleApplyAll = () => {
    if (!plans) return;

    for (const plan of plans) {
      for (const item of plan.items) {
        createAndAssignSample(
          {
            harvestDate: item.harvestDate,
            farmerCode: item.farmerCode,
            countTons: item.countTons,
            tonnageNumber: item.tonnageNumber,
            rateSpecs: item.rateSpecs,
            locationName: item.locationName,
            subLocation: item.subLocation,
            coords: item.coords || { lat: 16.5449, lng: 81.5212 },
            googleMapsUrl: item.googleMapsUrl,
            ownerPhone: item.ownerPhone,
            company,
            assignedSamplerId: plan.sampler.id,
            rawMessage: item.rawMessage
          },
          plan.sampler.id
        );
      }
    }

    setApplied(true);
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Batch Multi-Route Optimizer</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Paste 4–6 messages at once to automatically distribute the best routes
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

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
          {/* Paste Multi-Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                <span>📋 Paste Bulk Messages:</span>
              </label>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px]">Company:</span>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={5}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Paste multiple messages here..."
              className="w-full text-base sm:text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
            />

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleOptimizeRoutes}
                className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Calculate Best Multi-Stop Routes</span>
              </button>
            </div>
          </div>

          {/* Optimized Route Plans Output */}
          {plans && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-purple-600" />
                  Optimized Route Chains:
                </h3>
                {!applied ? (
                  <button
                    onClick={handleApplyAll}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply All</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Assigned!
                  </span>
                )}
              </div>

              {/* Plans per sampler */}
              <div className="grid grid-cols-1 gap-2.5">
                {plans.map((plan) => (
                  <div
                    key={plan.sampler.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plan.sampler.color }}
                        />
                        <span className="font-extrabold text-sm text-slate-900">{plan.sampler.name}</span>
                        <span className="text-[11px] text-slate-500">
                          ({plan.sampler.currentLocation.name})
                        </span>
                      </div>
                      <span className="bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded text-[11px]">
                        {plan.items.length} stops ({plan.totalDistanceKm} km)
                      </span>
                    </div>

                    {plan.items.length > 0 ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                            {plan.sampler.currentLocation.name}
                          </span>
                          {plan.items.map((item, idx) => (
                            <React.Fragment key={idx}>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="bg-white border border-slate-300 font-bold text-slate-800 px-2 py-0.5 rounded shadow-2xs text-[11px]">
                                {item.locationName}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>

                        {/* WhatsApp Message preview */}
                        <div className="pt-1">
                          <details className="text-[11px] cursor-pointer">
                            <summary className="text-blue-600 font-bold hover:underline">
                              View {plan.items.length} WhatsApp dispatch messages
                            </summary>
                            <div className="mt-2 space-y-2 bg-slate-900 text-slate-100 p-3 rounded-lg font-mono">
                              {plan.dispatchTexts.map((txt, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="pb-2 border-b border-slate-700 last:border-0 last:pb-0"
                                >
                                  <pre className="whitespace-pre-wrap">{txt}</pre>
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={() => sendViaWhatsApp(txt, plan.sampler.phone)}
                                      className="py-1 px-2.5 bg-emerald-600 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Send className="w-3 h-3" /> WhatsApp
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await copyTextToClipboard(txt);
                                        setCopiedIndex(`${plan.sampler.id}-${tIdx}`);
                                        setTimeout(() => setCopiedIndex(null), 2000);
                                      }}
                                      className="py-1 px-2.5 bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />{' '}
                                      {copiedIndex === `${plan.sampler.id}-${tIdx}`
                                        ? 'Copied!'
                                        : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No stops assigned (Standby)</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
