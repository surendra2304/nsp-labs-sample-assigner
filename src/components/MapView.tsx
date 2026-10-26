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
}

// Default center of the map is Bhimavaram (NSP Labs Delta Headquarters)
const BHIMAVARAM_CENTER: Coordinates = { lat: 16.5449, lng: 81.5212 };
const DEFAULT_MAP_ZOOM = 12;

export const MapView: React.FC<MapViewProps> = ({
  onMapClick,
  onMapZoom,
  pendingCoords,
  targetSamplerId
}) => {
  const { samplers, requests, settings, deleteSampleRequest } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Map Engine state: defaults to leaflet if no API key is provided
  const [engine, setEngine] = useState<'google' | 'leaflet'>(() => {
    return settings.googleMapsApiKey && settings.googleMapsApiKey.trim() ? 'google' : 'leaflet';
  });
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('hybrid');

  // Reactive map instance state to trigger marker rendering immediately on load!
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Google Maps refs
  const googleMapRef = useRef<any>(null);
  const googleSamplerMarkersRef = useRef<{ [key: string]: any }>({});
  const googleRequestMarkersRef = useRef<{ [key: string]: any }>({});
  const googlePendingMarkerRef = useRef<any>(null);
  const googleRoutePolylineRef = useRef<any>(null);

  // Leaflet fallback refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletSamplerMarkersRef = useRef<{ [key: string]: L.Marker }>({});

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

    if (engine === 'google' && settings.googleMapsApiKey && settings.googleMapsApiKey.trim()) {
      loadGoogleMaps(settings.googleMapsApiKey)
        .then((g: any) => {
          if (!isMounted || !mapContainerRef.current) return;

          if (!googleMapRef.current) {
            mapContainerRef.current.innerHTML = '';

            const map = new g.maps.Map(mapContainerRef.current, {
              center: BHIMAVARAM_CENTER,
              zoom: DEFAULT_MAP_ZOOM,
              mapTypeId: mapType,
              gestureHandling: 'greedy', // Enables 1-finger panning on mobile screens without 2-finger blocking
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

            // Dismiss keyboard when zooming in/out to view the map
            map.addListener('zoom_changed', () => {
              if (onMapZoom) onMapZoom();
            });

            googleMapRef.current = map;
            // Reactive state trigger so sampler markers render IMMEDIATELY before typing!
            setMapInstance(map);
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
          if (onMapClick) {
            onMapClick({
              lat: e.latlng.lat,
              lng: e.latlng.lng
            });
          }
        });

        lMap.on('zoomend', () => {
          if (onMapZoom) onMapZoom();
        });

        leafletMapRef.current = lMap;
        setMapInstance(lMap);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [engine, settings.googleMapsApiKey, onMapClick, onMapZoom]);

  // Handle Map Type Change (Roadmap vs Hybrid)
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current) {
      googleMapRef.current.setMapTypeId(mapType);
    }
  }, [mapType, engine]);

  // Center on Bhimavaram or fit active points
  const handleCenterOrFit = useCallback(() => {
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
  }, [engine, samplers, pendingCoords]);

  // RENDER MARKERS (Google Maps - runs as soon as mapInstance is ready!)
  useEffect(() => {
    if (engine === 'google' && (googleMapRef.current || mapInstance) && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current || mapInstance;

      // 1. Plot or Update Samplers (Prominent big markers with clear full names!)
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
              scale: isTarget ? 24 : 20, // Large, high-visibility marker
              fillColor: sampler.color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: isTarget ? 4 : 3
            },
            label: {
              text: sampler.name, // Full name clearly visible on marker
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '12px'
            },
            zIndex: isTarget ? 160 : 100
          });

          marker.addListener('click', () => {
            const info = new g.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif; padding: 6px; font-size: 13px;">
                  <b style="font-size: 15px; color: ${sampler.color};">📍 ${sampler.name}</b><br/>
                  <span style="color: #475569;">📍 Current: <b>${sampler.currentLocation.name}</b></span><br/>
                  <span style="color: #64748b; font-size: 11px;">🏠 Home Base: ${sampler.homeBase.name}</span>
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
            scale: isTarget ? 24 : 20,
            fillColor: sampler.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isTarget ? 4 : 3
          });
          marker.setLabel({
            text: sampler.name,
            color: '#ffffff',
            fontWeight: '900',
            fontSize: '12px'
          });
          marker.setZIndex(isTarget ? 160 : 100);
        }
      });

      // Plot valid assigned ponds (if any)
      requests.forEach((req) => {
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
            title: `${req.locationName} - Assigned to ${assignedSampler?.name || 'Sampler'}`,
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: pinColor,
              fillOpacity: 1,
              scale: 1.5,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              anchor: new g.maps.Point(12, 22)
            },
            zIndex: 60
          });

          marker.addListener('click', () => {
            const info = new g.maps.InfoWindow({
              content: `
                <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
                  <b style="color: ${pinColor}; font-size: 13px;">${req.locationName}</b><br/>
                  ${req.farmerCode ? `<span style="font-size: 11px; color: #475569;">Farmer: <b>${req.farmerCode}</b></span><br/>` : ''}
                  ${req.countTons ? `<span style="font-size: 11px; color: #475569;">Count: <b>${req.countTons}</b></span><br/>` : ''}
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
            title: 'Drop/Drag Pond Location',
            animation: g.maps.Animation.DROP,
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#ef4444', // Prominent Red Target Marker
              fillOpacity: 1,
              scale: 2.2,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              anchor: new g.maps.Point(12, 22)
            },
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
        }
      } else if (googlePendingMarkerRef.current) {
        googlePendingMarkerRef.current.setMap(null);
        googlePendingMarkerRef.current = null;
      }
    } else if (engine === 'leaflet' && (leafletMapRef.current || mapInstance)) {
      const lMap = leafletMapRef.current || mapInstance;

      // Leaflet sampler markers with bold visible badges
      samplers.forEach((sampler) => {
        let lMarker = leafletSamplerMarkersRef.current[sampler.id];
        const isTarget = targetSamplerId === sampler.id;

        const icon = L.divIcon({
          html: `<div style="background-color: ${sampler.color}; color: white; padding: 4px 10px; border-radius: 20px; font-weight: 900; font-size: 12px; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; ${isTarget ? 'transform: scale(1.15); ring: 3px solid #60a5fa;' : ''}">${sampler.name}</div>`,
          className: 'sampler-badge-marker',
          iconSize: [70, 26],
          iconAnchor: [35, 13]
        });

        if (!lMarker) {
          lMarker = L.marker([sampler.currentLocation.coords.lat, sampler.currentLocation.coords.lng], { icon }).addTo(lMap);
          leafletSamplerMarkersRef.current[sampler.id] = lMarker;
        } else {
          lMarker.setLatLng([sampler.currentLocation.coords.lat, sampler.currentLocation.coords.lng]);
          lMarker.setIcon(icon);
        }
      });
    }
  }, [mapInstance, engine, samplers, requests, pendingCoords, targetSamplerId, onMapClick]);

  // ROUTE LINES: Draw route between target sampler and pending pond
  useEffect(() => {
    if (engine === 'google' && googleMapRef.current && (window as any).google) {
      const g = (window as any).google;
      const map = googleMapRef.current;

      if (targetSamplerId && pendingCoords && pendingCoords.lat) {
        const sampler = samplers.find((s) => s.id === targetSamplerId);
        if (sampler) {
          const path = [sampler.currentLocation.coords, pendingCoords];

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
      <div ref={mapContainerRef} className="w-full h-full" style={{ touchAction: 'pan-x pan-y' }} />

      {/* Top Right Controls: Satellite toggle / Center on Bhimavaram */}
      <div className="absolute top-14 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-700/80 text-white text-xs">
        {/* Satellite / Hybrid toggle */}
        <button
          type="button"
          onClick={() => {
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
