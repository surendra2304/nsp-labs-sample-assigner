import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { loadGoogleMaps } from '../services/googleMapsService';
import type { Coordinates } from '../types';
import L from 'leaflet';
import {
  Crosshair
} from 'lucide-react';

interface MapViewProps {
  onMapClick?: (coords: Coordinates) => void;
  /** Fired ONLY on zoom (pinch, scroll wheel, +/- controls) — used to dismiss the mobile keyboard */
  onMapZoom?: () => void;
  pendingCoords?: Coordinates | null;
  targetSamplerId?: string | null;
  onMapInteraction?: () => void;
}

// Default center of the map is Bhimavaram (NSP Labs Delta Headquarters)
const BHIMAVARAM_CENTER: Coordinates = { lat: 16.5449, lng: 81.5212 };
const DEFAULT_MAP_ZOOM = 12;

export const MapView: React.FC<MapViewProps> = ({
  onMapClick,
  onMapZoom,
  pendingCoords,
  targetSamplerId,
  onMapInteraction
}) => {
  const { samplers, requests, settings, deleteSampleRequest } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Map Engine state: defaults to 'google'
  const [engine, setEngine] = useState<'google' | 'leaflet'>('google');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');

  // Google Maps refs
  const googleMapRef = useRef<any>(null);
  const googleSamplerMarkersRef = useRef<{ [key: string]: any }>({});
  const googleRequestMarkersRef = useRef<{ [key: string]: any }>({});
  const googlePendingMarkerRef = useRef<any>(null);
  const googleRoutePolylineRef = useRef<any>(null);

  // Leaflet fallback refs
  const leafletMapRef = useRef<L.Map | null>(null);

  // Expose delete helper for InfoWindow clicks
  useEffect(() => {
    (window as any).__deleteSampleRequest = (id: string) => {
      deleteSampleRequest(id);
    };
    return () => {
      delete (window as any).__deleteSampleRequest;
    };
  }, [deleteSampleRequest]);

  // 1. Google Maps auth failure fallback
  useEffect(() => {
    const win = window as any;
    win.gm_authFailure = () => {
      console.warn('Google Maps API key error. Falling back to OpenStreetMap.');
      setEngine('leaflet');
    };
  }, []);

  // 2. Initialize Map (Google Maps preferred, centered on Bhimavaram)
  useEffect(() => {
    let isMounted = true;
    if (!mapContainerRef.current) return;

    if (engine === 'google') {
      loadGoogleMaps(settings.googleMapsApiKey)
        .then((g: any) => {
          if (!isMounted || !mapContainerRef.current) return;

          if (!googleMapRef.current) {
            mapContainerRef.current.innerHTML = '';

            const map = new g.maps.Map(mapContainerRef.current, {
              center: BHIMAVARAM_CENTER,
              zoom: DEFAULT_MAP_ZOOM,
              mapTypeId: mapType,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true
            });

            // Keep focus when clicking on map
            map.addListener('click', (e: any) => {
              if (onMapInteraction) onMapInteraction();
              if (e.latLng && onMapClick) {
                onMapClick({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }
            });

            // Keep focus when zooming in/out
            map.addListener('zoom_changed', () => {
              if (onMapInteraction) onMapInteraction();
              // Zooming is a deliberate "look at the map" gesture: hide the keyboard
              if (onMapZoom) onMapZoom();
            });

            // Keep focus when dragging map
            map.addListener('dragend', () => {
              if (onMapInteraction) onMapInteraction();
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
      // Leaflet OpenStreetMap Engine centered on Bhimavaram
      if (!leafletMapRef.current) {
        mapContainerRef.current.innerHTML = '';
        const lMap = L.map(mapContainerRef.current, {
          center: [BHIMAVARAM_CENTER.lat, BHIMAVARAM_CENTER.lng],
          zoom: DEFAULT_MAP_ZOOM,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(lMap);

        lMap.on('click', (e: L.LeafletMouseEvent) => {
          if (onMapInteraction) onMapInteraction();
          if (onMapClick) {
            onMapClick({
              lat: e.latlng.lat,
              lng: e.latlng.lng
            });
          }
        });

        lMap.on('zoomend', () => {
          if (onMapInteraction) onMapInteraction();
          // Zooming is a deliberate "look at the map" gesture: hide the keyboard
          if (onMapZoom) onMapZoom();
        });

        lMap.on('moveend', () => {
          if (onMapInteraction) onMapInteraction();
        });

        leafletMapRef.current = lMap;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [engine, settings.googleMapsApiKey, onMapClick, onMapZoom, onMapInteraction]);

  // Handle Map Type Change (Roadmap vs Hybrid)
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, engine]);

  // Center on Bhimavaram or fit active points
  const handleCenterOrFit = useCallback(() => {
    if (onMapInteraction) onMapInteraction();

    if (pendingCoords && pendingCoords.lat) {
      // Zoom to fit target pond and nearest sampler
      if (engine === 'google' && googleMapRef.current && (window as any).google) {
        const g = (window as any).google;
        const bounds = new g.maps.LatLngBounds();
        samplers.forEach((s) => bounds.extend(s.currentLocation.coords));
        bounds.extend(pendingCoords);
        googleMapRef.current.fitBounds(bounds, 60);
      }
    } else {
      // Default: Center strictly on Bhimavaram
      if (engine === 'google' && googleMapRef.current) {
        googleMapRef.current.panTo(BHIMAVARAM_CENTER);
        googleMapRef.current.setZoom(DEFAULT_MAP_ZOOM);
      } else if (engine === 'leaflet' && leafletMapRef.current) {
        leafletMapRef.current.setView([BHIMAVARAM_CENTER.lat, BHIMAVARAM_CENTER.lng], DEFAULT_MAP_ZOOM);
      }
    }
  }, [engine, samplers, pendingCoords, onMapInteraction]);

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
            if (onMapInteraction) onMapInteraction();
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

      // 2. Clean up removed or legacy requests
      const currentReqIds = new Set(requests.map((r) => r.id));
      Object.keys(googleRequestMarkersRef.current).forEach((id) => {
        if (!currentReqIds.has(id)) {
          googleRequestMarkersRef.current[id].setMap(null);
          delete googleRequestMarkersRef.current[id];
        }
      });

      // Plot valid assigned ponds (if any)
      requests.forEach((req) => {
        // Exclude legacy mock "Gnr Kuppanapudi"
        if (
          req.farmerCode?.toLowerCase() === 'gnr' ||
          req.locationName?.toLowerCase().includes('kuppanapudi')
        ) {
          if (googleRequestMarkersRef.current[req.id]) {
            googleRequestMarkersRef.current[req.id].setMap(null);
            delete googleRequestMarkersRef.current[req.id];
          }
          return;
        }

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
            if (onMapInteraction) onMapInteraction();
            const info = new g.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
                  <b style="color: ${pinColor}; font-size: 13px;">${req.farmerCode} - ${req.locationName}</b><br/>
                  <span style="font-size: 11px; color: #475569;">Count: <b>${req.countTons}</b></span><br/>
                  <span style="font-size: 11px; color: #475569;">Sampler: <b>@${assignedSampler?.name || 'Assigned'}</b></span><br/>
                  ${req.ownerPhone ? `<a href="tel:${req.ownerPhone}" style="color: #0284c7; font-size: 11px;">📞 ${req.ownerPhone}</a><br/>` : ''}
                  <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
                    <button onclick="window.__deleteSampleRequest && window.__deleteSampleRequest('${req.id}')" style="background: #ef4444; color: white; border: none; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">Remove Pin</button>
                  </div>
                </div>`
            });
            info.open(map, marker);
          });

          googleRequestMarkersRef.current[req.id] = marker;
        } else {
          marker.setPosition(req.coords);
        }
      });

      // 3. Pending Target Pond Pin (Draggable, with DROP animation on every new location)
      if (pendingCoords && pendingCoords.lat && pendingCoords.lng) {
        const prevPos = googlePendingMarkerRef.current?.getPosition();
        const isNewLocation =
          !prevPos ||
          Math.abs(prevPos.lat() - pendingCoords.lat) > 0.0001 ||
          Math.abs(prevPos.lng() - pendingCoords.lng) > 0.0001;

        if (isNewLocation) {
          if (googlePendingMarkerRef.current) {
            googlePendingMarkerRef.current.setMap(null);
            googlePendingMarkerRef.current = null;
          }

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
            if (onMapInteraction) onMapInteraction();
            if (e.latLng && onMapClick) {
              onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              });
            }
          });

          googlePendingMarkerRef.current = pMarker;
          map.panTo(pendingCoords);
        }
      } else if (googlePendingMarkerRef.current) {
        googlePendingMarkerRef.current.setMap(null);
        googlePendingMarkerRef.current = null;
      }
    }
  }, [engine, samplers, requests, pendingCoords, targetSamplerId, onMapClick, onMapInteraction]);

  // ROUTE LINES: Draw route between target sampler and pending pond
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current;

      // Draw route line from Target Sampler to Pending Pond
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
    }
  }, [engine, targetSamplerId, pendingCoords, samplers]);

  return (
    <div className="relative w-full h-full bg-slate-900 transition-all">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        onPointerUp={() => onMapInteraction?.()}
        onTouchEnd={() => onMapInteraction?.()}
      />

      {/* Top Right Controls: Satellite toggle / Center on Bhimavaram */}
      <div className="absolute top-14 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 text-white text-xs">
        {/* Satellite / Hybrid toggle */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (onMapInteraction) onMapInteraction();
            setMapType(mapType === 'hybrid' ? 'roadmap' : 'hybrid');
          }}
          className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
            mapType === 'hybrid'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
          title="Toggle Satellite Imagery"
        >
          <span>🛰️ Satellite</span>
        </button>

        {/* Center Bhimavaram / Fit */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCenterOrFit}
          title="Center on Bhimavaram / Fit points"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
