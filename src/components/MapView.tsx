import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { loadGoogleMaps } from '../services/googleMapsService';
import type { Coordinates } from '../types';
import L from 'leaflet';
import {
  Navigation,
  AlertCircle,
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  MapPin
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
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Map Engine state: 'google' | 'leaflet'
  const [engine, setEngine] = useState<'google' | 'leaflet'>('google');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);

  // Google Maps refs
  const googleMapRef = useRef<any>(null);
  const googleMarkersRef = useRef<{ [key: string]: any }>({});
  const googlePolylineRef = useRef<any>(null);
  const googleDirectionsRef = useRef<any>(null);

  // Leaflet refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const leafletPolylineRef = useRef<L.Polyline | null>(null);

  // 1. Google Maps gm_authFailure handler
  useEffect(() => {
    const win = window as any;
    win.gm_authFailure = () => {
      console.warn('Google Maps API key error. Auto-switching to OpenStreetMap engine.');
      setEngineNotice('Google Maps key limited. Switched to OpenStreetMap for guaranteed display.');
      setEngine('leaflet');
    };
  }, []);

  // 2. Initialize Map based on Engine
  useEffect(() => {
    let isMounted = true;
    if (!mapContainerRef.current) return;

    if (engine === 'google') {
      // Clean up Leaflet if it was active
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      loadGoogleMaps(settings.googleMapsApiKey)
        .then((g: any) => {
          if (!isMounted || !mapContainerRef.current) return;

          if (!googleMapRef.current) {
            const map = new g.maps.Map(mapContainerRef.current, {
              center: settings.mapCenter,
              zoom: settings.mapZoom,
              mapTypeId: mapType,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true
            });

            map.addListener('click', (e: any) => {
              if (e.latLng && onMapClick) {
                onMapClick({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }
            });

            if (g.maps.DirectionsRenderer) {
              googleDirectionsRef.current = new g.maps.DirectionsRenderer({
                map,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#2563eb',
                  strokeWeight: 5,
                  strokeOpacity: 0.85
                }
              });
            }

            googleMapRef.current = map;
          }
        })
        .catch((err) => {
          console.warn('Google Maps script failed to load, switching to Leaflet:', err);
          if (isMounted) {
            setEngine('leaflet');
            setEngineNotice('Using OpenStreetMap engine (works 100% offline & without API limits).');
          }
        });
    } else {
      // Leaflet OpenStreetMap Engine
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }

      if (!leafletMapRef.current) {
        const lMap = L.map(mapContainerRef.current, {
          center: [settings.mapCenter.lat, settings.mapCenter.lng],
          zoom: settings.mapZoom,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(lMap);

        lMap.on('click', (e: L.LeafletMouseEvent) => {
          if (onMapClick) {
            onMapClick({
              lat: e.latlng.lat,
              lng: e.latlng.lng
            });
          }
        });

        leafletMapRef.current = lMap;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [engine, settings.googleMapsApiKey, settings.mapCenter, settings.mapZoom, onMapClick]);

  // Handle Google mapType change
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, engine]);

  // Center / Fit all markers
  const handleFitAll = useCallback(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const bounds = new g.maps.LatLngBounds();
      samplers.forEach((s) => bounds.extend(s.currentLocation.coords));
      requests.forEach((r) => bounds.extend(r.coords));
      if (pendingCoords) bounds.extend(pendingCoords);
      googleMapRef.current.fitBounds(bounds, 50);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const bounds = L.latLngBounds([]);
      samplers.forEach((s) => bounds.extend([s.currentLocation.coords.lat, s.currentLocation.coords.lng]));
      requests.forEach((r) => bounds.extend([r.coords.lat, r.coords.lng]));
      if (pendingCoords) bounds.extend([pendingCoords.lat, pendingCoords.lng]);
      if (bounds.isValid()) {
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [engine, samplers, requests, pendingCoords]);

  // Render Markers on Map
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current;

      // Clear old google markers
      Object.values(googleMarkersRef.current).forEach((m: any) => m.setMap(null));
      googleMarkersRef.current = {};

      // Plot Samplers
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

        marker.addListener('click', () => {
          const info = new g.maps.InfoWindow({
            content: `<b>${sampler.name}</b><br/>Current: ${sampler.currentLocation.name}<br/>Base: ${sampler.homeBase.name}`
          });
          info.open(map, marker);
        });

        googleMarkersRef.current[`sampler-${sampler.id}`] = marker;
      });

      // Plot Requests
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

        marker.addListener('click', () => {
          setSelectedRequest(req);
        });

        googleMarkersRef.current[`req-${req.id}`] = marker;
      });

      // Plot Draggable Pending Target Pin
      if (pendingCoords) {
        const pendingMarker = new g.maps.Marker({
          position: pendingCoords,
          map,
          draggable: true,
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

        googleMarkersRef.current['pending-target'] = pendingMarker;
      }
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const lMap = leafletMapRef.current;

      // Clear old leaflet markers
      Object.values(leafletMarkersRef.current).forEach((m) => m.remove());
      leafletMarkersRef.current = {};

      // 1. Plot Samplers
      samplers.forEach((sampler) => {
        const isTarget = targetSamplerId === sampler.id;
        const icon = L.divIcon({
          className: 'custom-sampler-icon',
          html: `<div style="background-color: ${sampler.color}; width: ${isTarget ? 30 : 24}px; height: ${isTarget ? 30 : 24}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${sampler.name[0]}</div>`,
          iconSize: [isTarget ? 30 : 24, isTarget ? 30 : 24],
          iconAnchor: [isTarget ? 15 : 12, isTarget ? 15 : 12]
        });

        const marker = L.marker([sampler.currentLocation.coords.lat, sampler.currentLocation.coords.lng], { icon })
          .bindPopup(`<b>${sampler.name}</b><br/>Current: ${sampler.currentLocation.name}<br/>Base: ${sampler.homeBase.name}`)
          .addTo(lMap);

        leafletMarkersRef.current[`sampler-${sampler.id}`] = marker;
      });

      // 2. Plot Requests
      requests.forEach((req) => {
        const isSelected = selectedRequest?.id === req.id;
        const assignedSampler = samplers.find((s) => s.id === req.assignedSamplerId);

        const icon = L.divIcon({
          className: 'custom-pond-icon',
          html: `<div style="background-color: ${req.status === 'assigned' ? (assignedSampler?.color || '#16a34a') : '#ea580c'}; width: ${isSelected ? 26 : 20}px; height: ${isSelected ? 26 : 20}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [isSelected ? 26 : 20, isSelected ? 26 : 20],
          iconAnchor: [isSelected ? 13 : 10, isSelected ? 13 : 10]
        });

        const marker = L.marker([req.coords.lat, req.coords.lng], { icon })
          .bindPopup(`<b>${req.locationName}</b><br/>Code: ${req.farmerCode}<br/>Count: ${req.countTons}`)
          .addTo(lMap);

        marker.on('click', () => setSelectedRequest(req));
        leafletMarkersRef.current[`req-${req.id}`] = marker;
      });

      // 3. Plot Draggable Target Pin
      if (pendingCoords) {
        const icon = L.divIcon({
          className: 'custom-target-icon',
          html: `<div style="background-color: #f97316; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">📍</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([pendingCoords.lat, pendingCoords.lng], {
          icon,
          draggable: true
        }).addTo(lMap);

        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          if (onMapClick) {
            onMapClick({
              lat: latlng.lat,
              lng: latlng.lng
            });
          }
        });

        leafletMarkersRef.current['pending-target'] = marker;
      }
    }
  }, [engine, samplers, requests, selectedRequest, pendingCoords, targetSamplerId, setSelectedRequest, onMapClick]);

  // Route drawing
  useEffect(() => {
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

    if (!originCoords || !destCoords) return;

    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      if (googleDirectionsRef.current && g.maps.DirectionsService) {
        const ds = new g.maps.DirectionsService();
        ds.route(
          {
            origin: new g.maps.LatLng(originCoords.lat, originCoords.lng),
            destination: new g.maps.LatLng(destCoords.lat, destCoords.lng),
            travelMode: g.maps.TravelMode.DRIVING
          },
          (result: any, status: any) => {
            if (status === 'OK' && result) {
              googleDirectionsRef.current.setDirections(result);
            }
          }
        );
      }
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      if (leafletPolylineRef.current) {
        leafletPolylineRef.current.remove();
        leafletPolylineRef.current = null;
      }

      const poly = L.polyline(
        [
          [originCoords.lat, originCoords.lng],
          [destCoords.lat, destCoords.lng]
        ],
        { color: routeColor, weight: 4, opacity: 0.85, dashArray: '6, 8' }
      ).addTo(leafletMapRef.current);

      leafletPolylineRef.current = poly;
    }
  }, [engine, targetSamplerId, pendingCoords, selectedRequest, samplers]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 border border-slate-300 transition-all ${
        isFullscreen ? 'fixed inset-3 z-50 h-[calc(100vh-24px)]' : 'h-full min-h-[440px]'
      }`}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />

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

      {/* Top Right Floating Controls: Engine toggle / Hybrid / Fit / Fullscreen */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 text-xs">
        {/* Engine Toggle */}
        <button
          onClick={() => setEngine(engine === 'google' ? 'leaflet' : 'google')}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] border border-slate-700 cursor-pointer"
          title="Switch Map Engine"
        >
          {engine === 'google' ? 'Google Maps' : 'OpenStreetMap'}
        </button>

        {engine === 'google' && (
          <div className="flex bg-slate-800 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Satellite + Roads"
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
              title="Standard Map"
            >
              🗺️ Map
            </button>
          </div>
        )}

        {/* Fit Bounds */}
        <button
          onClick={handleFitAll}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all cursor-pointer"
          title="Zoom to Fit All"
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

      {/* Engine Notice */}
      {engineNotice && (
        <div className="absolute bottom-10 left-3 right-3 z-10 bg-blue-950/90 border border-blue-600 text-blue-200 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-[11px] font-medium">{engineNotice}</p>
          </div>
          <button
            onClick={() => setEngineNotice(null)}
            className="text-[10px] text-blue-300 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
