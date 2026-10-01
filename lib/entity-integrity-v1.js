export const ENTITY_INTEGRITY_VERSION = '1.0';

// Canonical identity records are intentionally small and conservative.
// Stable identity/location facts only. Volatile facts such as hours, prices,
// menus and availability must still be checked live.
export const CANONICAL_ENTITIES = [
  {
    id: 'place:kraft-koffee',
    name: 'Kraft Koffee',
    aliases: ['KRAFT', 'KRAFT Coffee', 'Kraft Koffee', 'KRAFT Koffee'],
    category: 'coffee',
    address: '12 Wood Street, Wakefield, WF1 2ED',
    locality: 'Wakefield',
    area: 'Wakefield city centre',
    cityCentreEligible: true,
    sourceUrl: 'https://experiencewakefield.co.uk/venue/kraft-koffee/',
    sourceType: 'official-tourism-editorial'
  },
  {
    id: 'place:recent-coffee-roasters',
    name: 'RECENT Coffee Roasters',
    aliases: ['Recent Coffee', 'RECENT Coffee', 'RECENT Coffee Roasters', 'Recent Coffee Roasters'],
    category: 'coffee',
    address: '97-99 Westgate, Wakefield, WF1 1EL',
    locality: 'Wakefield',
    area: 'Wakefield city centre',
    cityCentreEligible: true,
    sourceUrl: 'https://recent.coffee/pages/contact',
    sourceType: 'first-party'
  },
  {
    id: 'place:the-art-house',
    name: 'The Art House',
    aliases: ['The Art House', 'The Art House Wakefield'],
    category: 'art',
    address: 'Drury Lane, Wakefield, West Yorkshire, WF1 2TE',
    locality: 'Wakefield',
    area: 'Wakefield city centre',
    cityCentreEligible: true,
    sourceUrl: 'https://the-arthouse.org.uk/about/plan-your-visit/',
    sourceType: 'first-party'
  },
  {
    id: 'place:the-hepworth-wakefield',
    name: 'The Hepworth Wakefield',
    aliases: ['The Hepworth', 'The Hepworth Wakefield'],
    category: 'art',
    address: 'Gallery Walk, Wakefield, West Yorkshire, WF1 5AW',
    locality: 'Wakefield',
    area: 'Wakefield city centre / waterfront',
    cityCentreEligible: true,
    sourceUrl: 'https://hepworthwakefield.org/your-visit/',
    sourceType: 'first-party'
  },
  {
    id: 'place:marmalade-on-the-square',
    name: 'Marmalade on the Square',
    aliases: ['Marmalade on the Square', 'Marmalade On The Square', 'Marmalade'],
    category: 'coffee',
    address: '21 Central Buildings, Bull Ring, Wakefield, WF1 1HA',
    locality: 'Wakefield',
    area: 'Wakefield city centre',
    cityCentreEligible: true,
    sourceUrl: 'https://experiencewakefield.co.uk/locations/wakefield/',
    sourceType: 'official-tourism-editorial'
  },
  {
    id: 'place:darling-reads',
    name: 'Darling Reads',
    aliases: ['Darling Reads'],
    category: 'books',
    address: '17 High Street, Horbury, WF4 5AB',
    locality: 'Horbury',
    area: 'Horbury',
    cityCentreEligible: false,
    sourceUrl: 'https://darlingreadsbooks.com/pages/contact',
    sourceType: 'first-party'
  },
  {
    id: 'place:fosters-books-ossett',
    name: "Foster's Books",
    aliases: ["Foster's Books", 'Fosters Books'],
    category: 'books',
    address: '3 Bank Street, Ossett, West Yorkshire, WF5 8PS',
    locality: 'Ossett',
    area: 'Ossett',
    cityCentreEligible: false,
    sourceUrl: 'https://fostersbooks.com/pages/about-us',
    sourceType: 'first-party'
  },
  {
    id: 'place:books-on-the-lane',
    name: 'Books on the Lane',
    aliases: ['Books on the Lane', 'Books On The Lane', 'Walton Herbs & Books on the Lane'],
    category: 'books',
    address: '59 Oakenshaw Lane, Walton, Wakefield, WF2 6NJ',
    locality: 'Walton',
    area: 'Walton',
    cityCentreEligible: false,
    sourceUrl: 'https://experiencewakefield.co.uk/plan-your-visit/',
    sourceType: 'official-tourism-editorial'
  }
];

function recentUserText(messages, limit = 5) {
  if (!Array.isArray(messages)) return '';
  return messages
    .filter(message => message?.role === 'user' && typeof message.content === 'string')
    .slice(-limit)
    .map(message => message.content.trim())
    .filter(Boolean)
    .join('\n');
}

export function isStrictCityCentreItineraryQuery(messages) {
  const text = recentUserText(messages);
  const cityCentre = /\b(wakefield\s+city\s+centre|city\s+centre|town\s+centre)\b/i.test(text);
  const planning = /\b(plan|itinerary|afternoon|day out|spend|three hours|couple of hours|few hours)\b/i.test(text);
  const interests = /\b(coffee|cafe|books?|bookshop|art|gallery|museum|culture)\b/i.test(text);
  return cityCentre && planning && interests;
}

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
}

function entityMentioned(text, entity) {
  const haystack = normalise(text);
  return [entity.name, ...(entity.aliases || [])].some(alias => {
    const needle = normalise(alias);
    return needle && haystack.includes(needle);
  });
}

function dynamicEntityLines(placesContext) {
  const lines = [];
  for (const place of placesContext?.places || []) {
    if (!place?.name || !place?.address) continue;
    lines.push([
      `ENTITY: ${place.name}`,
      `ADDRESS: ${place.address}`,
      place.primaryType ? `TYPE: ${place.primaryType}` : '',
      place.businessStatus ? `BUSINESS STATUS: ${place.businessStatus}` : '',
      place.websiteUri ? `WEBSITE: ${place.websiteUri}` : '',
      place.googleMapsUri ? `GOOGLE MAPS: ${place.googleMapsUri}` : ''
    ].filter(Boolean).join('\n'));
  }
  return lines;
}

export function buildEntityIntegrityContext({ messages, placesContext = null } = {}) {
  if (!isStrictCityCentreItineraryQuery(messages)) return '';

  const allowed = CANONICAL_ENTITIES.filter(entity => entity.cityCentreEligible);
  const excluded = CANONICAL_ENTITIES.filter(entity => !entity.cityCentreEligible);
  const dynamic = dynamicEntityLines(placesContext);

  return `\n\nENTITY INTEGRITY GATE — STRICT WAKEFIELD CITY-CENTRE ITINERARY:\n` +
    `The named area is a hard boundary. Do not turn a district-wide guide member into a city-centre venue.\n` +
    `For every venue you name, keep its name, address/locality and attributes attached to that exact entity. Never transfer a street, town, postcode, opening time or facility from another venue.\n` +
    `You may recommend only a venue that appears in VERIFIED / CANONICAL CITY-CENTRE ENTITIES below or in GOOGLE PLACES ENTITY CARDS below. If a place is absent, omit it rather than guessing.\n` +
    `Do not state walking minutes, distance, "short walk", "easy walking distance", "nearby" or similar proximity language unless current route evidence explicitly supports it.\n` +
    `Stable identity/location facts below may be stated. Opening hours, prices, current exhibitions, menus and availability remain volatile and need current evidence.\n\n` +
    `VERIFIED / CANONICAL CITY-CENTRE ENTITIES:\n${allowed.map(entity => [
      `ENTITY: ${entity.name}`,
      `CATEGORY: ${entity.category}`,
      `ADDRESS: ${entity.address}`,
      `AREA: ${entity.area}`,
      `SOURCE: ${entity.sourceUrl}`
    ].join('\n')).join('\n\n')}\n\n` +
    `KNOWN OUT-OF-CENTRE ENTITIES — DO NOT USE IN THIS CITY-CENTRE ITINERARY:\n${excluded.map(entity => `${entity.name} — ${entity.area} — ${entity.address}`).join('\n')}\n` +
    (dynamic.length ? `\nGOOGLE PLACES ENTITY CARDS:\n${dynamic.join('\n\n')}\n` : '');
}

function stripUnsupportedProximity(text) {
  return String(text)
    .replace(/\bwalk(?:ing)?\s+(?:for\s+)?(?:about\s+|roughly\s+|around\s+)?\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*(?:minute|minutes|min)\b/gi, 'walk')
    .replace(/\b(?:about\s+|roughly\s+|around\s+)?\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*(?:minute|minutes|min)\s+(?:walk|stroll)\b/gi, 'walk')
    .replace(/\b(?:a\s+)?\d{1,2}(?:\s*[-–]\s*\d{1,2})?[- ]minute\s+(?:walk|stroll)\b/gi, 'walk')
    .replace(/\bwithin easy walking distance\b/gi, 'in the city-centre plan')
    .replace(/\b(?:a|an)\s+(?:short|quick|gentle|easy)\s+(?:walk|stroll)\b/gi, 'walk')
    .replace(/\b(?:just|only)\s+(?:a\s+)?(?:short|quick)\s+walk\b/gi, 'a walk')
    .replace(/\bnearby\b/gi, 'in the city centre');
}

function canonicalLocationRepairs(block) {
  let out = block;

  if (/\bRECENT Coffee(?: Roasters)?\b|\bRecent Coffee(?: Roasters)?\b/i.test(out)) {
    out = out
      .replace(/\b(?:on|at)\s+Wood Street\b/gi, 'on Westgate')
      .replace(/\b(?:on|at)\s+Drury Lane\b/gi, 'on Westgate');
  }

  if (/\bKRAFT(?: Coffee| Koffee)?\b|\bKraft Koffee\b/i.test(out)) {
    out = out
      .replace(/\b(?:on|at)\s+Westgate\b/gi, 'on Wood Street')
      .replace(/\b(?:on|at)\s+Drury Lane\b/gi, 'on Wood Street');
  }

  return out;
}

export function deterministicallySanitiseEntityIntegrityAnswer(reply, messages) {
  if (!reply || !isStrictCityCentreItineraryQuery(messages)) return reply;

  const forbidden = CANONICAL_ENTITIES.filter(entity => !entity.cityCentreEligible);
  const blocks = String(reply).split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  const kept = [];

  for (let block of blocks) {
    // Remove only the sentence/line that contains an out-of-centre entity so a
    // valid city-centre recommendation in the same paragraph is not lost.
    const lines = block.split(/\n/).map(line => line.trim()).filter(Boolean);
    const cleanedLines = [];
    for (const line of lines) {
      const clauses = line
        .split(/(?<=[.!?;])\s+|,\s+(?=then\b)|\s+(?=Then\b)/i)
        .map(part => part.trim())
        .filter(Boolean);
      const keptClauses = clauses
        .filter(clause => !forbidden.some(entity => entityMentioned(clause, entity)));
      if (keptClauses.length) cleanedLines.push(keptClauses.join(' '));
    }
    block = cleanedLines.join('\n').trim();
    if (!block) continue;
    block = canonicalLocationRepairs(block);
    block = stripUnsupportedProximity(block);
    kept.push(block);
  }

  return kept.join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}
