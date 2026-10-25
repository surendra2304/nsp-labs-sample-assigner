import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { parseMultipleCompanyMessages, ParsedCompanyMessage } from '../utils/messageParser';
import { calculateHaversineDistanceKm, findKnownHubCoordinates } from '../utils/geoUtils';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import { Sampler, Coordinates, SampleRequest } from '../types';
import {
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Copy,
  Send,
  X,
  ExternalLink,
  MapPin,
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
  const { samplers, companies, addSampleRequest, assignSampleToSampler } = useApp();

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

    // Clone samplers current state with starting coords
    const activeSamplers = samplers.map((s) => ({
      sampler: s,
      currentCoords: { ...s.currentLocation.coords },
      assignedItems: [] as ParsedCompanyMessage[],
      totalDistance: 0
    }));

    // Pool of remaining unassigned items
    const unassigned = [...parsedItems];

    // Iteratively assign nearest destination to best situated sampler
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

      // Assign the selected item to that sampler
      const targetSampler = activeSamplers[bestSamplerIdx];
      const selectedItem = unassigned[bestItemIdx];
      
      targetSampler.assignedItems.push(selectedItem);
      targetSampler.totalDistance += minDistance;
      
      // Update sampler's simulated location to this stop!
      if (selectedItem.coords) {
        targetSampler.currentCoords = { ...selectedItem.coords };
      }

      // Remove from pool
      unassigned.splice(bestItemIdx, 1);
    }

    // Build Route Plans & WhatsApp text
    const routePlans: SamplerRoutePlan[] = activeSamplers.map((s) => {
      const dispatches = s.assignedItems.map((item) => {
        const dummyReq: SampleRequest = {
          id: 'temp',
          harvestDate: item.harvestDate,
          farmerCode: item.farmerCode,
          countTons: item.countTons,
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
        const created = addSampleRequest({
          harvestDate: item.harvestDate,
          farmerCode: item.farmerCode,
          countTons: item.countTons,
          rateSpecs: item.rateSpecs,
          locationName: item.locationName,
          subLocation: item.subLocation,
          coords: item.coords || { lat: 16.5449, lng: 81.5212 },
          googleMapsUrl: item.googleMapsUrl,
          ownerPhone: item.ownerPhone,
          company,
          assignedSamplerId: plan.sampler.id,
          rawMessage: item.rawMessage
        });

        assignSampleToSampler(created.id, plan.sampler.id);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Batch Multi-Sample Route Optimizer</h2>
              <p className="text-[11px] text-slate-500">
                Paste 4–6 messages at once to automatically distribute the best routes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Paste Multi-Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>📋 Paste Bulk Messages (Multiple Requests):</span>
              </label>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px]">Company:</span>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs font-semibold outline-none cursor-pointer"
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
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none"
            />

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleOptimizeRoutes}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
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
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply All & Update Locations</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Assigned!
                  </span>
                )}
              </div>

              {/* Plans per sampler */}
              <div className="grid grid-cols-1 gap-3">
                {plans.map((plan) => (
                  <div
                    key={plan.sampler.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plan.sampler.color }}
                        />
                        <span className="font-bold text-sm text-slate-800">{plan.sampler.name}</span>
                        <span className="text-[11px] text-slate-500">
                          (Starts from {plan.sampler.currentLocation.name})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">
                          {plan.items.length} stops ({plan.totalDistanceKm} km)
                        </span>
                      </div>
                    </div>

                    {plan.items.length > 0 ? (
                      <>
                        {/* Route chain badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

                        {/* WhatsApp Message preview for this sampler's route */}
                        <div className="pt-2">
                          <details className="text-[11px] cursor-pointer">
                            <summary className="text-blue-600 font-semibold hover:underline">
                              View {plan.items.length} WhatsApp dispatch messages
                            </summary>
                            <div className="mt-2 space-y-2 bg-slate-900 text-slate-100 p-3 rounded-lg font-mono">
                              {plan.dispatchTexts.map((txt, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="pb-2 border-b border-slate-700 last:border-0 last:pb-0"
                                >
                                  <pre className="whitespace-pre-wrap">{txt}</pre>
                                  <div className="mt-1 flex gap-2">
                                    <button
                                      onClick={() => sendViaWhatsApp(txt, plan.sampler.phone)}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Send className="w-2.5 h-2.5" /> Send to WhatsApp
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await copyTextToClipboard(txt);
                                        setCopiedIndex(`${plan.sampler.id}-${tIdx}`);
                                        setTimeout(() => setCopiedIndex(null), 2000);
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-200 underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />{' '}
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
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
