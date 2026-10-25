import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { loadGoogleMaps } from '../services/googleMapsService';
import type { Coordinates } from '../types';
import {
  Navigation,
  AlertCircle,
  Layers,
  Maximize2,
  Minimize2,
  Crosshair,
  Satellite,
  Compass
} from 'lucide-react';

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
  const directionsRendererRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid'); // Default hybrid for aquaculture visibility
  const [isFullscreen, setIsFullscreen] = useState(false);

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
            mapTypeId: mapType,
            streetViewControl: false,
            mapTypeControl: false, // We provide custom styled toggle
            fullscreenControl: false,
            zoomControl: true
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

          // Initialize DirectionsRenderer for real road path
          if (g.maps.DirectionsRenderer) {
            const renderer = new g.maps.DirectionsRenderer({
              map,
              suppressMarkers: true, // We use custom markers
              polylineOptions: {
                strokeColor: '#2563eb',
                strokeWeight: 5,
                strokeOpacity: 0.85
              }
            });
            directionsRendererRef.current = renderer;
          }

          googleMapInstance.current = map;
        }

        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        if (isMounted) {
          setLoadError(
            'Google Maps Demo key active. Visual delta mode & offline coordinates ready.'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [settings.googleMapsApiKey, settings.mapCenter, settings.mapZoom, onMapClick]);

  // Handle Map Type Change
  useEffect(() => {
    if (googleMapInstance.current) {
      googleMapInstance.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Center & Fit Bounds on All Samplers & Pending Ponds
  const handleFitAll = useCallback(() => {
    const win = window as any;
    if (!googleMapInstance.current || !win.google) return;
    const g = win.google;
    const bounds = new g.maps.LatLngBounds();

    samplers.forEach((s) => bounds.extend(s.currentLocation.coords));
    requests.forEach((r) => bounds.extend(r.coords));
    if (pendingCoords) bounds.extend(pendingCoords);

    googleMapInstance.current.fitBounds(bounds, 50);
  }, [samplers, requests, pendingCoords]);

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
          scale: isTarget ? 14 : 10,
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
              <b>Current:</b> ${sampler.currentLocation.name} ${sampler.currentLocation.subLocation ? `(${sampler.currentLocation.subLocation})` : ''}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              <b>Home:</b> ${sampler.homeBase.name}
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

    // 2. Plot Requests
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

    // 3. Draggable Pending Target Pin (Fine-tune exact pond location)
    if (pendingCoords) {
      const pendingMarker = new g.maps.Marker({
        position: pendingCoords,
        map,
        draggable: true, // Father can drag directly onto shrimp pond bund!
        title: 'Target Pond (Drag to exact pond bund)',
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#f97316',
          fillOpacity: 1,
          scale: 1.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          anchor: new g.maps.Point(12, 22)
        },
        animation: g.maps.Animation.DROP,
        zIndex: 120
      });

      pendingMarker.addListener('dragend', (e: any) => {
        if (e.latLng && onMapClick) {
          onMapClick({
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          });
        }
      });

      markersRef.current['pending-target'] = pendingMarker;
    }
  }, [mapLoaded, samplers, requests, selectedRequest, pendingCoords, targetSamplerId, setSelectedRequest, onMapClick]);

  // Turn-by-Turn Driving Route via DirectionsService
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
    if (directionsRendererRef.current) {
      directionsRendererRef.current.set('directions', null);
    }

    let originCoords: Coordinates | null = null;
    let destCoords: Coordinates | null = null;
    let routeColor = '#2563eb';

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
      // Try DirectionsService for actual road route
      if (g.maps.DirectionsService && directionsRendererRef.current) {
        const directionsService = new g.maps.DirectionsService();
        directionsService.route(
          {
            origin: new g.maps.LatLng(originCoords.lat, originCoords.lng),
            destination: new g.maps.LatLng(destCoords.lat, destCoords.lng),
            travelMode: g.maps.TravelMode.DRIVING
          },
          (result: any, status: any) => {
            if (status === 'OK' && result) {
              directionsRendererRef.current.setOptions({
                polylineOptions: {
                  strokeColor: routeColor,
                  strokeWeight: 5,
                  strokeOpacity: 0.9
                }
              });
              directionsRendererRef.current.setDirections(result);
            } else {
              // Fallback to straight line polyline
              drawFallbackPolyline(originCoords!, destCoords!, routeColor, map, g);
            }
          }
        );
      } else {
        drawFallbackPolyline(originCoords, destCoords, routeColor, map, g);
      }
    }
  }, [mapLoaded, targetSamplerId, pendingCoords, selectedRequest, samplers]);

  function drawFallbackPolyline(origin: Coordinates, dest: Coordinates, color: string, map: any, g: any) {
    const path = [
      new g.maps.LatLng(origin.lat, origin.lng),
      new g.maps.LatLng(dest.lat, dest.lng)
    ];

    const polyline = new g.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map
    });

    polylineRef.current = polyline;
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 border border-slate-300 transition-all ${
        isFullscreen ? 'fixed inset-3 z-50 h-[calc(100vh-24px)]' : 'h-full min-h-[440px]'
      }`}
    >
      {/* Google Map Container */}
      <div ref={mapRef} className="w-full h-full min-h-[440px]" />

      {/* Top Floating Sampler Pill Bar */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-10 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-700/80 text-xs text-white">
        <div className="flex items-center gap-1 font-semibold text-slate-300 px-1">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Samplers:</span>
        </div>

        {samplers.map((sampler) => (
          <div
            key={sampler.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-medium transition-all ${
              targetSamplerId === sampler.id
                ? 'bg-blue-600 border-blue-400 text-white shadow-sm ring-2 ring-blue-400/50'
                : 'bg-slate-800/90 border-slate-700 text-slate-200'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: sampler.color }}
            />
            <span className="font-bold">{sampler.name}</span>
            <span className="text-[10px] text-slate-300 bg-slate-700/70 px-1 py-0.5 rounded">
              {sampler.currentLocation.name}
            </span>
          </div>
        ))}
      </div>

      {/* Top Right Floating Controls: Satellite / Roadmap / Fit / Fullscreen */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 text-xs">
        {/* Map Type Switcher */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
              mapType === 'hybrid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Satellite + Roads (Best for aquaculture ponds & canal bunds)"
          >
            🛰️ Hybrid
          </button>
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
              mapType === 'roadmap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Standard Street Map"
          >
            🗺️ Map
          </button>
        </div>

        {/* Fit Bounds */}
        <button
          onClick={handleFitAll}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all cursor-pointer"
          title="Zoom to Fit All Samplers & Ponds"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Hint Banner */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md text-slate-300 px-2.5 py-1 rounded-lg text-[10px] border border-slate-700 flex items-center gap-1.5 shadow-md">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
        <span>Tip: Drag orange pin or click map to pinpoint exact shrimp pond</span>
      </div>

      {/* Notice Banner */}
      {loadError && (
        <div className="absolute bottom-10 left-3 right-3 z-10 bg-amber-950/90 border border-amber-600 text-amber-200 p-2.5 rounded-xl flex items-center gap-2 text-xs shadow-md backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] font-medium">{loadError}</p>
        </div>
      )}
    </div>
  );
};
