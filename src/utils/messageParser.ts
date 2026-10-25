import type { Coordinates } from '../types';
import { findKnownHubCoordinates, parseLocationFromGoogleMapsString, parseNumericTonnage } from './geoUtils';

export interface ParsedCompanyMessage {
  harvestDate: string;
  farmerCode: string;
  countTons: string;
  tonnageNumber: number;
  rateSpecs: string;
  locationName: string;
  subLocation?: string;
  ownerPhone: string;
  googleMapsUrl?: string;
  coords?: Coordinates;
  rawMessage: string;
}

/**
 * Parses an incoming single raw message from a harvesting company.
 */
export function parseCompanyMessage(rawText: string, defaultCompany = 'Sigma sea foods'): ParsedCompanyMessage {
  const text = rawText.trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let harvestDate = '';
  let farmerCode = '';
  let countTons = '';
  let rateSpecs = '';
  let locationName = '';
  let subLocation = '';
  let ownerPhone = '';
  let googleMapsUrl = '';
  let coords: Coordinates | undefined;

  // 1. Check for Google Maps URL in text
  const urlCheck = parseLocationFromGoogleMapsString(text);
  if (urlCheck.rawUrl) {
    googleMapsUrl = urlCheck.rawUrl;
    if (urlCheck.coords) {
      coords = urlCheck.coords;
    }
  }

  // 2. Line by line and regex extraction
  const remainingLines: string[] = [];

  for (const line of lines) {
    // Check for Harvest date
    const dateMatch = line.match(/(?:harvest\s*date|date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dateMatch && !harvestDate) {
      harvestDate = dateMatch[1];
      continue;
    }

    // Check for phone number (Indian mobile: 10 digits starting with 6,7,8,9, optional +91/91)
    const phoneMatch = line.match(/(?:\+?91[\s-]?)?([6-9]\d{9})/);
    if (phoneMatch && !ownerPhone) {
      ownerPhone = phoneMatch[0].trim();
      continue;
    }

    // Check for Count - Tonnage (e.g. 90c-2tons, 80c - 6 ton, 100 count 3 tons)
    const countMatch = line.match(/\b\d+\s*c(?:ount)?\s*[-–:]\s*\d+(?:\.\d+)?\s*(?:tons?|t)?\b/i);
    if (countMatch && !countTons) {
      countTons = line;
      continue;
    }

    // Check for Rate / Specs (e.g. 255+, 290+, Rs 280)
    const rateMatch = line.match(/^\d{2,4}\+?$/);
    if (rateMatch && !rateSpecs) {
      rateSpecs = line;
      continue;
    }

    // Line didn't match standard patterns yet
    remainingLines.push(line);
  }

  // From remaining lines, infer farmerCode and locationName
  for (let i = 0; i < remainingLines.length; i++) {
    const line = remainingLines[i];

    // Check if line contains sub-location in parentheses e.g. "Kuppanapudi,(konalapalli)"
    const subMatch = line.match(/^([^,(]+)[,\s]*\(([^)]+)\)/);
    if (subMatch && !locationName) {
      locationName = subMatch[1].trim();
      subLocation = subMatch[2].trim();
      continue;
    }

    // Check if line matches a known aquaculture hub
    const hubCoords = findKnownHubCoordinates(line);
    if (hubCoords && !locationName) {
      locationName = line;
      if (!coords) coords = hubCoords;
      continue;
    }

    // If farmer code not assigned yet, usually it's short like "Gnr", "MSR", "A1", or a name
    if (!farmerCode && line.length <= 15 && !line.includes('http')) {
      farmerCode = line;
      continue;
    }

    // If location name not assigned yet
    if (!locationName && !line.includes('http')) {
      locationName = line;
      continue;
    }
  }

  // Fallback: if today's date not found, default to today
  if (!harvestDate) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    harvestDate = `${dd}/${mm}/${yy}`;
  }

  // Lookup coords for location if still missing
  if (!coords && locationName) {
    const foundCoords = findKnownHubCoordinates(locationName);
    if (foundCoords) {
      coords = foundCoords;
    }
  }

  // Default coordinate if completely unknown (center of Bhimavaram delta)
  if (!coords) {
    coords = { lat: 16.5449, lng: 81.5212 };
  }

  const tonnageNumber = parseNumericTonnage(countTons);

  return {
    harvestDate,
    farmerCode: farmerCode || 'General',
    countTons: countTons || 'Standard',
    tonnageNumber,
    rateSpecs: rateSpecs || '-',
    locationName: locationName || 'Unknown Location',
    subLocation,
    ownerPhone,
    googleMapsUrl,
    coords,
    rawMessage: text
  };
}

/**
 * Splits and parses multiple harvest messages pasted together.
 * Commonly companies send 3-6 harvest requests in one WhatsApp blast.
 */
export function parseMultipleCompanyMessages(bulkText: string, defaultCompany = 'Sigma sea foods'): ParsedCompanyMessage[] {
  const normalized = bulkText.replace(/\r\n/g, '\n');
  
  // Split on "Harvest date" if present multiple times
  const chunks = normalized.split(/(?=Harvest\s*date|\bDate:)/i).filter((chunk) => chunk.trim().length > 0);

  if (chunks.length > 1) {
    return chunks.map((chunk) => parseCompanyMessage(chunk, defaultCompany));
  }

  // Otherwise check if separated by multiple newlines
  const doubleNewlineChunks = normalized.split(/\n\s*\n\s*\n/).filter((chunk) => chunk.trim().length > 0);
  if (doubleNewlineChunks.length > 1) {
    return doubleNewlineChunks.map((chunk) => parseCompanyMessage(chunk, defaultCompany));
  }

  // Single message
  return [parseCompanyMessage(bulkText, defaultCompany)];
}
