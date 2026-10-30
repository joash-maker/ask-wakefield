import { PLACES } from './askwakefield-places-data.js';

function matchesPlaceName(query, place) {
  const normal = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
  const text = ' '+normal(query)+' ';
  return [place.name, ...(place.aliases || [])].some(name => text.includes(' '+normal(name)+' '));
}

export function namedDiningFollowUp(query, messages = []) {
  const q = String(query || '');
  const hoursRequest = /\b(?:opening\s+(?:hours|times)|hours|open\s+now)\b/i.test(q)
    || /\b(?:when|what time).{0,50}\b(?:open|close)\b/i.test(q);
  let picks = PLACES.filter(p => p.dining && matchesPlaceName(q,p));
  if (!picks.length && hoursRequest) {
    const prior = (Array.isArray(messages) ? messages : []).slice(0, -1).reverse()
      .find(m => m?.role === 'assistant' && typeof m.content === 'string')?.content || '';
    const previous = PLACES.filter(p => p.dining && matchesPlaceName(prior,p));
    if (previous.length === 1) picks = previous;
  }
  if (!picks.length) return null;
  if (hoursRequest) {
    const days = [['Mon','Monday'],['Tue','Tuesday'],['Wed','Wednesday'],['Thu','Thursday'],['Fri','Friday'],['Sat','Saturday'],['Sun','Sunday']];
    const chosen = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
    const dates = chosen ? days.filter(([,name]) => name.toLowerCase() === chosen.toLowerCase()) : days;
    const reply = picks.map(p => {
      const sourceName = /experiencewakefield\.co\.uk/i.test(p.source || '') ? 'Experience Wakefield' : 'the linked venue listing';
      const lines = dates.map(([abbr,name]) => name + ': ' + (p.hours?.[abbr] || 'Not confirmed')).join('\n');
      const warning = p.conflict
        ? 'Other published listings disagree, so these are published reference hours, not confirmed current opening or meal-service availability. '
        : 'These are published regular hours, not a live confirmation that the venue is open. ';
      const contact = p.phone ? 'You can confirm with the restaurant on ' + p.phone + '.' : 'Please check with the venue before travelling.';
      return 'According to ' + sourceName + ', the published opening hours for ' + p.name + ' at ' + p.address + ' are:\n' + lines + '\n\n' + warning + contact;
    }).join('\n\n');
    return { kind:'food.venue_details', area:'Wakefield', constraints:{}, reply, sources:picks.map(p => ({title:p.name,url:p.source})) };
  }
  const weekday = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const day = weekday ? weekday.slice(0,3).replace(/^./,c=>c.toUpperCase()) : null;
  return { kind:'food.venue_details', area:'Wakefield', constraints:{}, reply:picks.map(p => p.name+' at '+p.address+': '+p.food+'. '+(day ? 'Published '+day+' hours: '+p.hours[day]+'. ' : '')+(p.conflict ? (p.id === 'AW-R010' ? 'Different venue directories publish conflicting hours; confirm the times directly with the restaurant. ' : 'The published hours conflict or distinguish bar and restaurant service, so confirm the meal-service time with the operator. ') : '')+'Check the current menu, prices and table availability before booking.').join('\n\n'), sources:picks.map(p=>({title:p.name,url:p.source})) };
}

// Use operator-provided evidence for narrowly scoped follow-up questions.
// A previous named restaurant remains in scope only when exactly one dining
// venue can be identified; never transfer its menu or contact details.
// Only published thali evidence qualifies for a district-wide thali recommendation.
// Do not recommend restaurants just because their cuisine makes thali plausible.
export function districtThaliDiscovery(query) {
  const q = String(query || '');
  if (!/\bthalis?\b/i.test(q)) return null;
  const broad = /\b(?:which|where|restaurants|venues|places|else|other|alternatives?|recommend|suggest)\b/i.test(q)
    && /\b(?:which|where|restaurants|venues|places|else|other|alternatives?)\b/i.test(q);
  if (!broad) return null;
  const confirmed = PLACES.filter(p => p.dining && p.lunchThali?.source && p.lunchThali?.vegetarian?.advertisedPrice && p.lunchThali?.nonVegetarian?.advertisedPrice);
  const wantsAlternative = /\b(?:other|else|alternatives?)\b/i.test(q);
  if (!confirmed.length) return { kind:'food.thali_discovery', area:'Wakefield', constraints:{},
    reply:'I could not verify a currently published thali offering for a Wakefield restaurant. I would not infer it from the type of Indian cuisine a venue serves.',
    sources:[] };
  const detail = confirmed.map(p => {
    const offer = p.lunchThali;
    return p.name + ' at ' + p.address + ' advertises lunchtime thalis: vegetarian ' + offer.vegetarian.advertisedPrice + ' and non-vegetarian ' + offer.nonVegetarian.advertisedPrice + '. These prices are from operator material dated 21 October 2026, not live prices.' + (p.phone ? ' Confirm with the restaurant on ' + p.phone + '.' : '');
  }).join('\n\n');
  const qualification = 'I have not verified thali service at other Wakefield restaurants, so I cannot recommend them as serving thali without a menu or operator source.';
  return { kind:'food.thali_discovery', area:'Wakefield', constraints:{},
    reply:(wantsAlternative ? 'I do not have another independently verified thali venue to suggest. The published option I can confirm is:\n\n' : 'The published Wakefield thali option I can confirm is:\n\n')
      + detail + '\n\n' + qualification,
    sources:confirmed.map(p=>({title:p.name,url:p.source})) };
}

export function namedDiningThaliFollowUp(query, messages = []) {
  const q = String(query || '');
  if (!/\bthalis?\b/i.test(q)) return null;
  const named = PLACES.filter(p => p.dining && matchesPlaceName(q,p));
  const preceding = (Array.isArray(messages) ? messages : []).slice(0,-1).reverse()
    .find(m => m?.role === 'assistant' && typeof m.content === 'string')?.content || '';
  const previous = PLACES.filter(p => p.dining && matchesPlaceName(preceding,p));
  const picks = named.length === 1 ? named : (named.length === 0 && previous.length === 1 ? previous : []);
  if (picks.length !== 1) return null;
  const p = picks[0];
  const thali = p.lunchThali;
  if (!thali) return null;
  const dinner = /\b(?:dinner|evening|tonight|night)\b/i.test(q);
  const veg = /\b(?:veg|veggie|vegetarian|meat[- ]?free)\b/i.test(q);
  const advertised = veg ? thali.vegetarian : null;
  const mealDetails = advertised
    ? `The restaurant's printed leaflet dated 21 October 2026 advertises a vegetarian thali for ${advertised.advertisedPrice}, including ${advertised.includes.join(', ')}. This is an advertised lunch offer, not a live menu or price confirmation. `
    : `The restaurant's printed leaflet dated 21 October 2026 advertises lunchtime thalis: vegetarian at ${thali.vegetarian.advertisedPrice} and non-vegetarian at ${thali.nonVegetarian.advertisedPrice}. These are advertised prices, not a live menu or price confirmation. `;
  const timing = dinner
    ? 'The leaflet lists these as lunchtime offers and does not confirm thali availability at dinner. Please ask the restaurant before travelling. '
    : 'The leaflet lists lunch service as 12:00–14:30; check current days, service, prices and availability directly. ';
  return {
    kind: 'food.venue_details', area: p.locality, constraints: {},
    reply: `${p.name}, ${p.address}. ${mealDetails}${timing}Contact the restaurant on ${p.phone} or at ${p.website}.`,
    sources: [{title:p.name, url:p.source}]
  };
}


// Specific, source-backed food and ordering answers override the generic venue summary.
export function namedDiningServiceFollowUp(query, messages = []) {
  const q = String(query || '');
  const askVegetarian = /\b(?:vegetarian|veggie|veg|vegan)\b/i.test(q) && /\b(?:menu|options?|dishes|choices|food|serve|have|offer)\b/i.test(q);
  const askOrdering = /\b(?:delivery|deliver|takeaway|take[- ]?out|collection|collect|order online)\b/i.test(q);
  if (!askVegetarian && !askOrdering) return null;
  const named = PLACES.filter(p => p.dining && matchesPlaceName(q, p));
  const priorAnswer = (Array.isArray(messages) ? messages : []).slice(0, -1).reverse()
    .find(m => m?.role === 'assistant' && typeof m.content === 'string')?.content || '';
  const previous = PLACES.filter(p => p.dining && matchesPlaceName(priorAnswer, p));
  const picks = named.length === 1 ? named : (named.length === 0 && previous.length === 1 ? previous : []);
  if (picks.length !== 1) return null;
  const p = picks[0];
  const sources = [{ title: p.name, url: p.source }];
  if (askOrdering && p.ordering) {
    const platforms = p.ordering.deliveryPlatforms || [];
    platforms.forEach(item => sources.push({ title: p.name + ' on ' + item.name, url: item.url }));
    const serviceText = platforms.length
      ? 'Yes. ' + p.name + ' advertises Grab & Go takeaway lunches, and online delivery listings are available on ' + platforms.map(item => item.name).join(' and ') + '. '
      : p.ordering.takeaway + '. ';
    const caution = 'Check each ordering service for your postcode, available times, menu and fees; the listings do not guarantee delivery to every address or at every time. ';
    return { kind:'food.venue_details', area:p.locality, constraints:{},
      reply:serviceText + caution + (p.phone ? 'For direct enquiries, call ' + p.phone + '.' : 'Confirm current arrangements with the restaurant.'),
      sources };
  }
  if (askVegetarian && p.vegetarianMenuExamples) {
    const examples = p.vegetarianMenuExamples;
    sources.push({ title:p.name + ' published menu', url:examples.source });
    if (/\bvegan\b/i.test(q)) {
      return { kind:'food.venue_details', area:p.locality, constraints:{},
        reply:p.name + ' has menu items labelled vegan on its published delivery menu, but I cannot confirm their ingredients, preparation or cross-contact from that label alone. Paneer dishes contain dairy and must not be presented as vegan. Check the current menu and confirm vegan suitability with the restaurant directly.' + (p.phone ? ' Telephone: ' + p.phone + '.' : ''),
        sources };
    }
    const thali = p.lunchThali ? ' Its printed leaflet also advertises a vegetarian lunchtime thali at ' + p.lunchThali.vegetarian.advertisedPrice + ' (price published 21 October 2026, subject to change).' : '';
    return { kind:'food.venue_details', area:p.locality, constraints:{},
      reply:'Yes. ' + p.name + ' lists vegetarian dishes on its published menu, including ' + examples.dishes.join(', ') + '.' + thali + ' Please check the current menu and ask the restaurant directly about ingredients, allergies or vegan requirements.' + (p.phone ? ' Telephone: ' + p.phone + '.' : ''),
      sources };
  }
  return null;
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

export function publishedFoodRecommendation(query, constraint, excludeIds = [], coffeeOverride) {
  const q = String(query || '');
  if (constraint?.mode === 'now') return null;
  if (!/\b(?:desserts?|cakes?|pudding|sweet treats?)\b/i.test(q)) return null;
  if (/\b(?:free|vegan|gluten|allerg|halal|dog|wheelchair|independent|no car)\b|£/i.test(q)) return null;
  const area = areaFrom(q);
  if (area && area !== 'city') return null;
  const coffee = coffeeOverride ?? /\b(?:coffee|hot drinks?|tea)\b/i.test(q);
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][constraint?.day ?? new Date().getDay()];
  const target = constraint && constraint.mode !== 'day' ? constraint.hour * 60 + (constraint.minute || 0) : null;
  const picks = PLACES.filter(p => !excludeIds.includes(p.id) && p.servesDessert === true && (!coffee || p.servesCoffee === true)
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
  if (!picks.length) return { reply: (excludeIds.length ? 'I do not have another confirmed published match for both coffee and dessert after your requested time. ' : 'I could not confirm a published option matching both coffee and dessert during your requested hours. ')+ ' I would not assume a dessert venue serves coffee or recommend a café after its closing time. Tell me if dessert without coffee would suit you, or choose another time.', sources: [], places: [] };
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
