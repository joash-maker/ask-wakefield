import type { ConversationState, TurnDelta } from "./types.ts";
const unique = (v: any[]) => [...new Set(v)];
export function initialState(raw: any = null): ConversationState {
  const constraints =
    raw?.constraints && typeof raw.constraints === "object"
      ? structuredClone(raw.constraints)
      : {};
  const week = constraints.eventWeek;
  return {
    version: 4,
    topic:
      raw?.topic ||
      (/^events\./.test(raw?.lastIntent || "")
        ? "events"
        : /^food\./.test(raw?.lastIntent || "")
          ? "food"
          : "general"),
    operation: raw?.operation || "discover",
    area: raw?.area || constraints.indoorArea || null,
    dateRange:
      raw && Object.hasOwn(raw, "dateRange") ? raw.dateRange : week || null,
    placeTime: raw?.placeTime || raw?.constraints?.time || null,
    timeWindow: raw?.timeWindow || null,
    weekday:
      raw && Object.hasOwn(raw, "weekday")
        ? raw.weekday
        : week?.filters?.day || null,
    includeCategories:
      raw?.includeCategories || (week?.filters?.musicOnly ? ["music"] : []),
    excludeCategories: raw?.excludeCategories || [],
    restrictions:
      raw?.restrictions || raw?.constraints?.outing?.requirements || [],
    needs: raw?.needs || [],
    excludeNeeds: raw?.excludeNeeds || [],
    freeOnly: raw?.freeOnly ?? week?.filters?.price === "free",
    paidOnly: raw?.paidOnly ?? week?.filters?.price === "paid",
    family: raw?.family ?? week?.filters?.family ?? false,
    ages: raw?.ages || [],
    selectedId: raw?.selectedId || constraints.eventFocus?.id || null,
    selectedName: raw?.selectedName || null,
    lastIntent: raw?.lastIntent || "general",
    constraints,
    resultCards: Array.isArray(raw?.resultCards) ? raw.resultCards : [],
    viewIds: Array.isArray(raw?.viewIds) ? raw.viewIds : [],
    lastFilter: raw?.lastFilter || null,
    question: raw?.question || "",
  };
}
// The sole owner of conversational requirements. Providers never replace state.
export function mergeConversationState(
  previous: ConversationState,
  delta: TurnDelta,
): ConversationState {
  const s = initialState(previous);
  s.previousQuestion = s.question;
  s.question = delta.question;
  s.operation = delta.operation;
  if (delta.newTopic) {
    s.includeCategories = [];
    s.excludeCategories = [];
    s.needs = [];
    s.restrictions = [];
    s.excludeNeeds = [];
    s.freeOnly = false;
    s.paidOnly = false;
    s.family = false;
    s.ages = [];
    s.timeWindow = null;
    s.placeTime = null;
    s.selectedId = null;
    s.selectedName = null;
    s.constraints = {};
    s.resultCards = [];
    s.viewIds = [];
  }
  if (delta.resetFilters) {
    s.lastFilter = null;
    s.includeCategories = [];
    s.excludeCategories = [];
    s.freeOnly = false;
    s.paidOnly = false;
    s.family = false;
    s.weekday = null;
    s.timeWindow = null;
    s.placeTime = null;
  }
  const areaChanged = delta.area !== undefined && delta.area !== previous.area;
  const selectedEvent = previous.resultCards.find(
    (c) => c.id === previous.constraints.eventFocus?.id,
  );
  const dateChanged =
    delta.dateRange?.kind === "day" &&
    selectedEvent &&
    !(
      selectedEvent.dates ||
      selectedEvent.occurrenceDates || [selectedEvent.startDate]
    ).includes(delta.dateRange.start);
  if (
    (areaChanged && delta.operation === "parking") ||
    (delta.topic === "food" && (areaChanged || dateChanged))
  ) {
    s.selectedId = null;
    s.selectedName = null;
    delete s.constraints.eventFocus;
    delete s.constraints.outing;
  }
  if (
    delta.topic === "events" &&
    (delta.includeCategories?.length ||
      delta.excludeCategories?.length ||
      areaChanged) &&
    !delta.selectedId &&
    !delta.selectedName
  ) {
    s.selectedId = null;
    s.selectedName = null;
    delete s.constraints.eventFocus;
  }
  if (delta.topic) s.topic = delta.topic;
  if (delta.area !== undefined) s.area = delta.area;
  if (delta.dateRange !== undefined) {
    s.dateRange = delta.dateRange;
    s.weekday = delta.weekday ?? null;
  }
  if (delta.weekday !== undefined) s.weekday = delta.weekday;
  if (delta.placeTime !== undefined) s.placeTime = delta.placeTime;
  if (
    s.placeTime &&
    (delta.weekday ||
      delta.dateRange?.kind === "day" ||
      (delta.placeTime && s.weekday))
  ) {
    const activeDay = delta.weekday || s.weekday;
    const day = activeDay
      ? [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ].indexOf(activeDay)
      : new Date(delta.dateRange!.start + "T12:00:00Z").getUTCDay();
    s.placeTime = {
      ...s.placeTime,
      day,
      ...(s.placeTime.mode === "now" ? { mode: "day" } : {}),
    };
  }
  s.constraints.time = s.placeTime;
  if (delta.timeWindow !== undefined) s.timeWindow = delta.timeWindow;
  if (delta.includeCategories)
    s.includeCategories = unique([
      ...s.includeCategories,
      ...delta.includeCategories,
    ]).filter((c) => !delta.excludeCategories?.includes(c));
  if (delta.excludeCategories)
    s.excludeCategories = unique([
      ...s.excludeCategories,
      ...delta.excludeCategories,
    ]).filter((c) => !delta.includeCategories?.includes(c));
  s.includeCategories = s.includeCategories.filter(
    (c) => !s.excludeCategories.includes(c),
  );
  if (delta.needs)
    s.excludeNeeds = s.excludeNeeds.filter((n) => !delta.needs?.includes(n));
  if (delta.restrictions)
    s.restrictions = unique([...s.restrictions, ...delta.restrictions]);
  if (delta.needs)
    s.needs = unique(delta.needs).filter(
      (n) => !delta.excludeNeeds?.includes(n),
    );
  if (delta.excludeNeeds) {
    s.excludeNeeds = unique([...s.excludeNeeds, ...delta.excludeNeeds]);
    s.needs = s.needs.filter((n) => !s.excludeNeeds.includes(n));
  }
  if (delta.freeOnly !== undefined) {
    s.lastFilter = delta.freeOnly ? "price:free" : null;
    s.freeOnly = delta.freeOnly;
    if (delta.freeOnly) s.paidOnly = false;
  }
  if (delta.paidOnly !== undefined) {
    s.lastFilter = delta.paidOnly ? "price:paid" : null;
    s.paidOnly = delta.paidOnly;
    if (delta.paidOnly) s.freeOnly = false;
  }
  if (delta.family !== undefined) s.family = delta.family;
  if (delta.ages) s.ages = delta.ages;
  if (delta.selectedId) s.selectedId = delta.selectedId;
  if (delta.selectedName) s.selectedName = delta.selectedName;
  if (delta.requirements)
    s.constraints = { ...s.constraints, ...delta.requirements };
  if (delta.planner)
    s.constraints.outing = {
      ...(s.constraints.outing || {}),
      plan: delta.planner,
    };
  if (delta.dateRange && delta.operation === "discover") {
    s.selectedId = null;
    s.selectedName = null;
  }
  if (!s.dateRange) delete s.constraints.eventWeek;
  if (s.dateRange)
    s.constraints.eventWeek = {
      ...s.dateRange,
      filters: {
        ...(s.weekday ? { day: s.weekday } : {}),
        ...(s.freeOnly
          ? { price: "free" }
          : s.paidOnly
            ? { price: "paid" }
            : {}),
        ...(s.family ? { family: true } : {}),
        ...(s.area === "Wakefield city centre" ? { area: s.area } : {}),
        ...(s.includeCategories.includes("music") ? { musicOnly: true } : {}),
      },
    };
  if (s.selectedId && s.topic === "events")
    s.constraints.eventFocus = {
      ...(s.constraints.eventFocus || {}),
      id: s.selectedId,
    };
  s.lastIntent =
    s.topic === "food" && previous.lastIntent === "food.open_at"
      ? previous.lastIntent
      : s.topic === "events"
        ? "events." +
          (delta.operation === "discover" ? "whats_on" : "filter_existing")
        : s.topic === "food"
          ? "food.discovery"
          : s.lastIntent;
  return s;
}
export function commitRetrievedState(
  state: ConversationState,
  records: any[],
  viewIds: string[],
  context: any = {},
): ConversationState {
  const s = initialState(state);
  if (context.recordsReplace !== false) s.resultCards = records;
  s.viewIds = viewIds;
  // Result metadata is persisted here, never by a provider. Requirements can
  // only be changed by mergeConversationState above.
  for (const key of [
    "eventFocus",
    "outing",
    "coffeeDiscovery",
    "namedLocalPlace",
    "activitySearch",
    "indoorGuide",
    "indoorArea",
    "indoorParking",
    "accessPlan",
    "foodSafety",
    "familyPlan",
    "cityItinerary",
    "brunchVenue",
    "artVenue",
    "hepworthTime",
    "preference",
    "coffeePreference",
    "cityStart",
    "visitDay",
    "journey",
    "serviceMenu",
    "pendingStation",
    "coffeeRequired",
    "dessertOnly",
    "time",
    "placeIds",
    "foodPreference",
    "nearbyNeeded",
    "namedRestaurant",
  ])
    if (context[key] !== undefined) s.constraints[key] = context[key];
  if (context.selectedId) s.selectedId = context.selectedId;
  if (context.selectedName) s.selectedName = context.selectedName;
  if (context.lastIntent) s.lastIntent = context.lastIntent;
  return s;
}
