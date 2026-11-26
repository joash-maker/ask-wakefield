import assert from "node:assert/strict";
import { initialState, mergeConversationState } from "../lib/chat/state.ts";
import { extractIntentAndDelta } from "../lib/chat/intent.ts";
import { canonicalise, resolvePlace } from "../lib/chat/canonicalStore.ts";
import {
  verifyResponseDraft,
  verifyAndRenderResponse,
} from "../lib/chat/verifier.ts";
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : ["2026-11-26T10:00:00Z"]));
  }
  static now() {
    return NativeDate.parse("2026-11-26T10:00:00Z");
  }
};
const range = {
  start: "2026-11-23",
  end: "2026-11-29",
  from: "2026-11-26",
  today: "2026-11-26",
  kind: "this-week",
};
const saturday = mergeConversationState(initialState(), {
  question: "Saturday",
  operation: "filter",
  topic: "events",
  dateRange: range,
  weekday: "saturday",
});
for (const q of ["Live bands?", "Anything musical?", "Any music events?"]) {
  const delta = await extractIntentAndDelta(q, saturday);
  const state = mergeConversationState(saturday, delta);
  assert.deepEqual(state.dateRange, range);
  assert.equal(state.weekday, "saturday");
  assert.deepEqual(state.includeCategories, ["music"]);
}
const excluded = mergeConversationState(
  saturday,
  await extractIntentAndDelta("No music, what else?", saturday),
);
assert.deepEqual(excluded.includeCategories, []);
assert.deepEqual(excluded.excludeCategories, ["music"]);
const evening = mergeConversationState(
  saturday,
  await extractIntentAndDelta("Any live bands in the evening?", saturday),
);
assert.deepEqual(evening.timeWindow, {
  startHour: 17,
  endHour: 24,
  label: "evening",
});
assert.equal(evening.weekday, "saturday");
const clear = mergeConversationState(
  evening,
  await extractIntentAndDelta("Clear dates, any time", evening),
);
assert.equal(clear.dateRange, null);
assert.equal(clear.timeWindow, null);
assert.equal(
  resolvePlace({ name: "Haus" }).id,
  resolvePlace({ name: "Haus Coffee & Plants" }).id,
);
assert.equal(
  resolvePlace({ name: "Bob & Berts Wakefield" }).id,
  resolvePlace({ name: "Bob & Berts, Trinity Walk" }).id,
);
const a = canonicalise({
  title: "Ghost Walk",
  venue: "Nostell, National Trust",
  startDate: "2026-11-28",
  sourceUrl: "https://experiencewakefield.co.uk/event/walk/",
});
const b = canonicalise({
  title: "Ghost Walk",
  venue: "Nostell",
  startDate: "2026-11-28",
  sourceUrl: "https://www.nationaltrust.org.uk/event/walk/",
});
assert.equal(a.id, b.id);
const known = canonicalise(
  {
    id: "known",
    name: "Known Coffee",
    address: "1 Test Street, WF1 1AA",
    sourceUrl: "https://official.example/known",
    openingHours: null,
  },
  "place",
);
// A stale raw field must not bypass the canonical null, either.
known.fields.end = "23:00";
known.fields.endMinute = 1380;
const hidden = canonicalise(
  {
    id: "hidden",
    name: "Filtered Out",
    sourceUrl: "https://official.example/hidden",
  },
  "place",
);
const retrieval = {
  records: [known, hidden],
  candidateIds: [known.id],
  mode: "place-list",
  provenance: "fixture",
  warnings: [],
  context: {},
};
const state = initialState({
  topic: "food",
  operation: "hours",
  needs: ["coffee"],
});
const malicious = {
  items: [
    {
      recordId: "invented",
      sourceUrl: "https://attacker.example",
      openingHours: "until 23:00",
    },
    { recordId: hidden.id },
    {
      recordId: known.id,
      fields: ["openingHours", "sourceUrl"],
      sourceUrl: "https://attacker.example",
      title: "Invented Cafe",
      openingHours: "until 23:00",
      reply: "Serves hot chocolate",
    },
  ],
  reply: "Unlisted Fixture Cafe is open until 23:00",
};
const verified = verifyResponseDraft(retrieval, malicious, state);
assert.deepEqual(
  verified.records.map((r) => r.id),
  [known.id],
);
assert.equal(verified.records[0].sourceUrl, "https://official.example/known");
assert.equal(verified.records[0].openingHours, null);
assert.equal(verified.records[0].fields.endMinute, undefined);
assert(verified.unknownFields.includes(known.id + ":openingHours"));
const rendered = verifyAndRenderResponse(retrieval, state, malicious);
assert.doesNotMatch(
  rendered.reply,
  /23:00|hot chocolate|Invented|Unlisted|attacker/,
);
assert.deepEqual(
  rendered.sources.map((s) => s.url),
  ["https://official.example/known"],
);
assert.match(rendered.reply, /\?$/);
assert.equal(
  verifyResponseDraft(retrieval, { items: "not an array" }, state).records
    .length,
  0,
);
assert.equal(
  verifyResponseDraft(
    retrieval,
    { items: [{ recordId: known.id }, { recordId: known.id }] },
    state,
  ).records.length,
  1,
);

// Null is authoritative, including after persistence and despite stale raw
// provider fields. Never resurrect a field from a second state handler.
assert.equal(initialState(clear).dateRange, null);
const nullHours = canonicalise(
  {
    name: "Unknown hours",
    sourceUrl: "https://official.example/unknown",
    openingHours: null,
    start: "08:00",
    end: "23:00",
  },
  "place",
);
assert.equal(nullHours.openingHours, null);
const gate = verifyResponseDraft(
  { ...retrieval, records: [nullHours], candidateIds: [nullHours.id] },
  { items: [{ recordId: nullHours.id, openingHours: "23:00" }] },
  state,
);
assert.equal(gate.records[0].end, null);
assert.equal(gate.records[0].fields.end, undefined);

// Exercise stage three with positive and negative fixtures, rather than
// passing an evening test simply by returning an empty answer.
const { queryAndFilterCanonicalRecords } =
  await import("../lib/chat/canonicalStore.ts");
const fixture = (id, title, start, categories) =>
  canonicalise({
    id,
    title,
    venue: "WX Wakefield Exchange",
    start,
    end: start ? "22:00" : null,
    startDate: "2026-11-28",
    endDate: "2026-11-28",
    dates: ["2026-11-28"],
    categories,
    catalogueVerified: true,
    sessionTimes: start ? [{ date: "2026-11-28", start, end: "22:00" }] : [],
    sourceUrl: "https://official.example/" + id,
  });
const corpus = [
  fixture("day", "Daytime band", "13:00", ["music"]),
  fixture("evening", "Evening band", "17:00", ["music"]),
  fixture("unknown", "Unknown time band", null, ["music"]),
  fixture("art", "Evening art", "18:00", ["arts"]),
];
globalThis.fetch = async () => {
  throw Error("Filtering a verified fixture must not access the network");
};
const filtered = await queryAndFilterCanonicalRecords(
  { ...evening, operation: "filter", resultCards: corpus },
  { question: "evening", operation: "filter" },
  [],
);
assert.deepEqual(filtered.candidateIds, [corpus[1].id]);
const noMusic = await queryAndFilterCanonicalRecords(
  { ...excluded, operation: "filter", resultCards: corpus },
  { question: "No music", operation: "filter" },
  [],
);
assert.deepEqual(noMusic.candidateIds, [corpus[3].id]);

const hausVariants = [
  canonicalise(
    { name: "Haus", sourceUrl: "https://maps.google.com/?cid=77" },
    "place",
  ),
  canonicalise(
    {
      name: "Haus Coffee & Plants",
      sourceUrl: "https://experiencewakefield.co.uk/venue/haus/",
    },
    "place",
  ),
];
assert.equal(hausVariants[0].id, hausVariants[1].id);
assert.equal(hausVariants[0].sourceUrl, hausVariants[1].sourceUrl);
assert.match(hausVariants[0].id, /^place:.*:WF1/);
assert.equal(
  resolvePlace({
    name: "Bob & Berts Wakefield",
    address: "Other town WF10 1AA",
  }),
  undefined,
  "Conflicting postcodes must not join separate branches",
);
const { mergeCanonicalRecords } = await import("../lib/chat/canonicalStore.ts");
const conflict = mergeCanonicalRecords([
  fixture("one", "Conflicting concert", "17:00", ["music"]),
  fixture("two", "Conflicting concert", "19:00", ["music"]),
]);
assert.equal(conflict.length, 1);
assert.equal(conflict[0].start, null);
assert.equal(conflict[0].sessionTimes.length, 0);
assert.deepEqual(conflict[0].evidence.conflicts, ["time"]);
const selectedMusic = {
  ...saturday,
  selectedId: corpus[1].id,
  selectedName: corpus[1].title,
  resultCards: corpus,
  constraints: { ...saturday.constraints, eventFocus: { id: corpus[1].id } },
};
const without = mergeConversationState(
  selectedMusic,
  await extractIntentAndDelta("No music, what else?", selectedMusic),
);
assert.equal(without.selectedId, null);
assert.deepEqual(without.excludeCategories, ["music"]);

const emptyHours = {
  ...known,
  openingHours: {},
  fields: { ...known.fields, end: "23:00", endMinute: 1380 },
};
const emptyCheck = verifyResponseDraft(
  { ...retrieval, records: [emptyHours], candidateIds: [emptyHours.id] },
  { items: [{ recordId: emptyHours.id }] },
  state,
);
assert.equal(
  emptyCheck.records[0].fields.endMinute,
  undefined,
  "An empty hours object is missing evidence",
);
console.log(
  "Unified contracts passed: inherited state, exclusions, evening window, canonical joins and adversarial ID/URL/hour injection.",
);
