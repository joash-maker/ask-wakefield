// Replays multi-turn conversations against api/chat.js with mocked sources.
import assert from 'node:assert/strict';
// Keep the fixture on the Tuesday before the 3–4 October 2026 demo weekend.
const NativeDate = Date;
const fixtureNow = '2026-09-29T12:00:00.000Z';
globalThis.Date = class extends NativeDate {
  constructor(...args) { if (args.length) super(...args); else super(fixtureNow); }
  static now() { return NativeDate.parse(fixtureNow); }
};
const target = process.argv[2] || '..';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.GOOGLE_PLACES_ENABLED = 'false';

const listing = `
<html><body>
<h3><a href="https://experiencewakefield.co.uk/event/caphouse-tabletop-gaming-day/">Caphouse Tabletop Gaming Day</a></h3>
<p>Calendar Sat 3 October 2026</p><p>Clock 11:00 - 15:00</p><p>Map pin National Coal Mining Museum</p>
<h3><a href="https://experiencewakefield.co.uk/event/pumpkin-festival/">Farmer Copleys Pumpkin Festival</a></h3>
<p>Calendar Sat 3 October 2026 - Sun 4 October 2026</p><p>Clock 10:00 - 16:00</p><p>Map pin Farmer Copleys</p>
<h3><a href="https://experiencewakefield.co.uk/event/craft-market/">Wakefield Craft Market</a></h3>
<p>Calendar Sun 4 October 2026</p><p>Map pin Wakefield Cathedral Precinct</p>
<h3><a href="https://experiencewakefield.co.uk/event/organ-recital/">Sunday Organ Recital</a></h3>
<p>Calendar Sun 4 October 2026</p><p>Clock 15:00 - 16:00</p><p>Map pin Wakefield Cathedral</p>
<h3><a href="https://experiencewakefield.co.uk/event/family-art-club/">Family Art Club</a></h3>
<p>Calendar Sat 3 October 2026</p><p>Clock 11:00 - 12:30</p><p>Map pin The Hepworth Wakefield</p>
</body></html>`;

const wxListing = `<html><body><h2>Quadrophenia: The Sound of the Mods</h2>
<p>Free</p><p>Saturday 3 October 2026</p><p>Start time:5PM - End time:10PM</p>
<a href="https://wxwakefield.co.uk/Whats-On/Details?event=quadrophenia-the-sound-of-the-mods">More info</a></body></html>`;
const wxDetail = `<html><body><h1>Quadrophenia: The Sound of the Mods</h1>
<p>Free</p><p>Saturday 3 October 2026</p><p>Start time:5PM - End time:10PM</p>
<p>PRICE: Free</p><p>Doors Open & DJs: 5PM</p><p>Performance Starts: 5:30PM</p></body></html>`;

const details = {
  'caphouse-tabletop-gaming-day': ['Caphouse Tabletop Gaming Day', 'Sat 3 October 2026 - Sat 3 October 2026 11:00 - 15:00 National Coal Mining Museum Free event'],
  'pumpkin-festival': ['Farmer Copleys Pumpkin Festival', 'Sat 3 October 2026 - Sun 4 October 2026 10:00 - 16:00 Farmer Copleys £4.50 - £12'],
  'craft-market': ['Wakefield Craft Market', 'Sun 4 October 2026 - Sun 4 October 2026 09:30 - 15:00 Wakefield Cathedral Precinct Free'],
  'organ-recital': ['Sunday Organ Recital', 'Sun 4 October 2026 - Sun 4 October 2026 15:00 - 16:00 Wakefield Cathedral'],
  'family-art-club': ['Family Art Club', 'Sat 3 October 2026 - Sat 3 October 2026 11:00 - 12:30 The Hepworth Wakefield £5']
};

const calls = { anthropic: 0, fetch: [] };
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  calls.fetch.push(u);
  if (u.includes('api.anthropic.com')) {
    calls.anthropic += 1;
    const body = JSON.parse(opts.body);
    const q = body.messages[body.messages.length - 1].content;
    return new Response(JSON.stringify({ content: [{ type: 'text', text: `FINAL_RESPONSE: [LEGACY MODEL ANSWER to: ${String(q).slice(0, 80)}]` }] }), { status: 200 });
  }
  if (u === 'https://experiencewakefield.co.uk/whats-on/') return new Response(listing, { status: 200 });
  if (u === 'https://wxwakefield.co.uk/whats-on') return new Response(wxListing, { status: 200 });
  if (u.includes('wxwakefield.co.uk/Whats-On/Details?event=quadrophenia-the-sound-of-the-mods')) return new Response(wxDetail, { status: 200 });
  const m = u.match(/experiencewakefield\.co\.uk\/event\/([^/]+)\/?$/);
  if (m && details[m[1]]) {
    const [t, meta] = details[m[1]];
    return new Response(`<html><h1>${t}</h1><div>${meta}</div><h2>About</h2><p>${m[1] === "caphouse-tabletop-gaming-day" ? "A family-friendly gaming day for children and adults." : "An event for adult visitors."} Lots of free parking nearby.</p></html>`, { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

const { default: handler } = await import(`${target}/api/chat.js`);

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = c => { res.statusCode = c; return res; };
  res.json = b => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

async function conversation(name, turns, { useCookie = true, useToken = true, cookieOverride, tamperTokenAt = -1 } = {}) {
  console.log(`\n=== ${name} ===`);
  const messages = [];
  let cookie = cookieOverride || '';
  let token = null;
  const results = [];
  for (const [turnIndex, text] of turns.entries()) {
    messages.push({ role: 'user', content: text });
    const body = { messages: [...messages] };
    if (useToken && token) body.stateToken = turnIndex === tamperTokenAt
      ? token.replace(/.$/, token.endsWith('A') ? 'B' : 'A') : token;
    const req = { method: 'POST', headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': name, cookie: useCookie ? cookie : '' }, body, socket: {} };
    const res = mockRes();
    await handler(req, res);
    const setCookie = res.headers['set-cookie'];
    if (setCookie) cookie = setCookie.split(';')[0];
    if (res.body?.stateToken) token = res.body.stateToken;
    const reply = res.body?.reply || '';
    results.push({ reply, verification: res.body?.verification, stateToken: res.body?.stateToken, sources: res.body?.sources || [] });
    console.log(`\n> ${text}\n[${res.body?.verification || '-'}]\n${reply}`);
    if (res.body?.followups) console.log(`chips: ${JSON.stringify(res.body.followups)}`);
    messages.push({ role: 'assistant', content: reply });
  }
  if (name.startsWith('Core weekend')) {
    assert.match(results[0].reply, /Caphouse Tabletop Gaming Day/);
    assert.match(results[1].reply, /Caphouse Tabletop Gaming Day/);
    assert.doesNotMatch(results[1].reply, /Farmer Copleys Pumpkin Festival/);
    assert.match(results[2].reply, /starts at 11:00/);
    assert.match(results[2].reply, /Quadrophenia.*starts at 17:00, performance at 17:30/s);
    assert.doesNotMatch(results[2].reply, /Family Art Club/);
    assert.ok(results[0].sources.length, 'Event sources must be returned');
  }
  if (name.startsWith('Embedded widget')) {
    assert.match(results[1].reply, /Caphouse Tabletop Gaming Day/);
    assert.ok(results[0].stateToken, 'The widget needs a response state token');
  }
  if (name.startsWith('Forged unsigned')) assert.equal(results[0].verification, 'no-prior-list');
  if (name.startsWith('Tampered signed')) assert.equal(results[1].verification, 'no-prior-list');
  if (name.startsWith('New question after')) assert.doesNotMatch(results[1].reply, /These are confirmed as free/);
  if (name.startsWith('Hepworth brunch')) {
    assert.match(results[1].reply, /brunch at The Hepworth.*10:00/i);
    assert.match(results[1].reply, /KRA:FT.*12 Wood Street/s);
    assert.match(results[2].reply, /brunch at The Hepworth.*10:00/i);
    assert.match(results[3].reply, /Friday, 2 October 2026/);
    assert.doesNotMatch(results[3].reply, /Friday, 3 October/);
    assert.match(results[3].reply, /Waterstones is a chain/);
  }
  if (name.startsWith('Family afternoon')) {
    assert.match(results[0].reply, /Wakefield Museum/);
    assert.match(results[1].reply, /Cheeky Monkeys/);
    assert.match(results[2].reply, /Stanley Ferry Wacky Warehouse/);
    assert.doesNotMatch(results[2].reply, /Diggerland/);
  }
  if (name.startsWith('Family town and rain')) {
    assert.match(results[1].reply, /Wakefield city centre.*7 and 4/s);
    assert.match(results[2].reply, /Cheeky Monkeys/);
    assert.match(results[2].reply, /13:30/);
    assert.doesNotMatch(results[2].reply, /£5–8|independent bookshop|five minutes/);
    assert.match(results[3].reply, /Rainbow Playrooms.*13:30/s);
    assert.match(results[4].reply, /Tenpin Wakefield.*Trinity Walk/s);
    assert.doesNotMatch(results[4].reply, /Xscape|four miles/);
  }
  if (name.startsWith('Indoor activity choices')) {
    assert.match(results[2].reply, /Tenpin Wakefield/);
    assert.match(results[2].reply, /Cheeky Monkeys/);
    assert.doesNotMatch(results[2].reply, /Art Pod|every Saturday from 11|short walk apart|Mediahubink/);
  }
  if (name.startsWith('Children from stored weekend')) {
    assert.match(results[2].reply, /Caphouse Tabletop Gaming Day/);
    assert.doesNotMatch(results[2].reply, /Quadrophenia|Blacker Hall|Mediahubink|Art Pods/);
    assert.match(results[3].reply, /Caphouse.*starts at 11:00/s);
    assert.doesNotMatch(results[3].reply, /Quadrophenia/);
  }
  if (name.startsWith('Three demos topic switch')) {
    assert.match(results[1].reply, /Starting at Wakefield city centre/);
    assert.doesNotMatch(results[1].reply, /bus 96|taxi|ten-minute walk/);
    assert.match(results[2].reply, /Tenpin Wakefield/);
    assert.match(results[4].reply, /10:00 to 13:00/);
    assert.match(results[5].reply, /Hepworth as your main art stop/);
    for (const result of results.slice(6)) assert.doesNotMatch(result.reply, /Hepworth as your main art stop|coffee at The Hepworth/);
    assert.match(results[6].reply, /Caphouse Tabletop Gaming Day/);
    assert.match(results[7].reply, /Caphouse Tabletop Gaming Day/);
    assert.match(results[8].reply, /starts at 11:00/);
  }
  if (name.startsWith('Pugneys two hours')) {
    for (const result of results.slice(1)) {
      assert.match(result.reply, /Pugneys/);
      assert.doesNotMatch(result.reply, /Newmillerdam|weather should be kind|late September|15-minute bus/);
    }
    assert.match(results[2].reply, /two hours in one location/);
    assert.match(results[2].reply, /£7.50/);
  }
  if (name.startsWith('Saturday 0930')) {
    assert.match(results[3].reply, /You’re welcome/);
    for (const result of results.slice(1, 3)) {
      assert.match(result.reply, /09:30 to 12:30/);
      assert.match(result.reply, /07:30 opening/);
      assert.doesNotMatch(result.reply, /13:30|waiting for coffee|Both open around 10:00/);
    }
    assert.match(results[2].reply, /prefer books first/);
    assert.match(results[2].reply, /Hepworth your main art stop/);
  }
  if (name.startsWith('Hepworth Saturday')) {
    for (const result of results.slice(1)) {
      assert.match(result.reply, /Hepworth as your main art stop/);
      assert.doesNotMatch(result.reply, /five-minute|five minutes|9:00 or 10:00 breakfast/);
    }
    assert.match(results[3].reply, /10:00 start.*11:00/);
  }
  if (name.startsWith('Hepworth only')) {
    assert.match(results[1].reply, /chosen brunch at The Hepworth/);
    assert.doesNotMatch(results[1].reply, /Mocca Moocho|Bob & Berts/);
  }
  if (name.startsWith('Wood Street morning')) {
    assert.match(results[1].reply, /KRA:FT Koffee, 12 Wood Street/);
    assert.match(results[1].reply, /The Hepworth.*10:00/s);
    assert.doesNotMatch(results[1].reply, /14 Wood Street|KRA:FT Wakefield|five-minute walk/);
  }
  return results;
}

const suites = {
  core: () => conversation('Core weekend flow (same-origin, cookie)', [
    "What's on this weekend?",
    'Which of those are free?',
    'What time do they start?'
  ]),
  city: () => conversation('Hepworth brunch and KRA:FT', [
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'Starting at around 10:00 am with a brunch at the Hepworth, and someone recommended trying out a coffee shop/bar called KRAFT.',
    'What are you talking about?',
    'Friday'
  ]),
  family: () => conversation('Family afternoon and indoor play', [
    'I’ve got two children, no car and about £40 to spend. We want something to do in the Wakefield district this Saturday afternoon. What would you suggest?',
    'Wakefield city centre, my kids are 7 and 4 years old',
    'Playcentres in Wakefield?'
  ]),
  familyTown: () => conversation('Family town and rain follow-ups', [
    'I’ve got two children, no car and about £40 to spend. We want something to do in the Wakefield district this Saturday afternoon. What would you suggest?',
    'Wakefield town, near Trinity walk, Kids ages are 7 and 4.',
    'Stay more central, in case it rains',
    'Yes, please.',
    'Is there a ten pin balling alley nearby?'
  ]),
  indoorNearby: () => conversation('Indoor activity choices', [
    'I’ve got two children, no car and about £40 to spend. We want something to do in the Wakefield district this Saturday afternoon. What would you suggest?',
    'Starting in the City centre, my kids ages are 7 and 4.',
    'Are there indoor activities nearby?'
  ]),
  kidsWeekend: () => conversation('Children from stored weekend', [
    'What’s on in the Wakefield district this weekend?',
    'Which of those are free?',
    'Anything for kids this weekend?',
    'What time do they start?'
  ]),
  topicSwitch: () => conversation('Three demos topic switch', [
    'I’ve got two children, no car and about £40 to spend. We want something to do in the Wakefield district this Saturday afternoon. What would you suggest?',
    'From the city centre, kids ages are 7 and 4',
    'Different shape afternoon',
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'Start around 10:00 am, this saturday.',
    'Can I slot the Hepworth in there?',
    'What’s on in the Wakefield district this weekend?',
    'Which of those are free?',
    'What time do they start?'
  ]),
  pugneys: () => conversation('Pugneys two hours', [
    'I’ve got two children, no car and about £40 to spend. We want something to do in the Wakefield district this Saturday afternoon. What would you suggest?',
    "Near Pugney's, the kids ages are 7 and 4.",
    'About 2 hours, and stay at one location.'
  ]),
  earlySaturday: () => conversation('Saturday 0930 morning', [
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'This saturday, around 9:30 am',
    'Books are fine, and we want to go to the Hepworth',
    'Oh, yes.'
  ]),
  hepworthVisit: () => conversation('Hepworth Saturday visit', [
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'This saturday at 10:00 am, we would like to visit the Hepworth too.',
    'Hepworth?',
    '11:00 am'
  ]),
  brunchOnly: () => conversation('Hepworth only brunch', [
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'We will start around 10:00, at the Hepworth for brunch.'
  ]),
  woodStreet: () => conversation('Wood Street morning follow-up', [
    'My wife and I have three hours in Wakefield city centre. We like good coffee, books and art. Plan us an afternoon.',
    'Starting at 9:30 am and if we can fit in a stop at the Hepworth, and check out some new bars and coffee shops on wood street?'
  ]),
  phrasing: () => conversation('Natural phrasings', [
    "What's on this weekend?",
    'Are any of them free?',
    'How much are they?',
    'Which ones are on Sunday?'
  ]),
  timesNoFree: () => conversation('Start times without a free filter', [
    "What's on this weekend?",
    'What time do they start?'
  ]),
  hijack: () => conversation('New question after an event list', [
    "What's on this weekend?",
    'What free things are there to do in Ossett with kids?'
  ]),
  widget: () => conversation('Embedded widget (cross-origin, no cookie)', [
    "What's on this weekend?",
    'Which of those are free?'
  ], { useCookie: false }),
  forge: () => conversation('Forged unsigned state cookie', [
    'Which of those are free?'
  ], { cookieOverride: 'aw_state=' + Buffer.from(JSON.stringify({ lastIntent: 'events.whats_on', resultCards: [{ id: 'x', entityType: 'event', title: 'Fake Paid Gala', priceStatus: 'free', sourceTier: 'first-party-detail' }] })).toString('base64url') }),
  tamper: () => conversation('Tampered signed token without cookie', [
    "What's on this weekend?",
    'Which of those are free?'
  ], { useCookie: false, tamperTokenAt: 1 }),
  firstFree: () => conversation('Free filter in the first question', [
    'Are there any free events this weekend?',
    'What time do they start?',
    'Show the full list again'
  ]),
  dayThenFree: () => conversation('Day then price narrowing', [
    "What's on this weekend?",
    'What about Sunday?',
    'Which of those are free?',
    'What about Saturday?'
  ]),
  unsupported: () => conversation('Constraints we cannot check yet', [
    "What's on this weekend for kids in Pontefract?"
  ]),
  topicShift: () => conversation('Topic shift after event list', [
    "What's on this weekend?",
    'Where can I get lunch near them?',
    'Which of those are free?'
  ]),
  ask: () => conversation('Free-form question about the list', [
    "What's on this weekend?",
    'Are any of those suitable for toddlers?'
  ]),
  legacyFree: () => conversation('Legacy free path (no longer crashes)', [
    'Any free events on today?'
  ])
};

const which = process.argv.slice(3);
for (const key of (which.length ? which : Object.keys(suites))) await suites[key]();
console.log(`\nAnthropic calls: ${calls.anthropic}`);
