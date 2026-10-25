import { Coordinates } from '../types';

/**
 * Pre-indexed regional coordinates for major aquaculture and prawn harvesting hubs
 * in West Godavari & Krishna districts of Andhra Pradesh.
 * Provides instant offline lookups and fallback for rapid dispatch.
 */
export const REGIONAL_AQUACULTURE_HUBS: Record<string, Coordinates> = {
  // Major towns
  'bhimavaram': { lat: 16.5449, lng: 81.5212 },
  'narasapuram': { lat: 16.4410, lng: 81.7011 },
  'narasapur': { lat: 16.4410, lng: 81.7011 },
  'palakol': { lat: 16.5167, lng: 81.7333 },
  'palakollu': { lat: 16.5167, lng: 81.7333 },
  'tanuku': { lat: 16.7570, lng: 81.6820 },
  'akividu': { lat: 16.6022, lng: 81.3800 },
  
  // Specific aquaculture villages mentioned in use cases
  'mogalthuru': { lat: 16.4178, lng: 81.5947 },
  'mogaluru': { lat: 16.4178, lng: 81.5947 },
  'mobiletour': { lat: 16.4178, lng: 81.5947 },
  'vempa': { lat: 16.4950, lng: 81.5650 },
  'undi': { lat: 16.5919, lng: 81.4644 },
  'kalla': { lat: 16.5408, lng: 81.4425 },
  'kuppanapudi': { lat: 16.5144, lng: 81.4286 },
  'konalapalli': { lat: 16.5200, lng: 81.4350 },
  'sesali': { lat: 16.5450, lng: 81.4550 },
  
  // Other prominent aquaculture mandals / villages
  'veeravasaram': { lat: 16.5110, lng: 81.6210 },
  'penumantra': { lat: 16.6340, lng: 81.6540 },
  'pippara': { lat: 16.6570, lng: 81.5670 },
  'attili': { lat: 16.6920, lng: 81.6010 },
  'maruteru': { lat: 16.6310, lng: 81.7450 },
  'peravali': { lat: 16.7450, lng: 81.7580 },
  'gollalakoderu': { lat: 16.5680, lng: 81.5540 },
  'yenamadurru': { lat: 16.5380, lng: 81.5690 },
  'dindi': { lat: 16.4250, lng: 81.8210 },
  'elurupadu': { lat: 16.5560, lng: 81.4110 },
  'kovvali': { lat: 16.7110, lng: 81.4200 },
  'chinakapavaram': { lat: 16.6110, lng: 81.4500 },
  'pedakapavaram': { lat: 16.6210, lng: 81.4600 },
  'juvvalapalem': { lat: 16.5220, lng: 81.4720 }
};

/**
 * Calculates straight-line distance in Kilometers between two coordinates (Haversine formula).
 */
export function calculateHaversineDistanceKm(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = R * c;
  // In rural aquaculture coastal delta canal roads, driving distance is typically ~1.25x straight line
  return Number((straightLine * 1.25).toFixed(1));
}

/**
 * Estimates driving time in minutes based on rural aquaculture road speed (~35 km/h).
 */
export function estimateDrivingTimeMinutes(distanceKm: number): number {
  const avgSpeedKmH = 35;
  return Math.max(5, Math.round((distanceKm / avgSpeedKmH) * 60));
}

/**
 * Normalizes text to lookup in regional coordinates hub dictionary
 */
export function findKnownHubCoordinates(name: string): Coordinates | null {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (REGIONAL_AQUACULTURE_HUBS[cleaned]) {
    return REGIONAL_AQUACULTURE_HUBS[cleaned];
  }

  // Check partial matches
  for (const [key, coords] of Object.entries(REGIONAL_AQUACULTURE_HUBS)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return coords;
    }
  }

  return null;
}

/**
 * Parses Google Maps URL or coordinate strings from WhatsApp messages
 * Supports:
 * - https://maps.app.goo.gl/...
 * - https://goo.gl/maps/...
 * - https://www.google.com/maps/place/...
 * - https://www.google.com/maps?q=16.544,81.521
 * - Raw "16.5449, 81.5212"
 */
export function parseLocationFromGoogleMapsString(input: string): { coords?: Coordinates; rawUrl?: string; placeName?: string } {
  if (!input) return {};
  
  // Check for raw lat,lng
  const rawCoordsMatch = input.match(/([-+]?\d{1,2}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/);
  if (rawCoordsMatch) {
    return {
      coords: {
        lat: parseFloat(rawCoordsMatch[1]),
        lng: parseFloat(rawCoordsMatch[2])
      }
    };
  }

  // Check for URL
  const urlMatch = input.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    const url = urlMatch[0];
    
    // Check if query contains coordinates: ?q=lat,lng or @lat,lng
    const queryCoords = url.match(/[?&]q=([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (queryCoords) {
      return {
        rawUrl: url,
        coords: {
          lat: parseFloat(queryCoords[1]),
          lng: parseFloat(queryCoords[2])
        }
      };
    }

    const atCoords = url.match(/@([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (atCoords) {
      return {
        rawUrl: url,
        coords: {
          lat: parseFloat(atCoords[1]),
          lng: parseFloat(atCoords[2])
        }
      };
    }

    return { rawUrl: url };
  }

  return {};
}
