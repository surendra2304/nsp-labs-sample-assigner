const assert = require('assert');

// 1. Regional Hubs
const REGIONAL_AQUACULTURE_HUBS = {
  'bhimavaram': { lat: 16.5449, lng: 81.5212 },
  'narasapuram': { lat: 16.4410, lng: 81.7011 },
  'palakol': { lat: 16.5167, lng: 81.7333 },
  'mogalthuru': { lat: 16.4178, lng: 81.5947 },
  'vempa': { lat: 16.4950, lng: 81.5650 },
  'undi': { lat: 16.5919, lng: 81.4644 },
  'kalla': { lat: 16.5408, lng: 81.4425 },
  'kuppanapudi': { lat: 16.5144, lng: 81.4286 }
};

function calculateHaversineDistanceKm(p1, p2) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.25).toFixed(1));
}

console.log('--- TEST 1: Distance Checks ---');
const distBhimavaramToKuppanapudi = calculateHaversineDistanceKm(
  REGIONAL_AQUACULTURE_HUBS['bhimavaram'],
  REGIONAL_AQUACULTURE_HUBS['kuppanapudi']
);
const distNarasapuramToKuppanapudi = calculateHaversineDistanceKm(
  REGIONAL_AQUACULTURE_HUBS['narasapuram'],
  REGIONAL_AQUACULTURE_HUBS['kuppanapudi']
);
console.log(`Bhimavaram to Kuppanapudi: ${distBhimavaramToKuppanapudi} km`);
console.log(`Narasapuram to Kuppanapudi: ${distNarasapuramToKuppanapudi} km`);
assert(distBhimavaramToKuppanapudi < distNarasapuramToKuppanapudi, 'Bhimavaram should be nearer to Kuppanapudi than Narasapuram');

console.log('--- TEST 2: Dynamic Location Movement ---');
// Step A: Ramesh starts at Bhimavaram, Suresh at Narasapuram, Naidu at Palakol
let rameshLoc = { ...REGIONAL_AQUACULTURE_HUBS['bhimavaram'] };
let sureshLoc = { ...REGIONAL_AQUACULTURE_HUBS['narasapuram'] };
let naiduLoc = { ...REGIONAL_AQUACULTURE_HUBS['palakol'] };

// Step B: Sample 1 at Kuppanapudi is assigned to Ramesh
// Ramesh's location moves to Kuppanapudi!
rameshLoc = { ...REGIONAL_AQUACULTURE_HUBS['kuppanapudi'] };
console.log(`Ramesh assigned to Kuppanapudi. New position: ${rameshLoc.lat}, ${rameshLoc.lng}`);

// Step C: Sample 2 at Vempa comes in! Who is closer?
const rameshToVempa = calculateHaversineDistanceKm(rameshLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);
const sureshToVempa = calculateHaversineDistanceKm(sureshLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);
const naiduToVempa = calculateHaversineDistanceKm(naiduLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);

console.log(`Ramesh (from Kuppanapudi) to Vempa: ${rameshToVempa} km`);
console.log(`Suresh (from Narasapuram) to Vempa: ${sureshToVempa} km`);
console.log(`Naidu (from Palakol) to Vempa: ${naiduToVempa} km`);

assert(rameshToVempa < sureshToVempa, 'Ramesh at Kuppanapudi must be closer to Vempa than Suresh at Narasapuram');
assert(rameshToVempa < naiduToVempa, 'Ramesh at Kuppanapudi must be closer to Vempa than Naidu at Palakol');
console.log('✅ Dynamic location movement test passed 100%!');

console.log('--- TEST 3: WhatsApp Dispatch Format ---');
function formatWhatsAppDispatchMessage(sample, samplerName) {
  const lines = [];
  lines.push(`@${samplerName.trim()}`);
  if (sample.company && sample.company.trim()) {
    lines.push(`*${sample.company.trim()}*`);
  }
  if (sample.farmerCode && sample.farmerCode.trim() && sample.farmerCode.toLowerCase() !== 'general') {
    lines.push(sample.farmerCode.trim());
  }
  if (sample.countTons && sample.countTons.trim() && sample.countTons.toLowerCase() !== 'standard') {
    lines.push(sample.countTons.trim());
  }
  if (sample.subLocation && sample.subLocation.trim().length > 0) {
    lines.push(`${sample.locationName.trim()},(${sample.subLocation.trim()})`);
  } else if (sample.locationName && sample.locationName.trim()) {
    lines.push(sample.locationName.trim());
  }
  if (sample.ownerPhone && sample.ownerPhone.trim()) {
    lines.push(sample.ownerPhone.trim());
  }
  if (sample.altContactPhone || sample.altContactName) {
    const contactParts = [sample.altContactName?.trim(), sample.altContactPhone?.trim()].filter(Boolean);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(' '));
    }
  }
  if (sample.googleMapsUrl && sample.googleMapsUrl.trim()) {
    lines.push(sample.googleMapsUrl.trim());
  }
  return lines.join('\n');
}

// Case 1: Full Company message
const expectedOutput = `@Ramesh\n*Sigma sea foods*\nGnr\n90c-2tons\nKuppanapudi,(konalapalli)\n+919014747367\nMadhu 9032259499`;
const testSample = {
  company: 'Sigma sea foods',
  farmerCode: 'Gnr',
  countTons: '90c-2tons',
  locationName: 'Kuppanapudi',
  subLocation: 'konalapalli',
  ownerPhone: '+919014747367',
  altContactName: 'Madhu',
  altContactPhone: '9032259499'
};
const actualOutput = formatWhatsAppDispatchMessage(testSample, 'Ramesh');
assert.strictEqual(actualOutput, expectedOutput);
console.log('✅ Case 1: Full message format matches 100%!');

// Case 2: ONLY Location (NO fake 'General', 'Standard', 'Today', etc.)
const locOnlySample = {
  locationName: 'Vempa',
  farmerCode: '',
  countTons: '',
  company: '',
  ownerPhone: ''
};
const locOnlyOutput = formatWhatsAppDispatchMessage(locOnlySample, 'Ramesh');
assert.strictEqual(locOnlyOutput, '@Ramesh\nVempa');
console.log('✅ Case 2: Location-only message has ZERO fake data!');

// Case 3: Google Maps link pasted (NO fake 'General', 'Standard', etc.)
const mapsSample = {
  locationName: 'Vempa (Pond Location)',
  farmerCode: '',
  countTons: '',
  company: '',
  ownerPhone: '',
  googleMapsUrl: 'https://maps.google.com/?q=16.4950,81.5650'
};
const mapsOutput = formatWhatsAppDispatchMessage(mapsSample, 'Ramesh');
assert.strictEqual(mapsOutput, '@Ramesh\nVempa (Pond Location)\nhttps://maps.google.com/?q=16.4950,81.5650');
console.log('✅ Case 3: Maps link message has ZERO fake data!');
