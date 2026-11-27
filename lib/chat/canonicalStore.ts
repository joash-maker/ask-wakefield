import {
  canonicalise,
  mergeCanonicalRecords,
  normal,
  url,
} from "./canonicalRecords.ts";
export { canonicalise, mergeCanonicalRecords } from "./canonicalRecords.ts";
export { resolvePlace } from "./entityIdentity.ts";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import type {
  ConversationState,
  TurnDelta,
  CanonicalRecord,
  Retrieval,
} from "./types.ts";
import * as readers from "./providers/sourceReaders.js";
import { loadCatalogueWeek } from "../events/catalogue.js";
import {
  fetchCouncilSeasonalContext,
  COUNCIL_CHRISTMAS_URL,
} from "../events/council-seasonal.js";
import {
  selectWeekCards,
  reconcileWeekCards,
  weekdayInWindow,
  eventInWakefieldCity,
} from "../event-week-window.js";
import { timesForCard } from "../event-session-times.js";
import { londonCalendar } from "../event-request-policy.js";
import { PLACES } from "../askwakefield-places-data.js";
import * as knowledge from "../askwakefield-places.js";
import { chatNavigation } from "../chat-navigation.js";
import { requirementAnswer } from "../chat-requirements.js";
import { activityDiscovery } from "../activity-discovery.js";
import { verifyHotChocolate } from "../coffee-discovery.js";
import {
  selectedOuting,
  outingParty,
  checkedOptions,
} from "../outing-companion.js";
import {
  checkMenus,
  optionFits,
  optionServices,
  compactFoodOption,
  sourceKey,
} from "../outing-food.js";
import { foodWindow } from "../outing-places.js";
import { outingTime } from "../outing-time.js";
import { contextualOutingPlan, fallbackOutingPlan } from "../outing-planner.js";
function base(
  records: CanonicalRecord[],
  mode: string,
  provenance: string,
  context: any = {},
): Retrieval {
  return {
    records,
    candidateIds: records.map((r) => r.id),
    mode,
    provenance,
    warnings: [],
    context,
  };
}
function oldState(s: ConversationState) {
  return {
    ...s,
    resultCards: s.resultCards.map((r: any) =>
      r.fields ? { ...r.fields, ...r } : r,
    ),
  };
}
function guidance(
  result: any,
  provenance = "local-navigation-v1",
): Retrieval | null {
  if (!result) return null;
  const sourceList = (result.sources || []).filter((s: any) => url(s.url));
  const id =
    "guidance:" +
    createHash("sha256").update(result.reply).digest("hex").slice(0, 20);
  // This field is compiled by a versioned local knowledge provider, never by
  // an LLM. URLs are registered separately and reconstructed in the verifier.
  const record: CanonicalRecord = {
    id,
    providerIds: [],
    entityType: "guidance",
    title: "Local guidance",
    sourceUrl: sourceList[0]?.url || null,
    categories: [],
    openingHours:
      result.reply.match(
        /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)|\b\d{1,2}:\d{2}/gi,
      ) || null,
    evidence: {
      sourceUrl: sourceList[0]?.url,
      sourceList,
      registeredKnowledge: true,
    },
    fields: { content: result.reply, sourceList },
  };
  const constraints = result.state?.constraints || result.constraints || {};
  return {
    ...base([record], "guidance", result.verification || provenance, {
      ...constraints,
      lastIntent: result.state?.lastIntent || result.kind || provenance,
      recordsReplace: false,
    }),
    guidanceId: id,
  };
}
const marketUrls: Record<string, string> = {
  "Light Up Wakefield":
    "https://experiencewakefield.co.uk/event/light-up-wakefield/",
  "Tileyard North Christmas Market":
    "https://experiencewakefield.co.uk/event/tileyard-north-christmas-market/",
  "The Hepworth Wakefield Festive Market":
    "https://experiencewakefield.co.uk/event/the-hepworth-wakefield-festive-market/",
  "Wakefield Christmas Market": COUNCIL_CHRISTMAS_URL,
};
async function eventDetail(s: ConversationState, messages: any[]) {
  const prior =
    s.resultCards.find((r: any) => r.id === s.selectedId) ||
    s.resultCards.find((r: any) => r.title === s.selectedName);
  let source =
    prior?.sourceUrl || prior?.url || marketUrls[s.selectedName || ""];
  let name = s.selectedName || prior?.title;
  if (!source && name) {
    const context = await readers.fetchExperienceWakefieldEventsContext();
    const link = [
      ...(context?.listingEventCards || []).map((c: any) => ({
        title: c.title,
        url: c.sourceUrl,
      })),
      ...(context?.eventLinks || []).map((l: any) => ({
        title: l.label,
        url: l.url,
      })),
    ].find((l: any) => normal(l.title) === normal(name));
    source = link?.url;
  }
  const detail = source
    ? await readers.fetchEventDetailContextByUrl(source, name)
    : null;
  if (!detail?.eventDetailCard && !prior)
    return base([], "event-detail", "selected-event-unverified");
  let raw = {
    ...(prior ? { ...prior.fields, ...prior } : {}),
    ...(detail?.eventDetailCard || {}),
    sourceUrl: source || prior.sourceUrl,
  };
  if (s.family) raw = (await readers.verifyWeeklyFamilyCards([raw]))[0] || raw;
  let record = canonicalise(raw);
  record.id = prior?.id || record.id;
  record.fields.id = record.id;
  const dates: string[] = record.occurrenceDates?.length
    ? record.occurrenceDates
    : [record.startDate].filter((d): d is string => typeof d === "string");
  let selectedDates: string[] = dates
    .filter((d): d is string => typeof d === "string")
    .filter(
      (d) =>
        !prior ||
        !s.dateRange ||
        (d >= s.dateRange.from && d <= s.dateRange.end),
    );
  if (s.weekday) {
    const target = s.dateRange ? weekdayInWindow(s.weekday, s.dateRange) : null;
    selectedDates =
      target && dates.includes(target)
        ? [target]
        : selectedDates.filter(
            (d: any) =>
              new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                timeZone: "Europe/London",
              })
                .format(new Date(d + "T12:00:00Z"))
                .toLowerCase() === s.weekday,
          );
  }
  const clocks = timesForCard({ ...record, dates: selectedDates });
  record = {
    ...record,
    dates: selectedDates,
    ...clocks,
    fields: {
      ...record.fields,
      dates: selectedDates,
      ...clocks,
      sections:
        detail?.eventSections || s.constraints.eventFocus?.sections || null,
      refreshFailed: !detail,
      performanceStart: raw.performanceStart,
    },
  };
  const previous = oldState(s);
  previous.resultCards = [
    record,
    ...previous.resultCards.filter((c: any) => c.id !== record.id),
  ];
  previous.constraints = {
    ...previous.constraints,
    eventFocus: {
      id: record.id,
      sections: record.fields.sections,
      checkedAt: detail
        ? new Date().toISOString()
        : s.constraints.eventFocus?.checkedAt,
    },
  };
  const ctx = selectedOuting(previous);
  let outing = {
    ...(s.constraints.outing?.eventId === record.id
      ? s.constraints.outing
      : {}),
    eventId: record.id,
    party: outingParty(s.question, s.constraints.outing?.party),
    activeTopic: "event",
  };
  let picks: CanonicalRecord[] = [];
  if (
    ctx &&
    !outing.suggested &&
    !/family.friendly/i.test(s.question) &&
    s.operation === "detail" &&
    !s.freeOnly &&
    !s.constraints.accessPlan
  ) {
    const options = await checkedOptions(
      { ...ctx, party: outing.party },
      outing,
      readers.outingServices(),
      new Date(),
    );
    outing = { ...outing, ...options, suggested: true };
    const selected =
      options.options.find((p: any) => p.sourceKind !== "branch-listing") ||
      options.options[0];
    if (selected) {
      picks = [
        canonicalise(
          {
            ...selected,
            title: selected.name,
            services: selected.services || ["coffee"],
          },
          "place",
        ),
      ];
      outing.currentIds = [sourceKey(selected.sourceUrl)];
      outing.shownIds = [sourceKey(selected.sourceUrl)];
    }
  }
  const oldCards = s.resultCards.filter(
    (c: any) => c.entityType === "event" && c.id !== record.id,
  );
  const context = {
    eventFocus: previous.constraints.eventFocus,
    outing,
    selectedId: record.id,
    selectedName: record.title,
    allRecords: [record, ...oldCards],
    suggestionIds: picks.map((r) => r.id),
    lastIntent: "events.filter_existing",
  };
  return {
    ...base(
      [record, ...picks],
      s.operation === "parking"
        ? "event-parking"
        : s.operation === "hours"
          ? "event-time"
          : "event-detail",
      s.operation !== "parking" &&
        name !== "Light Up Wakefield" &&
        Object.keys(marketUrls).includes(name || "")
        ? "named-market-v1"
        : prior
          ? "cards-first-v17"
          : "selected-event-discovery-v2",
      context,
    ),
    candidateIds: [record.id, ...picks.map((r) => r.id)],
  };
}
async function eveningRecords(
  s: ConversationState,
  messages: any[],
  detail: Retrieval,
): Promise<Retrieval> {
  const event = detail.records.find((r) => r.entityType === "event");
  if (!event?.start || !event.end) return detail;
  const parts = event.start.split(":").map(Number),
    before = Math.max(0, parts[0] * 60 + parts[1] - 60),
    after = event.end
      .split(":")
      .map(Number)
      .reduce((h, m) => h * 60 + m);
  const asClock = (m: number) =>
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0");
  const phases = [
    { needs: ["dinner"], timing: "before", time: before },
    { needs: ["coffee"], timing: "after", time: after },
  ];
  const outcomes = await Promise.all(
    phases.map(async (phase) => {
      const working = {
        ...s,
        question:
          (phase.timing === "before"
            ? "Dinner before the event at "
            : "Coffee after the event at ") + asClock(phase.time),
        resultCards: detail.context!.allRecords,
        constraints: {
          ...s.constraints,
          eventFocus: detail.context!.eventFocus,
          outing: {
            ...detail.context!.outing,
            plan: { intent: "food_drink", ...phase, maxOptions: 1 },
          },
        },
      };
      return outingFood(working, messages);
    }),
  );
  const places = outcomes.flatMap((r) => r?.records || []),
    phaseIds = outcomes.map((r) => r?.candidateIds || []);
  return {
    ...detail,
    records: [event, ...places],
    candidateIds: [event.id, ...places.map((r) => r.id)],
    mode: "event-plan",
    provenance: "outing-evening-plan-v1",
    context: {
      ...detail.context,
      phaseIds,
      phaseTimes: [before, after],
      suggestionIds: places.map((r) => r.id),
      outing: { ...detail.context!.outing, ...outcomes[1]?.context?.outing },
      allRecords: [
        event,
        ...s.resultCards.filter(
          (r) => r.entityType === "event" && r.id !== event.id,
        ),
      ],
    },
  };
}
async function events(
  s: ConversationState,
  messages: any[],
): Promise<Retrieval> {
  if (s.constraints.missingPriorList)
    return base([], "no-prior-list", "no-prior-list", {
      recordsReplace: false,
    });
  if (s.operation === "parking" && !s.selectedId && !s.selectedName)
    return base([], "event-choice", "event-parking-choice", {
      recordsReplace: false,
    });
  if (s.selectedId || s.selectedName) {
    const detail = await eventDetail(s, messages);
    if (s.operation === "parking" && /\b(?:coffee|caf[eé]s?|hot chocolate|hot drinks?)\b/i.test(s.question)) {
      const event = detail.records.find((r) => r.entityType === "event");
      if (event && detail.context) {
        const needs = /hot chocolate/i.test(s.question) ? ["hot_chocolate"] : ["coffee"];
        const working = {
          ...s,
          question: needs.includes("hot_chocolate") ? "Hot chocolate nearby" : "Coffee nearby",
          resultCards: detail.context.allRecords,
          constraints: {
            ...s.constraints,
            eventFocus: detail.context.eventFocus,
            outing: {
              ...detail.context.outing,
              plan: { intent: "food_drink", needs, timing: "during" },
            },
          },
        };
        const food = await outingFood(working, messages).catch(() => null);
        return {
          ...detail,
          mode: "event-parking-food",
          records: [...detail.records, ...(food?.records || [])],
          candidateIds: [...detail.candidateIds, ...(food?.candidateIds || [])],
          context: {
            ...detail.context,
            foodContext: food?.context || null,
            outing: food?.context?.outing || detail.context.outing,
            allRecords: food?.context?.allRecords || detail.context.allRecords,
          },
        };
      }
    }
    return s.constraints.eveningPlan
      ? eveningRecords(s, messages, detail)
      : detail;
  }
  const window = s.dateRange;
  if (!window)
    return base(
      [],
      /half.term/i.test(s.question) ? "half-term" : "clarify-events",
      /half.term/i.test(s.question)
        ? "half-term-dates-needed"
        : "no-prior-list",
    );
  const follow =
    s.operation !== "discover" &&
    s.resultCards.some((c: any) => c.entityType === "event");
  let raw: any[] = [],
    provenance = follow ? "weekly-followup-v1" : "weekly-cards-v1";
  if (follow)
    raw = s.resultCards
      .filter((c: any) => c.entityType === "event")
      .map((r: any) => (r.fields ? { ...r.fields, ...r } : r));
  else {
    const catalogue = await loadCatalogueWeek(window);
    if (catalogue !== null) {
      raw = catalogue;
      provenance = "weekly-catalogue-v1";
    } else {
      const [experience, wx, council, tileyard, supplement] = await Promise.all(
        [
          readers.fetchExperienceWakefieldEventsContext(),
          readers.fetchWxWhatsOnContext(),
          fetchCouncilSeasonalContext(),
          readers.fetchEventDetailContextByUrl(
            marketUrls["Tileyard North Christmas Market"],
            "Tileyard North Christmas Market",
          ),
          readers.verifiedOctoberWeekendSupplementV16({
            saturday: new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(londonCalendar().saturday + "T12:00:00Z")),
            sunday: londonCalendar().sunday,
            today: londonCalendar().today,
          }),
        ],
      );
      raw = [
        ...(experience?.listingEventCards || []),
        ...(wx?.eventCards || []),
        ...(council?.eventCards || []),
        ...(tileyard?.eventDetailCard ? [tileyard.eventDetailCard] : []),
        ...(supplement || []),
      ];
    }
  }
  raw = (reconcileWeekCards as any)(raw, window);
  raw = selectWeekCards(raw, window);
  raw = await readers.verifyWeeklySessionCards(raw, window);
  if (s.family) raw = await readers.verifyWeeklyFamilyCards(raw);
  if (s.freeOnly || s.paidOnly || /price|cost|how much/i.test(s.question))
    raw = await readers.refreshEventCardsForPriceV16(raw);
  raw = selectWeekCards(raw, window);
  const records = mergeCanonicalRecords(raw.map((r) => canonicalise(r)));
  let selected = records.filter(
    (r) =>
      r.fields.availability !== "sold-out" &&
      !["cancelled", "postponed"].includes(r.fields.status),
  );
  if (s.area === "Wakefield city centre")
    selected = selected.filter(eventInWakefieldCity);
  const day = s.weekday ? weekdayInWindow(s.weekday, window) : null;
  if (s.weekday)
    selected = selected
      .filter(
        (r) =>
          day &&
          ((r.startDate === day && r.endDate === day) ||
            r.occurrenceDates?.includes(day)),
      )
      .map((r) => ({
        ...r,
        dates: [day!],
        ...timesForCard({ ...r, dates: [day] }),
      }));
  if (window.kind === "day")
    selected = selected
      .filter(
        (r) =>
          (r.startDate === window.start && r.endDate === window.start) ||
          r.occurrenceDates?.includes(window.start),
      )
      .map((r) => ({
        ...r,
        dates: [window.start],
        ...timesForCard({ ...r, dates: [window.start] }),
      }));
  if (s.timeWindow)
    selected = selected.filter((r) => {
      const clock = timesForCard({
        ...r,
        dates: r.dates?.length ? r.dates : r.occurrenceDates,
      });
      // A drop-in market or fair can be visited after its published start.
      // Keep fixed-start performances on the existing start-time rule.
      const window = s.timeWindow!;
      const minutes = (value: string) => {
        const [hours, mins] = value.split(":").map(Number);
        return hours * 60 + mins;
      };
      if (!clock.start) return false;
      const start = minutes(clock.start);
      const startsInWindow =
        start >= window.startHour * 60 && start < window.endHour * 60;
      const dropIn =
        /\b(?:christmas market|festive market|craft fair|gift fair)\b/i.test(r.title) &&
        !r.fields.performanceStart;
      return startsInWindow || Boolean(
        dropIn && clock.end &&
        start < window.endHour * 60 &&
        minutes(clock.end) > window.startHour * 60
      );
    });
  if (s.freeOnly) selected = selected.filter((r) => r.priceStatus === "free");
  if (s.paidOnly)
    selected = selected.filter((r) =>
      ["paid", "variable"].includes(r.priceStatus || ""),
    );
  if (s.family) selected = selected.filter((r) => r.familyVerified);
  selected = selected.filter(
    (r) =>
      s.includeCategories.every((c) => r.categories.includes(c)) &&
      !s.excludeCategories.some((c) => r.categories.includes(c)),
  );
  const updated = records.map((r) => selected.find((c) => c.id === r.id) || r);
  return {
    ...base(
      updated,
      "event-list",
      window.kind === "weekend" ? "cards-first-v17" : provenance,
      {
        allRecords: updated,
        unsupported: /wheelchair|accessible|dogs? friendly|toddlers?/i.test(
          s.question,
        ),
      },
    ),
    candidateIds: selected.map((r) => r.id),
  };
}
async function namedPlace(s: ConversationState): Promise<Retrieval | null> {
  const p = PLACES.find(
    (p) => p.id === s.selectedId || p.name === s.selectedName,
  );
  if (!p) return null;
  let openingHours = null;
  if (s.operation === "hours") {
    try {
      const r = await fetch(p.source, { signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const $ = load(await r.text());
        $("nav,header,footer,script,style").remove();
        const t = $("body").text().replace(/\s+/g, " ");
        const h = t
          .split(/Venue opening hours/i)[1]
          ?.split(/Venue Details|Access facilities/i)[0];
        if (h) openingHours = h;
      }
    } catch {}
  }
  const record = canonicalise(
    {
      ...p,
      title: p.name,
      sourceUrl: p.source,
      openingHours,
      address: p.address,
      weekdayDescriptions: null,
    },
    "place",
  );
  record.fields.day =
    s.question.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    )?.[1] ||
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Europe/London",
    }).format(new Date());
  return base(
    [record],
    s.operation === "hours" ? "place-hours" : "place-detail",
    "named-local-place-v1",
    {
      namedLocalPlace: p.id,
      selectedId: record.id,
      selectedName: record.title,
      lastIntent: "food.venue_reference",
    },
  );
}
async function outingFood(
  s: ConversationState,
  messages: any[],
): Promise<Retrieval | null> {
  const legacy = oldState(s),
    context = selectedOuting(legacy);
  if (!context) return null;
  if (s.restrictions.length)
    return base([], "outing-requirements", "outing-companion-unverified", {
      recordsReplace: false,
      anchor: context,
    });
  let previous = s.constraints.outing || {};
  const services: any = readers.outingServices();
  const age = Date.now() - Date.parse(previous.checkedAt);
  if (
    !("anchorKind" in context && context.anchorKind === "station") &&
    (!Number.isFinite(age) || age < 0 || age >= 15 * 60 * 1000)
  ) {
    previous = {
      ...previous,
      ...(await checkedOptions(context, previous, services, new Date())),
    };
  }
  let plan = s.constraints.outing?.plan ||
    fallbackOutingPlan(s.question, previous.plan || {}) || {
      intent: "food_drink",
      needs: s.needs.length ? s.needs : ["coffee"],
      timing: previous.plan?.timing || "during",
    };
  plan = contextualOutingPlan(s.question, plan, previous);
  if (plan?.intent !== "food_drink") return null;
  let requested = outingTime(s.question, +context.start.split(":")[0] >= 12);
  if (
    requested == null &&
    plan.timing === (previous.plan?.timing || "during") &&
    previous.requestedTime
  ) {
    const [h, m] = previous.requestedTime.split(":").map(Number);
    requested = h * 60 + m;
  }
  plan.exactTime = requested != null;
  const window = (foodWindow as any)(context, plan, requested);
  let options: any[] = previous.options || [];
  if (!options.length || (!plan.namedBrand && !plan.referencePrevious)) {
    const found = await services.discover?.(window, plan, new Date());
    options = [
      ...(found || []),
      ...options.filter(
        (p: any) =>
          !(found || []).some(
            (o: any) => sourceKey(o.sourceUrl) === sourceKey(p.sourceUrl),
          ),
      ),
    ];
  }
  if (plan.needs.includes("hot_chocolate"))
    options = await checkMenus(options, services);
  const named = options.filter(
    (p: any) =>
      normal(p.name) === normal(s.selectedName) ||
      normal(s.question).includes(normal(p.name).replace(/ wakefield$/, "")) ||
      (plan.namedBrand && normal(p.name).includes(normal(plan.namedBrand))),
  );
  let pool = named.length ? named : options;
  if (
    plan.referencePrevious &&
    !plan.alternatives &&
    !named.length &&
    previous.currentIds?.length
  )
    pool = pool.filter((p: any) =>
      previous.currentIds.includes(sourceKey(p.sourceUrl)),
    );
  if (plan.alternatives)
    pool = pool.filter(
      (p: any) => !previous.shownIds?.includes(sourceKey(p.sourceUrl)),
    );
  const serviceMatch = (p: any) =>
    plan.needs.every((n: string) =>
      n === "hot_chocolate"
        ? p.hotChocolate || p.hotChocolateMenu
        : optionServices(p).includes(n) ||
          (n === "food" &&
            optionServices(p).some((v: string) =>
              ["snack", "dinner"].includes(v),
            )),
    );
  let suitable = pool.filter(
    (p: any) => serviceMatch(p) && optionFits(p, window, plan),
  );
  const chocolateUnknown =
    !suitable.length && plan.needs.includes("hot_chocolate");
  if (chocolateUnknown)
    suitable = pool.filter(
      (p: any) =>
        optionServices(p).includes("coffee") && optionFits(p, window, plan),
    );
  const needsSeating =
    /sit(?:ting)? down|seating/i.test(s.question) || previous.seating;
  if (needsSeating) suitable = suitable.filter((p: any) => p.dineIn === true);
  const closed = pool.filter(
    (p: any) =>
      (serviceMatch(p) ||
        (chocolateUnknown && optionServices(p).includes("coffee"))) &&
      !optionFits(p, window, plan),
  );
  const shown = suitable.slice(0, plan.maxOptions || 3),
    cited = shown.length
      ? shown
      : named.length || plan.referencePrevious
        ? closed.slice(0, 2)
        : [];
  const timedRecord = (p: any, disposition: string) =>
    canonicalise(
      {
        ...p,
        title: p.name,
        services: optionServices(p),
        disposition,
        openingHours: {
          start: p.start,
          end: p.end,
          startMinute: p.startMinute,
          endMinute: p.endMinute,
        },
        requestedWindow: window,
      },
      "place",
    );
  const records = cited.map((p: any) =>
    timedRecord(p, shown.length ? "suitable" : "closed"),
  );
  const closedNotes = shown.length
    ? closed
        .filter((p: any) => {
          const end =
            p.endMinute ??
            (typeof p.end === "string"
              ? +p.end.split(":")[0] * 60 + +p.end.split(":")[1]
              : null);
          return end != null && end <= window.windowStart;
        })
        .slice(0, 2)
        .map((p: any) => timedRecord(p, "closed-note"))
    : [];
  records.push(...closedNotes);
  const party = outingParty(s.question, previous.party);
  const outing = {
    ...previous,
    party,
    plan,
    seating: needsSeating,
    options: [
      ...shown,
      ...options.filter(
        (p) => !shown.includes(p) && p.sourceKind !== "branch-listing",
      ),
      ...options.filter(
        (p) => !shown.includes(p) && p.sourceKind === "branch-listing",
      ),
    ]
      .slice(0, 6)
      .map(compactFoodOption),
    currentIds: cited.map((p: any) => sourceKey(p.sourceUrl)),
    shownIds: [
      ...new Set([
        ...(previous.shownIds || []),
        ...shown.map((p: any) => sourceKey(p.sourceUrl)),
      ]),
    ].slice(-10),
    requestedTime:
      requested == null
        ? null
        : `${String(Math.floor(requested / 60)).padStart(2, "0")}:${String(requested % 60).padStart(2, "0")}`,
    activeTopic: "warmup",
  };
  return base(
    records,
    "outing-food",
    s.constraints.outing?.anchor &&
      (/station/i.test(s.question) ||
        /^(?:westgate|kirkgate)[?.!\s]*$/i.test(s.question))
      ? "station-food-v1"
      : "outing-food-v2",
    {
      outing,
      window,
      plan,
      party,
      closed: !shown.length && cited.length > 0,
      anchor: context,
      chocolateUnknown,
      allRecords: [
        ...s.resultCards.filter((r: any) => r.entityType === "event"),
        ...records,
      ],
      selectedId: named.length && records[0] ? records[0].id : s.selectedId,
      selectedName:
        named.length && records[0] ? records[0].title : s.selectedName,
    },
  );
}
function publishedFood(
  s: ConversationState,
  messages: any[],
  provided: any = null,
): Retrieval | null {
  const query = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const constraint =
    s.constraints.time || readers.requestedPlaceTimeConstraint(messages);
  const result =
    provided ||
    knowledge.publishedFoodRecommendation(
      query,
      constraint,
      s.operation === "more" ||
        /other|more|another|alternatives/i.test(s.question)
        ? s.resultCards.flatMap((r) =>
            r.providerIds?.length ? r.providerIds : [r.id],
          )
        : [],
      s.constraints.coffeeRequired,
    );
  if (!result) return null;
  const g = guidance(result, "published-place-options")!;
  if (/nearby|near me|close by/i.test(s.question))
    g.records[0].fields.content +=
      "\n\nWhere are you starting from? I haven’t checked walking distances.";
  const places = result.places.map((p: any) =>
    canonicalise(
      { ...p, title: p.name, sourceUrl: p.source, openingHours: p.hours },
      "place",
    ),
  );
  g.context = {
    ...g.context,
    lastIntent: "food.open_at",
    time: constraint,
    coffeeRequired: s.constraints.coffeeRequired,
    allRecords: places.length ? places : s.resultCards,
    recordsReplace: places.length > 0,
  };
  return g;
}
async function food(s: ConversationState, messages: any[]): Promise<Retrieval> {
  let working = s;
  if (s.constraints.eventFocus?.id && !selectedOuting(oldState(s))) {
    const hydrated = await eventDetail(
      { ...s, operation: "hours", selectedId: s.constraints.eventFocus.id },
      messages,
    );
    const updated = {
      ...s,
      resultCards: hydrated.context?.allRecords || s.resultCards,
      constraints: {
        ...s.constraints,
        eventFocus: hydrated.context?.eventFocus || s.constraints.eventFocus,
        outing: hydrated.context?.outing || s.constraints.outing,
      },
    };
    if (!selectedOuting(oldState(updated)))
      return base(
        hydrated.records.filter((r) => r.entityType === "event"),
        "outing-unavailable",
        "outing-context-unavailable",
        { recordsReplace: false },
      );
    working = updated;
  }
  const outing = await outingFood(working, messages);
  if (outing) return outing;
  if (s.lastIntent === "food.open_at")
    return (
      publishedFood(s, messages) ||
      base([], "place-list", "published-place-options")
    );
  if (s.selectedName || s.selectedId) {
    const named = await namedPlace(s);
    if (named) return named;
  }
  const needs = s.needs.length ? s.needs : ["coffee"];
  const requested = s.placeTime;
  const timing =
    requested?.mode === "now"
      ? " open now"
      : requested?.hour != null
        ? " " +
          (requested.mode === "after" ? "after" : "at") +
          " " +
          String(requested.hour).padStart(2, "0") +
          ":" +
          String(requested.minute || 0).padStart(2, "0")
        : "";
  const query = `Where can I get ${needs.map((n) => (n === "hot_chocolate" ? "hot chocolate" : n === "dessert" ? "dessert" : n === "snack" || n === "food" ? "food" : n)).join(" and ")}${s.area ? " in " + s.area : " in Wakefield"}${s.weekday ? " on " + s.weekday : ""}${timing}?`;
  let context: any = await (readers.fetchWakefieldDistrictPlacesContext as any)(
    [{ role: "user", content: query }],
    {
      ...s,
      constraints: { ...s.constraints, coffeeDiscovery: { area: s.area } },
    },
    { area: s.area, needs, timeConstraint: s.placeTime },
  );
  if (needs.includes("hot_chocolate"))
    context = await verifyHotChocolate(context);
  let records = (context?.places || [])
    .filter(
      (p: any) =>
        p.businessStatus === "OPERATIONAL" &&
        p.serviceVerified === true &&
        (context.constraint ? p.timeMatch === true : p.timeMatch !== false),
    )
    .map((p: any) =>
      canonicalise(
        {
          ...p,
          title: p.name,
          sourceUrl: p.googleMapsUri || p.websiteUri,
          openingHours: p.weekdayDescriptions,
          services: [
            ...(p.servesCoffee ? ["coffee"] : []),
            ...(p.servesLunch || p.servesDinner ? ["food", "snack"] : []),
            ...(p.servesDessert ? ["dessert"] : []),
            ...(p.hotChocolateVerified ? ["hot_chocolate"] : []),
          ],
        },
        "place",
      ),
    );
  records = records.filter((r: any) =>
    needs.every((n) => r.services.includes(n)),
  );
  if (s.operation === "more")
    records = records.filter(
      (r: any) => !s.constraints.coffeeDiscovery?.shownIds?.includes(r.id),
    );
  if (s.operation === "hours" && s.viewIds.length)
    records = records.filter((r: any) => s.viewIds.includes(r.id));
  records = records.slice(0, 5);
  if (
    !records.length &&
    needs.some((n) => ["food", "dessert"].includes(n)) &&
    !needs.includes("hot_chocolate")
  ) {
    const result = knowledge.publishedFoodRecommendation(
      s.question,
      readers.requestedPlaceTimeConstraint(messages),
      s.operation === "more" ||
        /other|more|another|alternatives/i.test(s.question)
        ? s.resultCards.flatMap((r) =>
            r.providerIds?.length ? r.providerIds : [r.id],
          )
        : [],
      s.constraints.coffeeRequired,
    );
    const g = publishedFood(s, messages, result);
    if (g) return g;
  }
  return base(records, "place-list", "coffee-discovery-v1", {
    coffeeDiscovery: {
      area: s.area,
      hotChocolate: needs.includes("hot_chocolate"),
      nowOnly: context?.constraint?.mode === "now",
      shownIds: [
        ...new Set([
          ...(s.constraints.coffeeDiscovery?.shownIds || []),
          ...records.map((r: any) => r.id),
        ]),
      ],
    },
    lastIntent: "food.discovery",
  });
}
function registeredKnowledge(
  s: ConversationState,
  messages: any[],
): Retrieval | null {
  const legacy = oldState(s),
    q = s.question;
  const factories = [
    () => knowledge.foodSpecificFollowUp(q, legacy),
    () => knowledge.nightlifeRecommendation(q, legacy),
    () => knowledge.districtThaliDiscovery(q),
    () => knowledge.namedDiningThaliFollowUp(q, messages),
    () => knowledge.namedDiningServiceFollowUp(q, messages),
    () => knowledge.namedDiningFollowUp(q, messages),
    () => knowledge.familyDistrictStarter(q),
    () => knowledge.undatedCityCentreArtsPlan(q),
    () => knowledge.familyPlanFollowUp(q, legacy),
    () => knowledge.cityItineraryFollowUp(q, legacy),
  ];
  for (const factory of factories) {
    const result = factory();
    if (result) return guidance(result, "canonical-place-starter")!;
  }
  return null;
}
async function localGuidance(
  s: ConversationState,
  messages: any[],
): Promise<Retrieval> {
  const legacy = oldState(s),
    q = s.question;
  const safety = requirementAnswer(q, legacy);
  if (safety) return guidance(safety)!;
  const navigation = chatNavigation(q, legacy, messages);
  if (navigation) return guidance(navigation)!;
  if (/pharmac\w*/i.test(q)) {
    const asda = /asda/i.test(q),
      named = asda || /sainsbury/i.test(q);
    const u = named
      ? asda
        ? "https://storelocator.asda.com/yorkshire-%26-humber/wakefield/asdale-road"
        : "https://stores.sainsburys.co.uk/2258/wakefield-marsh-way"
      : "https://www.nhs.uk/service-search/pharmacy/find-a-pharmacy";
    return guidance(
      {
        reply: named
          ? `I haven’t verified the pharmacy-counter hours at ${asda ? "ASDA Wakefield Superstore" : "Sainsbury’s Wakefield Marsh Way"}. [Check its exact branch page](${u}). Store opening hours do not establish pharmacy service.`
          : `I couldn’t verify a pharmacy near Trinity Walk covering your requested time. [Use the NHS pharmacy finder](${u}) for current branch information. How far can you travel?`,
        sources: [
          {
            title: named ? "Official branch page" : "NHS pharmacy finder",
            url: u,
          },
        ],
      },
      named ? "named-pharmacy-v1" : "pharmacy-local-unverified-v1",
    )!;
  }
  if (
    /(?:cathedral|wakefield).*?(?:ysp|yorkshire sculpture park)|(?:ysp|yorkshire sculpture park).*?cathedral/i.test(
      q,
    )
  )
    return guidance(
      {
        reply:
          "Check [YSP’s getting-here guide](https://ysp.org.uk/visit-us/getting-here) and [West Yorkshire Metro](https://www.wymetro.com/) for your travel date, boarding stop and last return. I haven’t confirmed a current departure time or walking connection from the Cathedral.",
        sources: [
          {
            title: "YSP getting-here guide",
            url: "https://ysp.org.uk/visit-us/getting-here",
          },
          { title: "West Yorkshire Metro", url: "https://www.wymetro.com/" },
        ],
        constraints: {
          journey: {
            origin: "Wakefield Cathedral",
            destination: "Yorkshire Sculpture Park",
          },
        },
      },
      "ysp-route-v1",
    )!;
  const activity = await activityDiscovery(q, legacy);
  if (activity) return guidance(activity)!;
  const known = registeredKnowledge(s, messages);
  if (known) return known;
  if (/\bBSL\b/i.test(q))
    return guidance(
      { reply: "BSL stands for British Sign Language.", sources: [] },
      "glossary",
    )!;
  return base([], "clarify", "clarification");
}
export async function queryAndFilterCanonicalRecords(
  state: ConversationState,
  delta: TurnDelta,
  messages: any[],
): Promise<Retrieval> {
  if (state.operation === "clarify" && /heading to/i.test(state.question))
    return base([], "destination", "incomplete-destination", {
      recordsReplace: false,
    });
  if (state.operation === "ack")
    return base([], "ack", "outing-acknowledgement", { recordsReplace: false });
  // Registered local knowledge is data compiled from reviewed references. It
  // cannot call the prose model; it is still bound and rendered by stages 4.
  const safe = requirementAnswer(state.question, oldState(state));
  if (safe) return guidance(safe)!;
  if (state.constraints.pendingStation)
    return base([], "station-choice", "station-choice", {
      recordsReplace: false,
    });
  if (
    !["events"].includes(state.topic) &&
    !state.constraints.outing?.eventId &&
    !state.constraints.outing?.anchor
  ) {
    const k = registeredKnowledge(state, messages);
    if (k) return k;
  }
  const providers: Record<
    string,
    (s: ConversationState, m: any[]) => Promise<Retrieval>
  > = {
    events,
    food,
    guide: localGuidance,
    activities: localGuidance,
    services: localGuidance,
    general: localGuidance,
  };
  return providers[state.topic](state, messages);
}
