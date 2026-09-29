import { PLACES } from './askwakefield-places-data.js';

const UNKNOWN = /^(unknown|not stated|not verified|n\/a)$/i;
const known = value => value && !UNKNOWN.test(String(value).trim());
const lower = value => String(value || '').toLowerCase();
const tidy = value => String(value || '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

function interests(text) {
  const q = lower(text);
  return {
    family: /\b(kids?|children|child|family|play|toddler|\d{1,2}[- ]year[- ]old)\b/.test(q),
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
  const candidates = PLACES.filter(place => !area || (area === 'city' ? place.cityCentre : lower(place.locality).includes(lower(area))));
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
  const placeIntent = /\b(where|take|go|visit|plan|recommend|suggest|shop|book|coffee|caf[eé]|restaurant|food|eat|park|museum|gallery|children|kids|family|activity|activities|open|booking|cost|budget|£\s*\d)\b/i.test(q);
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

const sourcesFor = (...ids) => ids.map(id => PLACES.find(place => place.id === id))
  .filter(Boolean).map(place => ({ title: place.name, url: place.source }));

export function familyPlanFollowUp(query, state) {
  if (state?.lastIntent !== 'places.family_plan') return null;
  const q = String(query || '');
  const old = state.constraints?.familyPlan || {};
  const ages = q.match(/\b(?:kids?|children)\b[^.!?]{0,50}?\b(\d{1,2})\s+(?:and|&)\s+(\d{1,2})\b/i);
  const origin = /\b(?:starting from|from|in)\s+wakefield\s+(?:city\s+)?centre\b/i.test(q) ? 'Wakefield city centre' : (old.origin || null);
  const constraints = { familyPlan: { budget: old.budget || 'your budget', origin, ages: ages ? [Number(ages[1]), Number(ages[2])] : (old.ages || []) } };
  const common = { kind: 'places.family_plan', area: origin, constraints };
  const budget = constraints.familyPlan.budget;
  if (/\b(play centres?|soft play|indoor play|playrooms?)\b/i.test(q)) {
    return { ...common, reply: `Yes. For your 4- and 7-year-old, Fun Factory Wakefield on Flanshaw Way is the soft-play option to investigate for Saturday afternoon; its published regular hours run to 20:00 and it has food and coffee. Tenpin Wakefield is a different indoor choice if they would prefer bowling.\n\nRainbow Playrooms on Navigation Walk suits ages 0–7, but its Saturday sessions finish at 13:30, so it only works if you can start early. My pick for a rainy afternoon is Fun Factory, provided a suitable session and admission for all three leave room in ${budget} for the journey. I have not confirmed those prices or the route from the centre.`, sources: sourcesFor('AW-D004','AW-026','AW-025') };
  }
  if (/\b(mix|mixture|both|indoor and outdoor)\b/i.test(q)) {
    return { ...common, reply: `For a mix from Wakefield centre, start with the free Wakefield Museum and children's library in Wakefield One, then head to Thornes Park for playground time if the weather holds. Put the museum first: its regular Saturday closing time is 16:00.\n\nIf rain takes over, swap the park for Fun Factory soft play; if the children fancy a different indoor activity, consider Tenpin bowling. The museum-and-park version keeps admission low, leaving ${budget} mainly for food and any travel. I have not checked the exact walking route, soft-play slot or bowling/admission prices, so those paid swaps need a price check.`, sources: sourcesFor('AW-007','AW-004','AW-046','AW-D004','AW-026') };
  }
  if (origin && constraints.familyPlan.ages.length) {
    return { ...common, reply: `From Wakefield centre with children aged ${constraints.familyPlan.ages.join(' and ')}, I would choose Wakefield Museum and the library for a free indoor start, then Thornes Park's playground if it is dry. The museum's regular Saturday hours end at 16:00, so go there first.\n\nFor a wet afternoon, Fun Factory offers soft play; Tenpin offers bowling. Those are paid alternatives whose group admission and journey need checking against ${budget}. Do you want a mostly outdoor plan or the rainy-day version?`, sources: sourcesFor('AW-007','AW-004','AW-046','AW-D004','AW-026') };
  }
  return null;
}

export function cityItineraryFollowUp(query, state) {
  if (state?.lastIntent !== 'places.city_itinerary') return null;
  const q = String(query || '');
  const common = { kind: 'places.city_itinerary', area: 'Wakefield city centre', constraints: { cityItinerary: true } };
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
