import assert from 'node:assert/strict';

const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : ['2026-10-23T12:00:00Z'])); }
  static now() { return NativeDate.parse('2026-10-23T12:00:00Z'); }
};
process.env.ANTHROPIC_API_KEY = 'test';
process.env.GOOGLE_PLACES_ENABLED = 'false';

const listing = `<html><body>
<h3><a href="https://experiencewakefield.co.uk/event/pumpkin-festival/">Farmer Copleys’ Pumpkin Festival</a></h3>
<div class="place-time-wrapper"><img alt="Calendar"><span>Now - <span class="event-end-date">Sun 01 Nov 2026</span></span></div>
<div>10:00 - 16:00</div>
<div>Farmer Copleys</div>
</body></html>`;

globalThis.fetch = async (url) => {
  const value = String(url);
  if (value.includes('anthropic.com')) throw new Error('Weekly view must bypass model');
  if (value === 'https://experiencewakefield.co.uk/whats-on/') return new Response(listing, { status: 200 });
  return new Response('not found', { status: 404 });
};

const { default: handler } = await import('../api/chat.js');
function mockRes() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

const first = mockRes();
await handler({ method: 'POST', headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': 'ongoing-regression' }, socket: {}, body: { messages: [{ role: 'user', content: "What's on this week in Wakefield?" }] } }, first);
assert.equal(first.statusCode, 200);
assert.equal(first.body.verification, 'weekly-cards-v1');
assert.match(first.body.reply, /Ongoing until Sunday 1 November 2026/);
assert.match(first.body.reply, /Check the event page for individual session dates and times/);
assert.doesNotMatch(first.body.reply, /Friday 23 October 2026 to Sunday 1 November|10:00|16:00/);
assert.equal(first.body.state.resultCards.some(card => card.ongoing === true && card.startDate == null), true);
assert.ok(first.body.stateToken);

const follow = mockRes();
await handler({
  method: 'POST',
  headers: { origin: 'https://www.askwakefield.co.uk', 'x-forwarded-for': 'ongoing-followup' },
  socket: {},
  body: { messages: [{ role: 'user', content: "What's on this week in Wakefield?" }, { role: 'assistant', content: first.body.reply }, { role: 'user', content: 'Show the full list again' }], stateToken: first.body.stateToken }
}, follow);
assert.equal(follow.statusCode, 200);
assert.equal(follow.body.verification, 'weekly-followup-v1');
assert.match(follow.body.reply, /Ongoing until Sunday 1 November 2026/);
assert.doesNotMatch(follow.body.reply, /Friday 23 October 2026 to Sunday 1 November|10:00|16:00/);
assert.equal(follow.body.state.resultCards.some(card => card.ongoing === true && card.startDate == null), true);

console.log('Ongoing handler checks passed: initial weekly answer and signed-state follow-up keep the unknown start.');
