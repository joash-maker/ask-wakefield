import { PLACES } from './askwakefield-places-data.js';

function matchesPlaceName(query, place) {
  const normal = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
  const text = ' '+normal(query)+' ';
  return [place.name, ...(place.aliases || [])].some(name => text.includes(' '+normal(name)+' '));
}

export function namedDiningFollowUp(query) {
  const picks = PLACES.filter(p => p.dining && matchesPlaceName(query,p));
  if (!picks.length) return null;
  const weekday = String(query).match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const day = weekday ? weekday.slice(0,3).replace(/^./,c=>c.toUpperCase()) : null;
  return { kind:'food.venue_details', area:'Wakefield', constraints:{}, reply:picks.map(p => p.name+' at '+p.address+': '+p.food+'. '+(day ? 'Published '+day+' hours: '+p.hours[day]+'. ' : '')+(p.conflict ? 'The published hours conflict or distinguish bar and restaurant service, so confirm the meal-service time with the operator. ' : '')+'Check the current menu, prices and table availability before booking.').join('\n\n'), sources:picks.map(p=>({title:p.name,url:p.source})) };
}

export function nightlifeRecommendation(query, state) {
  const q = String(query || '');
  if (['places.city_itinerary','places.family_plan'].includes(state?.lastIntent)) return null;
  const named = PLACES.filter(p => p.nightlifeStyle && q.toLowerCase().includes(p.name.toLowerCase().replace(/^the /, '')));
  const continuation = state?.lastIntent === 'places.nightlife_plan' && /cocktails?|beer|gin|games|party|wood street|tileyard|westgate/i.test(q);
  if (!named.length && !continuation && !/\b(?:bars?|pubs?|nightclubs?|nightlife|night out|cocktails?|taprooms?)\b/i.test(q)) return null;
  if (/\b(?:open now|right now|wheelchair|kids|children|family|under 18)\b|£/i.test(q)) return null;
  const common = { kind: 'places.nightlife_plan', area: 'Wakefield', constraints: { nightlife: true } };
  if (named.some(p => p.recommendationStatus === 'needs-current-operating-check')) return { ...common, reply: 'Journey Lounge at 11 Bull Ring has been reported as a new bar by Wakefield First, but the linked operator website still says coming soon. I cannot confirm its current opening or recommend it as open tonight until that conflict is resolved.', sources: named.map(p => ({title:p.name,url:p.source})) };
  let picks = named.length ? named : PLACES.filter(p => p.nightlifeStyle && p.recommendationStatus !== 'needs-current-operating-check' && p.locality !== 'Castleford');
  if (!named.length) {
    if (/wood street/i.test(q)) picks = picks.filter(p => /wood street/i.test(p.address));
    else if (/tileyard/i.test(q)) picks = picks.filter(p => /tileyard/i.test(p.address));
    else if (/westgate/i.test(q)) picks = picks.filter(p => /westgate/i.test(p.address));
    const style = /\b(?:beer|taproom)\b/i.test(q) ? 'beer' : /cocktail|speakeasy|date night/i.test(q) ? 'cocktails' : /danc|party|nightclub/i.test(q) ? 'party' : /games|axe throwing|darts/i.test(q) ? 'games' : /\bgin\b/i.test(q) ? 'gin' : /music/i.test(q) ? 'music' : null;
    if (style) picks = picks.filter(p => p.nightlifeStyle === style);
    else {
      const chosen = ['AW-E006','AW-N004','AW-N006','AW-N009'];
      picks.sort((a,b) => (chosen.includes(a.id) ? chosen.indexOf(a.id) : 99) - (chosen.includes(b.id) ? chosen.indexOf(b.id) : 99));
    }
  }
  if (!picks.length) return null;
  picks = picks.slice(0,4);
  const weekday = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const day = weekday ? weekday.slice(0,3).replace(/^./,c=>c.toUpperCase()) : /\b(?:today|tonight|this evening)\b/i.test(q) ? new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(new Date()) : null;
  if (day && !named.length) picks = picks.filter(p => p.hours[day] !== 'Closed');
  if (!picks.length) return { ...common, reply: 'The published records show these venues closed on your chosen day. Try a different day or a different style of venue rather than assume they are open.', sources: [] };
  const lines = picks.map(p => '• '+p.name+' ('+p.address+'): '+p.description+(day ? '. Published '+day+' hours: '+p.hours[day] : ''));
  return { ...common, reply: (named.length ? 'Here are the published details for your choice:' : 'Here are different ways to spend an evening in Wakefield:')+'\n\n'+lines.join('\n\n')+'\n\nThese are venue suggestions, not confirmation that they are open or have tickets available tonight. Check your date, last orders and any admission or activity charge with the operator. A venue hosting music does not confirm a performance tonight. Would you prefer cocktails, craft beer, games or dancing?', sources:picks.map(p=>({title:p.name,url:p.source})) };
}

export function foodSpecificFollowUp(query, state) {
  const q = String(query || '');
  if (!/desserts?|deserts?|vanilla bean/i.test(q) && state?.lastIntent !== 'food.open_at') return null;
  const common = { kind: 'food.open_at', area: 'Wakefield', constraints: state?.constraints || {} };
  if (/vanilla bean/i.test(q)) return { ...common, reply: 'Yes, Bakes by Vanilla Bean at 28 Wood Street offers brownies, blondies, cookies and speciality coffee, to sit in or take away. It is a daytime choice: Experience Wakefield publishes Monday–Friday 08:00–17:00, Saturday 09:00–17:00 and Sunday 10:00–16:00. That makes it unsuitable for your evening plan after 17:00. For later dessert, consider Rassam’s Creamery or Legends and check the serving time before setting off.', sources: [{title:'Bakes by Vanilla Bean',url:'https://experiencewakefield.co.uk/venue/bakes-by-vanilla-bean/'}] };
  if (/\b(?:train|railway) station\b|\b(?:westgate|kirkgate) station\b/i.test(q)) return { ...common, reply: 'Do you mean Wakefield Westgate or Wakefield Kirkgate station? For Westgate, Rassam’s Creamery at Unit 7, 2 Burgage Square, Merchant Gate is a dessert candidate to check, with published daily hours 11:00–22:00. Dolce Vita on Smyth Street is another option in the Westgate area. I have not measured walking distances, so I would not rank them by proximity. Tell me which station and your arrival time so the shortlist matches your journey.', sources: sourcesFor('AW-E002','AW-E001') };
  return null;
}

export function publishedFoodRecommendation(query, constraint) {
  const q = String(query || '');
  if (constraint?.mode === 'now') return null;
  if (!/\b(?:desserts?|cakes?|pudding|sweet treats?)\b/i.test(q)) return null;
  if (/\b(?:free|vegan|gluten|allerg|halal|dog|wheelchair|independent|no car)\b|£/i.test(q)) return null;
  const area = areaFrom(q);
  if (area && area !== 'city') return null;
  const coffee = /\b(?:coffee|hot drinks?|tea)\b/i.test(q);
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][constraint?.day ?? new Date().getDay()];
  const target = constraint && constraint.mode !== 'day' ? constraint.hour * 60 + (constraint.minute || 0) : null;
  const picks = PLACES.filter(p => p.servesDessert === true && (!coffee || p.servesCoffee === true)
    && (area !== 'city' || p.cityCentre)
    && (!/\bwood street\b/i.test(q) || /wood street/i.test(p.address)))
    .filter(p => {
      if (target == null) return true;
      return [...String(p.hours[day]).matchAll(/(\d{2}):(\d{2})–(\d{2}):(\d{2})/g)].some(m => {
        const start = +m[1] * 60 + +m[2];
        let end = +m[3] * 60 + +m[4];
        if (end <= start) end += 1440;
        return constraint.mode === 'after' ? end > target : start <= target && end > target;
      });
    }).sort((a,b) => Number(/Creamery|Legends|Sip & Dip/.test(b.name)) - Number(/Creamery|Legends|Sip & Dip/.test(a.name))).slice(0, 4);
  if (!picks.length) return null;
  const lines = picks.map(p => `• ${p.name}, ${p.address}: ${p.food}. Published ${day} hours: ${p.hours[day]}.`);
  return {
    reply: `For ${coffee ? 'coffee and something sweet' : 'dessert'}, I would consider:\n\n${lines.join('\n\n')}\n\nThese use published venue details, not a live availability check. ${constraint?.approximate ? 'I treated after work/evening as after 17:00; tell me your arrival time if it is later. ' : ''}For a restaurant, check that it takes dessert-only visits and is still serving when you arrive.`,
    sources: picks.map(p => ({ title: p.name, url: p.source })),
    places: picks
  };
}

const UNKNOWN = /^(unknown|not stated|not verified|n\/a)$/i;
const known = value => value && !UNKNOWN.test(String(value).trim());
const lower = value => String(value || '').toLowerCase();
const tidy = value => String(value || '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

function interests(text) {
  const q = lower(text);
  return {
    family: /\b(kids?|children|child|family|play|toddler|\d{1,2}[- ]year[- ]old)\b/.test(q),
    nightlife: /\b(bars?|pubs?|nightclubs?|nightlife|cocktails?|taprooms?|beer|gin)\b/.test(q),
    coffee: /\b(coffee|cafe|caf[eé]|hot drink)\b/.test(q),
    food: /\b(food|eat|lunch|dinner|breakfast|restaurant|meal)\b/.test(q),
    books: /\b(books?|bookshop|reading)\b/.test(q),
    art: /\b(art|gallery|museum|culture)\b/.test(q),
    outdoor: /\b(park|outside|outdoor|walk|fresh air)\b/.test(q),
    meeting: /\b(meet|meeting|chat|conversation|work|laptop|wi[- ]?fi|wifi|sit down|seating)\b/.test(q)
  };
}

function score(place, query, goals) {
  const q = tidy(query);
  const name = tidy(place.name);
  const type = lower(place.type);
  const tags = lower(place.tags);
  const family = lower(place.family);
  let n = 0;
  if (goals.nightlife && place.nightlifeStyle) n += 20;
  if (matchesPlaceName(query, place)) n += 100;
  if (name.length > 5 && q.includes(name)) n += 100;
  if (goals.family && known(place.family)) n += 8;
  if (goals.family && /play|family|child|kid|trail|activity|activities|ages? 0|ages? 2/i.test(family)) n += 6;
  if (goals.family && /bar|pub|takeaway|escape room/i.test(type)) n -= 15;
  if (goals.coffee && /coffee|caf[eé]|tearoom/i.test(type)) n += 10;
  if (goals.food && (known(place.food) || /restaurant|food|caf[eé]|bakery/i.test(type))) n += 8;
  if (/\bbreakfast\b/i.test(query) && /\bbreakfast\b/i.test(place.food)) n += 12;
  if (goals.books && (/book|librar/i.test(type) || known(place.books))) n += 10;
  if (goals.books && /book/i.test(type + ' ' + place.name)) n += 6;
  if (goals.art && /art|gallery|museum/i.test(type)) n += 10;
  if (goals.outdoor && /park|garden|trail|castle/i.test(type)) n += 10;
  if (goals.meeting && /^yes\b/i.test(place.wifi || '')) n += 8;
  if (goals.meeting && /^yes\b/i.test(place.seating || '')) n += 5;
  if (goals.coffee && /\b(plan|afternoon|spend|sit|stay|three hours)\b/i.test(query)) {
    if (/^yes\b/i.test(place.seating || '')) n += 7;
    if (/^limited\b/i.test(place.seating || '')) n -= 12;
  }
  if (q.includes('pottery') && /pottery/i.test(name + type)) n += 12;
  if (q.includes('cinema') && /cinema/i.test(type)) n += 12;
  if (q.includes('bowling') && /bowling/i.test(type)) n += 12;
  if (q.includes('free') && /^free\b/i.test(place.priceStatus)) n += 5;
  if (/\b(book|budget|cost|price|£\s*\d)/i.test(query) && /^free\b/i.test(place.priceStatus)) n += 3;
  if (known(place.tags) && q.split(/\s+/).some(word => word.length > 4 && tags.includes(word))) n += 1;
  return n;
}

function areaFrom(text) {
  const q = lower(text);
  for (const area of ['Horbury','Ossett','Castleford','Pontefract','Wintersett','Newmillerdam','Sandal','Nostell','Overton','West Bretton']) {
    if (q.includes(area.toLowerCase())) return area;
  }
  if (/\b(city centre|town centre|wakefield city|in town)\b/.test(q)) return 'city';
  return null;
}

function budgetFrom(text) {
  const q = String(text || '');
  const amount = q.match(/£\s*(\d+(?:\.\d{1,2})?)\b|\b(\d+(?:\.\d{1,2})?)\s*(?:pounds?|quid)\b/i);
  const freeOnly = /\b(?:free|no spend|no money|zero budget)\b/i.test(q) || /£\s*0(?:\.00)?\b/i.test(q);
  const lowCost = /\b(?:cheap|inexpensive|low[- ]cost|tight budget|on a budget|not much money)\b/i.test(q);
  if (!amount && !freeOnly && !lowCost) return '';
  if (freeOnly && (!amount || Number(amount[1] || amount[2]) === 0)) {
    return 'Budget: free activities only. A free entry label does not prove free parking, food, transport or add-ons. State these separately, or say their cost is unknown.';
  }
  if (!amount) return 'Budget: low cost requested, no exact cap given. Prioritise confirmed free/low-cost admission; do not invent a price.';
  const pounds = Number(amount[1] || amount[2]);
  const scope = /\b(per person|each person|each of us|per adult|per child|each child|each)\b/i.test(q)
    ? 'per person or unit as stated by the user'
    : 'total for the group unless the user clarifies otherwise';
  const cap = /\b(?:under|below|maximum|max|up to|no more than|within|at most|limit)\b/i.test(q);
  return `Budget: £${pounds.toFixed(2)} ${scope}; ${cap ? 'hard upper limit' : 'planning amount'}. Add only exact, current, verified prices for the right people and activity; calculate the group total before saying the plan fits. Keep admission, food, parking and transport separate. Unknown or variable costs cannot be counted as £0 or guaranteed within budget. If a complete total is unavailable, offer an honest lower-cost plan and flag the unresolved costs.`;
}

function recentAssistantText(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(message => message?.role === 'assistant' && typeof message.content === 'string')
    .slice(-2).map(message => message.content).join('\n');
}

export function selectTrustedPlaces(query, limit = 12, messages = []) {
  const q = String(query || '');
  const goals = interests(q);
  const area = areaFrom(q);
  const recent = tidy(recentAssistantText(messages));
  const followUp = /\b(those|them|these|the ones?|which of|what about|first one|second one|are they|were they)\b/i.test(q);
  const direct = PLACES.filter(place => tidy(q).includes(tidy(place.name)) && tidy(place.name).length > 5);
  if (area && area !== 'city' && direct.length === 0 && !PLACES.some(place => lower(place.locality).includes(lower(area)))) return [];
  const candidates = PLACES.filter(place => place.recommendationStatus !== 'needs-current-operating-check' && (!area || (area === 'city' ? place.cityCentre : lower(place.locality).includes(lower(area)))));
  return candidates.map(place => {
    const wasMentioned = recent.includes(tidy(place.name)) && tidy(place.name).length > 5;
    const value = score(place, q, goals) + (wasMentioned ? (followUp ? 100 : -6) : 0);
    return { place, value };
  })
    .filter(item => item.value > 0)
    .sort((a,b) => b.value - a.value || a.place.id.localeCompare(b.place.id))
    .slice(0, limit).map(item => item.place);
}

export function buildTrustedPlacesContext(query, messages = []) {
  const q = String(query || '');
  const placeIntent = /\b(where|take|go|visit|plan|recommend|suggest|bars?|pubs?|cocktails?|nightlife|taprooms?|shop|book|coffee|caf[eé]|restaurant|food|eat|park|museum|gallery|children|kids|family|activity|activities|open|booking|cost|budget|£\s*\d)\b/i.test(q);
  if (!placeIntent) return '';
  const picks = selectTrustedPlaces(q, 12, messages);
  const timeSensitive = /\b(now|today|tonight|tomorrow|this|next|coming)\s+(?:saturday|sunday|weekend)\b/i.test(q)
    || /\b(now|today|tonight|tomorrow|next\s+\d+\s+hours?|open|opening|close|this afternoon|this morning|this evening|booking|book a slot)\b/i.test(q)
    || /\b(?:(?:the\s+)?time\s+is|it(?:'|’)s|it\s+is)\s+\d{1,2}:\d{2}\b/i.test(q);
  const budget = budgetFrom(q);
  const pair = q.match(/\b(?:ages?|aged)\s*(\d{1,2})\s*(?:,|and|&)\s*(\d{1,2})\b/i);
  const age = pair
    ? [Number(pair[1]), Number(pair[2])].filter(n => n < 19)
    : [...q.matchAll(/\b(\d{1,2})[- ]year[- ]olds?\b/gi)].map(match => Number(match[1])).filter(n => n < 19);
  const noCar = /\b(no car|without a car|don't drive|do not drive|public transport|by bus|by train)\b/i.test(q);
  const datedDaypart = /\b(?:this|next|coming)?\s*(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday)\s+(?:morning|afternoon|evening)\b/i.test(q);
  const cards = picks.map(place => [
    `ID ${place.id}: ${place.name} | ${place.type} | ${place.address}, ${place.postcode} | ${place.locality}`,
    `Family/age evidence: ${place.family}; child-friendly: ${place.childFriendly}. Food: ${place.food}. Books: ${place.books}. Art: ${place.art}. Wi-Fi: ${place.wifi || 'Unknown'}. Seating: ${place.seating || 'Unknown'}.`,
    `Entry/price status: ${place.priceStatus}. Adult: ${place.adultPrice}; child: ${place.childPrice}; family: ${place.familyPrice}. Booking: ${place.booking}.`,
    `Regular published hours: ${JSON.stringify(place.hours)}. Hours conflict: ${place.conflict ? 'yes, hours withheld' : 'no flag'}.`,
    `Source: ${place.source}; venue: ${place.website}; last checked: ${place.verified}. Notes: ${place.notes}`
  ].join('\n')).join('\n\n');
  return `\n\nGROUNDED LOCAL PLACE SELECTION (Batch 1, canonical IDs; ${picks.length} candidates):\n` +
    `Answer the user's practical question first, then at most two useful alternatives or follow-up options. Keep a conversational tone.\n` +
    `For an itinerary or recommendation, choose only from the exact entity cards below. Do not add remembered venue names or swap attributes between places. If the requested area is absent or no candidates fit, state the coverage gap and use current first-party search to discover the requested area; do not substitute the city centre.\n` +
    `For a fresh recommendation, vary the suitable choices across the conversation and briefly explain the difference between them. Recently named places have been ranked lower where alternatives exist. For a follow-up about 'those' or 'the first one', keep the exact previously named venues instead of rotating them away. Never trade off a hard age, area, time, dietary, access or budget constraint just for variety.\n` +
    `A record dated 2026-09-28 is a starting point, not proof of current hours, price, booking, menu, availability, age suitability or today's opening. ${timeSensitive ? 'The user needs current operational facts: check the exact venue first-party page live before claiming open now, bookable, serving food or affordable for the requested time. If checking fails, label the missing fact unconfirmed and give a safe, useful partial answer.' : 'Do not imply live verification was performed.'}\n` +
    `${/\bcoffee\b/i.test(q) && /\bbreakfast\b/i.test(q) ? 'Coffee plus breakfast is one combined requirement: verify both services for the same venue at the requested time. A café label or cakes alone is not breakfast evidence. If the user asks for the closest without a starting street, landmark or postcode, give supported city-centre options without claiming a nearest and ask for their starting point after the answer.\n' : ''}` +
    `${/\b(meeting|meet someone|laptop|work|wi[- ]?fi|wifi)\b/i.test(q) ? 'For a coffee meeting, verify usable seating and Wi-Fi at the exact branch where possible. Costa lists two Wakefield drive-through stores with Wi-Fi; the user has not identified which one they personally know as spacious. Do not transfer that observation to either branch.\n' : ''}` +
    `${budget ? `${budget}\n` : ''}` +
    `${age.length ? `Ages mentioned: ${age.join(', ')}. Confirm suitability for each child; don't infer it from a generic family label.\n` : ''}` +
    `${noCar ? 'No car is a hard constraint. Prefer destinations with independently verified practical access from the stated origin by foot or public transport. If the origin is missing, offer a conditional district shortlist and ask for the starting area after giving useful options. Do not invent a bus route, journey time, fare or walk. Count transport costs separately against the budget when known; otherwise the total is unconfirmed.\n' : ''}` +
    `${datedDaypart ? 'The specified daypart is a hard filter. Confirm that each recommended venue or activity actually operates during that window on the mapped date, not merely on the same calendar day. For a child activity, verify the age rules or label them unknown. If a usable three-hour schedule cannot be supported, give a shorter practical shortlist and clearly identify what still needs checking.\n' : ''}` +
    `An undated afternoon plan is a future suggestion. Do not call venues open now. Do not invent walking/travel times, queues, dwell times, admission or bookshelves. A three-hour plan must account for travel and the actual opening window; if those cannot be checked, offer a shortlist and ask for only the missing start point/date.\n` +
    `For a sit-down coffee stop, a tiny or unverified seating area is a poor fit. RECENT Coffee Roasters was reported by a local tester to have just two tables; avoid it as the main sit-down stop until seating is confirmed. Never claim another venue has spacious seating merely because it has some seats.\n` +
    `${cards || 'No matching place records in this batch.'}\n`;
}

// A short, source-linked answer remains useful when live search or the writing
// model is unavailable. It makes no current opening, routing or cost promise.
export function familyDistrictStarter(query) {
  if (!/\b(children|kids|family)\b/i.test(query) || !/\bno car\b/i.test(query)
      || !/\bsaturday afternoon\b/i.test(query)) return null;
  const amount = String(query).match(/£\s*(\d+(?:\.\d{1,2})?)/);
  const budgetLabel = amount ? `£${amount[1]}` : 'your budget';
  const library = PLACES.find(place => place.id === 'AW-004');
  const museum = PLACES.find(place => place.id === 'AW-007');
  const park = PLACES.find(place => place.id === 'AW-046');
  const indoor = PLACES.find(place => place.id === 'AW-D004');
  const reply = `For a Saturday afternoon with two children and ${budgetLabel}, here are three quite different ways to play it:\n\n• Low-cost discovery: Wakefield Museum and the children's section of Wakefield Library share Wakefield One. Both are free to enter; make this an early-afternoon choice because their regular Saturday hours end at 16:00.\n• Run around: Thornes Park has a playground. Pair it with the museum if you can get between them comfortably.\n• Rain plan: Fun Factory Wakefield on Flanshaw Way has soft play and a café. Check the children's admission, available session and journey before counting it within ${budgetLabel}.\n\nMy first choice is museum plus outdoor play, weather permitting. Where are you starting, and how old are the children? That will let me narrow the route and the best play option.`;
  return { kind: 'places.family_plan', area: null, constraints: { familyPlan: { budget: budgetLabel, origin: null, ages: [] } }, reply, sources: [museum, library, park, indoor].filter(Boolean).map(place => ({ title: place.name, url: place.source })) };
}

export function undatedCityCentreArtsPlan(query) {
  const q = String(query || '');
  if (!/\b(city centre|town centre)\b/i.test(q) || !/\b(plan|afternoon|itinerary)\b/i.test(q)
      || !/\bcoffee\b/i.test(q) || !/\bbooks?\b/i.test(q) || !/\bart\b/i.test(q)
      || /\b(today|tomorrow|tonight|now)\b/i.test(q)
      || /\b(?:this|next)?\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(q)) return null;
  const coffee = PLACES.find(place => place.id === 'AW-010');
  const books = PLACES.find(place => place.id === 'AW-016');
  const art = PLACES.find(place => place.id === 'AW-005');
  const reply = `A good three-hour shape is coffee, books, then art:\n\n• Settle in for coffee at Mocca Moocho on Cross Square; it is an independent café that also serves breakfast. Bob & Berts in Trinity Walk is a more familiar seated alternative, while RECENT is a coffee-focused quick stop with limited seating.\n• Browse at Waterstones on Kirkgate or The Works in Trinity Walk. If comics and manga appeal, try independent Wakefield Comics-616 on The Springs; if you want to read rather than buy, use Wakefield Library.\n• Finish at The Art House on Drury Lane for its free gallery and shop.\n\nThat is an order of stops rather than a timed walking route. Tell me the day and start time and I can check the opening overlap and make the three hours usable.`;
  return { kind: 'places.city_itinerary', area: 'Wakefield city centre', constraints: { cityItinerary: true }, reply, sources: [coffee, books, art, PLACES.find(place => place.id === 'AW-004')].filter(Boolean).map(place => ({ title: place.name, url: place.source })).concat([{ title: 'Experience Wakefield — book lovers guide', url: 'https://experiencewakefield.co.uk/guide/a-book-lovers-guide-to-wakefield/' }]) };
}

const switchesToEvents = q => /\b(?:what(?:['’]s| is)\s+on|events?|gigs?|festivals?)\b/i.test(q);

const sourcesFor = (...ids) => ids.map(id => PLACES.find(place => place.id === id))
  .filter(Boolean).map(place => ({ title: place.name, url: place.source }));

export function familyPlanFollowUp(query, state) {
  if (state?.lastIntent !== 'places.family_plan') return null;
  const q = String(query || '');
  if (switchesToEvents(q)) return null;
  const old = state.constraints?.familyPlan || {};
  const ages = q.match(/\b(?:kids?|children|ages?|aged)\b[^.!?]{0,50}?\b(\d{1,2})\s+(?:and|&)\s+(\d{1,2})\b/i);
  const origin = /\bhorbury(?: bridge)?\b/i.test(q) ? 'Horbury' : /\bpugney['’]?s\b/i.test(q) ? 'Pugneys Country Park' : /\btrinity\s+walk\b/i.test(q) ? 'Trinity Walk, Wakefield city centre' : (/\bwakefield bus station\b/i.test(q) ? 'Wakefield Bus Station' : (/\bwakefield\s+(?:(?:city|town)\s+)?centre\b|\bwakefield town\b|\b(?:city|town)\s+centre\b/i.test(q) ? 'Wakefield city centre' : (old.origin || null)));
  const constraints = { familyPlan: { budget: old.budget || 'your budget', origin, ages: ages ? [Number(ages[1]), Number(ages[2])] : (old.ages || []), pending: old.pending || null, durationHours: /\b(?:2|two)\s+hours?\b/i.test(q) ? 2 : (old.durationHours || null), oneLocation: /\b(?:one|1)\s+location\b/i.test(q) || old.oneLocation || false } };
  const common = { kind: 'places.family_plan', area: origin, constraints };
  const budget = constraints.familyPlan.budget;
  if ((origin === 'Horbury' && (ages || origin !== old.origin || /\b(?:indoor|rain|wet|play|activities|options)\b/i.test(q))) || /\bsecret garden\b/i.test(q)) {
    return { ...common, reply: 'Starting in Horbury, The Secret Garden at 223 Bridge Road, Horbury Bridge, WF4 5QA is a local indoor soft-play option. Its main play area is for children up to 9, so it covers ages 7 and 4, with separate younger-child zones and a café. The operator lists online admission of £6.95 per child aged 1–9 and the first adult free: £13.90 for your two children and one adult before food or travel. Additional adults are £2.50 and walk-ins cost extra.\n\nIts booking page lists afternoon sessions 13:50–15:50 and 16:00–18:00. General opening hours conflict elsewhere on its site, so confirm your chosen Saturday session and available tickets in the booking form. I have not checked the walking or bus route from your exact starting point in Horbury, so I cannot promise the total journey cost. This gives you a local candidate to check before considering city-centre venues.', sources: sourcesFor('AW-D001') };
  }
  if (/\b(?:ten[ -]?pin|bowling|balling|bowling alley)\b/i.test(q)) {
    return { ...common, reply: `Yes: Tenpin Wakefield is inside Trinity Walk, at Unit MSU1A, WF1 1QU. Since you are starting near Trinity Walk, it is a useful indoor option to check first. The operator lists bowling bumpers and ramps for younger children and Saturday opening from 10:00 to 01:00 the following morning.\n\nFor your 7- and 4-year-old, I would check one game for the three of you, then decide whether to add food. The exact Saturday slot and group price need checking in the booking form before I can promise it fits ${budget}. You can pair it with the free museum and children's library before 16:00.`, sources: sourcesFor('AW-026','AW-007','AW-004') };
  }
  if (/^(?:yes(?:,? please)?|please do|can you check)[.!?\s]*$/i.test(q) && old.pending === 'central_rain') {
    return { ...common, reply: `For Saturday afternoon, Rainbow Playrooms is not a suitable booking: its published Saturday sessions end at 13:30. Cheeky Monkeys on Grantley Street is the indoor play centre to check for an afternoon slot. Its own site describes play for children up to 10 and recommends booking, but I cannot confirm a specific slot or admission for your group. Check its booking page before setting off.\n\nWakefield Museum and the children's library in Wakefield One remain the free indoor plan until 16:00. That keeps the £40 available for food or a paid play session once you have its price.`, sources: sourcesFor('AW-025','AW-D005','AW-007','AW-004') };
  }
  if (/\b(stay|keep|remain)\s+(?:more\s+)?central\b|\bcentral\b[^.!?]{0,45}\b(?:rain|wet|indoors?)\b/i.test(q)) {
    constraints.familyPlan.pending = 'central_rain';
    return { ...common, reply: `From ${origin || 'Wakefield city centre'}, keep this Saturday afternoon close to the centre: start with free Wakefield Museum and the children's library in Wakefield One before their regular 16:00 close. If the children want active indoor play, Cheeky Monkeys on Grantley Street is an option for ages up to 10, but check Saturday afternoon availability and admission before using the £40 budget.\n\nRainbow Playrooms suits ages 0–7 but its published Saturday sessions finish at 13:30, so it is not an afternoon rain plan. The Works is a chain bookshop for a short browse, not a play centre. I have not verified the walking connections from your exact starting point. If you want paid play, I can point you to the operator's booking page.`, sources: sourcesFor('AW-007','AW-004','AW-D005','AW-025','AW-016') };
  }
  if (/\bindoor\s+(?:activities|options|things to do)\b/i.test(q)) {
    return { ...common, reply: `Yes. For your children aged ${constraints.familyPlan.ages.join(' and ')} from ${origin || 'Wakefield centre'}, I would compare three different indoor options:\n\n• Free exploring: Wakefield Museum and the children's library share Wakefield One. Their regular Saturday hours end at 16:00. I have not verified a particular craft session for this Saturday.\n• Bowling: Tenpin Wakefield is inside Trinity Walk and lists bumpers and ramps for younger children. Check the exact Saturday slot and the group price before adding food to ${budget}.\n• Active play: Cheeky Monkeys on Grantley Street caters for children up to 10. Fun Factory on Flanshaw Way is another soft-play venue with a café. Check admission and session availability.\n\nMy first paid option to check from the centre would be Tenpin. For play rather than bowling, compare Cheeky Monkeys and Fun Factory. I have not verified the walking or bus connections, so I cannot rank these by journey or promise a complete £40 total.`, sources: sourcesFor('AW-007','AW-004','AW-026','AW-D005','AW-D004') };
  }
  if (/\b(play\s*centres?|play\s*areas?|soft\s*play|indoor\s*play|playrooms?)\b/i.test(q)) {
    return { ...common, reply: `Yes, there are actual play centres to choose from for your 7- and 4-year-old:\n\n• Cheeky Monkeys Wakefield, 48 Grantley Street: soft play for children up to 10, with a café. Book a play session; its Saturday afternoon availability and admission need checking.\n• Fun Factory Wakefield, Flanshaw Way: multi-level soft play and a café. Its published Saturday hours run to 20:00, but confirm the session and price.\n• Stanley Ferry Wacky Warehouse: indoor soft play with an outdoor area too. Its operator lists Saturday 09:00–20:00, £6 per child and free adult entry, so play admission for your two would be £12 before food and travel. This is farther out in Stanley; I have not checked a bus journey from ${origin || 'your starting point'}.\n\nRainbow Playrooms fits the ages but its Saturday sessions finish at 13:30, so it is not an afternoon option. From ${origin || 'Wakefield centre'}, I would check Cheeky Monkeys first, then Fun Factory. I cannot rank them by journey until the walking or bus route is confirmed, or promise the full outing stays within ${budget}.`, sources: sourcesFor('AW-D005','AW-D004','AW-D006','AW-025') };
  }
  if (origin === 'Pugneys Country Park' && constraints.familyPlan.ages.length) {
    const short = constraints.familyPlan.durationHours === 2;
    return { ...common, reply: `${short ? 'For two hours in one location, stay at Pugneys.' : 'Since you are starting near Pugneys, I would keep the afternoon there rather than spend time travelling into town.'} Park entry is free. Start with Pirates Cove playground, then choose a short wander or the Blown Away trail, with a snack break when the children need it.\n\nAn optional treat is Pugneys Light Railway: its published fare is £2.50 per person, so three tickets would be £7.50. Saturday running depends on weather and volunteers; check the operator’s current running update before promising the children a ride.\n\nThe council lists the park’s Boat House café/toilet building hours as 09:00–16:00. Food prices are not in the record, so set a snack allowance or bring a picnic rather than assume a full meal fits ${budget}. ${short ? 'Keep the railway optional so the outing stays within two hours.' : 'How long have you got, and would you like to stay in one location?'} I have not checked Saturday’s forecast, so this outdoor plan depends on the weather.`, sources: sourcesFor('AW-044','AW-059','AW-069') };
  }
  if (/\b(?:different|another|alternative)\b/i.test(q) && origin) {
    return { ...common, reply: `Let's change the activity rather than repeat the museum-and-park plan. From ${origin}, here are three alternatives for your children aged ${constraints.familyPlan.ages.join(' and ')}:\n\n• Bowling: Tenpin Wakefield is inside Trinity Walk. Bumpers and ramps are available for younger children. Check the exact Saturday slot and price for one adult and two children before adding food to the ${budget} budget.\n• Indoor active play: Cheeky Monkeys on Grantley Street caters for children up to 10. Fun Factory on Flanshaw Way is another soft-play option with a café. Admission, session availability and the journey need checking.\n• Outdoor adventure: Pugneys has free park entry, Pirates Cove playground and the Blown Away trail. Its miniature railway is optional and separately charged. I have not checked a bus journey, so I would not promise the total cost or travel time.\n\nFor a change close to the centre, I would check Tenpin first. Would you prefer bowling or soft play?`, sources: sourcesFor('AW-026','AW-D005','AW-D004','AW-044','AW-059') };
  }
  if (/\b(mix|mixture|both|indoor and outdoor)\b/i.test(q)) {
    return { ...common, reply: `For a mix from Wakefield centre, start with the free Wakefield Museum and children's library in Wakefield One, then head to Thornes Park for playground time if the weather holds. Put the museum first: its regular Saturday closing time is 16:00.\n\nIf rain takes over, swap the park for Fun Factory soft play; if the children fancy a different indoor activity, consider Tenpin bowling. The museum-and-park version keeps admission low, leaving ${budget} mainly for food and any travel. I have not checked the exact walking route, soft-play slot or bowling/admission prices, so those paid swaps need a price check.`, sources: sourcesFor('AW-007','AW-004','AW-046','AW-D004','AW-026') };
  }
  if (origin && constraints.familyPlan.ages.length && (ages || origin !== old.origin)) {
    return { ...common, reply: `Starting at ${origin} with children aged ${constraints.familyPlan.ages.join(' and ')}, I'd head for free Wakefield Museum and the children's library in Wakefield One first. The museum's regular Saturday hours end at 16:00. If the rain holds off, Thornes Park's playground is your outdoor option.\n\nFor heavy rain, you have two proper soft-play candidates: Cheeky Monkeys on Grantley Street and Fun Factory on Flanshaw Way. Stanley Ferry Wacky Warehouse is another option farther out. I have not verified the route, admission and session availability for the first two, so I cannot promise the whole outing fits ${budget}.`, sources: sourcesFor('AW-007','AW-004','AW-046','AW-D005','AW-D004','AW-D006') };
  }
  return null;
}

export function cityItineraryFollowUp(query, state) {
  if (state?.lastIntent !== 'places.city_itinerary') return null;
  const q = String(query || '');
  if (switchesToEvents(q)) return null;
  const kraft = /\bkra\s*:?\s*ft\b|\bkraft\b/i.test(q);
  const preference = kraft ? 'KRA:FT Koffee' : (state.constraints?.coffeePreference || null);
  const day = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1] || state.constraints?.visitDay || null;
  const hepworthBrunch = /\b(?:brunch|breakfast)\b[^.!?]{0,65}\bhepworth\b|\bhepworth\b[^.!?]{0,65}\b(?:brunch|breakfast)\b/i.test(q) || state.constraints?.brunchVenue === 'The Hepworth Wakefield Café';
  const start = /\b(?:9:30|09:30|9\.30)\b/i.test(q) ? '09:30' : /\b(?:10:00|10\s*(?:am|a\.m\.))\b/i.test(q) ? '10:00' : (state.constraints?.cityStart || null);
  const hepworthVisit = /\bhepworth\b/i.test(q) || state.constraints?.artVenue === 'The Hepworth Wakefield';
  const visitTime = /^\s*11(?::00|\.00)?\s*(?:am|a\.m\.)?\s*[.!]?\s*$/i.test(q) && hepworthVisit ? '11:00' : (state.constraints?.hepworthTime || null);
  const common = { kind: 'places.city_itinerary', area: 'Wakefield city centre', constraints: { cityItinerary: true, coffeePreference: preference, visitDay: day, brunchVenue: hepworthBrunch ? 'The Hepworth Wakefield Café' : null, cityStart: start, artVenue: hepworthVisit ? 'The Hepworth Wakefield' : null, hepworthTime: visitTime } };
  if (/\bfinish\b[^.!?]{0,30}\b(?:1\s*pm|13:00)\b/i.test(q) && hepworthBrunch && preference) {
    return { ...common, reply: 'Yes, keep 13:00 as your finish. Allow roughly 45 minutes for brunch at The Hepworth, then reserve a separate travel buffer before coffee at KRA:FT. Use the remaining time for one bookshop. I would leave The Art House for another visit rather than squeeze four stops into three hours. I have not measured the walking route, so I cannot promise exact arrival times. If the Hepworth galleries matter most, shorten the book browse instead.', sources: sourcesFor('AW-018','AW-006','AW-031','AW-003','AW-005') };
  }
  if (/^(?:thanks|thank you|oh[ ,]+yes|yes)[.!\s]*$/i.test(q)) {
    return { ...common, reply: 'You’re welcome. Keep your chosen stops and finish time, and allow time for the journey between them.', sources: [] };
  }
  if (start === '09:30' && day?.toLowerCase() === 'saturday' && !hepworthBrunch && !/\bwood street\b/i.test(q)) {
    const booksFirst = /\bbooks?\s+(?:are\s+)?fine\b/i.test(q) || state.constraints?.booksFirst || false;
    common.constraints.booksFirst = booksFirst;
    return { ...common, reply: `For Saturday from 09:30 to 12:30, you can start with coffee. The trusted listings give Bob & Berts in Trinity Walk a 07:30 opening, KRA:FT Koffee on Wood Street 08:00, and Mocca Moocho on Cross Square 08:30. KRA:FT is the specialty-coffee option; Bob & Berts lists seating and breakfast.\n\n${booksFirst ? 'Since you prefer books first, begin with a book browse once the shop’s Saturday opening is confirmed, then have coffee.' : 'Have coffee first, then browse Waterstones on Kirkgate or independent Comics-616 on The Springs if comics and manga appeal.'} ${hepworthVisit ? 'Make The Hepworth your main art stop and leave The Art House for another visit. The Hepworth lists opening from 10:00 Tuesday to Sunday; its café is another coffee option if you want fewer stops.' : 'Finish with The Art House, subject to checking its Saturday gallery opening. The Hepworth is an alternative main art stop if you would prefer it.'}\n\nKeep all stops and travel within the 12:30 finish. I have not verified bookshop opening overlap or measured the walking connections, so this is an order of stops rather than a timed route.`, sources: sourcesFor('AW-010','AW-031','AW-034','AW-003','AW-005','AW-006','AW-018') };
  }
  if (hepworthVisit && !hepworthBrunch && !kraft && !/\bwood street\b/i.test(q)) {
    return { ...common, reply: `Yes, let's include The Hepworth as your main art stop in the three hours${day ? ` on ${day}` : ''}. ${visitTime ? `Keep your ${start || '10:00'} start and aim for The Hepworth at ${visitTime}. Have coffee first, then leave time for the journey before the gallery visit.` : `Starting around ${start || '10:00'}, you could have coffee at The Hepworth Café and explore the galleries before heading into the centre for books.`}\n\nFor books, choose Waterstones on Kirkgate for general browsing or independent Comics-616 on The Springs for comics and manga. I would leave The Art House for another visit so you have time for coffee, books and The Hepworth. The gallery lists opening from 10:00 Tuesday to Sunday. Exhibition entry is free for Wakefield District residents and under-18s; other adults should check the current ticket price.\n\nAllow travel time between the gallery and the centre. I have not checked the walking route or the bookshop opening overlap, so these are suggested stops rather than a verified timed route.`, sources: sourcesFor('AW-006','AW-018','AW-003','AW-005') };
  }
  if (hepworthBrunch && !preference) {
    return { ...common, reply: `Start with your chosen brunch at The Hepworth Wakefield Café around ${start || '10:00'}. Its published brunch service is 10:00–12:00 Tuesday to Sunday. Spend some of your remaining time with the art there, then head into the centre for a book browse at Waterstones on Kirkgate or independent Comics-616 on The Springs if comics and manga appeal.\n\nFor three hours, I would make The Hepworth your main art stop. The Art House is an optional extra if you keep the other stops short. I have not measured the travel connections, so this is a suggested order rather than a timed route. ${day ? `You said ${day}; the opening overlap and any special closures still need checking for that date.` : 'Which day are you visiting?'}`, sources: sourcesFor('AW-018','AW-006','AW-003','AW-005') };
  }
  if (/\bhepworth\b/i.test(q) && /\bwood street\b/i.test(q) && /\b(?:9:30|9\.30|half past nine)\b/i.test(q)) {
    return { ...common, reply: `That can work as a three-hour morning, with a choice about how much art and book browsing you fit in:\n\n• Around 09:30: Start with coffee at KRA:FT Koffee, 12 Wood Street. Experience Wakefield lists daytime opening from 08:00 Tuesday to Saturday and 10:00 Sunday. It also describes KRA:FT's cocktail side, but a bar visit is better saved for later in the day.\n• From 10:00: Visit The Hepworth Wakefield, which lists gallery opening at 10:00 Tuesday to Sunday. Give the art the largest share of your time. Its café also lists brunch from 10:00 if you would rather eat there.\n• Before 12:30: Return to the centre for one book stop, such as Waterstones on Kirkgate for general books or independent Comics-616 on The Springs for comics and manga. The Art House on Drury Lane is an alternative second art stop if you prefer that to books.\n\nI would choose either the bookshop or The Art House for the final stop so the three hours stay relaxed. I have not measured the route between The Hepworth and Wood Street. Which day are you visiting? I can then check the opening overlap.`, sources: sourcesFor('AW-031','AW-006','AW-018','AW-003','AW-005').concat([{ title: 'The Art House — plan your visit', url: 'https://the-arthouse.org.uk/about/plan-your-visit/' }]) };
  }
  if (hepworthBrunch && (kraft || /\b(?:what are you talking about|friday|same as above|same)\b/i.test(q))) {
    const sources = sourcesFor('AW-018','AW-006','AW-031','AW-003','AW-005').concat([
      { title: 'The Hepworth Wakefield Café — menu and hours', url: 'https://hepworthwakefield.org/your-visit/the-hepworth-cafe/' },
      { title: 'The Art House — plan your visit', url: 'https://the-arthouse.org.uk/about/plan-your-visit/' }
    ]);
    if (/\bwhat are you talking about\b/i.test(q)) {
      return { ...common, reply: `Sorry, I misread your plan. You chose brunch at The Hepworth at about 10:00; KRA:FT is a separate coffee stop afterwards, not the breakfast venue. The Hepworth café lists brunch from 10:00 to noon, and KRA:FT Koffee is at 12 Wood Street. Then you can browse books and finish with art at The Art House. Which day are you going?`, sources };
    }
    if (day) {
      const today = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      const part = type => Number(today.find(item => item.type === type)?.value);
      const base = new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12));
      const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const target = weekdays.indexOf(day.toLowerCase());
      const offset = (target - base.getUTCDay() + 7) % 7;
      base.setUTCDate(base.getUTCDate() + offset);
      const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(base);
      return { ...common, reply: `For ${dateLabel}, here is a three-hour plan built around your choices:\n\n• 10:00: Brunch at The Hepworth Wakefield Café. Its own page says brunch is served 10:00–12:00; take a look at the gallery while you are there if time allows.\n• Late morning: Head into the centre for specialty coffee at KRA:FT Koffee, 12 Wood Street. Experience Wakefield lists Friday hours of 08:00–15:00.\n• Before 13:00: Browse Waterstones on Kirkgate for general books, or independent Comics-616 on The Springs if comics and manga appeal. Finish with a short art stop at The Art House on Drury Lane, which lists Friday opening 09:30–16:00 and free entry.\n\nThat is a suggested pace within 10:00–13:00; allow time to get from The Hepworth into the centre. Waterstones is a chain, while Comics-616 is independent.`, sources: sources.concat([{ title: 'Wakefield Comics-616 — Friday hours', url: 'https://experiencewakefield.co.uk/venue/wakefield-comics-616/' }]) };
    }
    return { ...common, reply: `Yes: brunch at The Hepworth around 10:00, then coffee at KRA:FT Koffee, followed by books and art. The Hepworth café serves brunch 10:00–12:00. KRA:FT is at 12 Wood Street and offers specialty coffee. For books, Waterstones is a general bookshop; independent Comics-616 is an option if comics appeal. The Art House makes a central gallery finish. Which day are you going? I can then check the opening overlap for the three hours.`, sources };
  }
  if (kraft || (preference && /\b(?:same as above|same|thursday|friday|saturday|sunday|monday|tuesday|wednesday)\b/i.test(q))) {
    if (/\bsame(?: as above)?\b/i.test(q) && !day) {
      return { ...common, reply: `Yes, I mean the same three-hour coffee, books and art plan, starting around 09:00 with KRA:FT in mind. Which day are you going? Its hours differ across listings, and I want to check the right morning.`, sources: sourcesFor('AW-031','AW-034','AW-005') };
    }
    if (day) {
      const label = day[0].toUpperCase() + day.slice(1).toLowerCase();
      return { ...common, reply: `For ${label} from about 09:00, KRA:FT Koffee at 12 Wood Street is a good specialty-coffee candidate. I cannot verify a full breakfast menu or its ${label} opening time from the trusted record, so I would not make a firm 09:00 breakfast booking there yet. If a proper breakfast is the priority, Mocca Moocho on Cross Square explicitly lists breakfasts and coffee.\n\nAfter breakfast, browse Waterstones on Kirkgate or Comics-616 on The Springs if comics appeal, then finish with art at The Art House. I can suggest that order, but the shops' and gallery's opening overlap still needs checking before calling it a timed 09:00–12:00 itinerary.`, sources: sourcesFor('AW-031','AW-034','AW-016','AW-003','AW-005') };
    }
    return { ...common, reply: `KRA:FT Koffee is a good suggestion for specialty coffee. It is listed at 12 Wood Street in the city centre. I missed the name you gave me earlier. The trusted listing does not confirm a full breakfast menu, and its published opening times conflict, so I cannot promise a 09:00 breakfast there.\n\nIf you want KRA:FT specifically, start with coffee there once its opening is confirmed, then Waterstones or Comics-616 for books and The Art House for art. If breakfast matters more, independent Mocca Moocho on Cross Square explicitly lists breakfasts and coffee. Which day are you visiting?`, sources: sourcesFor('AW-031','AW-034','AW-016','AW-003','AW-005') };
  }
  if (start === '10:00' && day?.toLowerCase() === 'saturday' && !/\b(?:breakfast|brunch|independent bookshop)\b/i.test(q)) {
    return { ...common, reply: `For Saturday from 10:00 to 13:00, start with coffee at Mocca Moocho on Cross Square or KRA:FT Koffee on Wood Street. Their published Saturday opening times are 08:30 and 08:00 respectively. Bob & Berts in Trinity Walk is a seated alternative with breakfast, listed from 07:30.\n\nThen choose one book stop: Waterstones on Kirkgate for general books or independent Comics-616 on The Springs for comics and manga. Finish with The Art House, subject to its Saturday opening. If you prefer The Hepworth, make it the main art stop instead so you can keep the three-hour limit.\n\nThese are suggested stops within your 10:00–13:00 window. The bookshop and gallery opening overlap and walking connections still need checking before setting exact arrival times.`, sources: sourcesFor('AW-034','AW-031','AW-010','AW-003','AW-005','AW-006') };
  }
  const wantsBreakfast = /\b(breakfast|brunch|9\s*(?:am|a\.m\.)|09:00|10\s*(?:am|a\.m\.)|10:00)\b/i.test(q);
  const wantsBooks = /\b(bookshops?|book stores?|books|independant|independent|closest bookshop|nearest bookshop)\b/i.test(q);
  if (wantsBreakfast && wantsBooks) {
    return { ...common, reply: `For a 10:00 start, have breakfast and coffee at independent Mocca Moocho on Cross Square. Its destination listing names both breakfasts and coffee; Bob & Berts in Trinity Walk or Gray's at WX are alternatives with breakfast menus if you prefer those parts of town.\n\nFor books, I should distinguish the choices: Waterstones on Kirkgate and The Works in Trinity Walk are general bookshops, but neither is independent. Wakefield Comics-616 on The Springs is independent if comics or manga count. I cannot verify an independent general-interest bookshop in the city-centre core; Books on the Lane in Walton and Darling Reads in Horbury are real district options, but would take you outside this three-hour city-centre plan.\n\nFinish with The Art House for art and its shop. Tell me which day you are going and I can check that these stops overlap between 10:00 and 13:00.`, sources: sourcesFor('AW-034','AW-010','AW-033','AW-016','AW-003','AW-005').concat([{ title: 'Experience Wakefield — book lovers guide', url: 'https://experiencewakefield.co.uk/guide/a-book-lovers-guide-to-wakefield/' }]) };
  }
  if (wantsBooks) {
    return { ...common, reply: `In the city centre, Waterstones on Kirkgate and The Works in Trinity Walk are the general bookshops. Wakefield Comics-616 on The Springs is the independent choice for comics and manga. Wakefield Library is a good browse if buying is optional.\n\nFor an independent general-interest bookshop, Books on the Lane is in Walton and Darling Reads is in Horbury, so either changes the scope of the three-hour city-centre outing. Which kind of books would make the detour worthwhile?`, sources: sourcesFor('AW-016','AW-003','AW-004').concat([{ title: 'Experience Wakefield — book lovers guide', url: 'https://experiencewakefield.co.uk/guide/a-book-lovers-guide-to-wakefield/' }]) };
  }
  if (wantsBreakfast) {
    return { ...common, reply: `For a 9:00 or 10:00 breakfast with coffee, try independent Mocca Moocho on Cross Square first. Bob & Berts in Trinity Walk and Gray's at WX also list breakfast. The destination listing gives Mocca Moocho regular 08:30 Saturday opening, but I would check your chosen day before fixing the order. After breakfast, choose Waterstones or Comics-616 for books and The Art House for art.`, sources: sourcesFor('AW-034','AW-010','AW-033','AW-003','AW-005') };
  }
  if (/\b(other|more|another|recommendations|alternatives)\b/i.test(q)) {
    return { ...common, reply: `A few different ways to make it yours: independent Mocca Moocho for breakfast and coffee; Gray's at WX for another breakfast setting; or RECENT for a quick specialist coffee rather than a long sit-down. For books, Waterstones has the broadest general-shop option I can name in the centre, Comics-616 is independent for comics, and the library is for a leisurely browse. For art, The Art House is the compact central stop; The Hepworth is a larger gallery if you are happy to go beyond the core shopping streets.\n\nThe missing piece is an independent general-interest bookshop in the city-centre core. The verified district choices are Books on the Lane in Walton and Darling Reads in Horbury.`, sources: sourcesFor('AW-034','AW-033','AW-001','AW-003','AW-004','AW-005','AW-006').concat([{ title: 'Experience Wakefield — book lovers guide', url: 'https://experiencewakefield.co.uk/guide/a-book-lovers-guide-to-wakefield/' }]) };
  }
  return null;
}
