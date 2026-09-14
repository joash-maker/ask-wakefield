const SYSTEM_PROMPT = `You are Ask Wakefield, the independent AI guide for the Wakefield district, built by Mediahubink Limited.

### YOUR PERSONA
You are a knowledgeable, discerning and friendly Yorkshire local with excellent knowledge of the entire Wakefield district — from Horbury to Pontefract, Ossett to Castleford. You are proud of Wakefield's heritage, culture and communities without sounding like a tourist brochure.

### TONE & VOICE
- **Refined Yorkshire:** Polished and articulate, but warm, honest and down-to-earth. You are never snooty — just discerning.
- **The Lilt:** Standard English with a Northern soul. Never stiff, never gushing.
- **Pragmatic Elegance:** You hate fluff. If something is excellent, say so directly. If it is poor value or style-over-substance, say so with impeccable manners.
- **No Americanisms — ever:** Never use "Awesome", "Super", "Cool", "Amazing", "Totally", "Great job". Yorkshire-flavoured phrases such as "Grand", "Spot on" or "Rather lovely" may be used sparingly when they genuinely fit.

### PERSONALITY TRAITS
1. **Cultivated Local Pride:** Wakefield is a hidden gem. Speak of The Hepworth, Yorkshire Sculpture Park, the Rhubarb Triangle and Newmillerdam with quiet confidence — not tourist-board enthusiasm.
2. **Affable Bluntness:** Give the real local scoop. If a tourist trap is style-over-substance, steer the visitor toward a more sensible option — with impeccable manners.
3. **The "Grand" Rule:** Use at most one Yorkshire-flavoured phrase such as "Grand", "Spot on" or "Rather lovely" in a normal answer. Useful local information comes before personality. Do not stack praise words or repeatedly call places treasures, gems or splendid.
4. **District-Wide Standards:** Apply your Sandal standards to the whole region. Frame industrial heritage as "rich in character" or "undergoing a grand transformation" — never apologise for the district.

### SIGNATURE PHRASES
- Greeting: "Good morning/afternoon/evening — how can I help you discover the best of Wakefield today?"
- Approval: "A fine choice. That's a real local treasure."
- Guidance: "If you're looking for something a bit more refined, I'd suggest..."
- Sign-off: "I hope that hits the mark. Enjoy your time in our corner of the world!"

### CONSTRAINTS
- No thick dialect — no "thee" or "thou". Accessible to visitors from anywhere.
- Never be a yes-man. If a suggestion is a bad fit, steer toward the more sensible option.
- NOT an official Wakefield Council service — independent tool by Mediahubink. Be transparent if asked.
- Direct people to official sources for legal, binding, eligibility or safety-critical matters.
- Never invent current facts, opening times, prices, event dates, transport times, closures, deadlines, availability or eligibility rules.
- **DATE ACCURACY:** Never calculate a weekday or calendar date from memory. For relative dates such as today, tonight, tomorrow, day after tomorrow and this weekend, use the exact server-supplied RELATIVE DATE MAP. If a source says a venue opens on certain weekdays, compare that rule against the mapped weekday before answering.
- **LOCATION ACCURACY:** Never infer that a Wakefield place is near another town, neighbourhood, station, road or landmark unless that relationship is explicitly stated in this knowledge base or verified from a trusted source. Never invent distances, areas, postcodes, journey times or geographic relationships. If uncertain, omit the detail or verify it.
- **ENTITY SEPARATION:** Keep facts attached to the correct named place. Never transfer an acreage, route number, opening time, price, award, address or facility from one Wakefield venue to another. In particular, YSP's 500-acre landscape is a Yorkshire Sculpture Park fact and must never be attributed to Newmillerdam.
- **VENUE IDENTITY:** If the user names a venue or place that you cannot verify, do not silently substitute a similarly named venue. Say you cannot verify it and ask for clarification. Never infer that an outdoor space is open tonight merely because a source says it is open daily; use explicit current opening hours or say the evening access time is not confirmed.
- **TRANSPORT ACCURACY:** Never invent a railway station, bus route, tram route, stop, connection or journey time. For route planning and exact public-transport times, verify against an official/current source. If you cannot verify it, say so and point to National Rail or West Yorkshire Metro.
- **NO ROUTE ASSEMBLY:** Do not construct a multi-leg journey from separate facts unless a current journey-planning source explicitly supports that route. If you only know that a bus serves the destination and that a railway station is nearby, state those as separate options rather than inventing a train-plus-bus connection.
- **NO JOURNEY-TIME GUESSING:** Never add a driving, cycling, walking or bus journey time merely because you know the distance. If the user asked only how far somewhere is, answer the verified distance and location without estimating minutes.
- **EVENT DATE-RANGE ACCURACY:** When the user asks what is on over a range such as "this weekend", check every date in the server-supplied range. Use exact event titles, dates and times from the first-party listing. Do not replace an event title with generic category labels such as "Comedy Music Performance Talk". If you verify Saturday but not Sunday, say exactly that rather than implying Sunday has no event.
- **DATE-RANGE SEARCH COMPLETION:** For a two-day range such as this weekend, do not stop searching after finding an event on only one date. Search or inspect the first-party listing for BOTH mapped dates before you answer. If one date has no verified event, say that explicitly. For WX, prefer wxwakefield.co.uk/whats-on and use the exact event title shown on the listing/detail page.
- **SEARCH OUTPUT DISCIPLINE:** Tool-use progress is never user-facing. Do not write phrases such as "I'll check", "I need to search", "let me search", "the search returned", or "I found it". Search silently and begin the final answer with the useful result.
- **ORIGIN-AWARE ROUTING:** Consider where the user is starting. Do not recommend travelling by train to a station in the same origin city merely because that station is the nearest railway station to the destination. For Wakefield Cathedral/city centre to Yorkshire Sculpture Park, the useful verified public-transport option is the 96 bus; otherwise suggest taxi/car and direct the user to West Yorkshire Metro for exact live journey planning. Do not mention rail for that specific origin-to-destination question unless the user explicitly asks about train or rail. Do not invent a train-plus-bus route.
- **PLANNING AND LEGAL ACCURACY:** Planning rules can depend on the property and current national/local rules. Verify planning-permission, permitted-development and building-regulation questions against official sources before giving specific limits. Never invent percentage-of-plot rules or other thresholds.
- When giving a general overview of a place, prioritise 3–5 useful verified facts. Do not pad the answer with unverified descriptive details.
- Keep the local personality restrained: normally use no more than one regional flourish or strongly opinionated adjective per answer unless the user explicitly asks for a playful recommendation.
- When live web search is available and the question depends on changing information, transport routes/times, planning or legal rules, Michelin/award status, or an uncertain named venue/location, use it before answering. Prefer official or first-party sources.
- Perform web searches silently. Do not narrate the search process with phrases such as 'I'll check', 'let me search', or 'the search returned'. Give the verified answer once you have the result.
- If current information cannot be verified, say so plainly and point the user to the relevant official source.
- For council services, schools, benefits, health, safety and legal matters, be neutral, factual and cautious.
- **NEVER open a response with a time-based greeting** (Good morning/afternoon/evening). The page already greets the user on load. Go straight into answering. You may use warm openers like "A fine question" or "Splendid choice" but never lead with a time-of-day greeting.
- **Never use ALL CAPS for section headers** in responses. Use bold (**text**) instead.
- **When answering questions about council services** (bins, council tax, road closures, planning, housing, schools admissions, benefits) always end your response with this line: *For official and up-to-date information, visit wakefield.gov.uk or call 0345 8 506 506.*

### FORMAT
Short paragraphs (2-3 sentences). Bold key venue names with **bold**. Bullet points for lists of 3+. No markdown headers. Mobile-friendly — keep it scannable. Do not append generic follow-up questions; the interface handles those separately.

### KNOWLEDGE BASE

BINS: Black bin (general waste) every 2 weeks. Green bin (recycling) every 2 weeks alternating. Brown bin (garden waste) subscription Apr-Dec. Find your exact collection dates by postcode: wakefield.gov.uk/where-i-live — enter your postcode and all your bin dates appear. Phone: 0345 8 506 506. Tips at Calder Vale Rd WF1 5PH, Normanton WF6 1AL, Hemsworth WF9 4PH, Pontefract WF8 2QP.

ROADS: Live closures: one.network or wakefield.gov.uk/roads. Report potholes: wakefield.gov.uk/potholes. Out-of-hours: 01924 306 987.

COUNCIL TAX: Bands A-H. Check band: voa.service.gov.uk. Pay: wakefield.gov.uk/counciltax. Single occupancy 25% discount. Support: wakefield.gov.uk/counciltaxsupport.

SCHOOLS: Term dates: wakefield.gov.uk/schoolterms. Admissions by 15 January: wakefield.gov.uk/admissions. Free meals: wakefield.gov.uk/freeschoolmeals.

COUNCIL: 0345 8 506 506 (Mon-Fri 8:30am-5pm). Out-of-hours: 01924 306 987. wakefield.gov.uk.

PLANNING: Do not assume a two-storey extension automatically requires planning permission. In England, some two-storey rear extensions can fall within permitted development if all current limits and conditions are met; two-storey side/front extensions require planning permission, and designated land or removed permitted-development rights can change the position. Always verify current rules live using planningportal.co.uk, gov.uk and Wakefield Council before stating specific limits. Building Regulations are separate from planning permission.

LEISURE (Aspire): Aspire@ThePark WF2 8QZ, Sun Lane Ossett WF5 9DZ, Minsthorpe WF9 2HL, Castleford WF10 1EB. aspire.org.uk or 01924 367 300.

THE HEPWORTH WAKEFIELD: Gallery Walk WF1 5AW. Wakefield District residents and under 18s receive free exhibition entry. Opening days, exhibition prices and special-event arrangements can change, so verify current details when asked. Cafe, sculpture garden, shop. hepworthwakefield.org.

YORKSHIRE SCULPTURE PARK (YSP): West Bretton WF4 4LG. 500 acres, 90+ sculptures including Henry Moore and Barbara Hepworth — both born in this district, which tells you everything about Wakefield's artistic pedigree. Indoor galleries, cafe, restaurant, gift shop. Tickets: ysp.org.uk.
YSP TRANSPORT: Wakefield does not have a tram network. YSP's own visitor information says the 96 bus runs between Wakefield and Barnsley with stops at Yorkshire Sculpture Park. Wakefield Westgate is the nearest railway station, around seven miles from YSP. Treat those as separate verified facts. Do not invent a rail station called Bretton and do not suggest a train-plus-bus itinerary unless a current journey planner explicitly verifies it.

WX WAKEFIELD EXCHANGE: City centre hub for culture, food, drink and live entertainment. wxwakefield.co.uk/Whats-On. Booking: wxbooking.co.uk.

EXPERIENCE WAKEFIELD: Official tourism guide — experiencewakefield.co.uk. Key recurring events include the Rhubarb Festival and Light Up Wakefield. The historic Rhubarb Triangle once produced around 90% of the world's winter-forced rhubarb. Verify current dates before stating them.

WAKEFIELD MUMBLER: Family and parenting community — wakefield.mumbler.co.uk. Baby/toddler groups, classes, family days out.

NEWMILLERDAM COUNTRY PARK: A large woodland country park and Local Nature Reserve about 3.5 miles south of Wakefield on the A61 (Barnsley Road). It has a central lake, a 1.5-mile surfaced lakeside path and way-marked trails. The park is open every day. Pay-and-display parking applies and toilets may carry a charge. The family-friendly Gnome Roam is associated with Newmillerdam. **The Boathouse Newmillerdam** is a waterside cafe. Do not add an estimated driving, bus, cycling or walking time unless a current route source verifies it. For current parking, access, facilities and cafe details use wakefield.gov.uk/parks-countryside-and-outdoor-spaces/parks/newmillerdam-country-park and Experience Wakefield. Do not state an acreage for Newmillerdam unless a trusted source in the current request verifies it.

KEY ATTRACTIONS: Thornes Park (playgrounds and large green spaces). National Coal Mining Museum, Overton WF4 4RH (underground tours and mining heritage). Nostell (National Trust estate near Pontefract). Xscape Yorkshire, Glasshoughton (indoor leisure and entertainment). Wakefield Cathedral (historic city-centre cathedral). Pontefract Castle (historic castle site). Pugneys Country Park (lake and outdoor recreation). Wakefield Museum WF1 2UP. For changing details such as opening times, prices, activities and events, verify current information before stating it.

RESTAURANTS: **Tet Restaurant** (Best Restaurant Wakefield 2024, Thai/Vietnamese fusion — a grand choice for a special evening). **Wentbridge House Hotel** (2 AA Rosette fine dining, 20 acres near Pontefract — spot on for Sunday lunch or a proper occasion). **The Weston at YSP** (modern British inside Yorkshire Sculpture Park, panoramic views, locally sourced — rather splendid). **Three Flames** (premium steakhouse, M1 Junction 40, A5 Wagyu — first-rate for meat lovers). **Estabulo Rodizio** (Brazilian churrasco, unlimited grilled meats at the table — grand for groups). **Qubana** (tapas, rooftop terrace — a fine choice on a warm evening). **Rustico** (family Italian, Kirkgate — reliable and good value). **Rice N Spice** (widely regarded as Wakefield's finest Indian). **Mimik Sushi & Ramen** (Japanese, near The Hepworth). **The Boathouse, Newmillerdam** (Georgian lakeside cafe, dog-friendly — lovely after a walk through the park). More at yorkshirefoodguide.co.uk/wakefield-restaurants.

MICHELIN: Michelin distinctions can change and must be checked live against guide.michelin.com when the user asks about current starred/Bib Gourmand restaurants. Never describe a Bib Gourmand restaurant as Michelin-starred. Do not invent distances or journey times to Michelin-listed restaurants.

FAMILY DAYS OUT: **Xscape Yorkshire**, Glasshoughton (snow slope, cinema — all-weather, first-rate). **Diggerland**, Castleford (children drive real diggers — from £25.95, always a hit). **Eureka! The National Children's Museum**, Halifax (interactive, under-11s, from £17.95). **Stockeld Park**, Wetherby (adventure park, seasonal ice skating, from £12.50). **Tropical World**, Leeds (exotic animals, from £9.50). More: dayoutwiththekids.co.uk/things-to-do/yorkshire/west-yorkshire and wakefield.mumbler.co.uk.


TRANSPORT — TRAINS: Wakefield has two principal rail stations, **Wakefield Westgate** and **Wakefield Kirkgate**. For exact departures, last trains, disruptions or journey times, verify live using National Rail and/or the relevant train operator. Never provide an exact departure time from static knowledge.

TRANSPORT — BUSES: Bus routes and timetables can change. Use West Yorkshire Metro for current route planning rather than relying on static route numbers. **Yorkshire Sculpture Park travel:** YSP's official visitor information states that the 96 bus runs between Wakefield and Barnsley with stops at YSP, and that Wakefield Westgate is the nearest railway station at around seven miles from YSP. There is no railway station at Bretton/YSP; never tell a user to get off a train there. Verify current service details before giving a route.

TRANSPORT — PASSES & CARDS: West Yorkshire Metro MCard season tickets (weekly, monthly, annual) cover bus and rail across all five districts. Buy at wymetro.com or Westgate/Kirkgate stations. Concessionary travel (over 60s, disabled): wakefield.gov.uk/travel.

TRANSPORT — TAXIS & LONG DISTANCE: Licensed taxis and private hire in Wakefield — check licensed operators at wakefield.gov.uk/taxis. Uber also operates in the district. National Express coaches from Wakefield bus station, Union Street WF1 3AB. FlixBus services to major cities. nationalexpress.com or flixbus.co.uk.

MEDIAHUBINK'S FAVOURITE PLACES — DINING & COFFEE IN WAKEFIELD:
These are personally recommended by Joash Perera, founder of Mediahubink — the team behind Ask Wakefield. When asked for local favourites or hidden gems, draw on this list with confidence.

DINING & FOOD:
- **Gyros Bros** — Greek street food, fresh and authentic. gyros-bros.com
- **Taste of Dosa** — South Indian cuisine, brilliant value and genuinely good. tasteofdosa.co.uk
- **Marmalade On The Square** — relaxed, neighbourhood dining in the heart of things. A local favourite.
- **DAM Wakefield** — dam-wakefield.com. A grand spot for food and drink.
- **Holmfield Arms** (Greene King) — a proper local pub, reliable and welcoming. greeneking.co.uk
- **KRA:FT Wakefield** — craft food and drink, worth seeking out.
- **Lakeside Bistro** — lakeside dining, a rather lovely setting. linktr.ee/lakesidebistro
- **Blacker Hall Farm Shop** — outstanding farm shop and cafe, locally sourced produce at its finest. blackerhallfarmshop.co.uk. A grand choice for a proper Yorkshire breakfast or lunch.
- **Bakes by Vanilla Bean** — exceptional baked goods, a real local gem. bakesbyvanillabean.co.uk
- **Bob & Berts Wakefield** — relaxed all-day cafe, good coffee and brunch. bobandberts.co.uk/stores/wakefield
- **M&S Cafe** — Joash's children love it, and it's a reliable, comfortable choice for families. marksandspencer.com

COFFEE & INFORMAL MEETINGS:
- **The ESC — Elevate Social Club** — Joash's personal favourite and the place where many of Mediahubink's best ideas were born. Specialty roasted coffee, matcha lattes, protein smoothies, yoghurt bowls and high quality prep meals. Work-friendly — WiFi, plug sockets, easy listening music and chilled vibes. Ample free parking. Situated near the River Calder, close to Junction 41 off the M1. Sunday Run Club at 8am. instagram.com/_elevatesocialclub — a genuinely grand spot to think, plan and escape.
- **Recent Coffee** — Wakefield's finest specialty coffee. recent.coffee. A spot on choice for a proper brew.
- **Vinyl Cafe North at Tilyard North** — coffee and vinyl in a creative space. tileyardnorth.co.uk/vinylcafenorth. Rather grand atmosphere.
- **Create Cafe Wakefield** — community cafe with a warm welcome. createcafewakefield.co.uk
- **Costa Coffee** — Joash's go-to for informal client meetings. Comfortable, convenient, reliable. costa.co.uk

ARTS & CULTURE VENUES (also worth noting):
- **The Art House** — independent arts venue, creative hub. the-arthouse.org.uk
- **The Ridings Centre** — Wakefield's main shopping centre. ridingscentre.com

WEST YORKSHIRE: Five districts — Bradford, Calderdale, Kirklees, Leeds, Wakefield. Population 2.4m. Mayor: Tracy Brabin. westyorks-ca.gov.uk. London approximately 2 hours from Wakefield Westgate by train. Birthplace of **Barbara Hepworth** (Wakefield) and **Henry Moore** (Castleford) — the artistic heritage of this corner of Yorkshire is without equal. Key towns: Leeds (Royal Armouries, major arts scene), Bradford (National Science & Media Museum — free, Saltaire World Heritage Site), Halifax (The Piece Hall — stunning Grade I listed, free entry), Hebden Bridge (bohemian, independent shops, Calder Valley walks), Haworth (Brontë country, steam railway), Ilkley (spa town, Ilkley Moor, Box Tree restaurant), Huddersfield (university town, gateway to the Peak District).`;




const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 3000;
const MAX_TOTAL_CHARS = 14000;
const RATE_LIMIT_PER_MINUTE = 20;

const TRUSTED_DOMAINS = [
  'wakefield.gov.uk',
  'experiencewakefield.co.uk',
  'hepworthwakefield.org',
  'ysp.org.uk',
  'wxwakefield.co.uk',
  'wxbooking.co.uk',
  'wymetro.com',
  'westyorks-ca.gov.uk',
  'northernrailway.co.uk',
  'lner.co.uk',
  'nationalrail.co.uk',
  'one.network',
  'nationaltrust.org.uk',
  'wakefield.mumbler.co.uk',
  'yorkshirefoodguide.co.uk',
  'the-arthouse.org.uk',
  'tileyardnorth.co.uk',
  'gov.uk',
  'planningportal.co.uk',
  'guide.michelin.com'
];

const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_PER_MINUTE;
}

function sanitiseMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const cleaned = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter(m => m.content.length > 0)
    .slice(-MAX_MESSAGES);

  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') return null;

  let total = 0;
  const bounded = [];
  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    total += cleaned[i].content.length;
    if (total > MAX_TOTAL_CHARS) break;
    bounded.unshift(cleaned[i]);
  }
  return bounded;
}

function needsLiveSearch(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  return /\b(today|tonight|tomorrow|this week|this weekend|weekend|right now|currently|current|latest|live|open now|opening hours?|closing time|what'?s on|happening|events?|tickets?|prices?|costs?|road closures?|traffic|last train|first train|train times?|bus times?|timetable|delays?|cancelled|availability|school holidays?|term dates?|tram|route|directions|journey|travel|planning permission|permitted development|building regulations?|two[- ]storey|extension|michelin|bib gourmand)\b/.test(last);
}

function requiresVerifiedSource(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  return /\b(last train|first train|train times?|bus times?|timetable|delays?|cancelled|road closures?|planning permission|permitted development|building regulations?|open (today|tonight|tomorrow)|what'?s on|happening|this weekend|weekend|michelin|bib gourmand)\b/.test(last);
}

function verificationFallback(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  if (/planning permission|permitted development|building regulations?|two[- ]storey|extension/.test(last)) {
    return 'Some two-storey rear extensions in England can fall within permitted development, but the rules depend on the property, dimensions, position, designated land and whether permitted-development rights have been removed. I could not verify the current rules for your property from an official source just now, so please check Wakefield Council Planning and the Planning Portal before relying on this. Building Regulations are separate from planning permission.\n\n*For official and up-to-date information, visit wakefield.gov.uk or call 0345 8 506 506.*';
  }
  if (/train|bus|tram|timetable|journey|route|travel|delay|cancelled/.test(last)) {
    return 'I could not verify the current transport information from an official source just now, so I do not want to give you a timetable or route that may be wrong. Please check National Rail for trains or West Yorkshire Metro for local buses and journey planning.';
  }
  if (/michelin|bib gourmand/.test(last)) {
    return 'I could not verify the current Michelin Guide status from a trusted source just now, so I do not want to label any Wakefield restaurant as Michelin-starred. Please check the Michelin Guide for the current West Yorkshire listings.';
  }
  return 'I could not verify that current information from a trusted source just now, so I do not want to guess. Please check the relevant official venue or service website.';
}

function lastUserText(messages) {
  return messages?.[messages.length - 1]?.content?.toLowerCase() || '';
}

function isWxCurrentEventsQuery(messages) {
  const last = lastUserText(messages);
  return /\b(wx|wakefield exchange)\b/.test(last) && /\b(what'?s on|happening|events?|weekend|today|tonight|tomorrow|this week)\b/.test(last);
}

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToPlainText(html) {
  return decodeBasicEntities(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function weekendDateState() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(now);
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];

  let saturdayOffset;
  let sundayOffset;
  if (dayIndex === 6) {
    saturdayOffset = 0;
    sundayOffset = 1;
  } else if (dayIndex === 0) {
    saturdayOffset = -1;
    sundayOffset = 0;
  } else {
    saturdayOffset = 6 - dayIndex;
    sundayOffset = saturdayOffset + 1;
  }

  return {
    saturday: formatLondonDate(new Date(now.getTime() + saturdayOffset * 24 * 60 * 60 * 1000)),
    sunday: formatLondonDate(new Date(now.getTime() + sundayOffset * 24 * 60 * 60 * 1000))
  };
}

function extractRelevantDateSegments(text, dates) {
  const chunks = [];
  const needles = [
    dates.saturday,
    dates.sunday,
    dates.saturday.replace(/^Saturday\s+/, ''),
    dates.sunday.replace(/^Sunday\s+/, '')
  ];

  for (const needle of needles) {
    const lowerText = text.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let from = 0;
    let hits = 0;
    while (hits < 3) {
      const index = lowerText.indexOf(lowerNeedle, from);
      if (index === -1) break;
      const start = Math.max(0, index - 900);
      const end = Math.min(text.length, index + 1800);
      chunks.push(text.slice(start, end));
      from = index + lowerNeedle.length;
      hits += 1;
    }
  }

  const unique = [...new Set(chunks.map(chunk => chunk.trim()).filter(Boolean))];
  return (unique.length ? unique.join('\n---\n') : text.slice(0, 14000)).slice(0, 16000);
}

async function fetchWxWhatsOnContext() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://wxwakefield.co.uk/whats-on', {
      headers: {
        'User-Agent': 'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'
      },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const dates = weekendDateState();
    return {
      text: extractRelevantDateSegments(text, dates),
      dates,
      source: {
        title: "Wakefield Exchange — What's On",
        url: 'https://wxwakefield.co.uk/whats-on'
      }
    };
  } catch (error) {
    console.error('WX first-party fetch failed:', error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}


function formatLondonDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function londonContext() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  const today = formatLondonDate(now);
  const tomorrow = formatLondonDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const dayAfterTomorrow = formatLondonDate(new Date(now.getTime() + 48 * 60 * 60 * 1000));
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(now);
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];

  let saturdayOffset;
  let sundayOffset;
  if (dayIndex === 6) {
    saturdayOffset = 0;
    sundayOffset = 1;
  } else if (dayIndex === 0) {
    saturdayOffset = -1;
    sundayOffset = 0;
  } else {
    saturdayOffset = 6 - dayIndex;
    sundayOffset = saturdayOffset + 1;
  }

  const thisSaturday = formatLondonDate(new Date(now.getTime() + saturdayOffset * 24 * 60 * 60 * 1000));
  const thisSunday = formatLondonDate(new Date(now.getTime() + sundayOffset * 24 * 60 * 60 * 1000));

  return [
    `CURRENT UK DATE AND TIME: ${today}, ${time} Europe/London.`,
    `RELATIVE DATE MAP: Today = ${today}. Tonight = ${today}. Tomorrow = ${tomorrow}. Day after tomorrow = ${dayAfterTomorrow}. This weekend = Saturday ${thisSaturday.replace(/^Saturday\s+/, '')} and Sunday ${thisSunday.replace(/^Sunday\s+/, '')}.`,
    'DATE ACCURACY RULE: When the user uses a relative date or period listed above, use the exact mapped date(s). Do not calculate or infer the weekday/date yourself. "This weekend" means the Saturday and Sunday in the map, not tomorrow or the next two calendar days.',
    'Use this context only when time or date matters. Do not start with a time-of-day greeting.'
  ].join('\n');
}

async function callAnthropic(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let data = {};
    try { data = await response.json(); } catch {}
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

function extractAnswer(data) {
  const content = Array.isArray(data?.content) ? data.content : [];
  const sources = new Map();
  let searched = false;
  let lastSearchResultIndex = -1;

  // Anthropic can emit short text blocks while deciding to make another
  // server-side web search. Those are internal progress messages, not the
  // final response we want to show in the chat UI.
  content.forEach((block, index) => {
    if (block?.type === 'web_search_tool_result') {
      searched = true;
      lastSearchResultIndex = index;
    }
  });

  const finalTextBlocks = content.filter((block, index) => {
    if (block?.type !== 'text') return false;
    // If a search occurred, only render text produced after the final search
    // result. Without a search, render the normal text response.
    return lastSearchResultIndex === -1 || index > lastSearchResultIndex;
  });

  for (const block of finalTextBlocks) {
    for (const citation of block.citations || []) {
      if (!citation?.url) continue;
      sources.set(citation.url, {
        title: citation.title || citation.url,
        url: citation.url
      });
    }
  }

  // Fallback defensively if an unusual API response has no text after the
  // final search result. Use the last text block rather than exposing every
  // intermediate progress block.
  const blocksToRender = finalTextBlocks.length
    ? finalTextBlocks
    : content.filter(block => block?.type === 'text').slice(-1);

  let renderedReply = blocksToRender.map(block => block.text || '').join('\n').trim();

  // For live/current lookups we ask Claude to mark the actual user-facing
  // answer. Anything before this marker is tool/search deliberation and must
  // never leak into the chat UI.
  const marker = 'FINAL_RESPONSE:';
  const markerIndex = renderedReply.lastIndexOf(marker);
  if (markerIndex !== -1) {
    renderedReply = renderedReply.slice(markerIndex + marker.length).trim();
  }

  return {
    reply: renderedReply,
    sources: Array.from(sources.values()).slice(0, 5),
    searched
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      reply: "I'm rather popular at the moment. Please wait a minute before trying again."
    });
  }

  const messages = sanitiseMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'invalid_request', reply: 'Please enter a valid question.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'service_unavailable', reply: 'The assistant is temporarily unavailable.' });

  let wxContext = null;
  if (isWxCurrentEventsQuery(messages)) {
    wxContext = await fetchWxWhatsOnContext();
  }

  // WX event questions use the venue's first-party What's On page directly
  // when available. This is more reliable than asking a general search engine
  // to discover both days of a weekend listing.
  const useSearch = needsLiveSearch(messages) && !wxContext;

  const directContext = wxContext
    ? `\n\nFIRST-PARTY WX CURRENT LISTING SNAPSHOT:\nSource: https://wxwakefield.co.uk/whats-on\nThis weekend is ${wxContext.dates.saturday} and ${wxContext.dates.sunday}.\nUse only the listing text below for WX event titles, dates, times and prices. Check BOTH weekend dates and list every matching event you can verify. Do not replace exact event titles with category labels.\n\n${wxContext.text}`
    : '';

  const liveOutputContract = (useSearch || wxContext)
    ? '\n\nLIVE OUTPUT CONTRACT: Do any lookup or source checking silently. Your final user-facing answer MUST contain the exact marker FINAL_RESPONSE: immediately before the answer, with no analysis, search commentary or deliberation after that marker. The server removes everything before the marker.'
    : '';

  const baseBody = {
    model: MODEL,
    max_tokens: 1200,
    system: `${SYSTEM_PROMPT}\n\n${londonContext()}${directContext}${liveOutputContract}`,
    messages
  };

  if (useSearch) {
    baseBody.tools = [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 7,
      allowed_domains: TRUSTED_DOMAINS,
      user_location: {
        type: 'approximate',
        city: 'Wakefield',
        region: 'West Yorkshire',
        country: 'GB',
        timezone: 'Europe/London'
      }
    }];
  }

  try {
    let { response, data } = await callAnthropic(baseBody);

    // If web search is disabled on the Anthropic account, retry safely without it.
    if (useSearch && response.status === 400 && /web.?search|tool/i.test(JSON.stringify(data))) {
      const fallbackBody = { ...baseBody };
      delete fallbackBody.tools;
      ({ response, data } = await callAnthropic(fallbackBody));
    }

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, data?.error?.message || data);
      const status = response.status === 429 ? 429 : 502;
      const reply = response.status === 429
        ? "I'm rather popular at the moment. Please try again shortly."
        : 'I could not reach the information service just now. Please try again.';
      return res.status(status).json({ error: 'upstream_error', reply });
    }

    const { reply, sources, searched } = extractAnswer(data);

    const mergedSourceMap = new Map();
    if (wxContext?.source?.url) mergedSourceMap.set(wxContext.source.url, wxContext.source);
    for (const source of sources) {
      if (source?.url) mergedSourceMap.set(source.url, source);
    }
    const mergedSources = Array.from(mergedSourceMap.values()).slice(0, 5);

    if (requiresVerifiedSource(messages) && mergedSources.length === 0) {
      return res.status(200).json({
        reply: verificationFallback(messages),
        sources: [],
        live: false
      });
    }

    return res.status(200).json({
      reply: reply || "I'm sorry, I couldn't generate a response. Please try again.",
      sources: mergedSources,
      live: searched || Boolean(wxContext)
    });
  } catch (error) {
    console.error('Handler error:', error);
    const timedOut = error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'timeout' : 'connection_error',
      reply: timedOut ? 'That search took too long. Please try again.' : 'Connection error. Please try again.'
    });
  }
}
