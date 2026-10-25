import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseCompanyMessage } from '../utils/messageParser';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import { calculateRoadDistance, geocodePlace } from '../services/googleMapsService';
import { parseLocationFromGoogleMapsString } from '../utils/geoUtils';
import type { Coordinates, Sampler, SampleRequest } from '../types';
import {
  Phone,
  Send,
  Copy,
  CheckCircle2,
  Navigation,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BottomDispatchBoxProps {
  onLocationChange: (coords: Coordinates | null) => void;
  onTargetSamplerChange: (samplerId: string | null) => void;
  targetSamplerId: string | null;
}

interface SamplerDist {
  sampler: Sampler;
  distanceKm: number;
  durationText: string;
}

export const BottomDispatchBox: React.FC<BottomDispatchBoxProps> = ({
  onLocationChange,
  onTargetSamplerChange,
  targetSamplerId
}) => {
  const { samplers, createAndAssignSample } = useApp();

  // The ONE input box for everything (message, village name, or Maps link)
  const [inputText, setInputText] = useState('');

  // Extracted details
  const [extractedLocation, setExtractedLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [farmerCode, setFarmerCode] = useState('');
  const [countTons, setCountTons] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [rateSpecs, setRateSpecs] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<Coordinates | null>(null);

  // Proximity calculations
  const [distances, setDistances] = useState<SamplerDist[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Track if user manually tapped a specific sampler (so auto-calculation DOES NOT overwrite user choice!)
  const userSelectedSamplerRef = useRef<boolean>(false);

  // Assignment result state
  const [assignedResult, setAssignedResult] = useState<{
    samplerName: string;
    locationName: string;
    dispatchText: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Parse input whenever text changes
  useEffect(() => {
    const text = inputText.trim();
    if (!text) {
      setExtractedLocation('');
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setResolvedCoords(null);
      setDistances([]);
      onLocationChange(null);
      return;
    }

    let locName = '';
    let subLoc = '';
    let phone = '';
    let fCode = '';
    let cTons = '';
    let rSpecs = '';
    let hDate = '';
    let directCoords: Coordinates | null = null;

    // 1. Check if input is a Google Maps link or raw coordinates
    const urlCheck = parseLocationFromGoogleMapsString(text);
    if (urlCheck.coords) {
      directCoords = urlCheck.coords;
      locName = 'Pond Location (from Maps link)';
    }

    // 2. Check if input is a full message
    if (text.includes('\n')) {
      const parsed = parseCompanyMessage(text);
      locName = parsed.locationName;
      subLoc = parsed.subLocation || '';
      phone = parsed.ownerPhone;
      fCode = parsed.farmerCode;
      cTons = parsed.countTons;
      rSpecs = parsed.rateSpecs;
      hDate = parsed.harvestDate;
      if (parsed.coords && !directCoords) {
        directCoords = parsed.coords;
      }
    } else if (!directCoords) {
      // Single line text: could be a village name (e.g. "Kuppanapudi", "Vempa", "Undi")
      locName = text;
    }

    setExtractedLocation(locName);
    setSubLocation(subLoc);
    setOwnerPhone(phone);
    setFarmerCode(fCode);
    setCountTons(cTons);
    setRateSpecs(rSpecs);
    setHarvestDate(hDate);

    // If direct coordinates found (e.g. from maps link)
    if (directCoords) {
      setResolvedCoords(directCoords);
      onLocationChange(directCoords);
      return;
    }

    // Otherwise geocode the location name with Google Maps
    if (locName) {
      let isCurrent = true;
      geocodePlace(locName).then((c) => {
        if (isCurrent && c) {
          setResolvedCoords(c);
          onLocationChange(c);
        }
      });
      return () => {
        isCurrent = false;
      };
    }
  }, [inputText, onLocationChange]);

  // Calculate driving distances from each sampler's CURRENT position
  useEffect(() => {
    if (!resolvedCoords || !resolvedCoords.lat) {
      setDistances([]);
      return;
    }

    let active = true;
    setIsCalculating(true);

    async function compute() {
      const list: SamplerDist[] = [];
      for (const s of samplers) {
        const res = await calculateRoadDistance(s.currentLocation.coords, resolvedCoords!);
        list.push({
          sampler: s,
          distanceKm: res.distanceKm,
          durationText: res.durationText
        });
      }

      // Sort nearest first
      list.sort((a, b) => a.distanceKm - b.distanceKm);

      if (active) {
        setDistances(list);
        setIsCalculating(false);

        // ONLY default to nearest if user has NOT manually selected a sampler!
        if (!userSelectedSamplerRef.current && list.length > 0) {
          const nearest = list[0].sampler;
          onTargetSamplerChange(nearest.id);
        }
      }
    }

    compute();
    return () => {
      active = false;
    };
  }, [resolvedCoords, samplers, onTargetSamplerChange]);

  // When user clicks a specific sampler, lock their choice and do NOT let auto-calculation override!
  const handleSelectSampler = (samplerId: string) => {
    userSelectedSamplerRef.current = true;
    onTargetSamplerChange(samplerId);
  };

  // Perform Assignment
  const handleAssign = () => {
    if (!targetSamplerId || !resolvedCoords) return;
    const sampler = samplers.find((s) => s.id === targetSamplerId);
    if (!sampler) return;

    const assignedSample: Omit<SampleRequest, 'id' | 'createdAt' | 'status'> = {
      harvestDate: harvestDate || 'Today',
      farmerCode: farmerCode || 'General',
      countTons: countTons || 'Standard',
      rateSpecs: rateSpecs || '',
      locationName: extractedLocation || 'Pond Location',
      subLocation,
      coords: resolvedCoords,
      ownerPhone,
      company: 'Sigma sea foods',
      assignedSamplerId: sampler.id,
      rawMessage: inputText
    };

    // ATOMIC: saves sample AND moves sampler's current location to this pond!
    const created = createAndAssignSample(assignedSample, sampler.id);

    const dispatchText = formatWhatsAppDispatchMessage(created, sampler.name);
    setAssignedResult({
      samplerName: sampler.name,
      locationName: extractedLocation || 'Pond Location',
      dispatchText
    });

    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.85 } });
    } catch (e) {
      // non-critical
    }
  };

  // Reset cleanly for next message
  const handleNext = () => {
    setInputText('');
    setAssignedResult(null);
    setExtractedLocation('');
    setSubLocation('');
    setOwnerPhone('');
    setResolvedCoords(null);
    setDistances([]);
    userSelectedSamplerRef.current = false;
    onLocationChange(null);
  };

  const handleCopy = async () => {
    if (!assignedResult) return;
    const ok = await copyTextToClipboard(assignedResult.dispatchText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!assignedResult) return;
    const sampler = samplers.find((s) => s.id === targetSamplerId);
    sendViaWhatsApp(assignedResult.dispatchText, sampler?.phone);
  };

  const selectedSampler = samplers.find((s) => s.id === targetSamplerId) || samplers[0];

  return (
    <div className="w-full max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3 sm:p-4 text-slate-800 transition-all">
      {/* 1. STATE: AFTER ASSIGNMENT */}
      {assignedResult ? (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  Assigned to {assignedResult.samplerName}!
                </h3>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  Location updated to {assignedResult.locationName}
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
            >
              <span>+ Next Sample</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formatted Message Preview */}
          <div className="bg-slate-900 rounded-xl p-2.5 text-white font-mono text-xs border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans font-bold mb-1">
              WhatsApp Message Ready:
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200 select-all">
              {assignedResult.dispatchText}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send on WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. STATE: INPUT & SELECTION */
        <div className="space-y-2.5">
          {/* Top Info Bar if Location or Owner Phone is detected */}
          {(extractedLocation || ownerPhone) && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400">📍 Location:</span>
                <span className="font-bold text-slate-900 truncate">
                  {extractedLocation} {subLocation ? `(${subLocation})` : ''}
                </span>
              </div>

              {/* Tap to Call Owner Button */}
              {ownerPhone && (
                <a
                  href={`tel:${ownerPhone}`}
                  className="shrink-0 ml-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call {ownerPhone}</span>
                </a>
              )}
            </div>
          )}

          {/* THE SINGLE INPUT BOX */}
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste message, village name, or Google Maps link here..."
            className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 bg-white resize-none font-medium leading-relaxed"
          />

          {/* SAMPLERS LIST WITH DISTANCES */}
          {distances.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-blue-600" />
                  <span>Nearest Sampler:</span>
                </span>
                {isCalculating && <span className="text-blue-600 animate-pulse font-normal">Calculating road distance...</span>}
              </div>

              {/* 3 Clickable Sampler Cards */}
              <div className="grid grid-cols-3 gap-1.5">
                {distances.map((item, idx) => {
                  const isSelected = targetSamplerId === item.sampler.id;
                  const isNearest = idx === 0;

                  return (
                    <button
                      key={item.sampler.id}
                      type="button"
                      onClick={() => handleSelectSampler(item.sampler.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isNearest && (
                        <span className="absolute -top-1.5 right-1.5 text-[8px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.2 rounded-full shadow-xs">
                          Nearest
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.sampler.color }}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.sampler.name}
                        </span>
                      </div>

                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {item.distanceKm} km
                      </div>

                      <div className="text-[10px] text-slate-500 truncate">
                        At: {item.sampler.currentLocation.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* BIG ASSIGN BUTTON */}
              <button
                type="button"
                onClick={handleAssign}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all mt-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Assign to {selectedSampler?.name} ({distances.find((d) => d.sampler.id === targetSamplerId)?.distanceKm || ''} km) →
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
