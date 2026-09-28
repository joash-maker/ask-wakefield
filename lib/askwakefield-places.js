import { PLACE_DATA } from './askwakefield-places-data.js';

const USABLE = new Set(['READY', 'READY WITH LIMITATIONS']);
const unknown = value => !value || String(value).trim().toLowerCase() === 'unknown';
const norm = value => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const aliases = {
  'AW-001': ['recent coffee'],
  'AW-006': ['hepworth gallery'],
  'AW-007': ['wakefield museum'],
  'AW-021': ['the cathedral'],
  'AW-022': ['wx', 'wakefield exchange'],
  'AW-029': ['hepworth garden'],
};

function isCityCentreRequest(question) {
  return /\b(city centre|city center|town centre|town center|central wakefield)\b/i.test(question);
}

function topic(question) {
  if (/\b(coffee|cafe|cafes|cafés|espresso|brunch)\b/i.test(question)) return /coffee|café|cafe|espresso|roaster|bakery/i;
  if (/\b(book|bookshop|comic|manga)\b/i.test(question)) return /book|comic|library/i;
  if (/\b(child|children|kids|family|rainy|indoor)\b/i.test(question)) return /family|child|museum|gallery|play|cinema|library|bowling|pottery/i;
  if (/\b(park|garden|outdoor|walk)\b/i.test(question)) return /park|garden|castle|trail|outdoor/i;
  if (/\b(food|eat|lunch|restaurant|dinner|sandwich)\b/i.test(question)) return /food|restaurant|café|cafe|coffee|pizza|falafel|bakery|pub/i;
  if (/\b(art|gallery|museum|culture)\b/i.test(question)) return /art|gallery|museum|sculpture|workshop/i;
  return null;
}

function score(record, q, intent) {
  const text = norm([record.name, record.type, record.tags].join(' '));
  let result = intent && intent.test([record.type, record.tags].join(' ')) ? 3 : 0;
  for (const word of norm(q).split(' ')) if (word.length > 3 && text.includes(word)) result += 1;
  if (record.readiness === 'READY') result += 0.5;
  return result;
}

// This is candidate selection, not a current opening/price/event authority.
export function buildTrustedPlacesContext(question) {
  const q = String(question || '').trim();
  if (!q) return '';
  const n = norm(q);
  const matches = PLACE_DATA.entities.filter(record => {
    const names = [record.name, ...(aliases[record.id] || [])].map(norm);
    return names.some(name => name.length >= 5 && n.includes(name));
  });
  const longest = Math.max(0, ...matches.map(record => norm(record.name).length));
  const exact = matches.filter(record => norm(record.name).length === longest);
  const blocked = exact.filter(record => record.readiness === 'NOT READY');
  const intent = topic(q);
  let candidates = exact.filter(record => USABLE.has(record.readiness));
  if (!candidates.length && !blocked.length && intent) {
    candidates = PLACE_DATA.entities.filter(record => USABLE.has(record.readiness)
      && (!isCityCentreRequest(q) || record.cityCentre === 'Yes')
      && intent.test([record.name, record.type].join(' ')))
      .sort((a, b) => score(b, q, intent) - score(a, q, intent)).slice(0, 6);
  }
  if (!candidates.length && !blocked.length) return '';
  const lines = candidates.map(record => {
    const parts = [
      `${record.id} | ${record.name} | ${record.readiness}`,
      !unknown(record.type) ? `Type: ${record.type}` : '',
      !unknown(record.address) ? `Address: ${record.address}` : '',
      !unknown(record.postcode) ? `Postcode: ${record.postcode}` : '',
      record.cityCentre === 'Yes' ? 'Verified city-centre flag: Yes' : '',
      record.cityCentre === 'No' ? 'City-centre flag: No' : '',
      !unknown(record.host) ? `Host: ${record.host} (do not inherit host hours)` : '',
      !unknown(record.tags) ? `Topics: ${record.tags}` : '',
      record.readiness === 'READY WITH LIMITATIONS' ? `Limitation: ${record.reason}` : '',
      !unknown(record.website) ? `Official page: ${record.website}` : '',
      record.sources?.length ? `Evidence: ${record.sources.join(' ; ')}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  });
  const blockedNames = blocked.map(record => record.name).join(', ');
  return `\n\nTRUSTED LOCAL PLACES — ${PLACE_DATA.version}:
The records below are candidate facts only. Use ONLY the listed identity, address, category, host and source relationship. Never fill Unknown from memory. READY means stable core facts are sourced; it does NOT mean open now. READY WITH LIMITATIONS permits only facts supported by its record. NOT READY records must never be recommended from this dataset${blockedNames ? `; named blocked records: ${blockedNames}` : ''}. The source workbook retains individual FACT PROVENANCE rows. This compact runtime extract does not include every field or every provenance row.
For opening now/today/tonight, opening hours, booking, prices, menus, closures, accessibility, dietary claims, timed events, parking rates and transport: verify the exact venue and requested date with current official evidence. If unavailable, say the specific fact is unconfirmed. A host's hours never establish a tenant's hours. A parent attraction's entry rules never establish a café's rules. Never use this dataset to populate current event cards or change persisted event IDs.
${lines.join('\n\n')}`;
}
