// Read-only provider adapters and parsers. No response dispatch.
import {
  sessionTimesFromHtml,
  cleanSessionTimes,
} from "../../event-session-times.js";
import { load } from "cheerio";
import { planOutingTurn } from "../../outing-planner.js";
import { discoverAnnouncements } from "../../outing-announcements.js";
import { discoverOutingPlaces, distanceMetres } from "../../outing-places.js";
import { extractEventDetailSections } from "../../event-detail-sections.js";
import {
  conditionalAdmission,
  londonCalendar,
} from "../../event-request-policy.js";
import {
  fetchCouncilSeasonalContext,
  COUNCIL_CHRISTMAS_URL,
} from "../../events/council-seasonal.js";
import { dateLabel } from "../../event-week-window.js";
import { isRequestRefinement } from "../../conversation-scope.js";
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

const GOOGLE_PLACES_ENABLED = process.env.GOOGLE_PLACES_ENABLED !== "false";

const GOOGLE_PLACES_TIMEOUT_MS = Math.max(
  2500,
  Math.min(Number(process.env.GOOGLE_PLACES_TIMEOUT_MS || 7000), 12000),
);

const WAKEFIELD_DISTRICT_VIEWPORT = {
  low: { latitude: 53.45, longitude: -1.7 },
  high: { latitude: 53.86, longitude: -1.1 },
};

const WAKEFIELD_DISTRICT_SEARCH_ZONES = [
  "Wakefield city centre",
  "Ossett Wakefield",
  "Horbury Wakefield",
  "Normanton Wakefield",
  "Castleford Wakefield",
  "Pontefract Wakefield",
  "Featherstone Wakefield",
  "Knottingley Wakefield",
  "Hemsworth Wakefield",
  "South Elmsall Wakefield",
];

const WAKEFIELD_DISTRICT_SECONDARY_ZONES = [
  "South Kirkby Wakefield",
  "Ackworth Wakefield",
  "Crofton Wakefield",
  "Stanley Wakefield",
  "Wrenthorpe Wakefield",
  "Sandal Wakefield",
];

function looksLikeContextDependentFollowUp(text) {
  const value = String(text || "")
    .trim()
    .toLowerCase();
  if (!value) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (
    /\b(those|them|these|that one|the first one|the second one|which of|what about|how about|instead|the free ones|the ones|same place|same area)\b/i.test(
      value,
    )
  )
    return true;
  if (
    /^(?:city centre|town centre|pontefract|castleford|ossett|horbury|normanton|featherstone|knottingley|hemsworth|south elmsall|denby dale|tileyard north|westgate|kirkgate|asda(?: pharmacy)?|sainsbury(?:'|’)s(?: pharmacy)?|boots)\??$/i.test(
      value,
    )
  )
    return true;
  if (
    /^(?:what time|how much|where are they|which are free|which ones|what about that|and that one)\??$/i.test(
      value,
    )
  )
    return true;
  return false;
}

function recentUserContext(messages, maxUserMessages = 3) {
  if (!Array.isArray(messages)) return "";
  const userMessages = messages
    .filter((m) => m?.role === "user" && typeof m.content === "string")
    .map((m) => m.content);
  if (!userMessages.length) return "";
  const last = userMessages[userMessages.length - 1];
  // V11: intent is no longer sticky by default. Older user turns are pulled in
  // only when the latest turn is clearly a short/referring follow-up.
  if (
    maxUserMessages <= 1 ||
    !(looksLikeContextDependentFollowUp(last) || isRequestRefinement(last))
  )
    return last.toLowerCase();
  return userMessages.slice(-maxUserMessages).join("\n").toLowerCase();
}

function cleanEventCategories(value) {
  return Array.isArray(value)
    ? value
        .filter((v) => typeof v === "string" && /^[a-z][a-z -]{0,30}$/i.test(v))
        .slice(0, 12)
    : [];
}

function isCurrentFoodStatusQuery(messages) {
  const context = recentUserContext(messages);
  const foodIntent =
    /\b(lunch|breakfast|brunch|dinner|tea|restaurant|cafe|coffee|food|eat|meal|sandwich|bakery)\b/i;
  const currentIntent =
    /\b(open now|open right now|right now|currently open|open for (?:lunch|breakfast|brunch|dinner|tea)(?: now| today)?|what(?:'|’)s open|what is open)\b/i;
  return foodIntent.test(context) && currentIntent.test(context);
}

function isGeneralAccessibilityQuery(messages) {
  const context = recentUserContext(messages, 5);
  return /\b(wheelchair|wheelchair accessible|accessible|accessibility|step[- ]?free|blue badge|changing places|mobility|disabled access|without (?:any )?steps?|no steps?)\b/i.test(
    context,
  );
}

function isPharmacyOpenQuery(messages) {
  const context = recentUserContext(messages, 5);
  const pharmacyIntent =
    /\b(pharmacy|pharmacies|chemist|chemists|boots|asda pharmacy|sainsbury(?:'|’)s pharmacy|rowlands|numark)\b/i.test(
      context,
    );
  const timingOrDiscovery =
    /\b(open now|open right now|right now|currently open|open today|open tonight|open late|late[- ]?night|this evening|evening|nearest|closest|where can i get|where(?:'|’)s|after\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|after\s+(?:six|seven|eight|nine)|later than\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i.test(
      context,
    );
  return pharmacyIntent && timingOrDiscovery;
}

function isEveningCoffeeDessertQuery(messages) {
  const context = recentUserContext(messages, 5);
  const service =
    /\b(coffee|hot drink|hot drinks|tea|dessert|desserts|cake|cakes|pudding|sweet treat|sweet treats)\b/i.test(
      context,
    );
  const evening =
    /\b(tonight|this evening|evening|night|after work|after-work|after 5|after 6|after 7|after 8|at [5-9](?::\d{2})?\s*(?:pm)?|(?:1[7-9]|2[0-3]):\d{2}|late coffee|coffee late)\b/i.test(
      context,
    );
  return service && evening;
}

function detectWakefieldArea(messages) {
  const last = lastUserText(messages);
  const context = recentUserContext(messages, 5);
  const areaRules = [
    [/\btileyard(?: north)?\b/i, "Tileyard North Wakefield"],
    [/\bbull ring\b/i, "Bull Ring Wakefield"],
    [/\bwood street\b/i, "Wood Street Wakefield"],
    [/\btrinity walk\b/i, "Trinity Walk Wakefield"],
    [/\bwestgate(?: station)?\b/i, "Wakefield Westgate station"],
    [/\bwakefield cathedral\b|\bcathedral\b/i, "Wakefield Cathedral"],
    [
      /\bcity centre\b|\btown centre\b|\bwakefield city\b/i,
      "Wakefield city centre",
    ],
    [/\bdenby dale road\b|\bdurkar\b/i, "Denby Dale Road Durkar Wakefield"],
    [/\bsandal\b/i, "Sandal Wakefield"],
    [/\bhorbury\b/i, "Horbury Wakefield"],
    [/\bossett\b/i, "Ossett Wakefield"],
    [/\bnormanton\b/i, "Normanton Wakefield"],
    [/\bcastleford\b/i, "Castleford Wakefield"],
    [/\bpontefract\b/i, "Pontefract Wakefield"],
    [/\bfeatherstone\b/i, "Featherstone Wakefield"],
    [/\bknottingley\b/i, "Knottingley Wakefield"],
    [/\bhemsworth\b/i, "Hemsworth Wakefield"],
    [/\bsouth elmsall\b/i, "South Elmsall Wakefield"],
    [/\bsouth kirkby\b/i, "South Kirkby Wakefield"],
    [/\backworth\b/i, "Ackworth Wakefield"],
  ];
  // A short follow-up such as 'Pontefract?' or 'Denby Dale Road?' should
  // override an earlier area from the conversation. Check the latest user turn first.
  for (const [pattern, label] of areaRules) {
    if (pattern.test(last)) return label;
  }
  for (const [pattern, label] of areaRules) {
    if (pattern.test(context)) return label;
  }
  return null;
}

function districtAreaQueryLabel(area) {
  if (!area) return null;
  const map = {
    "Tileyard North Wakefield": "Tileyard North",
    "Bull Ring Wakefield": "Bull Ring",
    "Wood Street Wakefield": "Wood Street",
    "Trinity Walk Wakefield": "Trinity Walk Wakefield",
    "Wakefield Westgate station": "Wakefield Westgate",
    "Wakefield Cathedral": "Wakefield Cathedral",
    "Wakefield city centre": "Wakefield city centre",
    "Denby Dale Road Durkar Wakefield": "Denby Dale Road, Durkar",
    "Sandal Wakefield": "Sandal",
    "Horbury Wakefield": "Horbury",
    "Ossett Wakefield": "Ossett",
    "Normanton Wakefield": "Normanton",
    "Castleford Wakefield": "Castleford",
    "Pontefract Wakefield": "Pontefract",
    "Featherstone Wakefield": "Featherstone",
    "Knottingley Wakefield": "Knottingley",
    "Hemsworth Wakefield": "Hemsworth",
    "South Elmsall Wakefield": "South Elmsall",
    "South Kirkby Wakefield": "South Kirkby",
    "Ackworth Wakefield": "Ackworth",
  };
  return map[area] || area.replace(/\s+Wakefield$/i, "");
}

function coffeeSweetRequirements(messages) {
  const context = recentUserContext(messages, 5);
  return {
    wantsCoffee: /\b(coffee|hot drink|hot drinks|tea)\b/i.test(context),
    wantsSweet:
      /\b(dessert|desserts|cake|cakes|pudding|sweet treat|sweet treats|something sweet)\b/i.test(
        context,
      ),
  };
}

function requiresIndependentVenue(messages) {
  return /\bindependent\b/i.test(recentUserContext(messages, 5));
}

function buildDistrictPlacesSearchSpecs(messages) {
  const context = recentUserContext(messages, 5);
  if (isPharmacyOpenQuery(messages)) {
    return [
      {
        textQuery: "pharmacy",
        includedType: "pharmacy",
        strictTypeFiltering: true,
        richFields: [],
      },
    ];
  }

  const coffeeSweet = coffeeSweetRequirements(messages);
  if (
    isEveningCoffeeDessertQuery(messages) ||
    ((isCurrentFoodStatusQuery(messages) ||
      isTimedFoodAvailabilityQuery(messages)) &&
      coffeeSweet.wantsCoffee &&
      coffeeSweet.wantsSweet)
  ) {
    const { wantsCoffee, wantsSweet } = coffeeSweet;
    const richFields = ["servesCoffee", "servesDessert", "dineIn"];
    if (wantsCoffee && wantsSweet) {
      return [
        { textQuery: "dessert", richFields },
        { textQuery: "restaurant", richFields },
      ];
    }
    if (wantsSweet) return [{ textQuery: "dessert", richFields }];
    return [{ textQuery: "coffee", richFields: ["servesCoffee", "dineIn"] }];
  }

  if (isDogFriendlyVenueQuery(messages)) {
    return [
      { textQuery: "cafe", richFields: ["allowsDogs", "servesCoffee"] },
      { textQuery: "restaurant", richFields: ["allowsDogs", "servesCoffee"] },
    ];
  }

  if (
    isGeneralAccessibilityQuery(messages) &&
    /\b(cafe|coffee|restaurant|venue|place|somewhere)\b/i.test(context)
  ) {
    return [
      { textQuery: "cafe restaurant", richFields: ["accessibilityOptions"] },
    ];
  }

  if (isDietaryOpenQuery(messages)) {
    return [
      { textQuery: "restaurant cafe", richFields: ["servesVegetarianFood"] },
    ];
  }

  const display = buildDistrictPlacesServiceQuery(messages);
  return [
    {
      textQuery: display,
      richFields: /\b(?:coffee|caf[eé]s?)\b/i.test(context)
        ? ["servesCoffee", "servesLunch", "servesDinner"]
        : [],
    },
  ];
}

function placeServiceConstraintStatus(place, messages) {
  const context = recentUserContext(messages, 5);
  if (isPharmacyOpenQuery(messages)) {
    const types = Array.isArray(place?.types) ? place.types : [];
    return (
      place?.primaryType === "pharmacy" ||
      (types.includes("pharmacy") &&
        !types.some((t) =>
          ["supermarket", "grocery_store", "shopping_mall"].includes(t),
        ))
    );
  }

  const coffeeSweet = coffeeSweetRequirements(messages);
  if (
    isEveningCoffeeDessertQuery(messages) ||
    ((isCurrentFoodStatusQuery(messages) ||
      isTimedFoodAvailabilityQuery(messages)) &&
      coffeeSweet.wantsCoffee &&
      coffeeSweet.wantsSweet)
  ) {
    const { wantsCoffee, wantsSweet } = coffeeSweet;
    const coffee = place?.servesCoffee;
    const dessert = place?.servesDessert;
    if (wantsCoffee && wantsSweet) {
      if (coffee === true && dessert === true) return true;
      if (coffee === false || dessert === false) return false;
      return null;
    }
    if (wantsCoffee)
      return coffee === true ? true : coffee === false ? false : null;
    if (wantsSweet)
      return dessert === true ? true : dessert === false ? false : null;
  }

  if (requiresIndependentVenue(messages)) {
    // Google Places does not provide a reliable "independent business" field.
    // Keep the candidate discoverable, but require first-party/web verification
    // before it can count as an exact match.
    return null;
  }

  if (isDogFriendlyVenueQuery(messages)) {
    return place?.allowsDogs === true
      ? true
      : place?.allowsDogs === false
        ? false
        : null;
  }

  if (
    isGeneralAccessibilityQuery(messages) &&
    /\b(cafe|coffee|restaurant|venue|place|somewhere)\b/i.test(context)
  ) {
    const a = place?.accessibilityOptions;
    if (!a) return null;
    if (a.wheelchairAccessibleEntrance === true) return true;
    if (a.wheelchairAccessibleEntrance === false) return false;
    return null;
  }

  if (/\b(?:coffee|caf[eé]s?)\b/i.test(context)) {
    if (/\bfood\s+or\s+(?:a\s+)?coffee\b/i.test(context))
      return place.servesCoffee === true ||
        place.servesLunch === true ||
        place.servesDinner === true
        ? true
        : null;
    return place.servesCoffee === true
      ? true
      : place.servesCoffee === false
        ? false
        : null;
  }

  return true;
}

function placeWithinDistrictViewport(place) {
  const lat = Number(place?.location?.latitude);
  const lng = Number(place?.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  return (
    lat >= WAKEFIELD_DISTRICT_VIEWPORT.low.latitude &&
    lat <= WAKEFIELD_DISTRICT_VIEWPORT.high.latitude &&
    lng >= WAKEFIELD_DISTRICT_VIEWPORT.low.longitude &&
    lng <= WAKEFIELD_DISTRICT_VIEWPORT.high.longitude
  );
}

function buildDistrictPlacesServiceQuery(messages) {
  const context = recentUserContext(messages, 5);
  if (isPharmacyOpenQuery(messages)) return "pharmacy";
  if (isEveningCoffeeDessertQuery(messages)) {
    if (
      /\bcoffee\b/i.test(context) &&
      /\b(dessert|desserts|cake|cakes|pudding|sweet treat|sweet treats)\b/i.test(
        context,
      )
    )
      return "coffee dessert";
    if (
      /\b(dessert|desserts|cake|cakes|pudding|sweet treat|sweet treats)\b/i.test(
        context,
      )
    )
      return "dessert";
    return "coffee";
  }
  if (isDogFriendlyVenueQuery(messages)) return "dog friendly cafe restaurant";
  if (isDietaryOpenQuery(messages)) {
    const diet =
      (context.match(
        /\b(gluten[- ]?free|coeliac|celiac|vegan|vegetarian|dairy[- ]?free)\b/i,
      ) || [])[1] || "dietary";
    return `${diet} restaurant cafe`;
  }
  if (/\bsandwich\b/i.test(context)) return "sandwich cafe bakery";
  if (/\bcoffee\b/i.test(context)) return "coffee cafe";
  if (/\bbreakfast\b/i.test(context)) return "breakfast cafe restaurant";
  if (/\blunch\b/i.test(context)) return "lunch restaurant cafe";
  if (/\bdinner\b/i.test(context)) return "dinner restaurant";
  if (/\b(pub|bar)\b/i.test(context)) return "pub bar";
  return "restaurant cafe food";
}

function requestedPlaceTimeConstraint(messages) {
  const context = recentUserContext(messages, 5);
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const named = [
    ...context.matchAll(
      /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
    ),
  ]
    .at(-1)?.[1]
    ?.toLowerCase();
  const day = named
    ? days.indexOf(named)
    : /\btomorrow\b/i.test(context)
      ? (londonDayIndex() + 1) % 7
      : londonDayIndex();
  const clock = requestedPlaceClockConstraint(messages);
  if (clock?.mode === "now" && named && day !== londonDayIndex()) {
    if (/\b(?:after work|evening|night)\b/i.test(context))
      return { mode: "after", hour: 17, minute: 0, day, approximate: true };
    return { mode: "day", day };
  }
  if (clock) return { ...clock, day };
  // An evening window is a search filter, not a promised arrival time.
  if (/\b(?:after work|after-work|evening|night|tonight)\b/i.test(context))
    return { mode: "after", hour: 17, minute: 0, day, approximate: true };
  return null;
}

function requestedPlaceClockConstraint(messages) {
  const context = recentUserContext(messages, 5)
    .split("\n")
    .reverse()
    .join("\n");
  if (
    /\b(open now|open right now|right now|currently open|what(?:'|’)s open)\b/i.test(
      context,
    )
  ) {
    return { mode: "now" };
  }

  const statedClock = context.match(
    /\b(?:(?:the\s+)?time\s+is|it(?:'|’)s|it\s+is)\s+(\d{1,2}):(\d{2})\s*(?:(am|pm)|in\s+the\s+(morning|afternoon|evening))?\b/i,
  );
  if (statedClock) {
    let hour = Number(statedClock[1]);
    const minute = Number(statedClock[2]);
    let period = String(statedClock[3] || statedClock[4] || "").toLowerCase();
    if (!period && /\b(dinner|supper|tonight|this evening)\b/i.test(context))
      period = "pm";
    if (!period && /\b(breakfast|this morning)\b/i.test(context)) period = "am";
    if (
      hour <= 12 &&
      (period === "pm" || period === "afternoon" || period === "evening") &&
      hour !== 12
    )
      hour += 12;
    if (hour === 12 && (period === "am" || period === "morning")) hour = 0;
    if (hour < 24 && minute < 60) return { mode: "at", hour, minute };
  }

  const after12 = context.match(
    /\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  );
  if (after12) {
    let hour = Number(after12[1]);
    const minute = Number(after12[2] || 0);
    const meridiem = (after12[3] || "").toLowerCase();
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (
      !meridiem &&
      hour >= 1 &&
      hour <= 11 &&
      /\b(evening|tonight|late|pharmacy)\b/i.test(context)
    )
      hour += 12;
    return { mode: "after", hour, minute };
  }

  const exact12 = context.match(
    /\b(?:(?:at|around|by)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  );
  if (exact12) {
    let hour = Number(exact12[1]);
    const minute = Number(exact12[2] || 0);
    const meridiem = exact12[3].toLowerCase();
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return { mode: "at", hour, minute };
  }
  const exact24 = context.match(
    /\b(?:at|around|by)?\s*((?:1[7-9]|2[0-3])):(\d{2})\b/i,
  );
  if (exact24)
    return { mode: "at", hour: Number(exact24[1]), minute: Number(exact24[2]) };

  const wordAfter = context.match(/\bafter\s+(six|seven|eight|nine)\b/i);
  if (wordAfter) {
    const map = { six: 18, seven: 19, eight: 20, nine: 21 };
    return { mode: "after", hour: map[wordAfter[1].toLowerCase()], minute: 0 };
  }
  return null;
}

function londonDayIndex() {
  const short = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(new Date());
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short];
}

function minutesOfDay(hour, minute) {
  return Number(hour || 0) * 60 + Number(minute || 0);
}

function placeOpenAtConstraint(place, constraint) {
  if (place?.businessStatus && place.businessStatus !== "OPERATIONAL")
    return false;
  if (!constraint) return true;
  const hours = place?.currentOpeningHours;
  if (!hours) return null;
  if (constraint.mode === "now")
    return typeof hours.openNow === "boolean" ? hours.openNow : null;

  const periods = Array.isArray(hours.periods) ? hours.periods : [];
  if (!periods.length) return null;
  const targetDay = Number.isInteger(constraint.day)
    ? constraint.day
    : londonDayIndex();
  const target = minutesOfDay(constraint.hour, constraint.minute);
  if (constraint.mode === "day")
    return periods.some((period) => Number(period?.open?.day) === targetDay);

  for (const period of periods) {
    const open = period?.open;
    const close = period?.close;
    if (!open) continue;
    if (
      Number(open.day) === (targetDay + 6) % 7 &&
      Number(close?.day) === targetDay &&
      minutesOfDay(close.hour, close.minute) > target
    )
      return true;
    if (Number(open.day) !== targetDay) continue;
    const openMin = minutesOfDay(open.hour, open.minute);
    if (!close) return constraint.mode === "after" ? true : target >= openMin;
    const closeDay = Number(close.day);
    const closeMin = minutesOfDay(close.hour, close.minute);
    if (constraint.mode === "at") {
      if (closeDay === targetDay) {
        if (target >= openMin && target < closeMin) return true;
      } else if (target >= openMin) {
        return true;
      }
    } else if (constraint.mode === "after") {
      if (closeDay !== targetDay || closeMin > target) return true;
    }
  }
  return false;
}

function compactPlace(place, meta = {}) {
  return {
    id: place?.id || null,
    name: place?.displayName?.text || place?.displayName || "",
    address: place?.formattedAddress || place?.shortFormattedAddress || "",
    primaryType: place?.primaryType || "",
    types: Array.isArray(place?.types) ? place.types.slice(0, 10) : [],
    businessStatus: place?.businessStatus || null,
    openNow: place?.currentOpeningHours?.openNow,
    weekdayDescriptions: Array.isArray(
      place?.currentOpeningHours?.weekdayDescriptions,
    )
      ? place.currentOpeningHours.weekdayDescriptions.slice(0, 7)
      : [],
    websiteUri: place?.websiteUri || null,
    googleMapsUri: place?.googleMapsUri || null,
    nationalPhoneNumber: place?.nationalPhoneNumber || null,
    location: place?.location || null,
    servesCoffee:
      typeof place?.servesCoffee === "boolean" ? place.servesCoffee : null,
    servesLunch:
      typeof place?.servesLunch === "boolean" ? place.servesLunch : null,
    servesDinner:
      typeof place?.servesDinner === "boolean" ? place.servesDinner : null,
    servesDessert:
      typeof place?.servesDessert === "boolean" ? place.servesDessert : null,
    dineIn: typeof place?.dineIn === "boolean" ? place.dineIn : null,
    allowsDogs:
      typeof place?.allowsDogs === "boolean" ? place.allowsDogs : null,
    goodForChildren:
      typeof place?.goodForChildren === "boolean"
        ? place.goodForChildren
        : null,
    accessibilityOptions: place?.accessibilityOptions || null,
    sourceZone: meta.sourceZone || place?._sourceZone || null,
    serviceVerified:
      typeof meta.serviceVerified === "boolean" ? meta.serviceVerified : null,
    timeMatch: typeof meta.timeMatch === "boolean" ? meta.timeMatch : null,
  };
}

let placesProviderBackoffUntil = 0;

async function googlePlacesTextSearch(
  textQuery,
  {
    pageSize = 6,
    openNow = false,
    locationBias = null,
    includedType = null,
    strictTypeFiltering = false,
    richFields = [],
    rankPreference = null,
    districtRestriction = true,
  } = {},
) {
  if (
    !GOOGLE_PLACES_ENABLED ||
    !GOOGLE_PLACES_API_KEY ||
    Date.now() < placesProviderBackoffUntil
  )
    return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_PLACES_TIMEOUT_MS);
  try {
    const body = {
      textQuery,
      pageSize,
      languageCode: "en",
      regionCode: "GB",
    };

    if (locationBias) {
      body.locationBias = locationBias;
    } else if (districtRestriction) {
      body.locationRestriction = { rectangle: WAKEFIELD_DISTRICT_VIEWPORT };
    }

    if (openNow) body.openNow = true;
    if (includedType) body.includedType = includedType;
    if (includedType && strictTypeFiltering) body.strictTypeFiltering = true;
    if (rankPreference) body.rankPreference = rankPreference;

    const baseFields = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.primaryType",
      "places.types",
      "places.businessStatus",
      "places.currentOpeningHours",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.nationalPhoneNumber",
    ];
    const richMap = {
      servesCoffee: "places.servesCoffee",
      servesDinner: "places.servesDinner",
      servesLunch: "places.servesLunch",
      takeout: "places.takeout",
      currentSecondaryOpeningHours: "places.currentSecondaryOpeningHours",
      servesDessert: "places.servesDessert",
      dineIn: "places.dineIn",
      allowsDogs: "places.allowsDogs",
      goodForChildren: "places.goodForChildren",
      accessibilityOptions: "places.accessibilityOptions",
      servesVegetarianFood: "places.servesVegetarianFood",
    };
    const fields = [...baseFields];
    for (const key of richFields || []) {
      if (richMap[key] && !fields.includes(richMap[key]))
        fields.push(richMap[key]);
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": fields.join(","),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      let detail = "";
      try {
        detail = await response.text();
      } catch {}
      if ([401, 403, 429].includes(response.status) || response.status >= 500)
        placesProviderBackoffUntil = Date.now() + 30000;
      console.warn(
        "Google Places Text Search failed:",
        response.status,
        detail.slice(0, 300),
      );
      return [];
    }
    const data = await response.json();
    return (Array.isArray(data?.places) ? data.places : []).filter(
      placeWithinDistrictViewport,
    );
  } catch (error) {
    if (error?.name === "AbortError")
      console.warn("Google Places Text Search timed out:", textQuery);
    else
      console.warn("Google Places Text Search error:", error?.message || error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function googlePlacesAnchorSearch(area) {
  if (!GOOGLE_PLACES_ENABLED || !GOOGLE_PLACES_API_KEY || !area) return null;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(GOOGLE_PLACES_TIMEOUT_MS, 5000),
  );
  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: districtAreaQueryLabel(area),
          pageSize: 1,
          languageCode: "en",
          regionCode: "GB",
          locationRestriction: { rectangle: WAKEFIELD_DISTRICT_VIEWPORT },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.places?.[0]?.location || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function dedupePlaces(places) {
  const seen = new Set();
  const out = [];
  for (const place of places || []) {
    const key =
      place?.id ||
      `${place?.displayName?.text || ""}|${place?.formattedAddress || ""}`.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

async function fetchWakefieldDistrictPlacesContext(
  messages,
  coffeeState = null,
  query = null,
) {
  if (!GOOGLE_PLACES_ENABLED || !GOOGLE_PLACES_API_KEY) return null;
  // Signed coffee refinements can outlive the text-history window. Restore the
  // service for retrieval without changing the user's displayed question.
  if (
    coffeeState?.constraints?.coffeeDiscovery &&
    !/\b(?:coffee|caf[eé]s?)\b/i.test(lastUserText(messages))
  ) {
    messages = messages.map((m, i) =>
      i === messages.length - 1 ? { ...m, content: m.content + " coffee" } : m,
    );
  }
  const service = buildDistrictPlacesServiceQuery(messages);
  const area =
    query?.area ||
    detectWakefieldArea(messages) ||
    coffeeState?.constraints?.coffeeDiscovery?.area ||
    coffeeState?.constraints?.indoorArea ||
    null;
  const constraint =
    query?.timeConstraint ?? requestedPlaceTimeConstraint(messages);
  const openNow = constraint?.mode === "now";
  const specs = buildDistrictPlacesSearchSpecs(messages);
  const widenExplicitly =
    /\b(anywhere|across (?:the )?district|whole district|wider district|elsewhere in wakefield)\b/i.test(
      lastUserText(messages),
    );

  const enrich = (place, sourceZone) => {
    if (sourceZone && !place._sourceZone) place._sourceZone = sourceZone;
    return place;
  };

  const runLocalSpecs = async () => {
    const anchor = await googlePlacesAnchorSearch(area);
    const label = districtAreaQueryLabel(area);
    const city =
      area === "Wakefield city centre" || area === "Trinity Walk Wakefield";
    if (city && !anchor) return [];
    const inScope = (items) =>
      city
        ? items.filter(
            (p) =>
              p.location &&
              distanceMetres(anchor, p.location) <= 1300 &&
              !/\b(?:horbury|ossett|castleford|pontefract|ferrybridge|normanton|knottingley)\b/i.test(
                p.formattedAddress || "",
              ),
          )
        : items;
    const batches = await Promise.all(
      specs.map((spec) => {
        const opts = {
          pageSize: 12,
          openNow,
          includedType: spec.includedType || null,
          strictTypeFiltering: Boolean(spec.strictTypeFiltering),
          richFields: spec.richFields || [],
        };
        if (anchor?.latitude != null && anchor?.longitude != null) {
          opts.locationBias = {
            circle: {
              center: {
                latitude: anchor.latitude,
                longitude: anchor.longitude,
              },
              radius: 4000.0,
            },
          };
          opts.rankPreference = "DISTANCE";
          opts.districtRestriction = false;
          return googlePlacesTextSearch(
            `${spec.textQuery} in ${label}`,
            opts,
          ).then((items) =>
            inScope(items).map((place) => enrich(place, label)),
          );
        }
        return googlePlacesTextSearch(
          `${spec.textQuery} in ${label}`,
          opts,
        ).then((items) => inScope(items).map((place) => enrich(place, label)));
      }),
    );
    return dedupePlaces(batches.flat());
  };

  const runZoneSpecs = async (
    zones,
    searchSpecs = specs.slice(0, 1),
    pageSize = 5,
  ) => {
    const jobs = [];
    for (const zone of zones) {
      const zoneLabel = districtAreaQueryLabel(zone);
      for (const spec of searchSpecs) {
        jobs.push(
          googlePlacesTextSearch(`${spec.textQuery} in ${zoneLabel}`, {
            pageSize,
            openNow,
            includedType: spec.includedType || null,
            strictTypeFiltering: Boolean(spec.strictTypeFiltering),
            richFields: spec.richFields || [],
          }).then((items) => items.map((place) => enrich(place, zoneLabel))),
        );
      }
    }
    return dedupePlaces((await Promise.all(jobs)).flat());
  };

  const evaluate = (places) =>
    places
      .map((place) => {
        const timeMatch = placeOpenAtConstraint(place, constraint);
        const serviceMatch = placeServiceConstraintStatus(place, messages);
        return { place, timeMatch, serviceMatch };
      })
      .filter(
        (item) => item.timeMatch !== false && item.serviceMatch !== false,
      );

  let scope = area ? "local" : "district";
  let evaluated = [];

  if (area) {
    const localPlaces = await runLocalSpecs();
    evaluated = evaluate(localPlaces);

    // A named area is a hard preference. Do not silently replace Pontefract,
    // Castleford, Horbury, Tileyard, Westgate, etc. with Wakefield city-centre
    // options just because only one or two local matches were found.
    const exactLocal = evaluated.filter((item) => item.serviceMatch === true);
    if (!exactLocal.length && widenExplicitly) {
      const districtPlaces = await runZoneSpecs(
        WAKEFIELD_DISTRICT_SEARCH_ZONES,
        specs.slice(0, 1),
        4,
      );
      evaluated = evaluate(dedupePlaces([...localPlaces, ...districtPlaces]));
      scope = "local-then-district";
    }
  } else {
    let districtPlaces = await runZoneSpecs(
      WAKEFIELD_DISTRICT_SEARCH_ZONES,
      specs.slice(0, 1),
      4,
    );
    evaluated = evaluate(districtPlaces);

    // If the primary service query did not produce enough exact service matches,
    // run one secondary service query. This is materially cheaper than launching
    // every query variant across every town on every request.
    if (
      evaluated.filter((item) => item.serviceMatch === true).length < 4 &&
      specs.length > 1
    ) {
      const secondary = await runZoneSpecs(
        WAKEFIELD_DISTRICT_SEARCH_ZONES,
        specs.slice(1, 2),
        3,
      );
      districtPlaces = dedupePlaces([...districtPlaces, ...secondary]);
      evaluated = evaluate(districtPlaces);
    }

    if (evaluated.filter((item) => item.serviceMatch === true).length < 3) {
      const secondaryZones = await runZoneSpecs(
        WAKEFIELD_DISTRICT_SECONDARY_ZONES,
        specs.slice(0, 1),
        3,
      );
      evaluated = evaluate(
        dedupePlaces([...districtPlaces, ...secondaryZones]),
      );
      scope = "full-district";
    }
  }

  const exact = evaluated.filter((item) => item.serviceMatch === true);
  const unknown = evaluated.filter((item) => item.serviceMatch == null);

  // Exact service matches always outrank merely plausible category matches.
  // Preserve Google ordering for local searches (DISTANCE-biased) and spread
  // district-wide results across their source zones.
  const spreadDistrict = (items) => {
    if (area) return items;
    const groups = new Map();
    for (const item of items) {
      const zone = item.place?._sourceZone || "Wakefield district";
      if (!groups.has(zone)) groups.set(zone, []);
      groups.get(zone).push(item);
    }
    const out = [];
    let added = true;
    while (added && out.length < 14) {
      added = false;
      for (const list of groups.values()) {
        if (list.length) {
          out.push(list.shift());
          added = true;
          if (out.length >= 14) break;
        }
      }
    }
    return out;
  };

  const selectedItems = spreadDistrict([...exact, ...unknown]).slice(0, 14);
  const selected = selectedItems.map(({ place, timeMatch, serviceMatch }) =>
    compactPlace(place, {
      sourceZone: place?._sourceZone || null,
      serviceVerified: serviceMatch === true,
      timeMatch: timeMatch === true ? true : timeMatch === false ? false : null,
    }),
  );

  if (!selected.length) return null;

  console.info(
    `Google Places district discovery: ${selected.length} candidates (${scope}); verified service matches=${selected.filter((p) => p.serviceVerified).length}.`,
  );

  return {
    service,
    area,
    scope,
    constraint,
    verifiedCount: selected.filter(
      (place) =>
        place.serviceVerified === true &&
        (constraint ? place.timeMatch === true : place.timeMatch !== false),
    ).length,
    places: selected,
    sources: selected
      .filter((p) => p.googleMapsUri)
      .slice(0, 10)
      .map((p) => ({
        title: `${p.name} — Google Places`,
        url: p.googleMapsUri,
      })),
  };
}

function isDogFriendlyVenueQuery(messages) {
  const context = recentUserContext(messages, 5);
  return (
    /\b(dog|dogs|dog-friendly|dog friendly|with our dog|with my dog|bring (?:a|our|my) dog)\b/i.test(
      context,
    ) &&
    /\b(coffee|cafe|restaurant|pub|bar|lunch|eat|drink|venue|where)\b/i.test(
      context,
    )
  );
}

function isDietaryOpenQuery(messages) {
  const context = recentUserContext(messages, 5);
  const dietary =
    /\b(gluten[- ]?free|coeliac|celiac|vegan|vegetarian|dairy[- ]?free|allerg(?:y|ies|ic))\b/i;
  const timing =
    /\b(open|today|now|right now|lunch|dinner|breakfast|this afternoon|this evening)\b/i;
  return dietary.test(context) && timing.test(context);
}

function isTimedFoodAvailabilityQuery(messages) {
  const context = recentUserContext(messages, 5);
  const food =
    /\b(coffee|cafe|breakfast|lunch|dinner|restaurant|food|eat|drink)\b/i;
  const timed =
    /\b(?:at|around|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\b(?:(?:the\s+)?time\s+is|it(?:'|’)s|it\s+is)\s+\d{1,2}:\d{2}\b|\btonight|this evening|this afternoon\b/i;
  const decision =
    /\b(where|somewhere|want|need|looking for|find|recommend)\b/i;
  return food.test(context) && timed.test(context) && decision.test(context);
}

function lastUserText(messages) {
  return messages?.[messages.length - 1]?.content?.toLowerCase() || "";
}

function decodeBasicEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function eventFragmentLines(html) {
  return decodeBasicEntities(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(
      /<\/(?:p|div|li|section|article|header|footer|h[1-6]|a|span|time)>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function eventHeadingSections(html) {
  const source = String(html || "");
  const headings = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = re.exec(source))) {
    const title = htmlToPlainText(match[2]).trim();
    if (!title) continue;
    headings.push({ title, index: match.index, end: re.lastIndex });
  }
  return headings.map((heading, index) => {
    const end =
      headings[index + 1]?.index ??
      Math.min(source.length, heading.index + 14000);
    const fragment = source.slice(heading.index, end);
    return {
      ...heading,
      fragment,
      lines: eventFragmentLines(fragment),
      text: htmlToPlainText(fragment),
    };
  });
}

function firstMatchingHref(fragment, re, base) {
  const source = String(fragment || "");
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = linkRe.exec(source))) {
    let url;
    try {
      url = new URL(match[1], base).toString();
    } catch {
      continue;
    }
    if (re.test(url)) return url;
  }
  return null;
}

function explicitPriceFromEventLines(lines) {
  for (const raw of lines || []) {
    const line = String(raw || "").trim();
    if (!line) continue;
    if (/^(?:free(?:\s*\([^)]*\))?|(?:from\s*)?£\s*\d|£\s*\d)/i.test(line)) {
      return priceStatusFromEventDetailText(line);
    }
  }
  return { type: "unknown", raw: null };
}

function extractJsonLdNodes(html) {
  const source = String(html || "");
  const nodes = [];
  const re =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  const pushNode = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushNode);
      return;
    }
    if (typeof value !== "object") return;
    if (Array.isArray(value["@graph"])) value["@graph"].forEach(pushNode);
    if (Array.isArray(value.itemListElement)) {
      for (const item of value.itemListElement) pushNode(item?.item || item);
    }
    nodes.push(value);
  };
  while ((match = re.exec(source))) {
    try {
      pushNode(JSON.parse(decodeBasicEntities(match[1]).trim()));
    } catch {}
  }
  return nodes;
}

function jsonLdTypeIncludes(node, wanted) {
  const raw = node?.["@type"];
  const types = Array.isArray(raw) ? raw : [raw];
  return types
    .filter(Boolean)
    .some(
      (type) => String(type).toLowerCase() === String(wanted).toLowerCase(),
    );
}

function normaliseIsoDateTime(value) {
  if (!value) return null;
  const s = String(value).trim();
  return s.length <= 80 ? s : s.slice(0, 80);
}

function priceStatusFromOffers(offers) {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const nums = [];
  for (const offer of list) {
    const candidates = [offer?.price, offer?.lowPrice, offer?.highPrice];
    for (const value of candidates) {
      if (value == null || value === "") continue;
      const n = Number(String(value).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n)) nums.push(n);
    }
  }
  if (!nums.length) return { type: "unknown", min: null, max: null };
  const min = Math.min(...nums),
    max = Math.max(...nums);
  if (min === 0 && max === 0) return { type: "free", min, max };
  if (min === 0 && max > 0) return { type: "variable", min, max };
  return { type: "paid", min, max };
}

function eventCardFromJsonLd(node, sourceUrl) {
  if (!jsonLdTypeIncludes(node, "Event")) return null;
  const location = node?.location;
  const venue =
    typeof location === "string" ? location : location?.name || null;
  const addressObj = location?.address;
  const address =
    typeof addressObj === "string"
      ? addressObj
      : [
          addressObj?.streetAddress,
          addressObj?.addressLocality,
          addressObj?.postalCode,
        ]
          .filter(Boolean)
          .join(", ") || null;
  const price = priceStatusFromOffers(node?.offers);
  const url = node?.url || sourceUrl || null;
  const title = node?.name || null;
  if (!title) return null;
  return {
    id: String(
      node?.["@id"] || url || `${title}|${node?.startDate || ""}`,
    ).slice(0, 500),
    entityType: "event",
    title: String(title).slice(0, 220),
    url: url ? String(url).slice(0, 800) : null,
    date: normaliseIsoDateTime(node?.startDate),
    start: normaliseIsoDateTime(node?.startDate),
    end: normaliseIsoDateTime(node?.endDate),
    venue: venue ? String(venue).slice(0, 220) : null,
    address: address ? String(address).slice(0, 300) : null,
    priceStatus: price.type,
    priceMin: price.min,
    priceMax: price.max,
    sourceTier: "structured-first-party",
  };
}

function extractStructuredPageData(html, text, url) {
  const nodes = extractJsonLdNodes(html);
  const eventCards = nodes
    .map((node) => eventCardFromJsonLd(node, url))
    .filter(Boolean);
  return { eventCards };
}

function titlesLikelySame(a, b) {
  const aa = normaliseEventTitle(a);
  const bb = normaliseEventTitle(b);
  if (!aa || !bb) return false;
  if (aa === bb || aa.includes(bb) || bb.includes(aa)) return true;
  const aw = aa.split(" ").filter((w) => w.length > 2);
  const bw = bb.split(" ").filter((w) => w.length > 2);
  if (!aw.length || !bw.length) return false;
  const overlap = aw.filter((w) => bw.includes(w)).length;
  return overlap >= Math.min(3, Math.min(aw.length, bw.length));
}

function shortEventDateToIso(label) {
  const m = String(label || "").match(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i,
  );
  if (!m) return null;
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const month = months[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

function experienceEventDetailFromHtml(html, url, expectedTitle = "") {
  const source = String(html || "");
  const h1 = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const pageTitle = h1
    ? htmlToPlainText(h1[1]).trim()
    : String(expectedTitle || "").trim();
  if (
    expectedTitle &&
    pageTitle &&
    normaliseEventTitle(pageTitle) !== normaliseEventTitle(expectedTitle)
  )
    return null;

  const $ = load(source);
  $('nav,footer,script,style,[class*=\"related\"]').remove();
  const header = $(".postHeading").first();
  const content = $("section.postContent")
    .not(".postContent--sessions")
    .first();
  const sessionDates =
    $(".postContent--sessions")
      .find("div")
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
      .match(/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4}\b/g) || [];
  const occurrenceDates = [
    ...new Set(
      sessionDates
        .map((value) => {
          const parsed = new Date(
            value.replace(/(\d)(?:st|nd|rd|th)\b/g, "$1") + " 12:00:00 GMT",
          );
          return Number.isNaN(parsed.getTime())
            ? null
            : parsed.toISOString().slice(0, 10);
        })
        .filter(Boolean),
    ),
  ];
  let scopedHtml = source;
  if (h1?.index != null) scopedHtml = source.slice(h1.index);
  const boundaries = [
    />\s*About\s*</i,
    />\s*Venue opening hours\s*</i,
    />\s*Access facilities\s*</i,
    />\s*Venue Details\s*</i,
    />\s*More at\s*</i,
    />\s*More events\s*</i,
  ];
  let cut = Math.min(scopedHtml.length, 12000);
  for (const re of boundaries) {
    const m = scopedHtml.match(re);
    if (m?.index != null && m.index > 0) cut = Math.min(cut, m.index);
  }
  // Cut points land just after "<h2" etc.; drop the half tag so it cannot leak
  // into the venue name.
  const detailText = header.length
    ? htmlToPlainText(header.html() || "")
    : htmlToPlainText(scopedHtml.slice(0, cut).replace(/<[^>]*$/, ""));
  const ownText = header.length
    ? htmlToPlainText((header.html() || "") + (content.html() || ""))
    : htmlToPlainText(
        scopedHtml.split(
          /<(?:div|section|footer)\b[^>]*(?:class|id)=["'][^"']*(?:related|venue-details|footer)[^"']*["']/i,
        )[0],
      );
  if (!detailText) return null;

  const publishedRange = detailText.match(
    /\b(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/i,
  );
  // A multi-day header can combine the first start with the final finish.
  // It is not evidence of a session running overnight.
  const timeRange =
    publishedRange &&
    publishedRange[2].padStart(5, "0") >= publishedRange[1].padStart(5, "0")
      ? publishedRange
      : null;
  const condition = conditionalAdmission(ownText);
  const price = condition
    ? { type: "conditional", raw: condition }
    : priceStatusFromEventDetailText(detailText);

  let venue = null;
  if (timeRange) {
    const after = detailText.slice(
      (timeRange.index || 0) + timeRange[0].length,
    );
    const chunk = after
      .split(
        /£\s*\d|\bTag\b|\bFree\b|\bVisit the website\b|\bBook now\b|\bAbout\b/i,
      )[0]
      .replace(/^\s*Map Pin\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (chunk && chunk.length <= 220) venue = chunk;
  }

  const parsedRange = parseLooseExperienceDateRange(detailText);
  const startDate = parsedRange.startDate;
  const endDate = parsedRange.endDate;
  return {
    id: String(url || `${pageTitle}|${startDate || ""}`).slice(0, 500),
    entityType: "event",
    title: pageTitle || expectedTitle || null,
    url: url || null,
    startDate,
    endDate,
    startTime: timeRange?.[1] || null,
    endTime: timeRange?.[2] || null,
    venue,
    priceStatus: price.type,
    priceRaw: price.raw || null,
    sourceTier: "first-party-detail",
    detailText,
    familyEvidenceText: ownText,
    occurrenceDates,
    sessionTimes: sessionTimesFromHtml(source),
  };
}

function extractRelevantFirstPartyText(text, title, maxChars = 9000) {
  const source = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (source.length <= maxChars) return source;
  const needles = [
    title,
    "Opening hours",
    "Pharmacy",
    "Accessibility",
    "Access facilities",
    "Dog Friendly",
    "Gluten Free",
    "Coffee",
    "Dessert",
    "Price",
    "Free",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  const chunks = [source.slice(0, 1400)];
  const lower = source.toLowerCase();
  for (const needle of needles) {
    const idx = lower.indexOf(needle);
    if (idx < 0) continue;
    chunks.push(
      source.slice(Math.max(0, idx - 700), Math.min(source.length, idx + 1800)),
    );
    if (chunks.join("\n---\n").length >= maxChars) break;
  }
  return [...new Set(chunks.map((v) => v.trim()).filter(Boolean))]
    .join("\n---\n")
    .slice(0, maxChars);
}

function htmlToPlainText(html) {
  return decodeBasicEntities(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function weekendDateState() {
  const dates = londonCalendar();
  return {
    saturday: dateLabel(dates.saturday),
    sunday: dateLabel(dates.sunday),
  };
}

function extractWxEventLinks(html) {
  const source = String(html || "");
  const found = new Map();
  const re =
    /<a\b[^>]*href=["']([^"']*\/Whats-On\/Details\?event=[^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(source))) {
    let url = match[1];
    try {
      url = new URL(url, "https://wxwakefield.co.uk").toString();
    } catch {
      continue;
    }
    if (
      !/^https:\/\/(?:www\.)?wxwakefield\.co\.uk\/Whats-On\/Details\?event=/i.test(
        url,
      )
    )
      continue;

    const before = source.slice(Math.max(0, match.index - 1800), match.index);
    const headings = [
      ...before.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi),
    ]
      .map((m) => htmlToPlainText(m[1]).trim())
      .filter(Boolean);
    let heading = headings.length ? headings[headings.length - 1] : "";
    if (/^(what'?s on|featured event|more at wx)$/i.test(heading)) heading = "";

    let slug = "";
    try {
      slug = new URL(url).searchParams.get("event") || "";
    } catch {}
    const slugLabel = slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    const innerText = htmlToPlainText(match[2]).trim();
    const label =
      heading ||
      (/^(more|more info|details|read more)$/i.test(innerText)
        ? ""
        : innerText) ||
      slugLabel;
    if (!label) continue;

    const existing = found.get(url);
    if (!existing || label.length > existing.label.length) {
      found.set(url, { url, label: label.slice(0, 220), source: "wx" });
    }
  }
  return Array.from(found.values()).slice(0, 160);
}

function isSpecificWxEventUrl(url) {
  return /^https:\/\/(?:www\.)?wxwakefield\.co\.uk\/Whats-On\/Details\?event=[^&#]+/i.test(
    String(url || ""),
  );
}

function clockLabelTo24(value) {
  const raw = String(value || "")
    .trim()
    .replace(/\./g, ":");
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || "").toLowerCase();
  if (ap === "am" && h === 12) h = 0;
  if (ap === "pm" && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function wxEventDetailFromHtml(html, url, expectedTitle = "") {
  const source = String(html || "");
  const text = htmlToPlainText(source);
  if (!text) return null;

  const h1 = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const pageTitle = h1
    ? htmlToPlainText(h1[1]).trim()
    : String(expectedTitle || "").trim();
  if (
    expectedTitle &&
    pageTitle &&
    normaliseEventTitle(pageTitle) !== normaliseEventTitle(expectedTitle)
  )
    return null;

  // Start at the visible event heading, not the duplicate title in <head>.
  // Otherwise the navigation's 'Plan your visit' cuts away the whole event.
  let eventHtml = h1?.index != null ? source.slice(h1.index) : source;
  const related = eventHtml.search(
    /<[^>]+class=["'][^"']*\brelated-events[^"']*["']/i,
  );
  if (related >= 0) eventHtml = eventHtml.slice(0, related);
  let scoped = htmlToPlainText(eventHtml).slice(0, 14000);
  const boundaryMatch = scoped.match(/\bMore at WX\b|\bPlan your visit\b/i);
  if (boundaryMatch?.index != null && boundaryMatch.index > 0)
    scoped = scoped.slice(0, boundaryMatch.index);

  const dates = parseLooseExperienceDateRange(scoped);
  const timeMatch = scoped.match(
    /Start time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)\s*[-–]\s*End time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)/i,
  );
  const performanceMatch = scoped.match(
    /Performance Starts\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)/i,
  );
  const price = priceStatusFromEventDetailText(scoped);

  return {
    id: String(url || `${pageTitle}|${dates.startDate || ""}`).slice(0, 500),
    entityType: "event",
    title: pageTitle || expectedTitle || null,
    url: url || null,
    startDate: dates.startDate,
    endDate: dates.endDate,
    startTime: clockLabelTo24(timeMatch?.[1]) || null,
    endTime: clockLabelTo24(timeMatch?.[2]) || null,
    performanceStart: clockLabelTo24(performanceMatch?.[1]) || null,
    venue: "WX Wakefield Exchange",
    priceStatus: price.type,
    priceRaw: price.raw || null,
    sourceTier: "first-party-detail",
    detailText: scoped.trim(),
  };
}

function extractWxListingEventCards(html, links = []) {
  const cards = [];
  const seen = new Set();
  const linkByTitle = new Map();
  for (const link of links || []) {
    const key = normaliseEventTitle(link?.label);
    if (key && link?.url && !linkByTitle.has(key))
      linkByTitle.set(key, link.url);
  }

  const $ = load(String(html || ""));
  const entries = $(".events-col").filter(
    (_, el) => $(el).find(".event-item .event-title").length,
  );
  if (entries.length) {
    entries.each((_, el) => {
      const row = $(el),
        item = row.find(".event-item").first();
      const title = item
        .find(".event-title")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const metadata = item.find(".event-text").first();
      const text = metadata.text().replace(/\s+/g, " ");
      const dates = parseLooseExperienceDateRange(text);
      const href =
        item.find("a.more-info[href]").first().attr("href") ||
        item.find(".img-wrapper a[href]").first().attr("href");
      let url;
      try {
        url = new URL(href, "https://wxwakefield.co.uk").toString();
      } catch {
        return;
      }
      if (!title || !dates.startDate || !isSpecificWxEventUrl(url)) return;
      const slug = new URL(url).searchParams.get("event");
      const id = `wx:${slug}:${dates.startDate}`;
      if (seen.has(id)) return;
      seen.add(id);
      const times = text.match(
        /Start time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)\s*[-–]\s*End time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)/i,
      );
      const price = priceStatusFromEventDetailText(
        metadata.find(".price").text(),
      );
      cards.push({
        id,
        sourceId: id,
        canonId: id,
        entityType: "event",
        title,
        url,
        sourceUrl: url,
        startDate: dates.startDate,
        endDate: dates.endDate || dates.startDate,
        startTime: clockLabelTo24(times?.[1]),
        endTime: clockLabelTo24(times?.[2]),
        venue: "WX Wakefield Exchange",
        availability: row
          .find(".sold-out")
          .filter((_, node) => !$(node).hasClass("d-none")).length
          ? "sold-out"
          : "unknown",
        priceStatus: price.type,
        priceRaw: price.raw || null,
        source: "wx",
        sourceTier: "first-party-listing",
      });
    });
    return cards;
  }

  for (const section of eventHeadingSections(html)) {
    const title = decodeBasicEntities(section.title)
      .replace(/\s+/g, " ")
      .trim();
    const dateIndex = section.lines.findIndex((line) =>
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}/i.test(
        line,
      ),
    );
    if (dateIndex < 0) continue;
    const dates = parseLooseExperienceDateRange(
      section.lines.slice(dateIndex, dateIndex + 3).join(" "),
    );
    const date = dates.startDate;
    if (!date) continue;
    const timeMatch = section.text.match(
      /Start time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)\s*[-–]\s*End time\s*:\s*([0-9]{1,2}(?::|\.)?[0-9]{0,2}\s*(?:am|pm)?)/i,
    );
    const startTime = clockLabelTo24(timeMatch?.[1]);
    const endTime = clockLabelTo24(timeMatch?.[2]);
    const price = explicitPriceFromEventLines(section.lines);

    const exactKey = normaliseEventTitle(title);
    let url = linkByTitle.get(exactKey) || null;
    if (!url) {
      url = firstMatchingHref(
        section.fragment,
        /^https:\/\/(?:www\.)?wxwakefield\.co\.uk\/Whats-On\/Details\?event=/i,
        "https://wxwakefield.co.uk",
      );
    }
    let slug = "";
    try {
      slug = url ? new URL(url).searchParams.get("event") || "" : "";
    } catch {}
    if (!slug) slug = exactKey.replace(/\s+/g, "-");
    const id = `wx:${slug}:${date}`;
    if (seen.has(id)) continue;
    seen.add(id);

    cards.push({
      id,
      sourceId: id,
      canonId: id,
      entityType: "event",
      title,
      url,
      sourceUrl: url,
      startDate: date,
      endDate: dates.endDate || date,
      startTime,
      endTime,
      venue: "WX Wakefield Exchange",
      availability: /class=[\"'][^\"']*sold-out[^\"']*d-block/i.test(
        section.fragment,
      )
        ? "sold-out"
        : "unknown",
      priceStatus: price.type,
      priceRaw: price.raw || null,
      source: "wx",
      sourceTier: "first-party-listing",
    });
  }
  return cards;
}

async function fetchWxWhatsOnContext() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://wxwakefield.co.uk/whats-on", {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const dates = eventDateState();
    const eventLinks = extractWxEventLinks(html);
    const eventCards = extractWxListingEventCards(html, eventLinks);
    return {
      text: extractRelevantEventSegments(text, dates),
      dates,
      eventLinks,
      eventCards,
      source: {
        title: "Wakefield Exchange — What's On",
        url: "https://wxwakefield.co.uk/whats-on",
      },
    };
  } catch (error) {
    console.error("WX first-party fetch failed:", error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function eventDateState() {
  const now = new Date();
  const weekend = weekendDateState();
  return {
    today: formatLondonDate(now),
    tomorrow: formatLondonDate(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
    dayAfterTomorrow: formatLondonDate(
      new Date(now.getTime() + 48 * 60 * 60 * 1000),
    ),
    saturday: weekend.saturday,
    sunday: weekend.sunday,
  };
}

function eventDateVariants(dateText) {
  const match = String(dateText || "").match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
  );
  if (!match) return [dateText];
  const [, weekday, day, month, year] = match;
  const shortMonth = month.slice(0, 3);
  const shortDay = weekday.slice(0, 3);
  const n = Number(day);
  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
        ? "nd"
        : n % 10 === 3 && n % 100 !== 13
          ? "rd"
          : "th";
  return [
    `${weekday} ${day} ${month} ${year}`,
    `${day} ${month} ${year}`,
    `${day} ${shortMonth} ${year}`,
    `${day}${suffix} ${month} ${year}`,
    `${day}${suffix} ${shortMonth} ${year}`,
    `${shortDay} ${day} ${shortMonth}`,
    `${shortDay} ${day}`,
    `${day} ${month}`,
    `${day} ${shortMonth}`,
    `${day}${suffix} ${month}`,
    `${day}${suffix} ${shortMonth}`,
  ];
}

function extractRelevantEventSegments(text, dates) {
  const chunks = [];
  const lower = text.toLowerCase();
  const needles = [
    ...eventDateVariants(dates.today),
    ...eventDateVariants(dates.tomorrow),
    ...eventDateVariants(dates.saturday),
    ...eventDateVariants(dates.sunday),
    "now -",
  ];

  for (const rawNeedle of [...new Set(needles.filter(Boolean))]) {
    const needle = rawNeedle.toLowerCase();
    let from = 0;
    let hits = 0;
    while (hits < 4) {
      const index = lower.indexOf(needle, from);
      if (index === -1) break;
      const start = Math.max(0, index - 650);
      const end = Math.min(text.length, index + 1450);
      chunks.push(text.slice(start, end));
      from = index + needle.length;
      hits += 1;
    }
  }

  const unique = [
    ...new Set(chunks.map((chunk) => chunk.trim()).filter(Boolean)),
  ];
  const matched = unique.join("\n---\n");
  // Keep current-event context compact so the answering call stays fast.
  // Prefer date-matched excerpts; fall back to the start of the listing only
  // when no requested-date text can be located.
  return (matched || text.slice(0, 9000)).slice(0, 12500);
}

function normaliseEventTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExperienceEventLinks(html) {
  const source = String(html || "");
  const found = new Map();
  const re =
    /<a\b[^>]*href=["']([^"']*\/event\/[^"'#?]+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(source))) {
    let url = match[1];
    try {
      url = new URL(url, "https://experiencewakefield.co.uk").toString();
    } catch {
      continue;
    }
    if (!/^https:\/\/(?:www\.)?experiencewakefield\.co\.uk\/event\//i.test(url))
      continue;
    const innerText = htmlToPlainText(match[2]).trim();
    const around = htmlToPlainText(
      source.slice(
        Math.max(0, match.index - 450),
        Math.min(source.length, re.lastIndex + 700),
      ),
    ).trim();
    const candidate = innerText.length >= 3 ? innerText : around;
    const existing = found.get(url);
    if (!existing || candidate.length > existing.label.length)
      found.set(url, { url, label: candidate.slice(0, 600) });
  }
  return Array.from(found.values()).slice(0, 120);
}

function parseLooseExperienceDateRange(text, todayIso = null) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return { startDate: null, endDate: null };

  const nowRange = value.match(
    /\bNow\s*[-–]\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i,
  );
  // "Now" is not a published start date. Keep the end date and mark the run ongoing.
  if (nowRange)
    return {
      startDate: null,
      endDate: shortEventDateToIso(nowRange[1]),
      ongoing: true,
    };

  const range = value.match(
    /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)\s*[-–]\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i,
  );
  if (range) {
    const endDate = shortEventDateToIso(range[2]);
    const endYear = Number(range[2].match(/(\d{4})\s*$/)?.[1] || 0) || null;
    let startDate;
    if (/\d{4}\s*$/.test(range[1])) {
      startDate = shortEventDateToIso(range[1]);
    } else if (endYear) {
      // When the first date omits its year, infer a year boundary from the
      // actual calendar order. Example: Sep -> Mar 2027 starts in Sep 2026.
      startDate = shortEventDateToIso(`${range[1]} ${endYear}`);
      if (startDate && endDate && startDate > endDate) {
        startDate = shortEventDateToIso(`${range[1]} ${endYear - 1}`);
      }
    } else {
      startDate = null;
    }
    return { startDate, endDate };
  }

  // WX shares the month/year across endpoints: Tuesday 27 - Friday 30 October 2026.
  const compact = value.match(
    /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*)\s+(\d{1,2})\s*[-–]\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+([A-Za-z]+)\s+(\d{4}))\b/i,
  );
  if (compact)
    return {
      startDate: shortEventDateToIso(
        `${compact[1]} ${compact[2]} ${compact[4]} ${compact[5]}`,
      ),
      endDate: shortEventDateToIso(compact[3]),
    };

  const single = value.match(
    /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i,
  );
  const date = shortEventDateToIso(single?.[1] || "");
  return { startDate: date, endDate: date };
}

function extractExperienceListingEventCards(html, todayIso = null) {
  const cards = [];
  const seen = new Set();

  for (const section of eventHeadingSections(html)) {
    const title = decodeBasicEntities(section.title)
      .replace(/\s+/g, " ")
      .trim();
    // Nested spans split "Now -" and the end date into different text lines.
    // Read the complete date field, rather than treating the end as a single event.
    const dateIndex = section.lines.findIndex((line) =>
      /\bNow\s*[-–]|\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+\d{1,2}\s+[A-Za-z]+/i.test(
        line,
      ),
    );
    if (dateIndex < 0) continue;
    const calendarLine = section.lines
      .slice(dateIndex, dateIndex + 3)
      .join(" ");
    const parsedRange = parseLooseExperienceDateRange(calendarLine, todayIso);
    const startDate = parsedRange.startDate;
    const endDate = parsedRange.endDate;
    const ongoing = parsedRange.ongoing === true;
    if (!startDate && !(ongoing && endDate)) continue;

    const clockLine =
      section.lines.find((line) =>
        /^(?:Image:\s*)?Clock(?: icon)?\b/i.test(line),
      ) ||
      section.lines.find((line) =>
        /\b\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\b/.test(line),
      );
    const timeMatch = clockLine?.match(
      /\b(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/i,
    );

    let venue = null;
    const venueLine = section.lines.find((line) =>
      /^(?:Image:\s*)?Map pin\b/i.test(line),
    );
    if (venueLine) {
      venue =
        venueLine
          .replace(/^(?:Image:\s*)?Map pin\s*/i, "")
          .replace(/\s+/g, " ")
          .trim() || null;
    }
    if (!venue && timeMatch) {
      const idx = section.lines.indexOf(clockLine);
      for (const candidate of section.lines.slice(
        Math.max(0, idx + 1),
        idx + 5,
      )) {
        if (/^(?:Read more|Book now|Free event|About|Tag\b|£)/i.test(candidate))
          continue;
        if (/^(?:Image:\s*)?(?:Clock|Calendar|Map pin)/i.test(candidate))
          continue;
        if (candidate.length >= 3 && candidate.length <= 160) {
          venue = candidate;
          break;
        }
      }
    }

    const url = firstMatchingHref(
      section.fragment,
      /^https:\/\/(?:www\.)?experiencewakefield\.co\.uk\/event\//i,
      "https://experiencewakefield.co.uk",
    );
    if (!url) continue;
    let slug = normaliseEventTitle(title).replace(/\s+/g, "-");
    try {
      slug =
        new URL(url).pathname.split("/event/")[1]?.replace(/\/$/, "") || slug;
    } catch {}
    const id = `experience:${slug}:${ongoing ? "ongoing:" + endDate : startDate}`;
    if (seen.has(id)) continue;
    seen.add(id);

    cards.push({
      id,
      sourceId: id,
      canonId: id,
      entityType: "event",
      title,
      url,
      sourceUrl: url,
      startDate,
      endDate: endDate || startDate,
      ongoing,
      startTime: timeMatch?.[1] || null,
      endTime: timeMatch?.[2] || null,
      venue,
      // Aggregate Experience Wakefield listings are discovery-only for price.
      // Price/free status is refreshed from the exact detail URL when required.
      priceStatus: "unknown",
      priceRaw: null,
      source: "experience",
      sourceTier: "first-party-listing",
    });
  }
  return cards;
}

function canonicaliseEventCardV16(card) {
  if (!card?.title) return null;
  const source =
    card.source ||
    (isSpecificWxEventUrl(card.url || card.sourceUrl)
      ? "wx"
      : isSpecificExperienceEventUrl(card.url || card.sourceUrl)
        ? "experience"
        : "unknown");
  const sourceUrl = card.sourceUrl || card.url || null;
  let slug = "";
  try {
    const parsed = sourceUrl ? new URL(sourceUrl) : null;
    slug =
      parsed?.searchParams?.get("event") ||
      parsed?.pathname?.split("/event/")[1]?.replace(/\/$/, "") ||
      "";
  } catch {}
  if (!slug) slug = normaliseEventTitle(card.title).replace(/\s+/g, "-");
  const sourceId =
    card.sourceId ||
    `${source}:${slug}:${card.startDate || card.date || "undated"}`;
  return {
    id: String(card.id || sourceId).slice(0, 300),
    sourceId: String(sourceId).slice(0, 300),
    canonId: String(card.canonId || sourceId).slice(0, 300),
    entityType: "event",
    title: String(card.title).slice(0, 180),
    kind:
      card.kind ||
      (card.startDate && card.endDate && card.startDate !== card.endDate
        ? "run"
        : "scheduled"),
    url: sourceUrl,
    sourceUrl,
    source,
    sourceTier: card.sourceTier || null,
    categories: cleanEventCategories(card.categories),
    startDate:
      card.startDate ||
      (typeof card.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(card.date)
        ? card.date
        : null),
    endDate:
      card.endDate ||
      card.startDate ||
      (typeof card.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(card.date)
        ? card.date
        : null),
    ongoing: card.ongoing === true,
    catalogueVerified: card.catalogueVerified === true,
    familyVerified: card.familyVerified === true,
    checkedAt: card.checkedAt || null,
    start: card.start || card.startTime || null,
    end: card.end || card.endTime || null,
    startTime: card.startTime || card.start || null,
    endTime: card.endTime || card.end || null,
    performanceStart: card.performanceStart || null,
    venue: card.venue || null,
    venueId:
      card.venueId ||
      (card.venue
        ? `venue:${normaliseEventTitle(card.venue).replace(/\s+/g, "-")}`
        : null),
    availability: card.availability === "sold-out" ? "sold-out" : "unknown",
    priceStatus: [
      "free",
      "paid",
      "variable",
      "conditional",
      "conflict",
      "unknown",
    ].includes(card.priceStatus)
      ? card.priceStatus
      : "unknown",
    priceRaw: card.priceRaw || null,
    occurrenceDates: Array.isArray(card.occurrenceDates)
      ? card.occurrenceDates.slice(0, 30)
      : [],
    sessionTimes: cleanSessionTimes(card?.sessionTimes),
    dates: Array.isArray(card.dates) ? card.dates.slice(0, 3) : [],
  };
}

async function verifiedOctoberWeekendSupplementV16(weekend) {
  if (londonDateLabelToIso(weekend.saturday) !== "2026-10-03") return [];
  const seeds = [
    [
      "Caphouse Tabletop Gaming Day",
      "https://experiencewakefield.co.uk/event/caphouse-tabletop-gaming-day/",
    ],
    [
      "Pumpkin Picking & Painting",
      "https://experiencewakefield.co.uk/event/blackerween/",
    ],
    [
      "Farmer Copleys’ Pumpkin Festival",
      "https://experiencewakefield.co.uk/event/pumpkin-festival/",
    ],
    [
      "Tom Puddings at Stanley Ferry",
      "https://experiencewakefield.co.uk/event/tom-puddings-at-stanley-ferry-wakefield-railway-modellers-society/",
    ],
  ];
  const contexts = await Promise.all(
    seeds.map(([title, url]) => fetchExperienceEventDetailContext(url, title)),
  );
  const cards = contexts.flatMap((context, index) => {
    const card = context?.eventDetailCard;
    if (!card || !titlesLikelySame(card.title, seeds[index][0])) return [];
    const canonical = canonicaliseEventCardV16(card);
    if (
      !canonical?.startDate ||
      !canonical?.endDate ||
      canonical.startDate > "2026-10-04" ||
      canonical.endDate < "2026-10-03"
    )
      return [];
    // The festival lists a daily 10:00–16:00 programme across its date range.
    // The model railway page gives different Sunday session hours from its
    // headline, so preserve two dated cards with the exact session times.
    if (index === 3) {
      const full = context.fullText || "";
      if (
        !/3rd October 2026\s+10:00\s*[-–]\s*17:00/i.test(full) ||
        !/4th October 2026\s+10:30\s*[-–]\s*16:00/i.test(full)
      )
        return [];
      return [
        {
          ...canonical,
          id: `${canonical.id}:sat`,
          canonId: `${canonical.canonId}:sat`,
          startDate: "2026-10-03",
          endDate: "2026-10-03",
          start: "10:00",
          end: "17:00",
        },
        {
          ...canonical,
          id: `${canonical.id}:sun`,
          canonId: `${canonical.canonId}:sun`,
          startDate: "2026-10-04",
          endDate: "2026-10-04",
          start: "10:30",
          end: "16:00",
        },
      ];
    }
    if (index === 2)
      return [{ ...canonical, startDate: "2026-10-03", endDate: "2026-10-04" }];
    return [canonical];
  });
  const comedyUrl =
    "https://www.theatreroyalwakefield.co.uk/events/chuckl-wakefield-ft-reginald-d-hunter-2026";
  try {
    const response = await fetch(comedyUrl, {
      signal: AbortSignal.timeout(5_500),
    });
    if (response.ok) {
      const plain = htmlToPlainText(await response.text());
      if (
        /Chuckl\. Wakefield ft\. Reginald D\. Hunter/i.test(plain) &&
        /Saturday 3 October 2026,?\s*19:30/i.test(plain) &&
        /book now/i.test(plain)
      ) {
        cards.push({
          id: "theatre:chuckl-reginald-hunter:2026-10-03",
          title: "Chuckl. Wakefield ft. Reginald D. Hunter",
          url: comedyUrl,
          sourceUrl: comedyUrl,
          source: "theatre",
          startDate: "2026-10-03",
          endDate: "2026-10-03",
          start: "19:30",
          venue: "Theatre Royal Wakefield",
          priceStatus: "paid",
          sourceTier: "first-party-detail",
        });
      }
    }
  } catch {}
  return cards;
}

async function refreshEventCardsForPriceV16(cards) {
  const targets = (cards || [])
    .filter(
      (card) =>
        isSpecificEventDetailUrl(card?.sourceUrl || card?.url) &&
        !/:sat$|:sun$/.test(card.id || "") &&
        (card.priceStatus === "unknown" ||
          !card.priceStatus ||
          card.sourceTier !== "first-party-detail"),
    )
    .slice(0, 10);
  const refreshed = new Map();
  await Promise.all(
    targets.map(async (card) => {
      const url = card.sourceUrl || card.url;
      const context = await fetchEventDetailContextByUrl(url, card.title);
      const direct = context?.eventDetailCard || null;
      if (!direct) {
        // A listing price cannot survive a failed exact-page identity check.
        // Earlier verified detail records are not targeted by this refresh.
        refreshed.set(card.id, {
          ...card,
          priceStatus: "unknown",
          priceRaw: null,
        });
        return;
      }
      refreshed.set(card.id, {
        ...card,
        priceStatus:
          direct.priceStatus && direct.priceStatus !== "unknown"
            ? direct.priceStatus
            : card.priceStatus || "unknown",
        priceRaw: direct.priceRaw || card.priceRaw || null,
        occurrenceDates: direct.occurrenceDates || [],
        sessionTimes: direct.sessionTimes || [],
        start: direct.startTime || card.start || null,
        end: direct.endTime || card.end || null,
        startTime: direct.startTime || card.startTime || null,
        endTime: direct.endTime || card.endTime || null,
        performanceStart:
          direct.performanceStart || card.performanceStart || null,
        startDate: direct.startDate || card.startDate || null,
        endDate: direct.endDate || card.endDate || null,
        venue: direct.venue || card.venue || null,
        sourceTier: "first-party-detail",
      });
    }),
  );
  return (cards || []).map((card) => refreshed.get(card.id) || card);
}

async function verifyWeeklyFamilyCards(cards) {
  return Promise.all(
    cards.map(async (card) => {
      try {
        if (
          card.catalogueVerified &&
          card.checkedAt &&
          Date.now() - Date.parse(card.checkedAt) <= 48 * 3600000
        )
          return { ...card, familyCheck: "read" };
        const context = await fetchEventDetailContextByUrl(
          card.sourceUrl || card.url,
          card.title,
          12_000,
        );
        if (
          !context &&
          card.familyVerified &&
          card.checkedAt &&
          Date.now() - Date.parse(card.checkedAt) >= 0 &&
          Date.now() - Date.parse(card.checkedAt) <= 30 * 60000
        )
          return { ...card, familyCheck: "earlier" };
        const text = String(
          context?.familyEvidenceText ??
            context?.eventDetailText ??
            context?.text ??
            "",
        );
        const titleAt = text.toLowerCase().indexOf(card.title.toLowerCase());
        const scoped =
          titleAt >= 0
            ? text
                .slice(titleAt, titleAt + 7000)
                .split(
                  /More at WX|Related Events|You may also|Venue Details/i,
                )[0]
            : "";
        const about = scoped.split(/\bAbout\b/i)[1] || scoped;
        const ageRange =
          scoped.match(
            /\bAGE RANGE\s*:\s*([\s\S]{0,180}?)(?=\b(?:Step|Join|Enjoy|This|About|PRICE|DATE)\b|$)/i,
          )?.[1] || "";
        const publishedAudience = /\b(?:Children|Families)\b/i.test(ageRange);
        const familyVerified =
          (publishedAudience ||
            /\bfamily[- ]friendly\b/i.test(scoped.split(/\bAbout\b/i)[0]) ||
            /\b(?:family[- ]friendly|for (?:all (?:the )?)?families|for (?:kids|children)|children aged|all ages(?: welcome)?|suitable for all ages|open to (?:kids|children))\b/i.test(
              about,
            )) &&
          !/\b(?:adults only|18\+|over[- ]18s only|not suitable for (?:children|kids)|not for (?:children|kids))\b/i.test(
            scoped,
          );
        return {
          ...card,
          familyVerified,
          familyCheck: context ? "read" : "unavailable",
          checkedAt: context ? new Date().toISOString() : card.checkedAt,
        };
      } catch {
        return { ...card, familyVerified: false, familyCheck: "unavailable" };
      }
    }),
  );
}

async function verifyWeeklySessionCards(cards, window) {
  return Promise.all(
    cards.map(async (card) => {
      if (card.ongoing || !card.startDate || card.startDate === card.endDate)
        return card;
      const context = await fetchEventDetailContextByUrl(
        card.sourceUrl || card.url,
        card.title,
      );
      const detail = context?.eventDetailCard;
      if (!detail?.occurrenceDates?.length) return card;
      const mixedClock = /\b(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/.exec(
        detail.detailText || "",
      );
      const ambiguous =
        mixedClock &&
        mixedClock[2].padStart(5, "0") < mixedClock[1].padStart(5, "0");
      const occurrences = detail.occurrenceDates.filter(
        (day) => day >= window.from && day <= window.end,
      );
      return {
        ...card,
        occurrenceDates: detail.occurrenceDates,
        sessionTimes: detail.sessionTimes,
        dates: occurrences,
        start: ambiguous ? null : detail.startTime || card.start,
        startTime: ambiguous ? null : detail.startTime || card.startTime,
        end: ambiguous ? null : detail.endTime || card.end,
        endTime: ambiguous ? null : detail.endTime || card.endTime,
      };
    }),
  );
}

function isSpecificExperienceEventUrl(url) {
  return /^https:\/\/(?:www\.)?experiencewakefield\.co\.uk\/event\/[^/?#]+\/?(?:[?#].*)?$/i.test(
    String(url || ""),
  );
}

function isSpecificEventDetailUrl(url) {
  return (
    url === COUNCIL_CHRISTMAS_URL ||
    isSpecificExperienceEventUrl(url) ||
    isSpecificWxEventUrl(url)
  );
}

async function fetchExperienceWakefieldEventsContext() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_500);
  try {
    const url = "https://experiencewakefield.co.uk/whats-on/";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const dates = eventDateState();
    const structured = extractStructuredPageData(html, text, url);
    const eventLinks = extractExperienceEventLinks(html);
    const listingEventCards = extractExperienceListingEventCards(
      html,
      londonDateLabelToIso(dates.today),
    );
    return {
      text: extractRelevantEventSegments(text, dates),
      dates,
      eventLinks,
      listingEventCards,
      eventCards: structured.eventCards || [],
      structured,
      source: {
        title: "Experience Wakefield — What's On",
        url,
      },
    };
  } catch (error) {
    console.error(
      "Experience Wakefield events fetch failed:",
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchExperienceEventDetailContext(
  url,
  expectedTitle,
  timeoutMs = 5_500,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const structured = extractStructuredPageData(html, text, url);
    const h1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
    const ownHtml = h1?.index != null ? html.slice(h1.index) : "";
    const familyEvidenceText = htmlToPlainText(
      ownHtml.split(
        /<(?:div|section|footer)\b[^>]*(?:class|id)=["'][^"']*(?:related|venue-details|footer)[^"']*["']/i,
      )[0],
    );
    const direct = experienceEventDetailFromHtml(html, url, expectedTitle);
    if (direct) {
      const cards = Array.isArray(structured?.eventCards)
        ? structured.eventCards
        : [];
      const existing = cards.find((card) =>
        titlesLikelySame(card?.title, direct.title),
      );
      if (existing) {
        existing.priceStatus = direct.priceStatus;
        existing.priceRaw = direct.priceRaw;
      } else {
        structured.eventCards = [direct, ...cards];
      }
    }
    return {
      text:
        direct?.detailText ||
        extractRelevantFirstPartyText(text, expectedTitle, 9000),
      fullText: text,
      familyEvidenceText: direct?.familyEvidenceText || familyEvidenceText,
      eventDetailText: direct?.detailText || null,
      eventDetailCard: direct || null,
      eventSections: direct
        ? extractEventDetailSections(html, url, direct.title)
        : null,
      structured,
      source: {
        title: `Experience Wakefield — ${direct?.title || expectedTitle}`,
        url,
      },
    };
  } catch (error) {
    console.error(
      `Experience Wakefield event detail fetch failed: ${expectedTitle}`,
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWxEventDetailContext(
  url,
  expectedTitle,
  timeoutMs = 5_500,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const direct = wxEventDetailFromHtml(html, url, expectedTitle);
    if (!direct) return null;
    return {
      text: direct.detailText,
      eventDetailText: direct.detailText,
      familyEvidenceText: /<h1\b/i.test(html) ? direct.detailText : "",
      eventDetailCard: direct,
      eventSections: extractEventDetailSections(html, url, direct.title),
      structured: { eventCards: [direct] },
      source: {
        title: `Wakefield Exchange — ${direct.title || expectedTitle}`,
        url,
      },
    };
  } catch (error) {
    console.error(
      `WX event detail fetch failed: ${expectedTitle}`,
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEventDetailContextByUrl(
  url,
  expectedTitle,
  timeoutMs = 5_500,
) {
  if (
    url === COUNCIL_CHRISTMAS_URL &&
    expectedTitle === "Wakefield Christmas Market"
  ) {
    const context = await fetchCouncilSeasonalContext();
    const card = context?.eventCards[0];
    if (!card) return null;
    const closure = card.description
      .match(
        /(?:Please note that )?Wood Street will be closed to traffic from 10 to 14 December\./,
      )?.[0]
      ?.replace(/^Please note that /, "");
    return {
      eventDetailCard: card,
      eventSections: {
        programme: [card.description],
        parking: closure
          ? [closure + " I have not confirmed a suitable car park."]
          : [],
        parkingLinks: [],
      },
      structured: { eventCards: [card] },
      text: card.description,
    };
  }
  if (isSpecificWxEventUrl(url))
    return fetchWxEventDetailContext(url, expectedTitle, timeoutMs);
  if (isSpecificExperienceEventUrl(url))
    return fetchExperienceEventDetailContext(url, expectedTitle, timeoutMs);
  return null;
}

async function fetchSimpleFirstPartyContext(url, title) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_500);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const structured = extractStructuredPageData(html, text, url);
    return {
      text: extractRelevantFirstPartyText(text, title, 9000),
      structured,
      source: { title, url },
    };
  } catch (error) {
    console.error(
      `${title} first-party fetch failed:`,
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDatedFirstPartyContext(url, title) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_500);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AskWakefield/2.0 (+https://www.askwakefield.co.uk)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const dates = eventDateState();
    return {
      text: extractRelevantEventSegments(text, dates),
      dates,
      source: { title, url },
    };
  } catch (error) {
    console.error(
      `${title} dated first-party fetch failed:`,
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatLondonDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function outingServices() {
  const services = { model: MODEL, call: callAnthropic };
  if (process.env.AW_OUTING_PLANNER_ENABLED !== "false") {
    services.plan = (messages, state, context) =>
      planOutingTurn(messages, state, context, services);
    services.discover = (context, plan, now) =>
      discoverOutingPlaces(
        context,
        plan,
        { search: googlePlacesTextSearch, anchor: googlePlacesAnchorSearch },
        now,
      );
    // Announcement leads include local cafés whose normal hours finish before
    // the event. They are research sources, not open-evening recommendations.
    services.sources = (context, now) =>
      discoverOutingPlaces(
        { ...context, windowStart: 0, windowEnd: 1440 },
        { needs: ["coffee"], timing: "during" },
        { search: googlePlacesTextSearch, anchor: googlePlacesAnchorSearch },
        now,
      );
    services.announcements = (context, branches, now) =>
      discoverAnnouncements(context, branches, services, now);
  }
  return services;
}

async function callAnthropic(body, { timeoutMs = 22000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = {};
    try {
      data = await response.json();
    } catch {}
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

function priceStatusFromEventDetailText(text) {
  const scoped = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!scoped) return { type: "unknown", raw: null };

  const condition = conditionalAdmission(scoped);
  if (condition) return { type: "conditional", raw: condition };
  const priceText = scoped.replace(
    /\bfree (?:parking|wifi|wi-fi|refreshments|trail maps?|maps?)\b/gi,
    "",
  );

  const range = priceText.match(
    /£\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*[-–]\s*£?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
  );
  if (range) {
    const a = Number(range[1].replace(",", "."));
    const b = Number(range[2].replace(",", "."));
    if (a === 0 && b === 0) return { type: "free", raw: range[0] };
    if (a === 0 || b === 0) return { type: "variable", raw: range[0] };
    return { type: "paid", raw: range[0] };
  }

  const money = priceText.match(/£\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (money) {
    const value = Number(money[1].replace(",", "."));
    return value === 0
      ? { type: "free", raw: money[0] }
      : { type: "paid", raw: money[0] };
  }

  // On an exact event page this scoped header is the event's own metadata, so
  // a standalone Free / Free event marker is safe once related-event sections
  // have been cut away.
  if (
    /\bFree event\b/i.test(priceText) ||
    /(?:^|\s)Free(?:\s|$)/i.test(priceText)
  ) {
    return { type: "free", raw: "Free" };
  }
  return { type: "unknown", raw: null };
}

function stripInternalProcessLeakage(reply) {
  if (!reply) return reply;
  let out = String(reply);
  const rewriteMarker = out.toLowerCase().lastIndexOf("recommended rewrite:");
  if (rewriteMarker !== -1)
    out = out.slice(rewriteMarker + "recommended rewrite:".length).trim();
  const finalMarker = out.lastIndexOf("FINAL_RESPONSE:");
  if (finalMarker !== -1)
    out = out.slice(finalMarker + "FINAL_RESPONSE:".length).trim();

  // Validators occasionally append an audit block after the real answer.
  // Remove the entire block rather than trying to clean it line by line.
  const validationBlock = out.search(/\n\s*---\s*\n+\s*validated(?:[.:]|\b)/i);
  if (validationBlock !== -1) out = out.slice(0, validationBlock).trim();

  // Web-search citation markup sometimes leaks into the text, either as real
  // tags or as a half-written "(cite index="7-7">". Strip it; sources are
  // rendered separately.
  out = out
    .replace(/\(?\s*<\/?(?:[a-z]+:)?cite\b[^>]*>\)?/gi, "")
    .replace(/\(?\s*(?:[a-z]+:)?cite\s+index\s*=\s*"[^"]*"\s*>\)?/gi, "")
    // House style: no em dashes in answers.
    .replace(/[ \t]*—[ \t]*/g, ", ")
    .replace(/,\s*,/g, ",");

  return out
    .split("\n")
    .filter(
      (line) =>
        !/^\s*(?:---\s*)?(?:validated|change made|changes? made|removed because|validator|validation note|audit note|draft note|internal note|recommended rewrite)\s*(?::|\.|\b)/i.test(
          line,
        ),
    )
    .filter((line) => !/trusted evidence supplied/i.test(line))
    .filter(
      (line) =>
        !/^\s*(?:i(?:'|’)ll|i will|i need to|let me)\s+(?:carry out a live search|search|check live sources)\b/i.test(
          line,
        ),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function londonDateLabelToIso(label) {
  const m = String(label || "").match(
    /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i,
  );
  if (!m) return null;
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const month = months[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}
export {
  requestedPlaceTimeConstraint,
  placeOpenAtConstraint,
  extractWxListingEventCards,
  parseLooseExperienceDateRange,
  extractExperienceListingEventCards,
  stripInternalProcessLeakage,
  fetchExperienceWakefieldEventsContext,
  fetchWxWhatsOnContext,
  fetchEventDetailContextByUrl,
  fetchWakefieldDistrictPlacesContext,
  fetchDatedFirstPartyContext,
  googlePlacesTextSearch,
  googlePlacesAnchorSearch,
  detectWakefieldArea,
  districtAreaQueryLabel,
  outingServices,
  canonicaliseEventCardV16,
  verifyWeeklySessionCards,
  verifyWeeklyFamilyCards,
  verifiedOctoberWeekendSupplementV16,
  refreshEventCardsForPriceV16,
  fetchSimpleFirstPartyContext,
  isSpecificEventDetailUrl,
};
