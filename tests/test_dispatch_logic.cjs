/**
 * NSP Labs Sample Assigner — logic tests
 *
 * These run against the REAL src/*.ts modules (transpiled on the fly by
 * ./ts-require.cjs) rather than copy-pasted implementations, so a regression in
 * the app's parsing, distance or dispatch code actually fails the suite.
 *
 * Run: node tests/test_dispatch_logic.cjs
 */
const assert = require('assert');

const { geoUtils, messageParser, dispatchFormatter } = require('./ts-require.cjs');

const {
  REGIONAL_AQUACULTURE_HUBS,
  calculateHaversineDistanceKm,
  estimateDrivingTimeMinutes,
  findKnownHubCoordinates,
  getVillageSuggestions,
  parseNumericTonnage,
  parseLocationFromGoogleMapsString
} = geoUtils;

const { parseCompanyMessage, parseMultipleCompanyMessages } = messageParser;
const { formatWhatsAppDispatchMessage } = dispatchFormatter;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}\n     ${err.message}`);
    process.exitCode = 1;
  }
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
test('Bhimavaram is nearer to Kuppanapudi than Narasapuram', () => {
  assert(distBhimavaramToKuppanapudi < distNarasapuramToKuppanapudi);
});
test('Driving estimate is at least 5 minutes and scales with distance', () => {
  const t = estimateDrivingTimeMinutes(10);
  assert(t >= 5, `expected >= 5, got ${t}`);
  assert(estimateDrivingTimeMinutes(100) > t);
});

console.log('--- TEST 2: Dynamic Location Movement ---');
// Ramesh starts at Bhimavaram, Suresh at Narasapuram, Naidu at Palakol
let rameshLoc = { ...REGIONAL_AQUACULTURE_HUBS['bhimavaram'] };
const sureshLoc = { ...REGIONAL_AQUACULTURE_HUBS['narasapuram'] };
const naiduLoc = { ...REGIONAL_AQUACULTURE_HUBS['palakol'] };

// Sample 1 at Kuppanapudi is assigned to Ramesh -> his location moves there
rameshLoc = { ...REGIONAL_AQUACULTURE_HUBS['kuppanapudi'] };
console.log(`Ramesh assigned to Kuppanapudi. New position: ${rameshLoc.lat}, ${rameshLoc.lng}`);

const rameshToVempa = calculateHaversineDistanceKm(rameshLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);
const sureshToVempa = calculateHaversineDistanceKm(sureshLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);
const naiduToVempa = calculateHaversineDistanceKm(naiduLoc, REGIONAL_AQUACULTURE_HUBS['vempa']);
console.log(`Ramesh: ${rameshToVempa} km | Suresh: ${sureshToVempa} km | Naidu: ${naiduToVempa} km`);

test('Ramesh at Kuppanapudi is nearest to Vempa', () => {
  assert(rameshToVempa < sureshToVempa, 'Ramesh must be closer than Suresh');
  assert(rameshToVempa < naiduToVempa, 'Ramesh must be closer than Naidu');
});

console.log('--- TEST 3: WhatsApp Dispatch Format ---');
function buildSample(overrides = {}) {
  return {
    id: 'req-1',
    harvestDate: '26/10/26',
    farmerCode: 'Gnr',
    countTons: '90c-2tons',
    rateSpecs: '255+',
    locationName: 'Kuppanapudi',
    subLocation: 'konalapalli',
    coords: { lat: 16.5144, lng: 81.4286 },
    ownerPhone: '+919014747367',
    altContactName: 'Madhu',
    altContactPhone: '9032259499',
    company: 'Sigma sea foods',
    status: 'assigned',
    createdAt: '2026-10-26T00:00:00.000Z',
    ...overrides
  };
}

test('Dispatch message matches the expected format exactly for full message', () => {
  const expected =
    '@Ramesh\n*Sigma sea foods*\nGnr\n90c-2tons\n255+\nKuppanapudi,(konalapalli)\n+919014747367\nMadhu 9032259499';
  assert.strictEqual(formatWhatsAppDispatchMessage(buildSample(), 'Ramesh'), expected);
});

test('Dispatch message for location-only input has ZERO fake defaults', () => {
  const locOnlySample = buildSample({
    harvestDate: '',
    farmerCode: '',
    countTons: '',
    rateSpecs: '',
    locationName: 'Vempa',
    subLocation: '',
    ownerPhone: '',
    altContactName: '',
    altContactPhone: '',
    company: ''
  });
  const text = formatWhatsAppDispatchMessage(locOnlySample, 'Ramesh');
  assert.strictEqual(text, '@Ramesh\nVempa');
});

test('Dispatch message for Google Maps link input has ZERO fake defaults', () => {
  const mapsSample = buildSample({
    harvestDate: '',
    farmerCode: '',
    countTons: '',
    rateSpecs: '',
    locationName: 'Vempa (Pond Location)',
    subLocation: '',
    ownerPhone: '',
    altContactName: '',
    altContactPhone: '',
    company: '',
    googleMapsUrl: 'https://maps.google.com/?q=16.4950,81.5650'
  });
  const text = formatWhatsAppDispatchMessage(mapsSample, 'Ramesh');
  assert.strictEqual(text, '@Ramesh\nVempa (Pond Location)\nhttps://maps.google.com/?q=16.4950,81.5650');
});

test('Dispatch message drops the legacy "General"/"Standard" placeholders if ever present', () => {
  const text = formatWhatsAppDispatchMessage(
    buildSample({ farmerCode: 'General', countTons: 'Standard', rateSpecs: '', altContactName: undefined, altContactPhone: undefined }),
    'Suresh'
  );
  assert.strictEqual(text, '@Suresh\n*Sigma sea foods*\nKuppanapudi,(konalapalli)\n+919014747367');
});

test('Dispatch message appends a Maps link when requested', () => {
  const text = formatWhatsAppDispatchMessage(buildSample({ googleMapsUrl: '' }), 'Naidu', true);
  assert(text.includes('https://www.google.com/maps?q=16.5144,81.4286'));
});

test('Dispatch message has no sub-location parentheses when none given', () => {
  const text = formatWhatsAppDispatchMessage(buildSample({ subLocation: undefined }), 'Ramesh');
  assert(text.includes('\nKuppanapudi\n'), 'location should be a bare line');
  assert(!text.includes('('), 'no parentheses expected');
});

console.log('--- TEST 4: Message Parser (real src/utils/messageParser.ts) ---');
const README_MESSAGE = 'Harvest date 26/10/26\nGnr\n90c-2tons\n255+\nKuppanapudi\n+919014747367';

test('Parses the README example message', () => {
  const p = parseCompanyMessage(README_MESSAGE);
  assert.strictEqual(p.harvestDate, '26/10/26');
  assert.strictEqual(p.farmerCode, 'Gnr');
  assert.strictEqual(p.countTons, '90c-2tons');
  assert.strictEqual(p.rateSpecs, '255+');
  assert.strictEqual(p.locationName, 'Kuppanapudi');
  assert.strictEqual(p.ownerPhone, '+919014747367');
  assert.strictEqual(p.tonnageNumber, 2);
});

test('Resolves known hub coordinates without any network call', () => {
  const p = parseCompanyMessage(README_MESSAGE);
  assert.deepStrictEqual(p.coords, REGIONAL_AQUACULTURE_HUBS['kuppanapudi']);
});

test('Extracts a sub-location in parentheses', () => {
  const p = parseCompanyMessage('Harvest date 26/10/26\nGnr\n90c-2tons\nKuppanapudi,(konalapalli)\n+919014747367');
  assert.strictEqual(p.locationName, 'Kuppanapudi');
  assert.strictEqual(p.subLocation, 'konalapalli');
});

test('Leaves harvest date blank when missing from input', () => {
  const p = parseCompanyMessage('Gnr\n90c-2tons\nVempa\n9703051223');
  assert.strictEqual(p.harvestDate, '', 'harvest date must be blank when not provided');
});

test('Never returns a location-less sample (falls back to Bhimavaram)', () => {
  const p = parseCompanyMessage('Gnr\n90c-2tons\n9703051223');
  assert(p.coords && p.coords.lat, 'coords must always be present for the map');
});

test('Splits a 5-message bulk blast into 5 samples', () => {
  const bulk = [
    'Harvest date 26/10/26\nGnr\n90c-2tons\n255+\nNarasapuram\n+919014747367',
    'Harvest date 26/10/26\nGnr\n80c-6tons\n290+\nMogalthuru\n9703051223',
    'Harvest date 26/10/26\nGnr\n70c-3tons\n270+\nVempa\n9848011223',
    'Harvest date 26/10/26\nGnr\n100c-4tons\n240+\nBhimavaram\n9440123456',
    'Harvest date 26/10/26\nGnr\n85c-5tons\n285+\nUndi\n9988776655'
  ].join('\n\n');
  const items = parseMultipleCompanyMessages(bulk);
  assert.strictEqual(items.length, 5, `expected 5, got ${items.length}`);
  assert.deepStrictEqual(
    items.map((i) => i.locationName),
    ['Narasapuram', 'Mogalthuru', 'Vempa', 'Bhimavaram', 'Undi']
  );
});

console.log('--- TEST 5: Geo helpers ---');
test('parseNumericTonnage handles every company phrasing', () => {
  assert.strictEqual(parseNumericTonnage('90c-2tons'), 2);
  assert.strictEqual(parseNumericTonnage('80c - 6.5 tons'), 6.5);
  assert.strictEqual(parseNumericTonnage('100c-3tons'), 3);
  assert.strictEqual(parseNumericTonnage('no tonnage here'), 0);
  assert.strictEqual(parseNumericTonnage(''), 0);
});

test('findKnownHubCoordinates is case/spacing insensitive', () => {
  assert.deepStrictEqual(findKnownHubCoordinates('  KUPPANAPUDI '), REGIONAL_AQUACULTURE_HUBS['kuppanapudi']);
  assert.deepStrictEqual(findKnownHubCoordinates('Vempa'), REGIONAL_AQUACULTURE_HUBS['vempa']);
  assert.strictEqual(findKnownHubCoordinates('Atlantis'), null);
});

test('Village autocomplete prioritises prefix matches', () => {
  const s = getVillageSuggestions('nar');
  assert(s[0] === 'Narasapuram', `expected Narasapuram first, got ${s[0]}`);
  assert(s.length <= 5);
});

test('Village autocomplete stays quiet for pasted messages and links', () => {
  assert.deepStrictEqual(getVillageSuggestions('Harvest date 26/10/26\nGnr'), []);
  assert.deepStrictEqual(getVillageSuggestions('https://maps.app.goo.gl/xyz'), []);
  assert.deepStrictEqual(getVillageSuggestions(''), []);
});

test('Google Maps link parsing extracts coordinates and resolves nearest hub name', () => {
  const raw = parseLocationFromGoogleMapsString('16.5144, 81.4286');
  assert.deepStrictEqual(raw.coords, { lat: 16.5144, lng: 81.4286 });

  const q = parseLocationFromGoogleMapsString('https://www.google.com/maps?q=16.5144,81.4286');
  assert.deepStrictEqual(q.coords, { lat: 16.5144, lng: 81.4286 });

  const at = parseLocationFromGoogleMapsString('https://www.google.com/maps/@16.5144,81.4286,17z');
  assert.deepStrictEqual(at.coords, { lat: 16.5144, lng: 81.4286 });

  const short = parseLocationFromGoogleMapsString('https://maps.app.goo.gl/abc123');
  assert.strictEqual(short.coords, undefined, 'short links carry no coords directly');
  assert.strictEqual(short.rawUrl, 'https://maps.app.goo.gl/abc123');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' (with failures)' : ''}`);
