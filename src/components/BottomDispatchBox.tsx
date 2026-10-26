import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseCompanyMessage } from '../utils/messageParser';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import { calculateRoadDistance, geocodePlace } from '../services/googleMapsService';
import { findKnownHubCoordinates, parseLocationFromGoogleMapsString, getVillageSuggestions } from '../utils/geoUtils';
import type { Coordinates, Sampler, SampleRequest } from '../types';
import {
  Phone,
  Send,
  Copy,
  CheckCircle2,
  Navigation,
  ArrowRight
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

  // Extracted details - strictly from user input (NO FAKE DEFAULTS!)
  const [extractedLocation, setExtractedLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [farmerCode, setFarmerCode] = useState('');
  const [countTons, setCountTons] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [rateSpecs, setRateSpecs] = useState('');
  const [detectedCompany, setDetectedCompany] = useState('');
  const [directMapsUrl, setDirectMapsUrl] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<Coordinates | null>(null);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

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

  // Parse input whenever text changes, with strict debounce & min length validation!
  useEffect(() => {
    const text = inputText.trim();

    // Autocomplete suggestions (only when typing a single word/village)
    if (text.length >= 1 && !text.includes('\n') && !text.startsWith('http')) {
      const list = getVillageSuggestions(text);
      setSuggestions(list);
    } else {
      setSuggestions([]);
    }

    // 1. If text is empty: clear everything immediately
    if (!text) {
      setExtractedLocation('');
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setHarvestDate('');
      setDetectedCompany('');
      setDirectMapsUrl('');
      setResolvedCoords(null);
      setDistances([]);
      onLocationChange(null);
      return;
    }

    // 2. Direct Google Maps link, coordinates, or shared location
    const urlCheck = parseLocationFromGoogleMapsString(text);
    if (urlCheck.coords) {
      const locTitle = urlCheck.placeName || 'Pond Location';
      setExtractedLocation(locTitle);
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setHarvestDate('');
      setDetectedCompany('');
      setDirectMapsUrl(urlCheck.rawUrl || (text.startsWith('http') ? text : ''));
      setResolvedCoords(urlCheck.coords);
      onLocationChange(urlCheck.coords);
      return;
    } else if (urlCheck.rawUrl && urlCheck.placeName && urlCheck.placeName !== 'Google Maps Location') {
      // Shortened maps link with accompanying place text
      setExtractedLocation(urlCheck.placeName);
      setDirectMapsUrl(urlCheck.rawUrl);
      const hub = findKnownHubCoordinates(urlCheck.placeName);
      if (hub) {
        setResolvedCoords(hub);
        onLocationChange(hub);
        return;
      }
      geocodePlace(urlCheck.placeName).then((c) => {
        if (c) {
          setResolvedCoords(c);
          onLocationChange(c);
        }
      });
      return;
    }

    // 3. Multi-line message (pasted message from harvesting company)
    if (text.includes('\n')) {
      const parsed = parseCompanyMessage(text);
      setExtractedLocation(parsed.locationName || '');
      setSubLocation(parsed.subLocation || '');
      setOwnerPhone(parsed.ownerPhone || '');
      setFarmerCode(parsed.farmerCode || '');
      setCountTons(parsed.countTons || '');
      setRateSpecs(parsed.rateSpecs || '');
      setHarvestDate(parsed.harvestDate || '');
      setDirectMapsUrl(parsed.googleMapsUrl || '');

      // Check if message mentions a company inside *...*
      const compMatch = text.match(/\*([^*]+)\*/);
      setDetectedCompany(compMatch ? compMatch[1].trim() : '');

      if (parsed.coords) {
        setResolvedCoords(parsed.coords);
        onLocationChange(parsed.coords);
        return;
      }

      const loc = parsed.locationName?.trim() || '';
      if (loc && loc.length >= 3) {
        // Known hub instant check
        const hub = findKnownHubCoordinates(loc);
        if (hub) {
          setResolvedCoords(hub);
          onLocationChange(hub);
          return;
        }

        // Geocode via Google Maps
        let isCurrent = true;
        geocodePlace(loc).then((c) => {
          if (isCurrent && c) {
            setResolvedCoords(c);
            onLocationChange(c);
          }
        });
        return () => {
          isCurrent = false;
        };
      }
      return;
    }

    // 4. Single-line typing (e.g. typing a village name "N", "NA", "NAR", "Narasapuram")
    // PREVENT RANDOM PINS: If text is less than 3 characters, DO NOT geocode!
    if (text.length < 3) {
      setExtractedLocation('');
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setHarvestDate('');
      setDetectedCompany('');
      setDirectMapsUrl('');
      setResolvedCoords(null);
      setDistances([]);
      onLocationChange(null);
      return;
    }

    // If >= 3 characters:
    // A. Check if user typed an exact known regional aquaculture hub (instant match, no waiting)
    const instantHub = findKnownHubCoordinates(text);
    if (instantHub) {
      setExtractedLocation(text);
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setHarvestDate('');
      setDetectedCompany('');
      setDirectMapsUrl('');
      setResolvedCoords(instantHub);
      onLocationChange(instantHub);
      return;
    }

    // B. Otherwise DEBOUNCE by 600ms so typing keystrokes don't spam random geocodes!
    let isCurrent = true;
    const timer = setTimeout(async () => {
      if (!isCurrent) return;
      const c = await geocodePlace(text);
      if (isCurrent && c) {
        setExtractedLocation(text);
        setSubLocation('');
        setOwnerPhone('');
        setFarmerCode('');
        setCountTons('');
        setRateSpecs('');
        setHarvestDate('');
        setDetectedCompany('');
        setDirectMapsUrl('');
        setResolvedCoords(c);
        onLocationChange(c);
      }
    }, 600);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
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

  // Handle village autocomplete selection
  const handleSelectSuggestion = (villageName: string) => {
    setInputText(villageName);
    setSuggestions([]);
    const hub = findKnownHubCoordinates(villageName);
    if (hub) {
      setExtractedLocation(villageName);
      setSubLocation('');
      setOwnerPhone('');
      setFarmerCode('');
      setCountTons('');
      setRateSpecs('');
      setHarvestDate('');
      setDetectedCompany('');
      setDirectMapsUrl('');
      setResolvedCoords(hub);
      onLocationChange(hub);
    } else {
      geocodePlace(villageName).then((c) => {
        if (c) {
          setExtractedLocation(villageName);
          setSubLocation('');
          setOwnerPhone('');
          setFarmerCode('');
          setCountTons('');
          setRateSpecs('');
          setHarvestDate('');
          setDetectedCompany('');
          setDirectMapsUrl('');
          setResolvedCoords(c);
          onLocationChange(c);
        }
      });
    }
  };

  // When user clicks a specific sampler, lock their choice and do NOT let auto-calculation override!
  const handleSelectSampler = (samplerId: string) => {
    userSelectedSamplerRef.current = true;
    onTargetSamplerChange(samplerId);
  };

  // Perform Assignment - ONLY include details actually provided by the user!
  const handleAssign = () => {
    if (!targetSamplerId || !resolvedCoords) return;
    const sampler = samplers.find((s) => s.id === targetSamplerId);
    if (!sampler) return;

    // Record the distance/duration we actually ranked this sampler by, so the
    // "Today's Samples" list can show it later
    const chosenDist = distances.find((d) => d.sampler.id === sampler.id);

    const assignedSample: Omit<SampleRequest, 'id' | 'createdAt' | 'status'> = {
      harvestDate: harvestDate.trim(),
      farmerCode: farmerCode.trim(),
      countTons: countTons.trim(),
      rateSpecs: rateSpecs.trim(),
      locationName: extractedLocation.trim() || 'Pond Location',
      subLocation: subLocation.trim(),
      coords: resolvedCoords,
      googleMapsUrl: directMapsUrl.trim(),
      ownerPhone: ownerPhone.trim(),
      company: detectedCompany.trim(),
      assignedSamplerId: sampler.id,
      distanceKm: chosenDist?.distanceKm,
      estimatedDuration: chosenDist?.durationText,
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
    setFarmerCode('');
    setCountTons('');
    setRateSpecs('');
    setHarvestDate('');
    setDetectedCompany('');
    setDirectMapsUrl('');
    setResolvedCoords(null);
    setDistances([]);
    setSuggestions([]);
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
                  Location: {assignedResult.locationName}
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

          {/* THE SINGLE INPUT BOX (Normal native behavior: blurs on map touch, keyboard dismisses when zooming) */}
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste message, village name, or Google Maps link here..."
            className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 bg-white resize-none font-medium leading-relaxed"
          />

          {/* AUTOCOMPLETE SUGGESTION CHIPS (e.g. typing NAR -> Narasapuram, BHI -> Bhimavaram) */}
          {suggestions.length > 0 && !assignedResult && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-in fade-in duration-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Suggested:</span>
              {suggestions.map((village) => (
                <button
                  key={village}
                  type="button"
                  onClick={() => handleSelectSuggestion(village)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <span>📍</span>
                  <span>{village}</span>
                </button>
              ))}
            </div>
          )}

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
                          className="w-2.5 h-2.5 rounded-full shrink-0"
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
