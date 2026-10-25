import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { loadGoogleMaps } from '../services/googleMapsService';
import type { Coordinates, Sampler } from '../types';
import L from 'leaflet';
import {
  Navigation,
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  MapPin,
  Sparkles
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

  // Map Engine state: defaults to 'google'
  const [engine, setEngine] = useState<'google' | 'leaflet'>('google');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Google Maps refs
  const googleMapRef = useRef<any>(null);
  const googleSamplerMarkersRef = useRef<{ [key: string]: any }>({});
  const googleRequestMarkersRef = useRef<{ [key: string]: any }>({});
  const googlePendingMarkerRef = useRef<any>(null);
  const googleRoutePolylineRef = useRef<any>(null);
  const googleHistoryPolylinesRef = useRef<any[]>([]);

  // Leaflet fallback refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const leafletPolylineRef = useRef<L.Polyline | null>(null);

  // 1. Google Maps auth failure fallback
  useEffect(() => {
    const win = window as any;
    win.gm_authFailure = () => {
      console.warn('Google Maps API key error. Falling back to OpenStreetMap.');
      setEngine('leaflet');
    };
  }, []);

  // 2. Initialize Map (Google Maps preferred, Leaflet fallback)
  useEffect(() => {
    let isMounted = true;
    if (!mapContainerRef.current) return;

    if (engine === 'google') {
      loadGoogleMaps(settings.googleMapsApiKey)
        .then((g: any) => {
          if (!isMounted || !mapContainerRef.current) return;

          if (!googleMapRef.current) {
            // Clear any prior DOM remnants
            mapContainerRef.current.innerHTML = '';

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

            googleMapRef.current = map;
          }
        })
        .catch((err) => {
          console.warn('Google Maps failed to load, switching to Leaflet:', err);
          if (isMounted) {
            setEngine('leaflet');
          }
        });
    } else {
      // Leaflet OpenStreetMap Engine
      if (!leafletMapRef.current) {
        mapContainerRef.current.innerHTML = '';
        const lMap = L.map(mapContainerRef.current, {
          center: [settings.mapCenter.lat, settings.mapCenter.lng],
          zoom: settings.mapZoom,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
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

  // Handle Map Type Change (Roadmap vs Hybrid)
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, engine]);

  // Focus map on a specific sampler
  const handlePanToSampler = (sampler: Sampler) => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo(sampler.currentLocation.coords);
      googleMapRef.current.setZoom(13);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.setView(
        [sampler.currentLocation.coords.lat, sampler.currentLocation.coords.lng],
        13
      );
    }
  };

  // Center / Fit all active points on map
  const handleFitAll = useCallback(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const bounds = new g.maps.LatLngBounds();
      samplers.forEach((s) => bounds.extend(s.currentLocation.coords));
      requests.forEach((r) => bounds.extend(r.coords));
      if (pendingCoords) bounds.extend(pendingCoords);
      googleMapRef.current.fitBounds(bounds, 60);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const bounds = L.latLngBounds([]);
      samplers.forEach((s) =>
        bounds.extend([s.currentLocation.coords.lat, s.currentLocation.coords.lng])
      );
      requests.forEach((r) => bounds.extend([r.coords.lat, r.coords.lng]));
      if (pendingCoords) bounds.extend([pendingCoords.lat, pendingCoords.lng]);
      if (bounds.isValid()) {
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [engine, samplers, requests, pendingCoords]);

  // RENDER MARKERS (Google Maps)
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current;

      // 1. Plot or Update Samplers
      samplers.forEach((sampler) => {
        const isTarget = targetSamplerId === sampler.id;
        let marker = googleSamplerMarkersRef.current[sampler.id];

        if (!marker) {
          marker = new g.maps.Marker({
            position: sampler.currentLocation.coords,
            map,
            title: `${sampler.name} - At: ${sampler.currentLocation.name}`,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: isTarget ? 15 : 12,
              fillColor: sampler.color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: isTarget ? 4 : 2.5
            },
            label: {
              text: sampler.name[0],
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '13px'
            },
            zIndex: isTarget ? 150 : 80
          });

          marker.addListener('click', () => {
            const info = new g.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif; padding: 4px;">
                  <b style="font-size: 14px; color: #1e293b;">${sampler.name}</b><br/>
                  <span style="font-size: 12px; color: #64748b;">📍 Current: <b style="color: #0f172a;">${sampler.currentLocation.name}</b></span><br/>
                  <span style="font-size: 11px; color: #94a3b8;">🏠 Home Base: ${sampler.homeBase.name}</span>
                </div>`
            });
            info.open(map, marker);
          });

          googleSamplerMarkersRef.current[sampler.id] = marker;
        } else {
          // Dynamically animate / move sampler marker to new location!
          marker.setPosition(sampler.currentLocation.coords);
          marker.setTitle(`${sampler.name} - At: ${sampler.currentLocation.name}`);
          marker.setIcon({
            path: g.maps.SymbolPath.CIRCLE,
            scale: isTarget ? 15 : 12,
            fillColor: sampler.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isTarget ? 4 : 2.5
          });
          marker.setZIndex(isTarget ? 150 : 80);
        }
      });

      // 2. Plot or Update Assigned Requests (Ponds)
      // Remove stale request markers
      const currentReqIds = new Set(requests.map((r) => r.id));
      Object.keys(googleRequestMarkersRef.current).forEach((id) => {
        if (!currentReqIds.has(id)) {
          googleRequestMarkersRef.current[id].setMap(null);
          delete googleRequestMarkersRef.current[id];
        }
      });

      requests.forEach((req) => {
        let marker = googleRequestMarkersRef.current[req.id];
        const assignedSampler = samplers.find((s) => s.id === req.assignedSamplerId);
        const pinColor = assignedSampler?.color || '#16a34a';

        if (!marker) {
          marker = new g.maps.Marker({
            position: req.coords,
            map,
            title: `${req.locationName} (${req.farmerCode}) - Assigned to ${assignedSampler?.name || 'Sampler'}`,
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: pinColor,
              fillOpacity: 1,
              scale: 1.4,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              anchor: new g.maps.Point(12, 22)
            },
            zIndex: 60
          });

          marker.addListener('click', () => {
            setSelectedRequest(req);
            const info = new g.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
                  <b style="color: ${pinColor}; font-size: 13px;">${req.farmerCode} - ${req.locationName}</b><br/>
                  <span style="font-size: 11px; color: #475569;">Count: <b>${req.countTons}</b></span><br/>
                  <span style="font-size: 11px; color: #475569;">Sampler: <b>@${assignedSampler?.name || 'Assigned'}</b></span><br/>
                  ${req.ownerPhone ? `<a href="tel:${req.ownerPhone}" style="color: #0284c7; font-size: 11px;">📞 ${req.ownerPhone}</a>` : ''}
                </div>`
            });
            info.open(map, marker);
          });

          googleRequestMarkersRef.current[req.id] = marker;
        } else {
          marker.setPosition(req.coords);
        }
      });

      // 3. Pending Target Pond Pin (Draggable)
      if (pendingCoords && pendingCoords.lat && pendingCoords.lng) {
        if (!googlePendingMarkerRef.current) {
          const pMarker = new g.maps.Marker({
            position: pendingCoords,
            map,
            draggable: true,
            title: 'Target Pond (Drag onto exact pond bund)',
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#ea580c', // Bright orange
              fillOpacity: 1,
              scale: 1.8,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
              anchor: new g.maps.Point(12, 22)
            },
            animation: g.maps.Animation.DROP,
            zIndex: 200
          });

          pMarker.addListener('dragend', (e: any) => {
            if (e.latLng && onMapClick) {
              onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              });
            }
          });

          googlePendingMarkerRef.current = pMarker;
        } else {
          googlePendingMarkerRef.current.setPosition(pendingCoords);
          googlePendingMarkerRef.current.setMap(map);
        }
      } else if (googlePendingMarkerRef.current) {
        // Hide pending marker if no pendingCoords
        googlePendingMarkerRef.current.setMap(null);
      }
    }
  }, [engine, samplers, requests, pendingCoords, targetSamplerId, setSelectedRequest, onMapClick]);

  // ROUTE LINES: Draw route between target sampler and pending pond + sampler history trails
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current;

      // 1. Draw route line from Target Sampler to Pending Pond
      if (targetSamplerId && pendingCoords && pendingCoords.lat) {
        const sampler = samplers.find((s) => s.id === targetSamplerId);
        if (sampler) {
          const path = [
            sampler.currentLocation.coords,
            pendingCoords
          ];

          if (!googleRoutePolylineRef.current) {
            googleRoutePolylineRef.current = new g.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: sampler.color || '#2563eb',
              strokeOpacity: 0.9,
              strokeWeight: 4,
              map
            });
          } else {
            googleRoutePolylineRef.current.setPath(path);
            googleRoutePolylineRef.current.setOptions({
              strokeColor: sampler.color || '#2563eb'
            });
            googleRoutePolylineRef.current.setMap(map);
          }
        }
      } else if (googleRoutePolylineRef.current) {
        googleRoutePolylineRef.current.setMap(null);
      }

      // 2. Draw Historical routes for each sampler's assigned ponds today
      googleHistoryPolylinesRef.current.forEach((line) => line.setMap(null));
      googleHistoryPolylinesRef.current = [];

      samplers.forEach((sampler) => {
        const sRequests = requests.filter((r) => r.assignedSamplerId === sampler.id);
        if (sRequests.length > 0) {
          // Connect homeBase -> pond1 -> pond2 ...
          const trailPath = [
            sampler.homeBase.coords,
            ...sRequests.map((r) => r.coords)
          ];

          const historyLine = new g.maps.Polyline({
            path: trailPath,
            geodesic: true,
            strokeColor: sampler.color,
            strokeOpacity: 0.6,
            strokeWeight: 3,
            icons: [
              {
                icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2 },
                offset: '100%'
              }
            ],
            map
          });

          googleHistoryPolylinesRef.current.push(historyLine);
        }
      });
    }
  }, [engine, targetSamplerId, pendingCoords, samplers, requests]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 border border-slate-300 transition-all ${
        isFullscreen ? 'fixed inset-3 z-50 h-[calc(100vh-24px)]' : 'h-full min-h-[460px]'
      }`}
    >
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* Top Floating Sampler Status Badges */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-700/80 text-xs text-white">
        <div className="flex items-center gap-1 font-bold text-slate-300 px-1">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Samplers:</span>
        </div>

        {samplers.map((sampler) => {
          const isTarget = targetSamplerId === sampler.id;
          return (
            <button
              key={sampler.id}
              type="button"
              onClick={() => handlePanToSampler(sampler)}
              title={`Click to pan to ${sampler.name}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                isTarget
                  ? 'bg-blue-600 border-blue-400 text-white shadow-sm ring-2 ring-blue-400/50'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sampler.color }}
              />
              <span className="font-bold">{sampler.name}</span>
              <span className="text-[10px] text-slate-300 bg-slate-700/70 px-1 py-0.5 rounded font-mono">
                {sampler.currentLocation.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Right Floating Controls: Satellite toggle / Fit / Fullscreen */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 text-white text-xs">
        {/* Satellite / Hybrid toggle */}
        <button
          type="button"
          onClick={() => setMapType(mapType === 'hybrid' ? 'roadmap' : 'hybrid')}
          className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
            mapType === 'hybrid'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
          title="Toggle Satellite Imagery with roads and ponds"
        >
          <span>🛰️ Satellite</span>
        </button>

        {/* Center / Fit all */}
        <button
          type="button"
          onClick={handleFitAll}
          title="Fit all samplers and ponds"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-6 left-3 z-10 pointer-events-none hidden sm:block">
        <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-800 flex items-center gap-1.5">
          <span>💡 Tap anywhere on map or drag pin onto exact pond bund</span>
        </div>
      </div>
    </div>
  );
};
