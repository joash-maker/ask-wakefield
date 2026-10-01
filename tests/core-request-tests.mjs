import assert from 'node:assert/strict';
import { scopeConversation } from '../lib/conversation-scope.js';
import { publishedFoodRecommendation } from '../lib/askwakefield-places.js';

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
process.env.GOOGLE_PLACES_ENABLED = 'true';
const { default: handler, requestedPlaceTimeConstraint, placeOpenAtConstraint } = await import('../api/chat.js');
const user = content => ({ role: 'user', content });
const assistant = content => ({ role: 'assistant', content });
const history = [user('Plan us three hours of coffee, books and art in Wakefield city centre'), assistant('Coffee, books, then art'), user('Saturday at 10 am'), assistant('Saturday plan'), user('Can I slot the Hepworth in there?'), assistant('Hepworth plan')];
for (const q of [
  'Friday night, coffee and dessert with friends in Wakefield. Any recommendations?',
  'Where can we have cake and a hot drink after work on Friday?',
  'Suggest dessert places around Wakefield for Friday evening',
  'I want coffee and pudding after work',
  'What’s on in the Wakefield district this weekend?'
]) {
  const scoped = scopeConversation([...history, user(q)]);
  assert.equal(scoped.messages.length, 1, q);
  assert.equal(scoped.newRequest, true);
}
const refined = scopeConversation([...history, user('11:00 am')]);
assert.ok(refined.messages.length > 1);
const friday = [user('Friday night, coffee and dessert in Wakefield after work')];
const time = requestedPlaceTimeConstraint(friday);
assert.equal(time.day, 5);
assert.equal(time.hour, 17);
assert.equal(time.approximate, true);
const updated = requestedPlaceTimeConstraint([...friday, assistant('What time?'), user('7 pm')]);
assert.equal(updated.day, 5);
assert.equal(updated.hour, 19);
assert.equal(requestedPlaceTimeConstraint([user('What’s open Friday night for coffee and dessert?')]).day, 5);
assert.equal(requestedPlaceTimeConstraint([user('What’s open Friday night for coffee and dessert?')]).mode, 'after');
const place = (id, day, coffee = true) => ({
  id, displayName: { text: id }, formattedAddress: 'Wakefield',
  location: { latitude: 53.68, longitude: -1.50 }, businessStatus: 'OPERATIONAL',
  servesCoffee: coffee, servesDessert: true,
  currentOpeningHours: { periods: [{ open: { day, hour: 17 }, close: { day, hour: 22 } }], weekdayDescriptions: ['Friday: 17:00–22:00'] },
  websiteUri: `https://example.com/${id}`, googleMapsUri: `https://maps.google.com/?q=${id}`
});
assert.equal(placeOpenAtConstraint(place('FridayVenue', 5), updated), true);
assert.equal(placeOpenAtConstraint(place('WednesdayOnly', 3), updated), false);
assert.equal(placeOpenAtConstraint({ ...place('Closed', 5), businessStatus: 'CLOSED_PERMANENTLY' }, updated), false);
assert.equal(placeOpenAtConstraint({ currentOpeningHours: { periods: [{ open: { day: 5, hour: 17 }, close: { day: 6, hour: 2 } }] } }, { mode: 'at', day: 6, hour: 1, minute: 0 }), true);

const published = publishedFoodRecommendation(friday[0].content, updated);
assert.match(published.reply, /Dolce Vita/);
assert.match(published.reply, /Club House/);
assert.doesNotMatch(published.reply, /Mocca Moocho|KRA:FT|guaranteed|open now/);
assert.equal(publishedFoodRecommendation('Coffee and dessert in Castleford on Friday', updated), null);
assert.equal(publishedFoodRecommendation('Vegan coffee and dessert Friday', updated), null);

let placesCalls = 0;
let providerFails = false;
globalThis.fetch = async url => {
  if (String(url).includes('places.googleapis.com')) {
    placesCalls++;
    if (providerFails) return new Response('provider unavailable', { status: 503 });
    return new Response(JSON.stringify({ places: [place('FridayVenue', 5), place('WednesdayOnly', 3), place('NoCoffee', 5, false)] }), { status: 200 });
  }
  if (String(url).includes('api.anthropic.com')) return new Response('{}', { status: 503 });
  return new Response('not found', { status: 404 });
};
async function ask(q, prior = [], stateToken = null) {
  const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  await handler({ method: 'POST', headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': 'core-test' }, socket: {}, body: { messages: [...prior, user(q)], stateToken } }, res);
  return res;
}
const live = await ask('Friday night at 7 pm, coffee and dessert with friends in Wakefield. Any recommendations?', history);
assert.ok(placesCalls > 0, 'Evening request must use live Places discovery');
assert.match(live.body.reply, /FridayVenue/);
assert.doesNotMatch(live.body.reply, /WednesdayOnly|NoCoffee|Hepworth/);
assert.equal(live.body.live, true);
providerFails = true;
const fallback = await ask('Coffee and dessert on Friday after work in Wakefield');
assert.match(fallback.body.reply, /Dolce Vita/);
assert.equal(fallback.body.live, false);
assert.equal(fallback.body.verification, 'published-place-options');
assert.equal(fallback.headers['X-AskWakefield-Build'], 'v18-core-2026-10-01.1');
console.log('Core tests passed: topic isolation, preserved refinements, Friday hours, overnight opening, closures, live discovery and provider-failure fallback.');

const { familyPlanFollowUp: horburyFollowUp } = await import('../lib/askwakefield-places.js');
const horburyReply = horburyFollowUp('Starting in Horbury, ages 7 and 4', {lastIntent:'places.family_plan',constraints:{familyPlan:{budget:'£40',ages:[]}}});
assert.match(horburyReply.reply, /Secret Garden/);
assert.match(horburyReply.reply, /£13.90/);
assert.match(horburyFollowUp('Indoor activities nearby?', {lastIntent:'places.family_plan',constraints:horburyReply.constraints}).reply, /Secret Garden/);

const {nightlifeRecommendation,selectTrustedPlaces} = await import('../lib/askwakefield-places.js');
assert.match(nightlifeRecommendation('Recommend bars in Wakefield',{}).reply,/Good Fortunes/);
assert.match(nightlifeRecommendation('Cocktail bars on Wood Street',{}).reply,/Hilton Lounge/);
assert.doesNotMatch(nightlifeRecommendation('Cocktail bars on Wood Street',{}).reply,/Popworld/);
assert.match(nightlifeRecommendation('What about Lost Cause Brewing Co?',{}).reply,/Castleford/);
assert.match(nightlifeRecommendation('What about Journey Lounge?',{}).reply,/cannot confirm/);
assert.equal(nightlifeRecommendation('Is a bar open now?',{}),null);
assert.ok(selectTrustedPlaces('Recommend cocktail bars in Wakefield').some(p=>p.nightlifeStyle));

const {namedDiningFollowUp} = await import('../lib/askwakefield-places.js');
assert.match(namedDiningFollowUp('What about San Leo?').reply,/Mexican.*Italian/);
assert.match(namedDiningFollowUp('Could we try Vera Friday?').reply,/17:00/);
assert.match(namedDiningFollowUp('Vinyl Café North Saturday?').reply,/Closed/);
assert.match(namedDiningFollowUp('Chopstix Sunday?').reply,/18:00/);
assert.match(namedDiningFollowUp('Chopstix Sunday?').reply,/conflict/);
assert.ok(selectTrustedPlaces('Recommend a Thai restaurant in Wakefield').some(p=>p.id==='AW-R004'));

const bowlingState = horburyFollowUp('What about bowling?', {lastIntent:'places.family_plan',constraints:{familyPlan:{budget:'£40',origin:'Wakefield city centre',ages:[7,4]}}});
const bowlingBudget = horburyFollowUp('Would that fit our £40, including getting there?',{lastIntent:'places.family_plan',constraints:bowlingState.constraints});
assert.match(bowlingBudget.reply,/Tenpin Wakefield/);
assert.match(bowlingBudget.reply,/£30/);
assert.match(bowlingBudget.reply,/not quoted venue prices/);

const neutralWeather = horburyFollowUp('Wakefield city centre, ages 7 and 4.',{lastIntent:'places.family_plan',constraints:{familyPlan:{budget:'£40',ages:[]}}});
assert.doesNotMatch(neutralWeather.reply,/heavy rain|rain holds off/);
assert.match(neutralWeather.reply,/For indoor play/);

const afterFourQuestion = 'Can you give me a few places to go for dessert and coffee after work, anything open after 4pm?';
const afterFourTime = requestedPlaceTimeConstraint([user(afterFourQuestion)]);
assert.equal(afterFourTime.mode,'after');
assert.equal(afterFourTime.hour,16);
const wedFour = {...afterFourTime,day:3};
const wedDessert = publishedFoodRecommendation(afterFourQuestion,wedFour);
assert.match(wedDessert.reply,/Dolce Vita/);
assert.doesNotMatch(wedDessert.reply,/Club House|Rassam|300|rarely cramped/);
assert.match(wedDessert.reply,/dessert-only/);
const afterFourResponse = await ask(afterFourQuestion);
assert.equal(afterFourResponse.body.verification,'published-place-options');
assert.match(afterFourResponse.body.reply,/Dolce Vita/);
assert.doesNotMatch(afterFourResponse.body.reply,/300|rarely cramped|mocktail area/);

const dessertHistory = [user(afterFourQuestion), assistant(afterFourResponse.body.reply)];
const moreDessert = await ask('Any others?',dessertHistory,afterFourResponse.body.stateToken);
assert.equal(moreDessert.body.verification,'published-place-options');
assert.match(moreDessert.body.reply,/another confirmed/);
assert.doesNotMatch(moreDessert.body.reply,/KRA:FT|Marmalade|M&S|Bob & Berts/);
const hoursDessert = await ask('What are the typical opening hours?',[...dessertHistory,user('Any others?'),assistant(moreDessert.body.reply)],moreDessert.body.stateToken);
assert.equal(hoursDessert.body.verification,'published-place-options');
assert.match(hoursDessert.body.reply,/Dolce Vita/);
assert.match(hoursDessert.body.reply,/16:30/);

const onlyDessert = await ask('Dessert without coffee',[...dessertHistory,user('Any others?'),assistant(moreDessert.body.reply)],moreDessert.body.stateToken);
assert.equal(onlyDessert.body.verification,'published-place-options');
assert.match(onlyDessert.body.reply,/Rassam/);
assert.match(onlyDessert.body.reply,/Legends/);
assert.doesNotMatch(onlyDessert.body.reply,/Hayat|Pizza Yard/);
const acceptedDessert = await ask('Yes, let me know.',[...dessertHistory,user('Dessert without coffee'),assistant(onlyDessert.body.reply)],onlyDessert.body.stateToken);
assert.equal(acceptedDessert.body.verification,'published-place-options');
assert.match(acceptedDessert.body.reply,/Rassam/);
assert.equal(acceptedDessert.body.state.constraints.coffeeRequired,false);

for (const wording of ['How about just dessert?', 'Just desserts please', 'Only dessert', 'Skip the coffee']) {
 const refined = await ask(wording,[...dessertHistory,user('Any others?'),assistant(moreDessert.body.reply)],moreDessert.body.stateToken);
 assert.equal(refined.body.verification,'published-place-options',wording);
 assert.match(refined.body.reply,/Rassam/,wording);
 assert.match(refined.body.reply,/Legends/,wording);
 assert.equal(refined.body.state.constraints.coffeeRequired,false,wording);
 assert.doesNotMatch(refined.body.reply,/For coffee and something sweet/,wording);
}

const nearbyDessert = await ask('Are there other dessert places nearby?',dessertHistory,afterFourResponse.body.stateToken);
assert.equal(nearbyDessert.body.verification,'published-place-options');
assert.doesNotMatch(nearbyDessert.body.reply,/• Dolce Vita/);
assert.match(nearbyDessert.body.reply,/Where are you starting/);
const nearbyOnly = await ask('How about just dessert?',[...dessertHistory,user('Are there other dessert places nearby?'),assistant(nearbyDessert.body.reply)],nearbyDessert.body.stateToken);
assert.match(nearbyOnly.body.reply,/Rassam/);
assert.equal(nearbyOnly.body.state.constraints.coffeeRequired,false);
assert.ok(nearbyOnly.body.state.resultCards.some(p=>/Rassam/.test(p.name)));
