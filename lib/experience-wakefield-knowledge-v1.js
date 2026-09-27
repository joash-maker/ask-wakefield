// AskWakefield curated knowledge layer v1
// Experience Wakefield editorial/social knowledge.
// This layer is for discovery and suitability.
// It must NOT override live verification for current facts.

export const CURATED_KNOWLEDGE_VERSION = 'ew-curated-v1';

const SOURCE = {
  publisher: 'Experience Wakefield',
  sourceType: 'editorial-social',
  authority: 'official-tourism-editorial'
};

export const ENTITIES = [
  {
    id: 'place:bakes-by-vanilla-bean',
    type: 'place',
    subtype: ['bakery', 'cafe'],
    name: 'Bakes by Vanilla Bean',
    area: 'Wakefield city centre',
    address: 'Wood Street, Wakefield, WF1 2ED',
    tags: [
      'coffee',
      'cake',
      'bakery',
      'sweet-treats',
      'vegan-options',
      'gluten-free-options',
      'plant-milk',
      'independent',
      'family-run'
    ],
    facts: [
      {
        key: 'supplier',
        value: 'Rounton Coffee Roasters',
        freshness: 'durable',
        evidence: 'source-stated'
      },
      {
        key: 'openingHours',
        value: 'Mon-Fri 08:00-17:00; Sat 09:00-16:00; Sun 10:00-16:00',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:castleford-museum',
    type: 'place',
    subtype: ['museum'],
    name: 'Castleford Museum',
    area: 'Castleford',
    address: 'Carlton Street, Castleford, WF10 1BB',
    tags: [
      'free',
      'family',
      'history',
      'roman',
      'archaeology',
      'rugby-league',
      'henry-moore',
      'indoor'
    ],
    facts: [
      {
        key: 'entry',
        value: 'Free entry',
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'openingHours',
        value: 'Mon Tue Thu Fri 09:30-17:00; Sat 09:30-16:00',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:tenpin-wakefield',
    type: 'place',
    subtype: ['entertainment-venue'],
    name: 'Tenpin Wakefield',
    area: 'Wakefield city centre',
    parentPlace: 'Trinity Walk',
    status: 'newly-opened',
    tags: [
      'bowling',
      'escape-room',
      'karaoke',
      'interactive-darts',
      'laser-tag',
      'pool',
      'arcade',
      'diner',
      'bar',
      'family',
      'groups',
      'date-night',
      'indoor'
    ],
    facts: [
      {
        key: 'bowlingLanes',
        value: 24,
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'escapeRooms',
        value: 3,
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'karaokeRooms',
        value: 2,
        freshness: 'medium',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:buttons-wakefield',
    type: 'place',
    subtype: ['cafe', 'bar', 'events-venue'],
    name: 'Buttons Wakefield',
    area: 'Walton / Crofton',
    address: 'Bridge Gate Farm, Shay Lane, Walton, WF2 6PR',
    tags: [
      'coffee',
      'breakfast',
      'bar',
      'live-music',
      'themed-events',
      'private-events',
      'dog-friendly',
      'family-run'
    ],
    facts: [
      {
        key: 'dogFriendly',
        value: true,
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'daypart',
        value: 'Cafe/breakfast by day; bar/events by night',
        freshness: 'medium',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:wf8-retail-outlet',
    type: 'place',
    subtype: ['retail-destination', 'mixed-use-venue'],
    name: 'WF8 Retail Outlet',
    area: 'Pontefract',
    address: 'Front Street, Pontefract',
    tags: [
      'independent-shopping',
      'antiques',
      'collectables',
      'vinyl',
      'art',
      'fashion',
      'jewellery',
      'cafe',
      'pilates',
      'heritage'
    ],
    facts: [
      {
        key: 'building',
        value: 'Grade II listed Old Magistrates’ Court',
        freshness: 'durable',
        evidence: 'source-stated'
      },
      {
        key: 'retailerCount',
        value: '14+',
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'openingHours',
        value: 'Mon-Sat 09:30-16:30',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:rosse-observatory',
    type: 'place',
    subtype: ['observatory'],
    name: 'Rosse Observatory',
    area: 'Carleton, Pontefract',
    operator: 'West Yorkshire Astronomical Society',
    tags: [
      'astronomy',
      'science',
      'stargazing',
      'space',
      'talks',
      'family',
      'young-people',
      'friday-evening'
    ],
    facts: [
      {
        key: 'programme',
        value:
          'Open evenings and talks on first three Fridays; young astronomers on last Friday',
        freshness: 'volatile',
        evidence: 'source-stated',
        verifyAt: 'wyas.org.uk'
      }
    ],
    ...SOURCE
  },

  {
    id: 'stay:flockton-water-tower',
    type: 'accommodation',
    subtype: ['unique-stay'],
    name: 'Flockton Water Tower',
    area: 'Flockton, near Wakefield',
    tags: [
      'unique-stay',
      'countryside',
      'group-stay',
      'family',
      'dog-friendly',
      'yorkshire-sculpture-park',
      'national-coal-mining-museum'
    ],
    facts: [
      {
        key: 'maxGuests',
        value: 8,
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'features',
        value:
          'Converted water tower; three floors; 360-degree countryside views',
        freshness: 'durable',
        evidence: 'source-stated'
      },
      {
        key: 'petFriendly',
        value: true,
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'stay:rogerthorpe-manor-hotel',
    type: 'accommodation',
    subtype: ['hotel', 'historic-hotel', 'event-venue'],
    name: 'Rogerthorpe Manor Hotel',
    area: 'Badsworth, near Pontefract',
    tags: [
      'historic',
      'grade-ii',
      'countryside',
      'hotel',
      'pub',
      'special-occasion',
      'romantic',
      'group-stay'
    ],
    facts: [
      {
        key: 'onsiteVenue',
        value: 'The Jacobean Pub',
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'packages',
        value: 'Pyjama pamper packages mentioned by Experience Wakefield',
        freshness: 'volatile',
        evidence: 'source-stated'
      },
      {
        key: 'food',
        value: 'Sunday carvery mentioned by Experience Wakefield',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'stay:went-cottage',
    type: 'accommodation',
    subtype: ['cottage', 'heritage-stay'],
    name: 'Went Cottage',
    area: 'Wentbridge',
    parentPlace: 'Wentbridge House Hotel',
    tags: [
      'cottage',
      'historic',
      '17th-century',
      'group-of-four',
      'private-courtyard',
      'special-stay'
    ],
    facts: [
      {
        key: 'maxGuests',
        value: 4,
        freshness: 'medium',
        evidence: 'source-stated'
      },
      {
        key: 'features',
        value: 'Roll-top bath, private courtyard garden, welcome hamper',
        freshness: 'medium',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:tanvis-indian-cuisine',
    type: 'place',
    subtype: ['restaurant'],
    name: 'Tanvis Indian Cuisine',
    area: 'Wakefield city centre',
    address: 'Northgate, Wakefield',
    tags: [
      'indian',
      'north-indian',
      'south-indian',
      'indo-chinese',
      'dosa',
      'thali',
      'vegetarian-options',
      'vegan-options',
      'gluten-free-options',
      'independent',
      'family-run'
    ],
    facts: [
      {
        key: 'recurringOffers',
        value:
          'Weekend breakfast, Wednesday buffet and Grab & Go lunch were promoted',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:rassams-creamery-wakefield',
    type: 'place',
    subtype: ['dessert', 'drinks'],
    name: 'Rassams Creamery',
    area: 'Wakefield city centre',
    address: 'Burgage Square, Wakefield, WF1 2TS',
    tags: ['mocktails', 'alcohol-free', 'dessert', 'evening'],
    facts: [
      {
        key: 'mocktailArea',
        value:
          'Dedicated mocktail area with 50+ syrups and fresh fruit',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:the-hilton-lounge',
    type: 'place',
    subtype: ['bar', 'lounge'],
    name: 'The Hilton Lounge',
    area: 'Wakefield city centre',
    address: 'Wood Street, Wakefield, WF1 2EL',
    tags: ['mocktails', 'alcohol-free', 'evening'],
    facts: [
      {
        key: 'mocktailCount',
        value: 3,
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:qubana',
    type: 'place',
    subtype: ['restaurant', 'bar'],
    name: 'Qubana',
    area: 'Wakefield city centre',
    address: 'Wood Street, Wakefield, WF1 2EL',
    tags: [
      'cuban-inspired',
      'cocktails',
      'mocktails',
      'alcohol-free',
      'date-night',
      'dinner'
    ],
    facts: [
      {
        key: 'mocktailMenu',
        value: 'Mocktail menu available',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:corarima',
    type: 'place',
    subtype: ['restaurant'],
    name: 'Corarima',
    area: 'Wakefield city centre',
    address: 'Cross Street, Wakefield, WF1 3BW',
    tags: ['abyssinian', 'vegan-guide', 'plant-based', 'dinner'],
    facts: [
      {
        key: 'veganRelationship',
        value:
          'Featured by Experience Wakefield in a vegan dining guide',
        freshness: 'medium',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:no-manches',
    type: 'place',
    subtype: ['restaurant'],
    name: 'No Manches',
    area: 'Wakefield city centre',
    address: 'Drury Lane, Wakefield, WF1',
    tags: [
      'mexican',
      'vegan-options',
      'burritos',
      'tacos',
      'salad-bowls',
      'quesadillas'
    ],
    facts: [
      {
        key: 'veganStatus',
        value: 'Clearly marked vegan options',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  },

  {
    id: 'place:doboy-donuts',
    type: 'place',
    subtype: ['bakery', 'dessert'],
    name: 'Doboy Donuts',
    area: 'Wakefield district',
    tags: ['donuts', 'vegan-friendly', 'dessert'],
    locations: [
      'Dewsbury Road, Wakefield, WF2 9BL',
      'Willowbridge Lane, Castleford, WF10 5NW'
    ],
    facts: [
      {
        key: 'veganStatus',
        value: 'Vegan-friendly',
        freshness: 'volatile',
        evidence: 'source-stated'
      }
    ],
    ...SOURCE
  }
];

export const GUIDES = [
  {
    id: 'guide:free-family-days-out',
    type: 'constraint-guide',
    title: 'Free family days out',
    tags: ['family', 'free', 'budget'],
    members: [
      'place:castleford-museum',
      'The Hepworth Wakefield',
      'Sandal Castle',
      'Pugneys Country Park',
      'Pontefract Castle',
      'Pontefract Museum',
      'Wakefield Museum',
      'National Coal Mining Museum for England'
    ],
    rule:
      'Guide membership is a discovery signal. Re-verify current entry cost and paid extras before a zero-cost recommendation.',
    ...SOURCE
  },

  {
    id: 'guide:family-days-out-by-bus',
    type: 'constraint-guide',
    title: 'Family days out by bus',
    tags: ['family', 'bus', 'no-car', 'public-transport'],
    members: [
      'National Coal Mining Museum for England',
      'WX Wakefield',
      'Yorkshire Sculpture Park',
      'The Hepworth Wakefield',
      'Xscape Yorkshire',
      'Pontefract Castle',
      'Wakefield Museum',
      'Nostell',
      'The Art House Wakefield',
      'Diggerland'
    ],
    rule:
      'Guide membership suggests public-transport suitability, but current route and timetable verification is required.',
    ...SOURCE
  },

  {
    id: 'guide:book-lovers',
    type: 'interest-guide',
    title: "Book Lovers' Guide to Wakefield",
    tags: [
      'books',
      'reading',
      'bookshops',
      'libraries',
      'quiet',
      'coffee',
      'bookish'
    ],
    members: [
      'Darling Reads',
      'Walton Herbs & Books on the Lane',
      "Foster's Books",
      'Wakefield Comics-616',
      'Nostell',
      'Wakefield Libraries',
      'Pontefract Castle',
      'Marmalade on the Square',
      'The Mad Ox',
      'Boathouse Newmillerdam'
    ],
    rule:
      'Members may be bookshops, libraries, cafés, heritage places or reading-friendly locations. Resolve entity type independently.',
    ...SOURCE
  },

  {
    id: 'guide:pup-culture',
    type: 'constraint-guide',
    title: 'Pup Culture',
    tags: ['dog-friendly', 'dogs', 'culture'],
    members: [
      'Yorkshire Sculpture Park',
      'The Art House Wakefield',
      'Pontefract Castle',
      'Sandal Castle'
    ],
    rule:
      'Re-verify the current dog policy at the exact venue before recommending access with a dog.',
    ...SOURCE
  },

  {
    id: 'guide:art-wellbeing',
    type: 'interest-guide',
    title: 'Art and culture for wellbeing',
    tags: ['art', 'culture', 'relaxing', 'quiet', 'wellbeing'],
    members: [
      'Yorkshire Sculpture Park',
      'The Art House Wakefield',
      'The Hepworth Wakefield'
    ],
    rule:
      'Treat wellbeing language as Experience Wakefield editorial framing, not a medical claim.',
    ...SOURCE
  },

  {
    id: 'guide:cocktails',
    type: 'interest-guide',
    title: 'Cocktail spots around the Wakefield district',
    tags: ['cocktails', 'bars', 'nightlife', 'date-night', 'evening'],
    members: [
      'The Priory Wakefield',
      'The Distillery Bar Wakefield',
      'RBT Video',
      'ChapterRooms',
      'Iron Dram',
      'The Greenhouse'
    ],
    geography: {
      'Wakefield city centre': [
        'The Priory Wakefield',
        'The Distillery Bar Wakefield',
        'RBT Video'
      ],
      Castleford: ['ChapterRooms'],
      Pontefract: ['Iron Dram'],
      Sandal: ['The Greenhouse']
    },
    ...SOURCE
  },

  {
    id: 'guide:alcohol-free',
    type: 'constraint-guide',
    title: 'Alcohol-free socialising',
    tags: [
      'mocktails',
      'alcohol-free',
      'non-drinker',
      'date-night',
      'evening'
    ],
    members: [
      'place:rassams-creamery-wakefield',
      'place:the-hilton-lounge',
      'place:qubana'
    ],
    rule:
      'Current drinks and menu availability are volatile and should be verified.',
    ...SOURCE
  },

  {
    id: 'guide:vegan-dining',
    type: 'dietary-guide',
    title: 'Vegan dining',
    tags: ['vegan', 'plant-based', 'dietary'],
    members: [
      'place:corarima',
      'place:no-manches',
      'place:doboy-donuts'
    ],
    rule:
      'Do not equate vegan-guide membership with fully vegan. Preserve vegan, vegan-options and vegan-friendly distinctions.',
    ...SOURCE
  }
];

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'at',
  'this',
  'that',
  'we',
  'i',
  'me',
  'my',
  'is',
  'are',
  'be',
  'can',
  'could',
  'would',
  'want',
  'looking',
  'something',
  'somewhere',
  'do',
  'go',
  'have'
]);

function normalise(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9£\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text = '') {
  return normalise(text)
    .split(' ')
    .filter(token => token.length > 2 && !STOP.has(token));
}

function entitySearchText(entity) {
  return [
    entity.name,
    entity.area,
    entity.address,
    ...(entity.subtype || []),
    ...(entity.tags || []),
    ...((entity.facts || []).flatMap(fact => [
      fact.key,
      String(fact.value)
    ]))
  ]
    .filter(Boolean)
    .join(' ');
}

function guideSearchText(guide) {
  return [
    guide.title,
    ...(guide.tags || []),
    ...(guide.members || [])
  ]
    .filter(Boolean)
    .join(' ');
}

function scoreText(queryTokens, haystack) {
  const text = normalise(haystack);
  let score = 0;

  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function querySignals(text = '') {
  const query = normalise(text);
  const signals = new Set(tokens(query));

  const add = (...values) => {
    for (const value of values) {
      signals.add(value);
    }
  };

  if (/\b(kid|kids|children|family)\b/.test(query)) {
    add('family');
  }

  if (/\b(no car|without a car|bus|public transport)\b/.test(query)) {
    add('bus', 'no-car', 'public-transport');
  }

  if (/\b(free|cheap|budget|£\s?\d+)/.test(query)) {
    add('free', 'budget');
  }

  if (/\b(dog|dogs|puppy|pup)\b/.test(query)) {
    add('dog-friendly', 'dogs');
  }

  if (/\b(book|books|reading|read)\b/.test(query)) {
    add('books', 'reading', 'bookish');
  }

  if (/\b(coffee|cafe|café)\b/.test(query)) {
    add('coffee', 'cafe');
  }

  if (/\b(art|gallery|sculpture)\b/.test(query)) {
    add('art', 'culture');
  }

  if (/\b(vegan|plant based|plant-based)\b/.test(query)) {
    add('vegan', 'plant-based');
  }

  if (
    /\b(mocktail|alcohol free|alcohol-free|don'?t drink|non drinker|non-drinker)\b/.test(
      query
    )
  ) {
    add('mocktails', 'alcohol-free');
  }

  if (/\b(date|date night|romantic|anniversary)\b/.test(query)) {
    add('date-night', 'romantic');
  }

  if (/\b(indoor|rain|raining|wet)\b/.test(query)) {
    add('indoor');
  }

  if (/\b(bowling|karaoke|escape room|laser tag|arcade)\b/.test(query)) {
    add(
      'bowling',
      'karaoke',
      'escape-room',
      'laser-tag',
      'arcade'
    );
  }

  if (/\b(stars|astronomy|stargazing|space|observatory)\b/.test(query)) {
    add('astronomy', 'stargazing', 'space');
  }

  return [...signals];
}

export function matchCuratedKnowledge(
  text,
  {
    maxEntities = 8,
    maxGuides = 5
  } = {}
) {
  const queryTokens = querySignals(text);

  const entities = ENTITIES
    .map(entity => ({
      entity,
      score: scoreText(queryTokens, entitySearchText(entity))
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntities)
    .map(item => item.entity);

  const guides = GUIDES
    .map(guide => ({
      guide,
      score: scoreText(queryTokens, guideSearchText(guide))
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxGuides)
    .map(item => item.guide);

  return {
    version: CURATED_KNOWLEDGE_VERSION,
    entities,
    guides
  };
}

function formatFact(fact) {
  const warning =
    fact.freshness === 'volatile'
      ? ' [CURRENT CHECK REQUIRED]'
      : '';

  return `${fact.key}: ${String(fact.value)}${warning}`;
}

export function buildCuratedKnowledgeContext(text) {
  const result = matchCuratedKnowledge(text);

  if (!result.entities.length && !result.guides.length) {
    return '';
  }

  const lines = [
    '',
    'CURATED EXPERIENCE WAKEFIELD KNOWLEDGE:',
    'Use this only as discovery/editorial evidence. It does not override live first-party evidence.',
    'Any field marked CURRENT CHECK REQUIRED must be verified before answering a time-sensitive or current question.',
    'Guide membership is a relationship/recommendation signal, not proof that every implied operational fact is currently true.'
  ];

  for (const entity of result.entities) {
    lines.push(
      `ENTITY: ${entity.name} | type=${entity.type}/${(
        entity.subtype || []
      ).join(',')} | area=${entity.area || 'unknown'}`
    );

    if (entity.tags?.length) {
      lines.push(`  tags: ${entity.tags.join(', ')}`);
    }

    for (const fact of entity.facts || []) {
      lines.push(`  ${formatFact(fact)}`);
    }
  }

  for (const guide of result.guides) {
    lines.push(`GUIDE: ${guide.title}`);
    lines.push(`  tags: ${(guide.tags || []).join(', ')}`);
    lines.push(`  members: ${(guide.members || []).join(' | ')}`);

    if (guide.rule) {
      lines.push(`  rule: ${guide.rule}`);
    }
  }

  lines.push(
    'CURATED-KNOWLEDGE RULE: Never turn an editorial relationship into a live fact. Verify current opening, price, availability, timetable, route, menu, booking, access or event occurrence from the appropriate current source.'
  );

  return lines.join('\n');
}
