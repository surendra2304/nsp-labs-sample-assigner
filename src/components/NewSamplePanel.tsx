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
  MicOff,
  Search
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

export const NewSamplePanel: React.FC<NewSamplePanelProps> = ({
  onLocationChange,
  onTargetSamplerChange
}) => {
  const { samplers, companies, addSampleRequest, assignSampleToSampler } = useApp();

  // Raw paste state
  const [rawText, setRawText] = useState('');

  // Structured fields
  const [company, setCompany] = useState(companies[0]?.name || 'Sigma sea foods');
  const [harvestDate, setHarvestDate] = useState('26/10/26');
  const [farmerCode, setFarmerCode] = useState('Gnr');
  const [countTons, setCountTons] = useState('90c-2tons');
  const [rateSpecs, setRateSpecs] = useState('255+');
  const [locationName, setLocationName] = useState('Kuppanapudi');
  const [subLocation, setSubLocation] = useState('konalapalli');
  const [ownerPhone, setOwnerPhone] = useState('+919014747367');
  const [altContactName, setAltContactName] = useState('Madhu');
  const [altContactPhone, setAltContactPhone] = useState('9032259499');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [coords, setCoords] = useState<Coordinates>({ lat: 16.5144, lng: 81.4286 });

  // Village typeahead
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const villageInputRef = useRef<HTMLInputElement>(null);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);

  // Calculation & Assignment state
  const [proximities, setProximities] = useState<SamplerProximity[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedSamplerId, setSelectedSamplerId] = useState<string | null>(null);
  const [assignedSuccess, setAssignedSuccess] = useState<boolean>(false);
  const [generatedDispatch, setGeneratedDispatch] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Auto-parse on paste into raw text area
  const handleRawTextChange = (text: string) => {
    setRawText(text);
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
    }
  };

  // Village typing & autocomplete suggestions
  const handleVillageChange = (val: string) => {
    setLocationName(val);
    const matches = getVillageSuggestions(val);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleSelectSuggestion = (village: string) => {
    setLocationName(village);
    setShowSuggestions(false);
    const foundCoords = findKnownHubCoordinates(village);
    if (foundCoords) {
      setCoords(foundCoords);
      onLocationChange?.(foundCoords);
    }
  };

  // Voice dictation using Web Speech API
  const handleToggleVoice = () => {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome on Android or Desktop.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN'; // Indian English / accent recognition
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleVillageChange(transcript.trim());
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Resolve Location coordinates when locationName or googleMapsUrl changes
  useEffect(() => {
    let active = true;

    async function resolveCoords() {
      if (googleMapsUrl) {
        const parsed = parseLocationFromGoogleMapsString(googleMapsUrl);
        if (parsed.coords) {
          if (active) {
            setCoords(parsed.coords);
            onLocationChange?.(parsed.coords);
          }
          return;
        }
      }

      if (locationName) {
        const found = findKnownHubCoordinates(locationName);
        if (found) {
          if (active) {
            setCoords(found);
            onLocationChange?.(found);
          }
          return;
        }

        const geocoded = await geocodePlace(locationName);
        if (active && geocoded) {
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

  // Recalculate distances from all samplers whenever coords change
  useEffect(() => {
    let active = true;
    if (!coords || !coords.lat) return;

    async function computeDistances() {
      setIsCalculating(true);
      const results: SamplerProximity[] = [];

      for (const sampler of samplers) {
        const dist = await calculateRoadDistance(sampler.currentLocation.coords, coords);
        results.push({
          sampler,
          distanceKm: dist.distanceKm,
          durationText: dist.durationText
        });
      }

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
    if (!selectedSamplerId) return;
    const targetSampler = samplers.find((s) => s.id === selectedSamplerId);
    if (!targetSampler) return;

    const created = addSampleRequest({
      harvestDate,
      farmerCode,
      countTons,
      rateSpecs,
      locationName,
      subLocation,
      coords,
      googleMapsUrl,
      ownerPhone,
      altContactName,
      altContactPhone,
      company,
      assignedSamplerId: targetSampler.id,
      rawMessage: rawText
    });

    assignSampleToSampler(created.id, targetSampler.id);

    const dispatchText = formatWhatsAppDispatchMessage(
      {
        ...created,
        assignedSamplerId: targetSampler.id
      },
      targetSampler.name
    );
    setGeneratedDispatch(dispatchText);
    setAssignedSuccess(true);

    try {
      confetti({
        particleCount: 75,
        spread: 65,
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

  const handleResetForNext = () => {
    setRawText('');
    setAssignedSuccess(false);
    setGeneratedDispatch('');
    setFarmerCode('');
    setCountTons('');
    setLocationName('');
    setSubLocation('');
    setOwnerPhone('');
    setAltContactName('');
    setAltContactPhone('');
    setGoogleMapsUrl('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">New Sample Dispatch</h2>
            <p className="text-xs text-slate-500">Paste WhatsApp SMS or type pond village</p>
          </div>
        </div>

        {/* Company Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!assignedSuccess ? (
        <div className="space-y-4">
          {/* Quick Paste Message Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>📋 Paste Company WhatsApp Message:</span>
              <span className="text-[10px] text-blue-600 font-normal">Auto-detects all details</span>
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              placeholder="Paste message e.g.&#10;Harvest date 26/10/26&#10;Gnr&#10;90c-2tons&#10;255+&#10;Kuppanapudi&#10;+919014747367"
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Date</label>
              <input
                type="text"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                placeholder="26/10/26"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Farmer / Lot Code</label>
              <input
                type="text"
                value={farmerCode}
                onChange={(e) => setFarmerCode(e.target.value)}
                placeholder="Gnr"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Count & Tons</label>
              <input
                type="text"
                value={countTons}
                onChange={(e) => setCountTons(e.target.value)}
                placeholder="90c-2tons"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Rate / Specs</label>
              <input
                type="text"
                value={rateSpecs}
                onChange={(e) => setRateSpecs(e.target.value)}
                placeholder="255+"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location & Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            {/* Left: Location & Sub-location with Autocomplete & Voice */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      Pond Village / Town:
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`p-1 rounded-full transition-all cursor-pointer ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Speak village name"
                    >
                      {isListening ? <Mic className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </button>
                  </label>

                  <input
                    ref={villageInputRef}
                    type="text"
                    value={locationName}
                    onChange={(e) => handleVillageChange(e.target.value)}
                    onFocus={() => {
                      if (locationName) setSuggestions(getVillageSuggestions(locationName));
                      setShowSuggestions(true);
                    }}
                    placeholder="e.g. Kuppanapudi or Kalla"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />

                  {/* Autocomplete Suggestion Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 overflow-hidden">
                      {suggestions.map((v) => (
                        <div
                          key={v}
                          onClick={() => handleSelectSuggestion(v)}
                          className="px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <span>{v}</span>
                          <span className="text-[10px] text-slate-400">West Godavari Hub</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-1/3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Landmark / (Sub):
                  </label>
                  <input
                    type="text"
                    value={subLocation}
                    onChange={(e) => setSubLocation(e.target.value)}
                    placeholder="konalapalli"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">
                  Or Paste Google Maps Link / Lat,Lng:
                </label>
                <input
                  type="text"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or 16.5144, 81.4286"
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono outline-none"
                />
              </div>
            </div>

            {/* Right: Phone Numbers */}
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5 flex items-center justify-between">
                  <span>Pond Owner Phone:</span>
                  {ownerPhone && (
                    <a
                      href={`tel:${ownerPhone}`}
                      className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-semibold hover:bg-green-100"
                    >
                      <Phone className="w-2.5 h-2.5" /> Call Owner
                    </a>
                  )}
                </label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+919014747367"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Alt Contact Name:
                  </label>
                  <input
                    type="text"
                    value={altContactName}
                    onChange={(e) => setAltContactName(e.target.value)}
                    placeholder="Madhu"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Alt Contact Number:
                  </label>
                  <input
                    type="text"
                    value={altContactPhone}
                    onChange={(e) => setAltContactPhone(e.target.value)}
                    placeholder="9032259499"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nearest Sampler Ranking Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                Distance from Samplers' Current Locations:
              </span>
              {isCalculating && (
                <span className="text-[11px] text-blue-600 animate-pulse">Calculating road routes...</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {proximities.map((item, idx) => {
                const isSelected = selectedSamplerId === item.sampler.id;
                const isNearest = idx === 0;

                return (
                  <div
                    key={item.sampler.id}
                    onClick={() => {
                      setSelectedSamplerId(item.sampler.id);
                      onTargetSamplerChange?.(item.sampler.id);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isNearest && (
                      <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
                        ★ Nearest
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.sampler.color }}
                        />
                        <span className="font-bold text-slate-800">{item.sampler.name}</span>
                      </div>
                      <span className="font-extrabold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded text-[11px]">
                        {item.distanceKm} km
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>
                        Current: <b>{item.sampler.currentLocation.name}</b>
                      </span>
                      <span className="text-slate-500">{item.durationText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              onClick={handleAssign}
              disabled={!selectedSamplerId || !locationName}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                Assign Sample to{' '}
                {samplers.find((s) => s.id === selectedSamplerId)?.name || 'Sampler'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Assigned Success & WhatsApp Dispatch Screen */
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-xs text-emerald-900">
                  Assigned Successfully to {samplers.find((s) => s.id === selectedSamplerId)?.name}!
                </h3>
                <p className="text-[11px] text-emerald-700">
                  Sampler's current location updated to <b>{locationName}</b>.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetForNext}
              className="px-2.5 py-1 text-xs bg-white text-emerald-800 font-semibold rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> New
            </button>
          </div>

          {/* WhatsApp Dispatch Preview */}
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs shadow-inner relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                WhatsApp Dispatch Message Preview
              </span>
              <span className="text-emerald-400 text-[10px] font-semibold">Ready to send</span>
            </div>

            <pre className="whitespace-pre-wrap leading-relaxed font-mono text-xs">
              {generatedDispatch}
            </pre>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleSendWhatsApp}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp to Group</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopy}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Message Text</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleResetForNext}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
            >
              + Add Another Sample Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
