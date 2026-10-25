import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { loadGoogleMaps } from '../services/googleMapsService';
import type { Coordinates } from '../types';
import { Navigation, AlertCircle } from 'lucide-react';

interface MapViewProps {
  onMapClick?: (coords: Coordinates) => void;
  pendingCoords?: Coordinates | null;
  targetSamplerId?: string | null;
}

export const MapView: React.FC<MapViewProps> = ({
  onMapClick,
  pendingCoords,
  targetSamplerId
}) => {
  const { samplers, requests, selectedRequest, settings, setSelectedRequest } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;
    if (!mapRef.current) return;

    loadGoogleMaps(settings.googleMapsApiKey)
      .then((g: any) => {
        if (!isMounted || !mapRef.current) return;

        if (!googleMapInstance.current) {
          const map = new g.maps.Map(mapRef.current, {
            center: settings.mapCenter,
            zoom: settings.mapZoom,
            mapTypeId: g.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: false,
            zoomControl: true,
            styles: [
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#c7e3ff' }]
              },
              {
                featureType: 'landscape.natural',
                elementType: 'geometry',
                stylers: [{ color: '#e8f4e5' }] // rural/aquaculture greenish tint
              }
            ]
          });

          // Click listener
          map.addListener('click', (e: any) => {
            if (e.latLng && onMapClick) {
              onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              });
            }
          });

          googleMapInstance.current = map;
        }

        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        if (isMounted) {
          setLoadError(
            'Google Maps Demo key active or connecting. Offline regional coordinates and dispatching ready.'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [settings.googleMapsApiKey, settings.mapCenter, settings.mapZoom, onMapClick]);

  // Update Markers for Samplers & Requests
  useEffect(() => {
    const win = window as any;
    if (!mapLoaded || !googleMapInstance.current || !win.google) return;
    const map = googleMapInstance.current;
    const g = win.google;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker: any) => marker.setMap(null));
    markersRef.current = {};

    // 1. Plot Sampler Markers
    samplers.forEach((sampler) => {
      const isTarget = targetSamplerId === sampler.id;
      const marker = new g.maps.Marker({
        position: sampler.currentLocation.coords,
        map,
        title: `${sampler.name} (${sampler.currentLocation.name})`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: isTarget ? 13 : 10,
          fillColor: sampler.color,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: isTarget ? 4 : 2
        },
        label: {
          text: sampler.name[0],
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '12px'
        },
        zIndex: isTarget ? 100 : 50
      });

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="font-family: system-ui, sans-serif; padding: 6px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${sampler.color}"></span>
              <strong style="font-size: 15px; color: #1e293b;">${sampler.name}</strong>
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 3px;">
              <b>Current Loc:</b> ${sampler.currentLocation.name} ${sampler.currentLocation.subLocation ? `(${sampler.currentLocation.subLocation})` : ''}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              <b>Home Base:</b> ${sampler.homeBase.name}
            </div>
            <a href="tel:${sampler.phone}" style="display: inline-block; background: #2563eb; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-decoration: none;">
              📞 Call ${sampler.name}
            </a>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current[`sampler-${sampler.id}`] = marker;
    });

    // 2. Plot Pending or Selected Requests
    requests.forEach((req) => {
      const isSelected = selectedRequest?.id === req.id;
      const assignedSampler = samplers.find((s) => s.id === req.assignedSamplerId);

      const marker = new g.maps.Marker({
        position: req.coords,
        map,
        title: `${req.locationName} - ${req.farmerCode}`,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: req.status === 'assigned' ? (assignedSampler?.color || '#16a34a') : '#ea580c',
          fillOpacity: 1,
          scale: isSelected ? 1.8 : 1.4,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          anchor: new g.maps.Point(12, 22)
        },
        zIndex: isSelected ? 90 : 30
      });

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="font-family: system-ui, sans-serif; padding: 6px; min-width: 180px;">
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px;">
              ${req.locationName} ${req.subLocation ? `(${req.subLocation})` : ''}
            </div>
            <div style="font-size: 11px; color: #3b82f6; font-weight: 600;">
              ${req.company} | ${req.farmerCode}
            </div>
            <div style="font-size: 11px; color: #475569; margin: 3px 0;">
              🦐 <b>Count:</b> ${req.countTons} | <b>Date:</b> ${req.harvestDate}
            </div>
            ${
              req.ownerPhone
                ? `<div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
                     📱 <a href="tel:${req.ownerPhone}" style="color: #2563eb; text-decoration: underline;">${req.ownerPhone}</a>
                   </div>`
                : ''
            }
            <div style="margin-top: 4px;">
              <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${req.status === 'assigned' ? '#dcfce7; color: #15803d' : '#ffedd5; color: #c2410c'}">
                ${req.status.toUpperCase()} ${assignedSampler ? `➔ ${assignedSampler.name}` : ''}
              </span>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        setSelectedRequest(req);
        infoWindow.open(map, marker);
      });

      markersRef.current[`req-${req.id}`] = marker;
    });

    // 3. Plot temporary pending coordinate marker (during input)
    if (pendingCoords) {
      const pendingMarker = new g.maps.Marker({
        position: pendingCoords,
        map,
        title: 'New Pond Target Location',
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f97316',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        animation: g.maps.Animation.BOUNCE
      });
      markersRef.current['pending-target'] = pendingMarker;
    }
  }, [mapLoaded, samplers, requests, selectedRequest, pendingCoords, targetSamplerId, setSelectedRequest]);

  // Draw Route Polyline from Target/Assigned Sampler to Pond
  useEffect(() => {
    const win = window as any;
    if (!mapLoaded || !googleMapInstance.current || !win.google) return;
    const map = googleMapInstance.current;
    const g = win.google;

    // Clear old lines
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    let originCoords: Coordinates | null = null;
    let destCoords: Coordinates | null = null;
    let routeColor = '#2563eb';

    // Check if target sampler and pending coords are specified
    if (targetSamplerId && pendingCoords) {
      const sampler = samplers.find((s) => s.id === targetSamplerId);
      if (sampler) {
        originCoords = sampler.currentLocation.coords;
        destCoords = pendingCoords;
        routeColor = sampler.color;
      }
    } else if (selectedRequest && selectedRequest.assignedSamplerId) {
      const sampler = samplers.find((s) => s.id === selectedRequest.assignedSamplerId);
      if (sampler) {
        originCoords = sampler.currentLocation.coords;
        destCoords = selectedRequest.coords;
        routeColor = sampler.color;
      }
    }

    if (originCoords && destCoords) {
      const path = [
        new g.maps.LatLng(originCoords.lat, originCoords.lng),
        new g.maps.LatLng(destCoords.lat, destCoords.lng)
      ];

      const polyline = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: routeColor,
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map
      });

      polylineRef.current = polyline;
    }
  }, [mapLoaded, targetSamplerId, pendingCoords, selectedRequest, samplers]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-inner bg-slate-200 border border-slate-300">
      {/* Google Map Container */}
      <div ref={mapRef} className="w-full h-full min-h-[420px]" />

      {/* Floating Map Legend & Sampler Quick Pill Bar */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-10 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200/80 text-xs">
        <div className="flex items-center gap-1 font-semibold text-slate-700 px-1">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span>Samplers:</span>
        </div>

        {samplers.map((sampler) => (
          <div
            key={sampler.id}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all ${
              targetSamplerId === sampler.id
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-2 ring-blue-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: sampler.color }}
            />
            <span>{sampler.name}</span>
            <span className="text-[10px] text-slate-500 bg-white px-1 py-0.5 rounded border border-slate-200">
              {sampler.currentLocation.name}
            </span>
          </div>
        ))}
      </div>

      {/* Load error or notice */}
      {loadError && (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-amber-50 border border-amber-300 text-amber-800 p-2.5 rounded-xl flex items-center gap-2 text-xs shadow-md">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-[11px]">{loadError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
