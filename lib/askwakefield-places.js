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

function topics(question) {
  const found = [];
  if (/\b(coffee|cafe|cafes|cafés|espresso|brunch)\b/i.test(question)) found.push({label:'coffee',match:r=>/coffee|café|cafe|espresso|roaster|bakery/i.test(`${r.name} ${r.type}`)});
  if (/\b(book|books|bookshop|comic|manga)\b/i.test(question)) found.push({label:'books',match:r=>/book|comic|library/i.test(`${r.name} ${r.type}`) || !unknown(r.books)});
  if (/\b(child|children|kids|family|rainy|indoor)\b/i.test(question)) found.push({label:'family',match:r=>/family|child|museum|gallery|play|cinema|library|bowling|pottery/i.test(`${r.name} ${r.type}`)});
  if (/\b(park|garden|outdoor|walk)\b/i.test(question)) found.push({label:'outdoors',match:r=>/park|garden|castle|trail|outdoor/i.test(`${r.name} ${r.type}`)});
  if (/\b(food|eat|lunch|restaurant|dinner|sandwich)\b/i.test(question)) found.push({label:'food',match:r=>/food|restaurant|café|cafe|coffee|pizza|falafel|bakery|pub/i.test(`${r.name} ${r.type}`)});
  if (/\b(art|gallery|museum|culture)\b/i.test(question)) found.push({label:'art',match:r=>/art|gallery|museum|sculpture|workshop/i.test(`${r.name} ${r.type}`)});
  return found;
}

function score(record, q, intent) {
  const text = norm([record.name, record.type, record.tags].join(' '));
  let result = intent?.match(record) ? 3 : 0;
  for (const word of norm(q).split(' ')) if (word.length > 3 && text.includes(word)) result += 1;
  if (record.readiness === 'READY') result += 0.5;
  return result;
}

// This is candidate selection, not a current opening/price/event authority.
export function buildTrustedPlacesContext(question, previousAssistant = '') {
  const q = String(question || '').trim();
  if (!q) return '';
  const followUp = /\b(those|them|these|which of|are they|open right now|open now)\b/i.test(q) && previousAssistant;
  const n = norm(followUp ? previousAssistant : q);
  const matches = PLACE_DATA.entities.filter(record => {
    const names = [record.name, ...(aliases[record.id] || [])].map(norm);
    return names.some(name => name.length >= 5 && n.includes(name));
  });
  const longest = Math.max(0, ...matches.map(record => norm(record.name).length));
  const exact = followUp ? matches : matches.filter(record => norm(record.name).length === longest);
  const blocked = exact.filter(record => record.readiness === 'NOT READY');
  const intents = topics(q);
  let candidates = exact.filter(record => USABLE.has(record.readiness));
  if (!candidates.length && !blocked.length && intents.length) {
    const pool = PLACE_DATA.entities.filter(record => USABLE.has(record.readiness)
      && (!isCityCentreRequest(q) || record.cityCentre === 'Yes'));
    candidates = [...new Map(intents.flatMap(intent => pool.filter(intent.match)
      .sort((a, b) => score(b, q, intent) - score(a, q, intent)).slice(0, 2))
      .map(record => [record.id,record])).values()].slice(0, 8);
  }
  if (!candidates.length && !blocked.length) return '';
  const lines = candidates.map(record => {
    const parts = [
      `${record.id} | ${record.name} | ${record.readiness}`,
      !unknown(record.type) ? `Type: ${record.type}` : '',
      !unknown(record.address) ? `Address: ${record.address}` : '',
      !unknown(record.postcode) ? `Postcode: ${record.postcode}` : '',
      record.cityCentre === 'Yes' ? 'Verified city-centre flag: Yes' : '',
      record.cityCentre !== 'Yes' ? `City-centre flag: ${record.cityCentre} (do not assume city-centre eligibility)` : '',
      !unknown(record.host) ? `Host: ${record.host} (do not inherit host hours)` : '',
      !unknown(record.books) ? `Books evidence: ${record.books}` : 'Book stock: Unknown; do not claim shelves or browsing.',
      followUp ? `Regular published hours (not live confirmation): ${Object.entries(record.hours || {}).map(([day,hours])=>`${day} ${hours}`).join('; ')}` : '',
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
An undated request to plan an afternoon is a future plan, not a claim that venues are open tonight. If the user insists on Wakefield city centre, include only records explicitly flagged Yes. The Hepworth gallery and garden are waterfront outside the centre core and must not be presented as city-centre stops. CoffeeWrite has no verified book stock; do not describe shelves, browsing or a bookshop there. Do not invent route lengths, walking ease, or guaranteed time allocations.
For opening now/today/tonight, opening hours, booking, prices, menus, closures, accessibility, dietary claims, timed events, parking rates and transport: verify the exact venue and requested date with current official evidence. If unavailable, say the specific fact is unconfirmed. A host's hours never establish a tenant's hours. A parent attraction's entry rules never establish a café's rules. Never use this dataset to populate current event cards or change persisted event IDs.
${lines.join('\n\n')}`;
}

// A conservative answer for a follow-up about the exact places just named.
// It describes published regular hours and never claims a live exception was checked.
export function regularHoursFollowUp(question, previousAssistant = '', now = new Date()) {
  if (!/\b(which of those|which of them|are those|are they|which ones)\b/i.test(question)
      || !/\b(open right now|open now|open at the moment|open currently|open)\b/i.test(question)) return null;
  const previous = norm(previousAssistant);
  const records = PLACE_DATA.entities.filter(record =>
    [record.name,...(aliases[record.id] || [])].some(name => norm(name).length >= 6 && previous.includes(norm(name))));
  if (!records.length) return null;
  const clock = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const part = key => clock.find(x=>x.type===key)?.value;
  const day=part('weekday');
  const minutes=Number(part('hour'))*60+Number(part('minute'));
  const time=`${part('hour')}:${part('minute')}`;
  const lines=[];
  const sources=[];
  for(const record of records){
    const hours=String(record.hours?.[day] || 'Unknown');
    let finding='Current status unconfirmed; no exact hours verified.';
    if(/^closed$/i.test(hours)) finding='Regular published schedule says closed today.';
    else {
      const m=hours.match(/^(\d{2}):(\d{2})[–-](\d{2}):(\d{2})$/);
      if(m){
        const start=Number(m[1])*60+Number(m[2]);
        const end=Number(m[3])*60+Number(m[4]);
        finding=minutes<start?'Regular published hours have not started yet.'
          :minutes>=end?`Regular published hours ended at ${m[3]}:${m[4]}.`
          :'Regular published hours cover this time, but a live exception has not been verified.';
      } else if(/open daily/i.test(hours))finding='Listed as open daily, but exact evening access hours are Unknown.';
      else if(/closed/i.test(hours))finding='The regular schedule lists closure, with exceptions that need a date-specific check.';
    }
    lines.push(`- ${record.name}: ${finding}`);
    if(record.sources?.[0])sources.push(record.sources[0]);
  }
  return {
    reply:`At ${time} on ${day} in Wakefield, I cannot confirm that any of those places is open right now. The regular published schedules say:\n\n${lines.join('\n')}\n\nThese are published hours, not a live check for special openings or closures. Check the venue directly before travelling.`,
    sources:[...new Set(sources)]
  };
}

export function undatedCityCentreCoffeeBooksArtPlan(question) {
  const q=String(question || '');
  if(!/\b(city centre|city center|town centre|town center)\b/i.test(q)
    || !/\b(plan|itinerary|afternoon)\b/i.test(q)
    || !/\bcoffee\b/i.test(q) || !/\bbooks?\b/i.test(q)
    || !/\bart\b/i.test(q)
    || /\b(today|tonight|tomorrow|this (?:saturday|sunday|weekend)|next (?:saturday|sunday)|open now|right now)\b/i.test(q)) return null;
  const ids=['AW-036','AW-016','AW-005'];
  const records=ids.map(id=>PLACE_DATA.entities.find(r=>r.id===id));
  if(records.some(r=>!r || r.cityCentre!=='Yes' || !USABLE.has(r.readiness)))return null;
  const [coffee,books,art]=records;
  const label=record=>{
    const first=String(record.address).split(',')[0].trim();
    return norm(record.name).includes(norm(first))
      ? `${record.name}, ${String(record.address).split(',').slice(1).join(',').trim()}`
      : `${record.name}, ${record.address}`;
  };
  return {
    reply:`For a future afternoon in Wakefield city centre, these three stops fit your interests:\n\n1. Coffee: ${label(coffee)}. Its own site confirms the coffee shop; book stock is unverified.\n2. Books: ${label(books)}. The record identifies it as a book retailer.\n3. Art: ${label(art)}. The venue lists free entry, with separate paid activities possible.\n\nI haven't checked a route or travel time between them, and I haven't confirmed that all three will be open on your chosen day. Tell me the date and approximate start time and I can check the hours before turning this into a timed three-hour plan.`,
    sources:[...new Set(records.flatMap(r=>r.sources || []))]
  };
}
