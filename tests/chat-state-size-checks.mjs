import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { attachState, decodeState } from "../lib/chat/transport.js";
import { initialState } from "../lib/chat/state.ts";
const irrelevantPageText = randomBytes(40000).toString("base64");
const records = Array.from({ length: 10 }, (_, i) => ({
  id: "event-" + i,
  entityType: "event",
  title: "Event " + i,
  sourceUrl: "https://official.example/events/" + i,
  venue: "Wakefield Museum",
  startDate: "2026-11-28",
  endDate: "2026-11-28",
  start: "17:00",
  end: "21:00",
  categories: i % 2 ? ["music"] : ["arts"],
  catalogueVerified: true,
  checkedAt: new Date().toISOString(),
  description: irrelevantPageText,
  fields: { detailText: irrelevantPageText, description: irrelevantPageText },
  evidence: {
    sourceUrl: "https://official.example/events/" + i,
    menuSourceUrl: "https://official.example/menu",
  },
}));
const state = {
  ...initialState(),
  topic: "events",
  weekday: "saturday",
  dateRange: {
    start: "2026-11-23",
    end: "2026-11-29",
    from: "2026-11-26",
    today: "2026-11-26",
    kind: "this-week",
  },
  resultCards: records,
  viewIds: records.map((r) => r.id),
};
const headers = {};
const token = attachState(
  {
    setHeader(k, v) {
      headers[k] = v;
    },
  },
  state,
);
assert(token);
assert(token.length <= 3600);
assert(headers["Set-Cookie"].includes("HttpOnly"));
const restored = decodeState(token);
assert(restored);
assert.equal(restored.weekday, "saturday");
assert.deepEqual(restored.viewIds, state.viewIds);
assert.equal(restored.resultCards.length, 10);
for (let i = 0; i < 10; i++) {
  const r = restored.resultCards[i];
  assert.equal(r.id, records[i].id);
  assert.equal(r.start, "17:00");
  assert.equal(r.sourceUrl, records[i].sourceUrl);
  assert.deepEqual(r.categories, records[i].categories);
  assert.equal(r.catalogueVerified, true);
  assert.equal(r.evidence.menuSourceUrl, records[i].evidence.menuSourceUrl);
  assert.equal(r.description, undefined);
  assert.equal(r.fields.detailText, undefined);
}
assert.equal(
  state.resultCards[0].description,
  irrelevantPageText,
  "The response records must not be mutated by transport compaction",
);
console.log(
  "Signed-state size checks passed: ten real-sized source records retain their dates, IDs, times, categories and evidence without copying page bodies into the cookie.",
);

// Real-world record sizes may exceed a cookie even after page text is removed.
// Preserve the entire result set in the response token, rather than silently
// keeping the first four rows and destroying later Saturday matches.
const { canonicalise } = await import("../lib/chat/canonicalStore.ts");
const { runChatPipeline } = await import("../lib/chat/pipeline.ts");
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) {
    super(...(a.length ? a : ["2026-11-26T19:00:00Z"]));
  }
  static now() {
    return RealDate.parse("2026-11-26T19:00:00Z");
  }
};
const specs = [
  ["Grow and Create", "2026-11-26", "10:00"],
  ["Toddler Disco", "2026-11-27", "10:00"],
  ["Rodeo Night", "2026-11-27", "19:00"],
  ["Autumn Craft Fair", "2026-11-28", "10:00"],
  ["Family Rhubarb Textile Workshop", "2026-11-28", "13:00"],
  ["Nostell Ghost Walks", "2026-11-28", "17:30"],
  ["Pooch Passport Challenge", "2026-11-28", "09:00"],
  ["Tufting Open Day", "2026-11-29", "10:00"],
  ["Winter Con", "2026-11-29", "10:00"],
];
const large = specs.map(([title, date, start], i) =>
  canonicalise({
    id: "large-" + i,
    title,
    venue: i === 5 ? "Nostell" : "WX Wakefield Exchange",
    startDate: date,
    endDate: date,
    start,
    end: i === 5 ? "19:30" : "16:00",
    categories: i === 2 ? ["music"] : ["arts"],
    sourceUrl: "https://official.example/" + randomBytes(700).toString("hex"),
    catalogueVerified: true,
    checkedAt: new Date().toISOString(),
  }),
);
const complete = {
  ...state,
  resultCards: large,
  viewIds: large.map((r) => r.id),
  weekday: null,
};
const fullToken = attachState(
  {
    setHeader(k, v) {
      headers[k] = v;
    },
  },
  complete,
);
assert(fullToken.length > 3600);
assert.match(headers["Set-Cookie"], /Max-Age=0/);
const decoded = decodeState(fullToken);
assert.equal(decoded.resultCards.length, 9);
assert.deepEqual(decoded.viewIds, complete.viewIds);
globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
const saturday = await runChatPipeline(
  [{ role: "user", content: "What about Saturday?" }],
  decoded,
);
assert.equal(saturday.state.viewIds.length, 4);
assert.match(saturday.reply, /^For Saturday 28 November 2026:/);
assert.doesNotMatch(saturday.reply, /coming up from Thursday/);
const bands = await runChatPipeline(
  [{ role: "user", content: "Live bands?" }],
  decodeState(attachState({ setHeader() {} }, saturday.state)),
);
const evening = await runChatPipeline(
  [{ role: "user", content: "Anything in the evening?" }],
  decodeState(attachState({ setHeader() {} }, bands.state)),
);
const other = await runChatPipeline(
  [{ role: "user", content: "No music, what else?" }],
  decodeState(attachState({ setHeader() {} }, evening.state)),
);
assert.equal(other.state.weekday, "saturday");
assert.equal(other.state.timeWindow.startHour, 17);
assert.equal(other.state.viewIds.length, 1);
assert.match(other.reply, /Nostell Ghost Walks/);
console.log(
  "Large signed-state replay passed: all Saturday events and the non-music evening option survive the complete user sequence.",
);
