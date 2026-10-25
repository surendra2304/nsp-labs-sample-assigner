import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { parseCompanyMessage } from '../utils/messageParser';
import { formatWhatsAppDispatchMessage, sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import { calculateRoadDistance, geocodePlace } from '../services/googleMapsService';
import { findKnownHubCoordinates, parseLocationFromGoogleMapsString, getVillageSuggestions } from '../utils/geoUtils';
import type { Coordinates, Sampler } from '../types';
import {
  Sparkles,
  Phone,
  MapPin,
  Send,
  Copy,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Building2,
  Mic,
  Search,
  PlusCircle,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewSamplePanelProps {
  onLocationChange?: (coords: Coordinates | null) => void;
  onTargetSamplerChange?: (samplerId: string | null) => void;
}

interface SamplerProximity {
  sampler: Sampler;
  distanceKm: number;
  durationText: string;
}

const SAMPLE_EXAMPLE_1 = `Harvest date 26/10/26
Gnr
90c-2tons
255+
Kuppanapudi
+919014747367`;

const SAMPLE_EXAMPLE_2 = `Harvest date 26/10/26
Gnr
80c-6tons
290+
Vempa
9703051223`;

export const NewSamplePanel: React.FC<NewSamplePanelProps> = ({
  onLocationChange,
  onTargetSamplerChange
}) => {
  const { samplers, companies, createAndAssignSample } = useApp();

  // Raw paste state
  const [rawText, setRawText] = useState('');

  // Structured fields
  const [company, setCompany] = useState(companies[0]?.name || 'Sigma sea foods');
  const [harvestDate, setHarvestDate] = useState('26/10/26');
  const [farmerCode, setFarmerCode] = useState('');
  const [countTons, setCountTons] = useState('');
  const [rateSpecs, setRateSpecs] = useState('');
  const [locationName, setLocationName] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [altContactName, setAltContactName] = useState('');
  const [altContactPhone, setAltContactPhone] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [coords, setCoords] = useState<Coordinates | null>(null);

  // Proximity & Nearest Sampler calculation
  const [proximities, setProximities] = useState<SamplerProximity[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedSamplerId, setSelectedSamplerId] = useState<string | null>(null);

  // Result & Dispatch State
  const [assignedSuccess, setAssignedSuccess] = useState(false);
  const [lastAssignedInfo, setLastAssignedInfo] = useState<{ samplerName: string; location: string } | null>(null);
  const [generatedDispatch, setGeneratedDispatch] = useState('');
  const [copied, setCopied] = useState(false);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load initial example if requested
  const handleLoadExample = (text: string) => {
    setRawText(text);
    handleParseText(text);
  };

  // Parse raw text into structured fields
  const handleParseText = (text: string) => {
    if (!text.trim()) return;
    const parsed = parseCompanyMessage(text, company);
    if (parsed.harvestDate) setHarvestDate(parsed.harvestDate);
    if (parsed.farmerCode) setFarmerCode(parsed.farmerCode);
    if (parsed.countTons) setCountTons(parsed.countTons);
    if (parsed.rateSpecs) setRateSpecs(parsed.rateSpecs);
    if (parsed.locationName) setLocationName(parsed.locationName);
    if (parsed.subLocation) setSubLocation(parsed.subLocation);
    if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone);
    if (parsed.googleMapsUrl) setGoogleMapsUrl(parsed.googleMapsUrl);

    if (parsed.coords) {
      setCoords(parsed.coords);
      onLocationChange?.(parsed.coords);
    } else if (parsed.locationName) {
      geocodePlace(parsed.locationName).then((resolved) => {
        if (resolved) {
          setCoords(resolved);
          onLocationChange?.(resolved);
        }
      });
    }
  };

  // Village autocomplete handling
  const handleLocationNameChange = (val: string) => {
    setLocationName(val);
    if (val.trim().length >= 1) {
      const matches = getVillageSuggestions(val.trim());
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (village: string) => {
    setLocationName(village);
    setShowSuggestions(false);
    const resolved = findKnownHubCoordinates(village);
    if (resolved) {
      setCoords(resolved);
      onLocationChange?.(resolved);
    } else {
      geocodePlace(village).then((c) => {
        if (c) {
          setCoords(c);
          onLocationChange?.(c);
        }
      });
    }
  };

  // Speech Recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English / Telugu accent friendly

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleaned = transcript.replace(/[.,]/g, '').trim();
          handleLocationNameChange(cleaned);
          const found = findKnownHubCoordinates(cleaned);
          if (found) {
            setCoords(found);
            onLocationChange?.(found);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  // Resolve coordinates when locationName or googleMapsUrl changes
  useEffect(() => {
    let active = true;

    async function resolveCoords() {
      if (googleMapsUrl.trim()) {
        const parsed = parseLocationFromGoogleMapsString(googleMapsUrl);
        if (parsed.coords && active) {
          setCoords(parsed.coords);
          onLocationChange?.(parsed.coords);
          return;
        }
      }

      if (locationName.trim()) {
        const local = findKnownHubCoordinates(locationName);
        if (local && active) {
          setCoords(local);
          onLocationChange?.(local);
          return;
        }

        const geocoded = await geocodePlace(locationName);
        if (geocoded && active) {
          setCoords(geocoded);
          onLocationChange?.(geocoded);
        }
      }
    }

    resolveCoords();
    return () => {
      active = false;
    };
  }, [locationName, googleMapsUrl, onLocationChange]);

  // Recalculate distances from all samplers whenever coords change or samplers move
  useEffect(() => {
    let active = true;
    if (!coords || !coords.lat) {
      setProximities([]);
      setSelectedSamplerId(null);
      return;
    }

    async function computeDistances() {
      setIsCalculating(true);
      const results: SamplerProximity[] = [];

      for (const sampler of samplers) {
        const dist = await calculateRoadDistance(sampler.currentLocation.coords, coords!);
        results.push({
          sampler,
          distanceKm: dist.distanceKm,
          durationText: dist.durationText
        });
      }

      // Sort ascending: closest first
      results.sort((a, b) => a.distanceKm - b.distanceKm);

      if (active) {
        setProximities(results);
        setIsCalculating(false);
        if (results.length > 0) {
          const nearest = results[0].sampler;
          setSelectedSamplerId(nearest.id);
          onTargetSamplerChange?.(nearest.id);
        }
      }
    }

    computeDistances();
    return () => {
      active = false;
    };
  }, [coords, samplers, onTargetSamplerChange]);

  // Handle Assignment
  const handleAssign = () => {
    if (!selectedSamplerId || !coords) return;
    const targetSampler = samplers.find((s) => s.id === selectedSamplerId);
    if (!targetSampler) return;

    // ATOMIC: Create and assign sample + update sampler location in AppContext
    const created = createAndAssignSample(
      {
        harvestDate: harvestDate || 'Today',
        farmerCode: farmerCode || 'General',
        countTons: countTons || 'Not specified',
        rateSpecs: rateSpecs || '',
        locationName: locationName || 'Pond Location',
        subLocation,
        coords,
        googleMapsUrl,
        ownerPhone,
        altContactName,
        altContactPhone,
        company,
        assignedSamplerId: targetSampler.id,
        rawMessage: rawText
      },
      targetSampler.id
    );

    const dispatchText = formatWhatsAppDispatchMessage(created, targetSampler.name);
    setGeneratedDispatch(dispatchText);
    setLastAssignedInfo({
      samplerName: targetSampler.name,
      location: locationName || 'Pond Location'
    });
    setAssignedSuccess(true);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleCopy = async () => {
    const success = await copyTextToClipboard(generatedDispatch);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    const targetSampler = samplers.find((s) => s.id === selectedSamplerId);
    sendViaWhatsApp(generatedDispatch, targetSampler?.phone);
  };

  // Reset cleanly for next incoming request
  const handleResetForNext = () => {
    setRawText('');
    setAssignedSuccess(false);
    setGeneratedDispatch('');
    setFarmerCode('');
    setCountTons('');
    setRateSpecs('');
    setLocationName('');
    setSubLocation('');
    setOwnerPhone('');
    setAltContactName('');
    setAltContactPhone('');
    setGoogleMapsUrl('');
    setCoords(null);
    onLocationChange?.(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              New Sample Dispatch
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Paste harvesting message or enter pond location
            </p>
          </div>
        </div>

        {/* Company Selector */}
        <div className="relative">
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 px-2.5 pr-7 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none transition-all"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* SUCCESS BANNER: Displayed once assigned */}
      {assignedSuccess && lastAssignedInfo && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Assigned to {lastAssignedInfo.samplerName}!
                </h3>
                <p className="text-xs text-emerald-700 font-medium">
                  {lastAssignedInfo.samplerName} is now at{' '}
                  <span className="font-bold underline">{lastAssignedInfo.location}</span>. Next distances will calculate from here!
                </p>
              </div>
            </div>

            <button
              onClick={handleResetForNext}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <span>+ Next Sample</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formatted WhatsApp Dispatch Preview */}
          <div className="mt-3.5 bg-slate-900 rounded-xl p-3 text-white text-xs font-mono shadow-inner border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-sans font-bold text-slate-300">📱 WhatsApp Message Ready:</span>
              <span className="text-emerald-400 font-bold">1-Click Dispatch</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-200 select-all font-sans text-xs">
              {generatedDispatch}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={handleSendWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
            <button
              onClick={handleCopy}
              className="w-full bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-sm cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="mt-3 text-center">
            <button
              onClick={handleResetForNext}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Another Sample Request</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN INPUT SECTION (Hidden when success is showing, or can be reset) */}
      {!assignedSuccess && (
        <div className="space-y-3.5">
          {/* Quick Paste Area with Auto-Parse */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📋 Paste Company WhatsApp Message:</span>
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleLoadExample(SAMPLE_EXAMPLE_1)}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  Example 1 (Kuppanapudi)
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleLoadExample(SAMPLE_EXAMPLE_2)}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  Example 2 (Vempa)
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                handleParseText(e.target.value);
              }}
              placeholder={`Paste message from company here, e.g.:\nHarvest date 26/10/26\nGnr\n90c-2tons\nKuppanapudi\n+919014747367`}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 resize-none"
            />
          </div>

          {/* Extracted / Editable Structured Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Date
              </label>
              <input
                type="text"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                placeholder="26/10/26"
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Farmer Code
              </label>
              <input
                type="text"
                value={farmerCode}
                onChange={(e) => setFarmerCode(e.target.value)}
                placeholder="e.g. Gnr"
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Count & Tons
              </label>
              <input
                type="text"
                value={countTons}
                onChange={(e) => setCountTons(e.target.value)}
                placeholder="e.g. 90c-2tons"
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Rate / Specs
              </label>
              <input
                type="text"
                value={rateSpecs}
                onChange={(e) => setRateSpecs(e.target.value)}
                placeholder="e.g. 255+"
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Location & Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Village Name with Instant Autocomplete & Voice */}
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1">
                <span className="flex items-center gap-1 text-rose-700">
                  <MapPin className="w-3 h-3 text-rose-600" />
                  <span>Village / Town:</span>
                </span>
                <span className="text-[9px] text-slate-400 font-normal">60+ Godavari hubs</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => handleLocationNameChange(e.target.value)}
                  onFocus={() => {
                    if (locationName.trim()) {
                      setSuggestions(getVillageSuggestions(locationName.trim()));
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="e.g. Kuppanapudi, Vempa, Undi..."
                  className="w-full text-xs font-bold p-2 pr-8 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title="Speak village name"
                  className={`absolute right-1.5 p-1 rounded-lg transition-all cursor-pointer ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 max-h-44 overflow-y-auto">
                  {suggestions.map((village) => (
                    <button
                      key={village}
                      type="button"
                      onClick={() => handleSelectSuggestion(village)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-none"
                    >
                      <span>{village}</span>
                      <span className="text-[10px] text-slate-400">West Godavari</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-location / Landmark */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sub-location / Landmark
              </label>
              <input
                type="text"
                value={subLocation}
                onChange={(e) => setSubLocation(e.target.value)}
                placeholder="e.g. (konalapalli), near church..."
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Owner Phone & Alternative Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Pond Owner Phone:
                </label>
                {ownerPhone && (
                  <a
                    href={`tel:${ownerPhone}`}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Call Owner</span>
                  </a>
                )}
              </div>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+919014747367"
                className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Alt Name
                </label>
                <input
                  type="text"
                  value={altContactName}
                  onChange={(e) => setAltContactName(e.target.value)}
                  placeholder="e.g. Madhu"
                  className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Alt Number
                </label>
                <input
                  type="text"
                  value={altContactPhone}
                  onChange={(e) => setAltContactPhone(e.target.value)}
                  placeholder="9032259499"
                  className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Google Maps link or coordinates */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Google Maps Pin Link / Coordinates (Optional):
            </label>
            <input
              type="text"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/... or 16.5144, 81.4286"
              className="w-full text-xs font-mono p-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-600 bg-slate-50/50"
            />
          </div>

          {/* PROXIMITY CARDS: Ranked distance from each sampler */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Driving Distance from Samplers:</span>
              </span>
              {isCalculating && (
                <span className="text-[10px] font-medium text-blue-600 animate-pulse">
                  Calculating real road distance...
                </span>
              )}
            </div>

            {proximities.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Enter a village name or paste a message to compute nearest sampler
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {proximities.map((item, index) => {
                  const isSelected = selectedSamplerId === item.sampler.id;
                  const isNearest = index === 0;

                  return (
                    <button
                      key={item.sampler.id}
                      type="button"
                      onClick={() => {
                        setSelectedSamplerId(item.sampler.id);
                        onTargetSamplerChange?.(item.sampler.id);
                      }}
                      className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isNearest && (
                        <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shadow-xs">
                          ★ Nearest
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.sampler.color }}
                        />
                        <span className="text-xs font-bold text-slate-900">
                          {item.sampler.name}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-sm font-black text-slate-900">
                          {item.distanceKm} km
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.durationText}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1 truncate">
                        <span className="text-slate-400">At:</span>{' '}
                        <span className="font-semibold text-slate-700">
                          {item.sampler.currentLocation.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ASSIGN BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!selectedSamplerId || !coords}
              onClick={handleAssign}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer ${
                selectedSamplerId && coords
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {selectedSamplerId
                  ? `Assign Sample to ${
                      samplers.find((s) => s.id === selectedSamplerId)?.name || 'Sampler'
                    } →`
                  : 'Select Location & Sampler'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
