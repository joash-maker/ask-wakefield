import type { ConversationState, TurnDelta, Topic } from "./types.ts";
import { eventWeekWindow } from "../event-week-window.js";
import { isLeisureDiscovery, londonCalendar } from "../event-request-policy.js";
import { outingTime } from "../outing-time.js";
import { selectedOuting, outingParty } from "../outing-companion.js";
import { contextualOutingPlan, fallbackOutingPlan } from "../outing-planner.js";
import {
  requestedPlaceTimeConstraint,
  outingServices,
} from "./providers/sourceReaders.js";
import { PLACES } from "../askwakefield-places-data.js";
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export async function extractIntentAndDelta(
  question: string,
  previous: ConversationState,
  messages: any[] = [],
): Promise<TurnDelta> {
  const q = question.trim(),
    n = norm(q),
    cal = londonCalendar();
  const delta: TurnDelta = {
    question: q,
    operation: "discover",
    requirements: { missingPriorList: false },
    reference:
      /\b(?:it|there|nearby|those|them|these|that|still|same|else|instead|what about|how about)\b/i.test(
        q,
      ),
  };
  const clockRequirement = requestedPlaceTimeConstraint([
    { role: "user", content: q },
  ]);
  if (clockRequirement) delta.placeTime = clockRequirement;
  if (/\bany time|all day\b/i.test(q)) delta.placeTime = null;
  const acknowledgement =
    /^(?:thanks(?: a lot)?|thank you(?: very much)?|cheers|great|lovely|brilliant|ok(?:ay)?|sounds good)[!.\s]*$/i.test(
      q,
    );
  if (
    /^yes(?: please)?[!.\s]*$/i.test(q) &&
    previous.dateRange?.kind === "this-week" &&
    previous.dateRange.today === previous.dateRange.end
  ) {
    return {
      question: q,
      topic: "events",
      operation: "discover",
      dateRange: eventWeekWindow("next week")!,
    };
  }
  if (acknowledgement) {
    delta.operation = "ack";
    return delta;
  }
  const music =
    /\b(?:music(?:al)?|gigs?|concerts?|live bands?|choirs?|jazz|blues|orchestra)\b/i.test(
      q,
    );
  const noMusic =
    /\b(?:no|not|without|exclude|skip|avoid|anything but)\s+(?:live\s+)?(?:music|gigs?|concerts?|bands?)\b/i.test(
      q,
    );
  const restrictions: string[] = [];
  for (const [pattern, label] of [
    [/dairy.free|lactose|milk allergy/i, "dairy-free"],
    [/\bvegan\b/i, "vegan"],
    [/gluten.free|coeliac/i, "gluten-free"],
    [/nut.free|nut allergy|allerg(?:y|ies)|anaphylaxis/i, "allergy"],
    [/wheelchair|step.free|accessible/i, "accessibility"],
    [/dog.friendly|with (?:our|my|the) dog/i, "dog access"],
  ] as [RegExp, string][]) {
    if (pattern.test(q)) restrictions.push(label);
  }
  if (restrictions.length) delta.restrictions = restrictions;
  const needs: string[] = [];
  if (/\b(?:coffee|caf[eé]s?|caffeine|cappuccino|latte|espresso)\b/i.test(q))
    needs.push("coffee");
  if (
    /hot chocolate|cocoa|something warm for (?:the )?(?:little ones|kids)/i.test(
      q,
    )
  )
    needs.push("hot_chocolate");
  if (/\b(?:desserts?|cakes?|puddings?)\b/i.test(q)) needs.push("dessert");
  if (
    /\b(?:snack|bite|quick food|fast food|burgers?|chips|fries|peckish|something quick|mcdonald|greggs)\b/i.test(
      q,
    )
  )
    needs.push("snack");
  if (
    /\b(?:dinner|meal|eat|eating|hungry|starving|restaurant|lunch|thali|takeaway|delivery|brunch|breakfast)\b/i.test(
      q,
    )
  )
    needs.push("food");
  const christmasMarkets = /\b(?:christmas|festive)\s+markets?\b/i.test(q);
  const isEvent =
    christmasMarkets ||
    /\b(?:what(?:'|’)s on|what is on|events?|happening|festivals?|weekend|exhibition|parade|light up)\b/i.test(
      q,
    ) ||
    music ||
    (isLeisureDiscovery(q) &&
      /this week|next week|weekend|today|tomorrow|half.term/i.test(q));
  const isGuide =
    /rainy day|wet weather|indoor activities|coffee.*books.*art|three hours.*(?:books|art)|plan.*(?:museum|gallery|cathedral)/i.test(
      q,
    );
  const isActivity =
    /\b(?:sports?|fitness|swimming|clubs?|community|walking groups?|running|padel|gym|tutoring|music lessons?|after.school)\b/i.test(
      q,
    ) && !isEvent;
  const services =
    /\b(?:bins?|parking|transport|pharmac\w*|chemist|council|pothole|library|libraries|bus|train|station)\b/i.test(
      q,
    );
  let topic: Topic | undefined = isEvent
    ? "events"
    : isGuide
      ? "guide"
      : isActivity
        ? "activities"
        : needs.length
          ? "food"
          : services
            ? "services"
            : undefined;
  if (previous.topic === "events" && /parking/i.test(q)) topic = "events";
  if (
    previous.constraints.indoorGuide &&
    /city centre|parking/i.test(q) &&
    !needs.length
  )
    topic = "guide";
  if (
    /parking|tell me.*about|more.*details|what time|when.*start|family.friendly/i.test(
      q,
    ) &&
    previous.selectedId &&
    previous.resultCards.some(
      (c) => c.id === previous.selectedId && c.entityType === "event",
    ) &&
    !needs.length
  )
    topic = "events";
  const namedEvent = previous.resultCards
    .filter(
      (c) =>
        c.entityType === "event" &&
        c.title &&
        (" " + n + " ").includes(" " + norm(c.title) + " "),
    )
    .sort((a, b) => b.title.length - a.title.length)[0];
  if (namedEvent && (!needs.length || /\bparking\b/i.test(q))) {
    topic = "events";
    delta.selectedId = namedEvent.id;
    delta.selectedName = namedEvent.title;
    delta.operation = "detail";
  }
  const place =
    PLACES.find((p) => (" " + n + " ").includes(" " + norm(p.name) + " ")) ||
    (/\bhaus\b/i.test(q)
      ? PLACES.find((p) => p.name === "Haus Coffee & Plants")
      : null);
  if (place && !isEvent && !isGuide && !services) {
    topic = "food";
    delta.selectedName = place.name;
    delta.selectedId = place.id;
    delta.operation = /hours|open|close|closing/i.test(q) ? "hours" : "detail";
  }
  if (
    (previous.constraints.familyPlan && !isEvent) ||
    (previous.constraints.cityItinerary &&
      !/what(?:['’]s| is) on|events?|weekend/i.test(q))
  )
    topic = "guide";
  if (!topic) topic = previous.topic;
  delta.topic = topic;
  delta.newTopic =
    topic !== previous.topic &&
    !delta.reference &&
    previous.topic !== "general" &&
    !namedEvent;
  if (
    previous.constraints.eventFocus?.id &&
    topic === "food" &&
    !/tomorrow|next week|castleford|pontefract|ossett|horbury|normanton/i.test(
      q,
    )
  )
    delta.newTopic = false;
  if (delta.newTopic) delta.operation = "discover";
  if (
    !delta.newTopic &&
    previous.topic === topic &&
    previous.resultCards.length
  )
    delta.operation = delta.operation === "detail" ? "detail" : "filter";
  if (
    /\b(?:hours|open|close|closing)\b|what time|when do.*start/i.test(q) &&
    !isEvent
  )
    delta.operation = "hours";
  if (/\bparking\b/i.test(q)) delta.operation = "parking";
  if (/\b(?:more|others|another|alternatives)\b/i.test(q) && !delta.selectedId)
    delta.operation = "more";
  if (
    /\b(?:full list|whole list|show all|all again|start again|reset)\b/i.test(q)
  ) {
    delta.resetFilters = true;
    delta.operation = "filter";
    if (previous.topic === "events") delta.area = null;
  }
  if (music) {
    if (noMusic) {
      delta.excludeCategories = ["music"];
      delta.includeCategories = [];
    } else delta.includeCategories = ["music"];
  }
  const weekday = q
    .match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    )?.[1]
    ?.toLowerCase();
  // Tonight is a London-local calendar date, not a request for clarification.
  // Apply only to event discovery, not a café's opening-hours enquiry.
  let range = eventWeekWindow(q);
  if (!range && topic === "events" && /\b(?:tonight|this evening)\b/i.test(q) && !weekday)
    range = eventWeekWindow("today");
  if (!range && /\bweekend\b/i.test(q))
    range = {
      kind: "weekend",
      start: cal.saturday,
      end: cal.sunday,
      from: cal.today > cal.saturday ? cal.today : cal.saturday,
      today: cal.today,
    };
  if (
    !range &&
    weekday &&
    (!previous.dateRange || previous.dateRange.kind === "day")
  ) {
    const base = new Date(cal.today + "T12:00:00Z");
    const target = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].indexOf(weekday);
    base.setUTCDate(base.getUTCDate() + ((target - base.getUTCDay() + 7) % 7));
    const d = base.toISOString().slice(0, 10);
    range = { kind: "day", start: d, end: d, from: d, today: cal.today };
  }
  if (christmasMarkets && !namedEvent && !/tileyard|hepworth|wood street|light up|wakefield christmas market\b|tell me|what time|when|start|close/i.test(q) && !needs.length && !/parking/i.test(q)) {
    delta.includeCategories = ["christmas-market"];
    if (!range && !weekday) {
      const end = new Date(cal.today + "T12:00:00Z");
      end.setUTCDate(end.getUTCDate() + 30);
      range = { kind: "seasonal", start: cal.today, from: cal.today, end: end.toISOString().slice(0, 10), today: cal.today };
      delta.timeWindow = null;
      delta.resetFilters = true;
      delta.operation = "discover";
    }
  }
  if (range) {
    delta.dateRange = range;
    if (
      topic === "events" &&
      (range.start !== previous.dateRange?.start ||
        range.end !== previous.dateRange?.end)
    )
      delta.operation = "discover";
  }
  if (weekday) delta.weekday = weekday;
  if (/\b(?:clear|any|all|no particular)\s+(?:dates?|days?)\b/i.test(q)) {
    delta.dateRange = null;
    delta.weekday = null;
  }
  if (/\b(?:evening|tonight|night|after work)\b/i.test(q))
    delta.timeWindow = { startHour: 17, endHour: 24, label: "evening" };
  if (/\bmorning\b/i.test(q))
    delta.timeWindow = { startHour: 0, endHour: 12, label: "morning" };
  if (/\bafternoon\b/i.test(q))
    delta.timeWindow = { startHour: 12, endHour: 17, label: "afternoon" };
  if (/\bany time|all day\b/i.test(q)) delta.timeWindow = null;
  if (/\b(?:free|no charge|no cost)\b/i.test(q)) delta.freeOnly = true;
  if (/\b(?:paid|ticketed)\b/i.test(q)) delta.paidOnly = true;
  if (/\b(?:famil(?:y|ies)|kids?|children)\b/i.test(q)) delta.family = true;
  const age = q.match(/\b(?:aged?|ages?)\s+(\d{1,2})\s*(?:and|&)\s*(\d{1,2})/i);
  if (age) delta.ages = [+age[1], +age[2]];
  if (needs.length) delta.needs = needs;
  if (/food\s+or\s+(?:a\s+)?coffee/i.test(q)) delta.needs = ["coffee"];
  if (
    /\b(?:(?:no|without|skip(?: the)?)\s+coffee|(?:just|only) desserts?)\b/i.test(
      q,
    )
  ) {
    delta.excludeNeeds = ["coffee"];
    delta.requirements = { coffeeRequired: false };
    if (!needs.length) delta.needs = ["dessert"];
  }
  const area = q.match(
    /\b(pontefract|castleford|ossett|horbury|normanton|featherstone|knottingley|hemsworth|south elmsall|south kirkby|denby dale)\b/i,
  )?.[1];
  if (area) delta.area = area[0].toUpperCase() + area.slice(1);
  else if (
    /wakefield city|city centre|town centre|northgate|wood street|burton street|trinity walk/i.test(
      q,
    )
  )
    delta.area = "Wakefield city centre";
  else if (
    /\bacross (?:the )?district|anywhere in wakefield|whole district|wakefield district/i.test(
      q,
    )
  )
    delta.area = null;
  if (
    /what time|when.*(?:start|begin|finish)|starts?|finishes?/i.test(q) &&
    previous.selectedId
  )
    delta.operation = "hours";
  if (
    /\b(?:tell me|more about|sounds good|sounds lovely|fancy|heading to)\b/i.test(
      q,
    ) &&
    isEvent
  )
    delta.operation = "detail";
  const namedMarket =
    /tileyard.*christmas|wakefield christmas market|wood street.*christmas|christmas.*wood street|hepworth wakefield festive market|light up wakefield/i.exec(
      q,
    );
  if (namedMarket && !needs.length) {
    delta.topic = "events";
    delta.selectedName = /tileyard/i.test(q)
      ? "Tileyard North Christmas Market"
      : /hepworth/i.test(q)
        ? "The Hepworth Wakefield Festive Market"
        : /light up/i.test(q)
          ? "Light Up Wakefield"
          : "Wakefield Christmas Market";
    delta.operation = /what time|when|close|start/i.test(q)
      ? "hours"
      : /parking/i.test(q)
        ? "parking"
        : "detail";
  }
  if (/\b(?:it|that|this)\b/i.test(q) && previous.selectedId) {
    delta.selectedId = previous.selectedId;
    delta.selectedName = previous.selectedName || undefined;
  }
  if (namedEvent && /what time|when.*(?:start|begin|finish|close)|hours/i.test(q)) delta.operation = "hours";
  // Structured interpretation belongs to this stage. A planner may supply
  // intent fields, never record facts, prose or URLs.
  const station =
    q.match(
      /\b(westgate|kirkgate)(?:\s+(?:train|railway))?\s+station\b/i,
    )?.[1] ||
    (previous.constraints.pendingStation
      ? q.match(/^\s*(westgate|kirkgate)[?.!\s]*$/i)?.[1]
      : null);
  if (
    station &&
    (needs.length ||
      previous.constraints.outing?.anchor ||
      previous.constraints.pendingStation) &&
    !/tomorrow|next|20\d{2}/i.test(q)
  ) {
    const label = `Wakefield ${station[0].toUpperCase() + station.slice(1).toLowerCase()} station`;
    delta.topic = "food";
    delta.newTopic = false;
    delta.area = label;
    delta.requirements = {
      pendingStation: false,
      outing: {
        anchor: {
          id: "station:" + station.toLowerCase(),
          label,
          date: cal.today,
          start: new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/London",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date()),
        },
        party: outingParty(q, previous.constraints.outing?.party),
        seating: previous.constraints.outing?.seating,
        plan: {
          intent: "food_drink",
          needs: needs.length
            ? needs
            : previous.constraints.outing?.plan?.needs || ["coffee"],
          timing: "during",
        },
      },
    };
  } else if (
    needs.length &&
    /\bwakefield\s+(?:(?:train|railway)\s+)?station\b/i.test(q)
  ) {
    delta.topic = "food";
    delta.newTopic = false;
    delta.requirements = { pendingStation: true };
    delta.operation = "clarify";
  }
  if (/half.term/i.test(q) && !previous.dateRange && !range) {
    delta.topic = "events";
    delta.operation = "clarify";
  }
  if (/^\s*(?:I(?:['’]m| am)|we(?:['’]re| are)) heading to[. …]*$/i.test(q)) {
    delta.operation = "clarify";
    delta.newTopic = false;
  }
  if (
    /\b(?:plan|planning|itinerary|organise|arrange)\b/i.test(q) &&
    /\b(?:evening|night|outing|visit)\b/i.test(q) &&
    !needs.length
  ) {
    delta.operation = "detail";
    delta.requirements = { ...delta.requirements, eveningPlan: true };
  } else delta.requirements = { ...delta.requirements, eveningPlan: false };
  const context = selectedOuting(previous);
  if (
    context &&
    (needs.length ||
      previous.constraints.outing?.activeTopic === "warmup" ||
      /warm(?:ing)? up|sit down/i.test(q)) &&
    (!isEvent || needs.length) &&
    !station &&
    !/\b(?:BSL|parking|parade|switch.on|tickets?)\b/i.test(q)
  ) {
    const service: any = outingServices();
    const raw = service.plan
      ? await service.plan(messages, previous, context)
      : null;
    let plan = contextualOutingPlan(q, raw, previous.constraints.outing || {});
    if (!plan || plan.intent !== "food_drink")
      plan = contextualOutingPlan(
        q,
        fallbackOutingPlan(q, previous.constraints.outing?.plan || {}),
        previous.constraints.outing || {},
      );
    if (plan?.intent === "food_drink" && !plan.scopeChanged) {
      delta.topic = "food";
      delta.newTopic = false;
      const referenceText = q.replace(
        /\b(?:that|this|the same)\s+(?:time|evening|day|area)\b/gi,
        "",
      );
      plan.referencePrevious =
        plan.referencePrevious &&
        (outingTime(q) != null ||
          /\b(?:that|those|them|these|it|still|there|they)\b/i.test(
            referenceText,
          ));
      delta.planner = plan;
      delta.needs = plan.needs;
    }
  }
  if (
    /^Help me find an activity in /i.test(q) ||
    (previous.constraints.activitySearch && !needs.length)
  ) {
    delta.topic = "activities";
    delta.newTopic = false;
  }
  if (
    previous.topic === "general" &&
    /which of those|which ones|any of them/i.test(q)
  ) {
    delta.topic = "events";
  }
  if (/\bBSL\b/i.test(q) && !needs.length) {
    delta.topic = "general";
    delta.newTopic = false;
  }
  if (
    !previous.resultCards.some((c) => c.entityType === "event") &&
    /which of those|any of them|which ones/i.test(q) &&
    /free|paid|start|cost/i.test(q)
  ) {
    delta.topic = "events";
    delta.requirements = { ...delta.requirements, missingPriorList: true };
  }
  return delta;
}
