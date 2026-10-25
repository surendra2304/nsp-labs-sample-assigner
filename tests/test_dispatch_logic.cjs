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

// Test Haversine
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

// Test 2: Mogalthuru vs Narasapuram vs Bhimavaram
const distNarasapuramToMogalthuru = calculateHaversineDistanceKm(
  REGIONAL_AQUACULTURE_HUBS['narasapuram'],
  REGIONAL_AQUACULTURE_HUBS['mogalthuru']
);
const distBhimavaramToMogalthuru = calculateHaversineDistanceKm(
  REGIONAL_AQUACULTURE_HUBS['bhimavaram'],
  REGIONAL_AQUACULTURE_HUBS['mogalthuru']
);
console.log(`Narasapuram to Mogalthuru: ${distNarasapuramToMogalthuru} km`);
console.log(`Bhimavaram to Mogalthuru: ${distBhimavaramToMogalthuru} km`);
assert(distNarasapuramToMogalthuru < distBhimavaramToMogalthuru, 'Narasapuram should be nearer to Mogalthuru than Bhimavaram');

console.log('✅ Distance logic passed successfully!');

// Test 3: Formatting WhatsApp Dispatch
function formatWhatsAppDispatchMessage(sample, samplerName) {
  const lines = [];
  lines.push(`@${samplerName.trim()}`);
  lines.push(`*${sample.company.trim()}*`);
  lines.push(sample.farmerCode.trim());
  lines.push(sample.countTons.trim());
  if (sample.subLocation) {
    lines.push(`${sample.locationName.trim()},(${sample.subLocation.trim()})`);
  } else {
    lines.push(sample.locationName.trim());
  }
  if (sample.ownerPhone) lines.push(sample.ownerPhone.trim());
  if (sample.altContactName || sample.altContactPhone) {
    lines.push(`${sample.altContactName || ''} ${sample.altContactPhone || ''}`.trim());
  }
  return lines.join('\n');
}

console.log('--- TEST 2: WhatsApp Dispatch Format ---');
const samplePayload = {
  company: 'Sigma sea foods',
  farmerCode: 'Gnr',
  countTons: '90c-2tons',
  locationName: 'Kuppanapudi',
  subLocation: 'konalapalli',
  ownerPhone: '+919014747367',
  altContactName: 'Madhu',
  altContactPhone: '9032259499'
};

const formatted = formatWhatsAppDispatchMessage(samplePayload, 'Ramesh');
console.log('Generated Output:\n' + formatted);

const expected = `@Ramesh
*Sigma sea foods*
Gnr
90c-2tons
Kuppanapudi,(konalapalli)
+919014747367
Madhu 9032259499`;

assert.strictEqual(formatted, expected, 'Formatted message must match exact user specification');
console.log('✅ WhatsApp message format matches 100%!');
