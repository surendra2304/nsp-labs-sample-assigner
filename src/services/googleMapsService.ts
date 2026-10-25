import type { Coordinates } from '../types';
import { calculateHaversineDistanceKm, estimateDrivingTimeMinutes, findKnownHubCoordinates } from '../utils/geoUtils';

let googleMapsPromise: Promise<any> | null = null;

/**
 * Initializes and loads the Google Maps JavaScript API with Places and Geometry libraries.
 */
export function loadGoogleMaps(apiKey: string): Promise<any> {
  const win = window as any;
  if (win.google && win.google.maps) {
    return Promise.resolve(win.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script already in document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (win.google && win.google.maps) {
        resolve(win.google);
      } else {
        existingScript.addEventListener('load', () => resolve(win.google));
        existingScript.addEventListener('error', (err) => reject(err));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey.trim()
    )}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(win.google);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Geocodes a place name (e.g. "Kuppanapudi", "Kalla, West Godavari") into Coordinates.
 * Falls back to regional dictionary if Google Maps is unavailable or returns no result.
 */
export async function geocodePlace(placeName: string, _apiKey?: string): Promise<Coordinates | null> {
  // First check regional hubs dictionary for instant local hit
  const localMatch = findKnownHubCoordinates(placeName);
  if (localMatch) {
    return localMatch;
  }

  // Attempt Google Geocoder if loaded
  const win = window as any;
  if (win.google && win.google.maps && win.google.maps.Geocoder) {
    try {
      const geocoder = new win.google.maps.Geocoder();
      const response = await new Promise<any>((resolve, reject) => {
        geocoder.geocode(
          {
            address: `${placeName}, West Godavari, Andhra Pradesh, India`,
            componentRestrictions: { country: 'IN' }
          },
          (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve({ results });
            } else {
              reject(status);
            }
          }
        );
      });

      const loc = response.results[0].geometry.location;
      return { lat: loc.lat(), lng: loc.lng() };
    } catch (err) {
      console.warn('Google geocoder lookup error, trying fallback:', err);
    }
  }

  return localMatch;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  durationText: string;
}

/**
 * Calculates road driving distance & duration using Google Maps Distance Matrix.
 * Gracefully falls back to regional road-factor formula if offline or quota exceeded.
 */
export async function calculateRoadDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<DistanceResult> {
  const win = window as any;
  if (win.google && win.google.maps && win.google.maps.DistanceMatrixService) {
    try {
      const service = new win.google.maps.DistanceMatrixService();
      const result = await new Promise<any>((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [{ lat: origin.lat, lng: origin.lng }],
            destinations: [{ lat: destination.lat, lng: destination.lng }],
            travelMode: win.google.maps.TravelMode.DRIVING,
            unitSystem: win.google.maps.UnitSystem.METRIC
          },
          (response: any, status: any) => {
            if (status === 'OK' && response && response.rows[0]?.elements[0]?.status === 'OK') {
              resolve(response);
            } else {
              reject(status);
            }
          }
        );
      });

      const element = result.rows[0].elements[0];
      const distanceKm = Number((element.distance.value / 1000).toFixed(1));
      const durationMinutes = Math.round(element.duration.value / 60);

      return {
        distanceKm,
        durationMinutes,
        durationText: element.duration.text
      };
    } catch (err) {
      console.warn('Distance Matrix failed, falling back to road-factor estimate', err);
    }
  }

  // Fallback road estimation
  const distanceKm = calculateHaversineDistanceKm(origin, destination);
  const durationMinutes = estimateDrivingTimeMinutes(distanceKm);
  return {
    distanceKm,
    durationMinutes,
    durationText: `${durationMinutes} mins`
  };
}
