process.env.AW_OUTING_PLANNER_ENABLED='false';
import assert from 'node:assert/strict';
import { conditionalAdmission, isLeisureDiscovery, londonCalendar } from '../lib/event-request-policy.js';
const NativeDate = Date;
const fixtureNow = '2026-11-09T16:00:00Z';
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [fixtureNow])); }
  static now() { return NativeDate.parse(fixtureNow); }
};
process.env.ANTHROPIC_API_KEY = 'test';
process.env.GOOGLE_PLACES_ENABLED = 'false';
process.env.EVENT_CARDS_FIRST_ENABLED = 'true';
process.env.AW_EVENT_CATALOGUE_ENABLED = 'false';
const root = 'https://experiencewakefield.co.uk/event/';
const fixtures = [
  ['Light Up Wakefield', 'light-up-wakefield', 'Fri 13 Nov 2026 - Sat 14 Nov 2026', '17:00 - 21:00', 'Wakefield City Centre', 'Free', 'A celebration of light and creativity.', true, ['13th November 2026', '14th November 2026']],
  ['Sunday Family Fair', 'sunday-fair', 'Sun 15 Nov 2026', '10:00 - 15:00', 'WX Wakefield Exchange', 'Free', 'Activities for families.', true],
  ['Resident Exhibition', 'resident-exhibition', 'Sat 14 Nov 2026', '10:00 - 16:00', 'The Hepworth Wakefield', 'Free', 'Free entry for Wakefield district residents and under 18s. Proof of address required.', true],
  ['Free Parking Activity', 'parking-activity', 'Sat 14 Nov 2026', '10:00 - 12:00', 'Wakefield', '', 'Free parking nearby. Admission not published.', false],
  ['Old Fair', 'old-fair', 'Sat 7 Nov 2026', '10:00 - 12:00', 'Wakefield', 'Free', 'For families.', true],
  ['Adults Session', 'adults-session', 'Sat 14 Nov 2026', '11:00 - 12:00', 'Wakefield', 'Free', 'Adults only.', false]
];
// Matches the live Experience Wakefield sibling sections, including a misleading
// later main/accessibility block. No menu/footer can establish family suitability.
function detail(row) {
  const [title, , dates, time, venue, cost, about, family, sessions = []] = row;
  return `<html><nav>Family friendly. Free event.</nav><section class="postHeading"><h1>${title}</h1><div class="date">${dates}</div><div class="time">${time}</div><div class="venue">${venue}</div><div class="cost">${cost}</div></section><section class="postContent"><div class="labels">${cost === 'Free' ? 'Free event' : ''} ${family ? 'Family friendly' : ''}</div><h2>About</h2><p>${about}</p></section><section class="postContent postContent--sessions">${sessions.map(d => `<div>${d}</div><div>${time}</div>`).join('')}</section><main>Access facilities. Sat 1 Nov 2025</main><footer>Family friendly. Free event.</footer></html>`;
}
const listing = fixtures.map(([title, slug, dates, time, venue]) => `<h3><a href="${root}${slug}/">${title}</a></h3><p>Calendar ${dates}</p>${title === 'Light Up Wakefield' ? '' : `<p>Clock ${time}</p>`}<p>Map pin ${venue}</p>`).join('');
const wxUrl = 'https://wxwakefield.co.uk/Whats-On/Details?event=light-up-wakefield';
const wxRow = (title, slug, sold = false) => `<div class="events-col"><div class="event-item"><div class="img-wrapper"><a href="/Whats-On/Details?event=${slug}" aria-label="More info on ${title}">Photo</a></div><div class="event-text"><h2 class="event-title">${title}</h2><div>Friday 13 - Saturday 14 November 2026</div><div>Start time:5PM - End time:9PM</div><div class="price">FREE</div><p>Part of <a href="/Whats-On/Details?event=light-up-wakefield">Light Up Wakefield</a></p></div><a class="more-info" href="/Whats-On/Details?event=${slug}">More Info</a></div><div class="sold-out ${sold ? 'd-block' : 'd-none'}">Sold out</div></div>`;
const wxListing = wxRow('Light Up Wakefield', 'light-up-wakefield')
  + wxRow('SEND-Friendly Creative Session - Light Up Wakefield', 'send-friendly-creative-session', true)
  + wxRow('Separate Child Workshop - Light Up Wakefield', 'wrong-workshop');
let modelCalls = 0, outage = false;
globalThis.fetch = async url => {
  const u = String(url);
  if (u.includes('anthropic.com')) { modelCalls++; throw Error('This conversation must not reach the prose model'); }
  if (u === 'https://experiencewakefield.co.uk/whats-on/') return new Response(listing);
  if (u === 'https://wxwakefield.co.uk/whats-on') return new Response(wxListing);
  if (u === wxUrl || u.endsWith('event=wrong-workshop')) return new Response(outage ? 'Unavailable' : '<h1>Light Up Wakefield</h1><div>Friday 13 - Saturday 14 November 2026</div><div>Start time:5PM - End time:9PM</div><div>PRICE: Free</div><div>AGE RANGE: Families Children</div><p>A family-friendly festival.</p>', { status: outage ? 503 : 200 });
  const row = fixtures.find(r => u === root + r[1] + '/');
  if (row) return new Response(outage ? 'Unavailable' : detail(row), { status: outage ? 503 : 200 });
  return new Response('Not found', { status: 404 });
};
const { default: handler, stripInternalProcessLeakage } = await import('../api/chat.js');
let requests = 0;
async function ask(q, previous) {
  const messages = [...(previous?.messages || []), { role: 'user', content: q }];
  const res = { setHeader() {}, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': 'free-weekend-' + ++requests }, socket: {}, body: { messages, stateToken: previous?.stateToken } }, res);
  assert.equal(res.code, 200);
  return { ...res.body, messages: [...messages, { role: 'assistant', content: res.body.reply }] };
}
const first = await ask('What free things can we do in Wakefield this weekend?');
assert.equal(first.verification, 'cards-first-v17');
assert.match(first.reply, /Light Up Wakefield/);
assert.match(first.reply, /Saturday,? 14 November/);
assert.match(first.reply, /Sunday Family Fair/);
assert.match(first.reply, /Sunday,? 15 November/);
assert.doesNotMatch(first.reply, /Resident Exhibition|Old Fair|middle of|right now|Friday 13/);
assert.equal(first.state.lastFilter, 'price:free');
assert.equal(first.state.resultCards.filter(c => c.title === 'Light Up Wakefield').length, 1, 'One festival across official sources');
assert.doesNotMatch(first.reply, /SEND-Friendly|Separate Child Workshop/, 'Sold-out sessions and mismatched parent pages cannot qualify');
assert(first.stateToken);
const family = await ask('Is Light Up Wakefield family-friendly?', first);
assert.equal(family.verification, 'cards-first-v17');
assert.match(family.reply, /Yes\. Light Up Wakefield is listed as family-friendly/);
assert.match(family.reply, /Saturday 14 November 2026/);
assert.match(family.reply, /17:00–21:00/);
assert.match(family.reply, /Free entry/);
assert.doesNotMatch(family.reply, /Sunday Family Fair|Adults Session|check.*dates|particular date|year to year/i);
assert.equal(family.sources.length, 1);
assert.equal(family.sources[0].url, root + 'light-up-wakefield/');
const time = await ask('What time does it start?', family);
assert.match(time.reply, /Light Up Wakefield/);
assert.doesNotMatch(time.reply, /Sunday Family Fair|Adults Session/);
assert.match(time.reply, /17:00/);
outage = true;
const retained = await ask('Is Light Up Wakefield family-friendly?', family);
assert.match(retained.reply, /Yes\. Light Up Wakefield/);
assert.match(retained.reply, /checked earlier in this chat/);
assert.match(retained.reply, /Saturday,? 14 November/);
assert.equal(retained.sources[0].url, root + 'light-up-wakefield/');
outage = false;
const adult = await ask('Is Adults Session family-friendly?', first);
assert.doesNotMatch(adult.reply, /Yes\./);
assert.match(adult.reply, /couldn’t confirm children/);
// Variations must use the same structured route, not a phrase-specific patch.
for (const q of ['What fun things can we do this weekend?', 'Any free family activities this weekend?', 'What free activities can we do this weekend?']) {
  const result = await ask(q);
  assert.equal(result.verification, 'cards-first-v17', q);
  assert.match(result.reply, /Light Up Wakefield/, q);
}
const week = await ask("What's on this week in Wakefield?");
assert.equal(week.verification, 'weekly-cards-v1');
assert.equal(week.state.resultCards.filter(c => c.title === 'Light Up Wakefield').length, 1, 'Weekly merge handles a missing clock on one source');
assert.doesNotMatch(week.reply, /SEND-Friendly|Listed as sold out/);
assert.match(week.reply, /Light Up Wakefield\nWakefield City Centre · Friday 13 November 2026 and Saturday 14 November 2026 · 17:00–21:00/);
const friday = await ask('What about Friday?', week);
assert.equal(friday.verification, 'weekly-followup-v1');
assert.match(friday.reply, /Light Up Wakefield/);
assert.doesNotMatch(friday.reply, /Sunday Family Fair|Saturday 14 November 2026/);
assert.match(friday.reply, /Friday 13 November 2026 · 17:00–21:00/);
const weeklyFamily = await ask('Is Light Up Wakefield family-friendly?', week);
assert.match(weeklyFamily.reply, /Yes\. Light Up Wakefield/);
assert.equal(weeklyFamily.sources.length, 1);
const weeklyTime = await ask('What time does it start?', weeklyFamily);
assert.equal(weeklyTime.sources.length, 1);
assert.doesNotMatch(weeklyTime.reply, /Sunday Family Fair/);
assert.match(weeklyTime.reply, /starts at 17:00.*runs until 21:00/s);

for (const text of ['Free for Wakefield residents', 'Free entry for under 18s', 'Free admission to members', 'Free event. Standard admission applies.', 'Free with an exhibition ticket']) assert(conditionalAdmission(text), text);
assert.equal(conditionalAdmission('Free entry. Everyone welcome.'), null);
assert.equal(conditionalAdmission('Free parking and Wi-Fi.'), null);
assert.equal(isLeisureDiscovery('Where can I get a burger?'), false);
assert.equal(londonCalendar(new Date('2026-11-09T16:00Z')).saturday, '2026-11-14');
assert.equal(londonCalendar(new Date('2026-10-24T23:30Z')).tomorrow, '2026-10-26', 'DST fallback must advance London date');
assert.equal(londonCalendar(new Date('2026-03-28T23:30Z')).sunday, '2026-03-29', 'DST spring weekend must retain Sunday');
assert.equal(londonCalendar(new Date('2026-12-31T23:30Z')).saturday, '2027-01-02');
assert.equal(stripInternalProcessLeakage('Hello\n— Next line'), 'Hello\n, Next line');
assert.equal(modelCalls, 0);
console.log('Free weekend continuity: exact conversation, named/singular membership, dates, eligibility, source failure, adults-only, variants and London DST passed.');
