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
async function ask(q, prior = []) {
  const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  await handler({ method: 'POST', headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': 'core-test' }, socket: {}, body: { messages: [...prior, user(q)] } }, res);
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
assert.equal(fallback.headers['X-AskWakefield-Build'], 'v18-core-2026-09-30.4');
console.log('Core tests passed: topic isolation, preserved refinements, Friday hours, overnight opening, closures, live discovery and provider-failure fallback.');

const { familyPlanFollowUp: horburyFollowUp } = await import('../lib/askwakefield-places.js');
const horburyReply = horburyFollowUp('Starting in Horbury, ages 7 and 4', {lastIntent:'places.family_plan',constraints:{familyPlan:{budget:'£40',ages:[]}}});
assert.match(horburyReply.reply, /Secret Garden/);
assert.match(horburyReply.reply, /£13.90/);
assert.match(horburyFollowUp('Indoor activities nearby?', {lastIntent:'places.family_plan',constraints:horburyReply.constraints}).reply, /Secret Garden/);
