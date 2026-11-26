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
