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
  const timeSensitive = /\b(now|today|tonight|tomorrow|next\s+\d+\s+hours?|open|opening|close|this afternoon|this morning|this evening|booking|book a slot)\b/i.test(q)
    || /\b(?:(?:the\s+)?time\s+is|it(?:'|’)s|it\s+is)\s+\d{1,2}:\d{2}\b/i.test(q);
  const budget = budgetFrom(q);
  const pair = q.match(/\b(?:ages?|aged)\s*(\d{1,2})\s*(?:,|and|&)\s*(\d{1,2})\b/i);
  const age = pair
    ? [Number(pair[1]), Number(pair[2])].filter(n => n < 19)
    : [...q.matchAll(/\b(\d{1,2})[- ]year[- ]olds?\b/gi)].map(match => Number(match[1])).filter(n => n < 19);
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
    `An undated afternoon plan is a future suggestion. Do not call venues open now. Do not invent walking/travel times, queues, dwell times, admission or bookshelves. A three-hour plan must account for travel and the actual opening window; if those cannot be checked, offer a shortlist and ask for only the missing start point/date.\n` +
    `${cards || 'No matching place records in this batch.'}\n`;
}
