import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(process.cwd(), 'data');
const file = join(dir, 'demo.json');
const SCHEMA_VERSION = 3;

// Official site lists produced by scripts/import-*.mjs. Records keep their source, festival year and review status.
const OFFICIAL_SOURCES = ['mcgm-ganeshotsav-2025.json'].map(name => JSON.parse(readFileSync(new URL(`./sources/${name}`, import.meta.url), 'utf8')));
// Fictional, bookable demo sites (Pune and Bengaluru) are shown by default and clearly labelled; DEMO_SITES=false hides them.
const includeDemo = () => process.env.DEMO_SITES !== 'false';

// Demo coordinates are synthetic: placed in real neighbourhoods so distance sorting can be shown,
// but they do not mark any real facility. Never present them as verified locations.
const demoCoordinates = (lat, lng) => ({ lat, lng, kind: 'synthetic', note: 'Demo location: not a real facility' });
const demoProvenance = { kind: 'demo', label: 'Fictional demo site', authority: null, sourceUrl: null, festivalYear: null, verifiedAt: null };
const sites=[
 { id: 'lakeview', name: 'Lakeview Artificial Pond', city: 'Pune', area: 'Kothrud, Pune', coordinates: demoCoordinates(18.5074, 73.8077), status: 'Available', waiting: 12, wait: '~8 min', capacity: 68, icon: '◉', description: 'A dedicated immersion site with a calm, spacious viewing area.', facilities: ['Accessible ramp', 'First aid', 'Drinking water', 'Changing area'], address: 'Demo location · Kothrud', hours: '8:00 AM – 10:00 PM' },
 { id: 'central', name: 'Central Community Immersion Centre', city: 'Pune', area: 'Shivajinagar, Pune', coordinates: demoCoordinates(18.5308, 73.8475), status: 'Busy', waiting: 46, wait: '~24 min', capacity: 86, icon: '▤', description: 'A community-managed centre with separate arrival and exit lanes.', facilities: ['First aid', 'Drinking water', 'Parking', 'Volunteers'], address: 'Demo location · Shivajinagar', hours: '7:00 AM – 11:00 PM' },
 { id: 'east', name: 'East Zone Immersion Facility', city: 'Pune', area: 'Viman Nagar, Pune', coordinates: demoCoordinates(18.5679, 73.9143), status: 'Near capacity', waiting: 31, wait: '~18 min', capacity: 92, icon: '⌂', description: 'A high-capacity facility with family and senior-citizen support.', facilities: ['Accessible ramp', 'First aid', 'Parking', 'Family area'], address: 'Demo location · Viman Nagar', hours: '8:00 AM – 10:00 PM' },
 { id: 'green', name: 'Green Park Immersion Pond', city: 'Pune', area: 'Aundh, Pune', coordinates: demoCoordinates(18.5590, 73.8079), status: 'Available', waiting: 7, wait: '~5 min', capacity: 50, icon: '♧', description: 'A smaller green-space location with clearly marked waste sorting.', facilities: ['Drinking water', 'Waste sorting', 'Volunteers'], address: 'Demo location · Aundh', hours: '9:00 AM – 9:00 PM' },
 { id: 'blr-jayanagar', name: 'Jayanagar Community Immersion Tank', city: 'Bengaluru', area: 'Jayanagar, Bengaluru', coordinates: demoCoordinates(12.9250, 77.5938), status: 'Available', waiting: 9, wait: '~6 min', capacity: 60, icon: '◉', description: 'A neighbourhood immersion tank with a separate offerings collection point.', facilities: ['Accessible ramp', 'Drinking water', 'Waste sorting'], address: 'Demo location · Jayanagar', hours: '8:00 AM – 10:00 PM' },
 { id: 'blr-malleshwaram', name: 'Malleshwaram Artificial Pond', city: 'Bengaluru', area: 'Malleshwaram, Bengaluru', coordinates: demoCoordinates(13.0035, 77.5709), status: 'Busy', waiting: 38, wait: '~20 min', capacity: 80, icon: '▤', description: 'A busy central pond with volunteer-guided queues.', facilities: ['First aid', 'Volunteers', 'Parking'], address: 'Demo location · Malleshwaram', hours: '7:00 AM – 11:00 PM' },
 { id: 'blr-indiranagar', name: 'Indiranagar Immersion Point', city: 'Bengaluru', area: 'Indiranagar, Bengaluru', coordinates: demoCoordinates(12.9719, 77.6412), status: 'Available', waiting: 14, wait: '~9 min', capacity: 55, icon: '⌂', description: 'A compact site with family seating and step-free access.', facilities: ['Accessible ramp', 'Family area', 'Drinking water'], address: 'Demo location · Indiranagar', hours: '8:00 AM – 9:00 PM' },
 { id: 'blr-whitefield', name: 'Whitefield Eco Immersion Pond', city: 'Bengaluru', area: 'Whitefield, Bengaluru', coordinates: demoCoordinates(12.9698, 77.7500), status: 'Near capacity', waiting: 27, wait: '~15 min', capacity: 70, icon: '♧', description: 'An eco-focused pond with nirmalya composting.', facilities: ['Waste sorting', 'Volunteers', 'First aid'], address: 'Demo location · Whitefield', hours: '9:00 AM – 9:00 PM' }
];
const slots = ['4:30 – 5:00 PM', '5:00 – 5:30 PM', '5:30 – 6:00 PM', '6:00 – 6:30 PM', '6:30 – 7:00 PM'];
const seededSlots = site => slots.map((time, i) => ({ siteId: site.id, time, capacity: 12, booked: (site.id === 'central' && i < 2) ? 7 : Math.min(i, 3) }));
const withDemoMetadata = (site, observedAt) => ({ ...site, provenance: demoProvenance, statusSource: { kind: 'demo', source: 'VisarjanOps demo simulation', observedAt } });
// Official records carry no status of their own; status only comes from authenticated staff updates or a future authorised feed.
const officialSite = r => ({ id: r.id, name: r.name, nameSource: r.nameSource, city: r.city, area: r.area, address: r.address || null, siteType: r.siteType, coordinates: r.coordinates, sourceLink: r.sourceLink, provenance: r.provenance, quality: r.quality, facilities: r.facilities || [], icon: '◉', description: null, hours: null });
const catalogue = observedAt => [...OFFICIAL_SOURCES.flatMap(s => s.records.map(officialSite)), ...(includeDemo() ? sites.map(s => withDemoMetadata(s, observedAt)) : [])];
const catalogueVersion = () => OFFICIAL_SOURCES.map(s => `${s.source.id}@${s.source.extractedAt}`).join(',') + (includeDemo() ? '+demo' : '');
const STAFF_FIELDS = ['status', 'waiting', 'wait', 'statusSource'];

async function save(db) {
  await mkdir(dir, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(db, null, 2));
  await rename(temporary, file);
}

export async function seed(reset = false) {
  await mkdir(dir, { recursive: true });
  if (!reset) { try { await readFile(file); return; } catch {} }
  const list = catalogue(new Date().toISOString());
  await save({ schemaVersion: SCHEMA_VERSION, catalogueVersion: catalogueVersion(), sites: list, slots: list.filter(s => s.provenance?.kind === 'demo').flatMap(seededSlots), bookings: [], feedback: [], apifyImports: [] });
}

// Re-syncs the stored site list with the source files. Keeps bookings, slot counts, staff status updates
// and any operator verification decision; never overwrites a site an operator has verified or rejected.
function sync(db) {
  if (db.schemaVersion === SCHEMA_VERSION && db.catalogueVersion === catalogueVersion()) return false;
  const previous = new Map((db.sites || []).map(s => [s.id, s]));
  db.sites = catalogue(new Date().toISOString()).map(next => {
    const old = previous.get(next.id);
    if (!old) return next;
    if (['VERIFIED', 'REJECTED'].includes(old.provenance?.verificationStatus)) return old;
    const kept = Object.fromEntries(STAFF_FIELDS.filter(k => k in old && old.statusSource?.kind !== 'demo').map(k => [k, old[k]]));
    return { ...next, ...kept };
  });
  db.slots ||= [];
  for (const s of db.sites.filter(s => s.provenance?.kind === 'demo' && !db.slots.some(x => x.siteId === s.id))) db.slots.push(...seededSlots(s));
  db.bookings ||= []; db.feedback ||= [];
  db.schemaVersion = SCHEMA_VERSION;
  db.catalogueVersion = catalogueVersion();
  return true;
}

export const officialSources = () => OFFICIAL_SOURCES.map(s => ({ ...s.source, stats: s.stats }));

export async function read() {
  const db = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(db.apifyImports)) db.apifyImports = [];
  if (sync(db)) await save(db);
  return db;
}
export async function write(db) { await save(db); }
