import type { Coordinates } from '../types';

/**
 * Comprehensive regional coordinates dictionary for aquaculture and prawn harvesting hubs
 * in West Godavari, Krishna, and Konaseema districts of Andhra Pradesh.
 * Provides instant offline lookups and fallback for rapid dispatch.
 */
export const REGIONAL_AQUACULTURE_HUBS: Record<string, Coordinates> = {
  // Major towns & mandal headquarters
  'bhimavaram': { lat: 16.5449, lng: 81.5212 },
  'narasapuram': { lat: 16.4410, lng: 81.7011 },
  'narasapur': { lat: 16.4410, lng: 81.7011 },
  'palakol': { lat: 16.5167, lng: 81.7333 },
  'palakollu': { lat: 16.5167, lng: 81.7333 },
  'tanuku': { lat: 16.7570, lng: 81.6820 },
  'akividu': { lat: 16.6022, lng: 81.3800 },
  
  // High-density prawn harvesting villages mentioned by user
  'mogalthuru': { lat: 16.4178, lng: 81.5947 },
  'mogaluru': { lat: 16.4178, lng: 81.5947 },
  'mobiletour': { lat: 16.4178, lng: 81.5947 },
  'vempa': { lat: 16.4950, lng: 81.5650 },
  'undi': { lat: 16.5919, lng: 81.4644 },
  'kalla': { lat: 16.5408, lng: 81.4425 },
  'kuppanapudi': { lat: 16.5144, lng: 81.4286 },
  'konalapalli': { lat: 16.5200, lng: 81.4350 },
  'sesali': { lat: 16.5450, lng: 81.4550 },
  
  // Rural aquaculture farming belts
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
  'juvvalapalem': { lat: 16.5220, lng: 81.4720 },
  'biyyaputhippa': { lat: 16.4020, lng: 81.6420 },
  'perupalem': { lat: 16.4050, lng: 81.6780 },
  'kaza': { lat: 16.4780, lng: 81.6850 },
  'matsyapuri': { lat: 16.5050, lng: 81.6120 },
  'rustumbada': { lat: 16.4380, lng: 81.6910 },
  'lakshmaneswaram': { lat: 16.4350, lng: 81.6820 },
  'doddipatla': { lat: 16.5020, lng: 81.7820 },
  'chinchinada': { lat: 16.4850, lng: 81.8010 },
  'achanta': { lat: 16.5980, lng: 81.7950 },
  'poduru': { lat: 16.6120, lng: 81.7420 },
  'penugonda': { lat: 16.6540, lng: 81.7650 },
  'sidhantham': { lat: 16.6850, lng: 81.7920 },
  'komarada': { lat: 16.5410, lng: 81.5050 },
  'srungavruksham': { lat: 16.5380, lng: 81.5950 },
  'gummaluru': { lat: 16.5520, lng: 81.6110 },
  'lankalakoderu': { lat: 16.5280, lng: 81.7050 },
  'goraganamudi': { lat: 16.5420, lng: 81.7220 },
  'jakkaram': { lat: 16.5510, lng: 81.4880 },
  'vissakoderu': { lat: 16.5720, lng: 81.5310 },
  'rayalam': { lat: 16.5310, lng: 81.5050 },
  'someswaram': { lat: 16.5510, lng: 81.5390 },
  'bondada': { lat: 16.5180, lng: 81.4620 },
  'chinamiram': { lat: 16.5320, lng: 81.5350 },
  'pedamiram': { lat: 16.5250, lng: 81.5420 },
  'losarigutlapadu': { lat: 16.4950, lng: 81.4820 },
  'panduvva': { lat: 16.5820, lng: 81.4920 },
  'cherukuvada': { lat: 16.5750, lng: 81.4780 },
  'kolamuru': { lat: 16.6120, lng: 81.4850 },
  'chilukuru': { lat: 16.6210, lng: 81.4920 },
  'unudurru': { lat: 16.5880, lng: 81.4320 },
  'vandram': { lat: 16.5680, lng: 81.4650 },
  'garagaparru': { lat: 16.5520, lng: 81.4720 },
  'palakoderu': { lat: 16.5880, lng: 81.5350 }
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

const CANONICAL_VILLAGES = [
  'Bhimavaram',
  'Narasapuram',
  'Palakol',
  'Mogalthuru',
  'Vempa',
  'Undi',
  'Kalla',
  'Kuppanapudi',
  'Sesali',
  'Akividu',
  'Tanuku',
  'Veeravasaram',
  'Penumantra',
  'Pippara',
  'Attili',
  'Maruteru',
  'Peravali',
  'Gollalakoderu',
  'Yenamadurru',
  'Dindi',
  'Elurupadu',
  'Chinakapavaram',
  'Pedakapavaram',
  'Juvvalapalem',
  'Biyyaputhippa',
  'Perupalem',
  'Kaza',
  'Matsyapuri',
  'Achanta',
  'Poduru',
  'Penugonda',
  'Chinchinada'
];

/**
 * Autocomplete suggestions for villages - prioritizes exact prefix matches
 */
export function getVillageSuggestions(query: string, maxResults = 5): string[] {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();

  // If query is a multi-line message or link, do not show single-word village suggestions
  if (q.includes('\n') || q.includes('http') || q.includes('maps.google')) {
    return [];
  }

  // 1. First priority: starts with query
  const startsWith = CANONICAL_VILLAGES.filter((v) => v.toLowerCase().startsWith(q));
  if (startsWith.length >= maxResults) {
    return startsWith.slice(0, maxResults);
  }

  // 2. Second priority: contains query
  const contains = CANONICAL_VILLAGES.filter(
    (v) => !v.toLowerCase().startsWith(q) && v.toLowerCase().includes(q)
  );

  return [...startsWith, ...contains].slice(0, maxResults);
}

/**
 * Extracts numeric tonnage from strings like "90c-2tons", "80c - 6.5 tons", "3 tons"
 */
export function parseNumericTonnage(countTonsString: string): number {
  if (!countTonsString) return 0;
  const match = countTonsString.match(/(\d+(?:\.\d+)?)\s*(?:tons?|ton|t)\b/i);
  if (match) {
    return parseFloat(match[1]);
  }
  // Try extracting any number after hyphen or count
  const hyphenMatch = countTonsString.match(/[-–]\s*(\d+(?:\.\d+)?)/);
  if (hyphenMatch) {
    return parseFloat(hyphenMatch[1]);
  }
  return 0;
}

/**
 * Finds the nearest known regional aquaculture hub to a set of coordinates.
 * Returns the capitalized village name if within maxKm.
 */
export function findNearestKnownHubName(coords: Coordinates, maxKm = 8): string | null {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return null;

  let closestName: string | null = null;
  let minDistance = Infinity;

  for (const [hubKey, hubCoords] of Object.entries(REGIONAL_AQUACULTURE_HUBS)) {
    const d = calculateHaversineDistanceKm(coords, hubCoords);
    if (d < minDistance) {
      minDistance = d;
      closestName = hubKey.charAt(0).toUpperCase() + hubKey.slice(1);
    }
  }

  if (minDistance <= maxKm && closestName) {
    return closestName;
  }
  return null;
}

/**
 * Parses Google Maps URL, coordinate strings (decimal or DMS), or shared location messages
 */
export function parseLocationFromGoogleMapsString(input: string): {
  coords?: Coordinates;
  rawUrl?: string;
  placeName?: string;
} {
  if (!input) return {};
  const trimmed = input.trim();

  // 1. DMS Coordinates (e.g. 16°29'42.0"N 81°33'54.0"E or 16°30'51.8"N, 81°25'43.0"E)
  const dmsMatch = trimmed.match(
    /(\d{1,2})[°\s]+(\d{1,2})['\s]+([\d\.]+)"?\s*([NSns])\s*[,;\s]\s*(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d\.]+)"?\s*([EWew])/
  );
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4].toUpperCase();

    const lngDeg = parseFloat(dmsMatch[5]);
    const lngMin = parseFloat(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngDir = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;

    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (lngDir === 'W') lng = -lng;

    const coords = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
    const nearHub = findNearestKnownHubName(coords);
    return {
      coords,
      placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${coords.lat}, ${coords.lng})`
    };
  }

  // 2. Decimal coordinates with comma or whitespace: 16.4950, 81.5650 or 16.4950 81.5650
  const decimalMatch = trimmed.match(/([-+]?\d{1,2}\.\d{3,})\s*[,;\s]\s*([-+]?\d{1,3}\.\d{3,})/);
  if (decimalMatch && !trimmed.startsWith('http')) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const coords = { lat, lng };
      const nearHub = findNearestKnownHubName(coords);
      return {
        coords,
        placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${lat}, ${lng})`
      };
    }
  }

  // 3. Check for URL
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const url = urlMatch[0];

    // a) ?q=lat,lng or ?query=lat,lng or &ll=lat,lng or &daddr=lat,lng or &destination=lat,lng
    const queryCoords = url.match(/[?&](?:q|query|daddr|saddr|ll|destination|loc)=([-+]?\d{1,2}\.\d+)[,\s\+]([-+]?\d{1,3}\.\d+)/i);
    if (queryCoords) {
      const coords = { lat: parseFloat(queryCoords[1]), lng: parseFloat(queryCoords[2]) };
      const nearHub = findNearestKnownHubName(coords);
      return {
        rawUrl: url,
        coords,
        placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${coords.lat}, ${coords.lng})`
      };
    }

    // b) /place/lat,lng
    const placeCoords = url.match(/\/place\/([-+]?\d{1,2}\.\d+)[,\s\+]([-+]?\d{1,3}\.\d+)/i);
    if (placeCoords) {
      const coords = { lat: parseFloat(placeCoords[1]), lng: parseFloat(placeCoords[2]) };
      const nearHub = findNearestKnownHubName(coords);
      return {
        rawUrl: url,
        coords,
        placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${coords.lat}, ${coords.lng})`
      };
    }

    // c) /@lat,lng
    const atCoords = url.match(/@([-+]?\d{1,2}\.\d+)[,\s\+]([-+]?\d{1,3}\.\d+)/i);
    if (atCoords) {
      const coords = { lat: parseFloat(atCoords[1]), lng: parseFloat(atCoords[2]) };
      const nearHub = findNearestKnownHubName(coords);
      return {
        rawUrl: url,
        coords,
        placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${coords.lat}, ${coords.lng})`
      };
    }

    // d) Check if URL has a place name, e.g. /place/Vempa or ?q=Vempa
    const placeNameMatch = url.match(/\/place\/([a-zA-Z\s\+]+)(?:[\/\?]|$)/i) || url.match(/[?&]q=([a-zA-Z\s\+]+)(?:[&]|$)/i);
    let extractedPlace = '';
    if (placeNameMatch) {
      extractedPlace = decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' ')).trim();
    }

    // e) Check if message around URL contains a place name (e.g. "Dropped pin near Vempa, Andhra Pradesh")
    const nearMatch = trimmed.match(/(?:near|at|in|village)\s+([A-Za-z]+)/i) || trimmed.match(/pin\s+([A-Za-z]+)/i);
    if (nearMatch && !extractedPlace) {
      extractedPlace = nearMatch[1].trim();
    }

    if (extractedPlace) {
      const hubCoords = findKnownHubCoordinates(extractedPlace);
      return {
        rawUrl: url,
        placeName: extractedPlace,
        coords: hubCoords || undefined
      };
    }

    // f) If coordinates were in text outside the URL
    if (decimalMatch) {
      const coords = { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };
      const nearHub = findNearestKnownHubName(coords);
      return {
        rawUrl: url,
        coords,
        placeName: nearHub ? `${nearHub} (Pond Location)` : `Pond Location (${coords.lat}, ${coords.lng})`
      };
    }

    return { rawUrl: url, placeName: 'Google Maps Location' };
  }

  return {};
}
