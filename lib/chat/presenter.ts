import type { VerifiedPayload, CanonicalRecord } from "./types.ts";
import { dateLabel, formatWeekCards } from "../event-week-window.js";
import { timesForCard, cleanSessionTimes } from "../event-session-times.js";
import {
  programmeConversation,
  parkingConversation,
} from "../event-conversation-voice.js";
import { renderFoodOption } from "../outing-food.js";
import { clockLabel } from "../outing-places.js";
const link = (r: CanonicalRecord) =>
  r.sourceUrl ? `[${r.title}](${r.sourceUrl})` : r.title;
const minute = (v: any) =>
  typeof v === "number"
    ? v
    : typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)
      ? +v.split(":")[0] * 60 + +v.split(":")[1]
      : NaN;
function clean(text: string) {
  return text
    .replace(
      /These are indoor ideas rather than confirmed sessions for your visit\.\s*/gi,
      "",
    )
    .replace(/These listings come from collected source pages[^\n]*/gi, "")
    .replace(/This is a partial district calendar\.?/gi, "")
    .replace(
      /a named coffee-shop record in the local directory/gi,
      "a coffee shop",
    )
    .replace(/local directory/gi, "local listings")
    .replace(/confirmed sessions/gi, "dated activities")
    .replace(/collected source pages/gi, "event pages")
    .replace(/partial district calendar/gi, "shortlist")
    .replace(/Here are some more checked listings/gi, "Some more options")
    .replace(/Here are some checked listings/gi, "A few options")
    .replace(/—/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function guidanceText(r: CanonicalRecord) {
  const allowed = new Set(
    ((r.evidence.sourceList as any[]) || []).map((s) => s.url),
  );
  return String(r.fields.content || "").replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    (_, label, url) => (allowed.has(url) ? `[${label}](${url})` : label),
  );
}
export function renderResponse(payload: VerifiedPayload) {
  const { records, retrieval, state } = payload,
    ctx = retrieval.context || {};
  let reply = "",
    question = "";
  const mode = retrieval.mode;
  const sourceRecords = records;
  const sources = sourceRecords.flatMap((r) =>
    r.entityType === "guidance"
      ? (r.evidence.sourceList as any[]) || []
      : r.sourceUrl
        ? [
            {
              title:
                r.sourceTitle ||
                r.title +
                  ((r.entityType === "place" && !r.fields.reviewed) ||
                  r.fields.sourceKind === "branch-listing"
                    ? " - branch listing"
                    : r.fields.reviewed && !r.evidence.factSourceUrl
                      ? " - reviewed business announcement"
                      : r.entityType === "place"
                        ? " - venue listing"
                        : " - official event page"),
              url: r.sourceUrl,
            },
            ...(r.evidence.factSourceUrl
              ? [
                  {
                    title:
                      r.title +
                      (r.fields.reviewed
                        ? " - reviewed business announcement"
                        : " - branch listing"),
                    url: r.evidence.factSourceUrl,
                  },
                ]
              : []),
            ...(r.evidence.menuSourceUrl
              ? [
                  {
                    title: r.title + " - published drink menu",
                    url: r.evidence.menuSourceUrl,
                  },
                ]
              : []),
          ]
        : [],
  );
  if (mode === "ack") {
    reply = /thanks|thank you|cheers/i.test(state.question)
      ? "You’re welcome."
      : "Sounds good.";
    question = state.constraints.outing
      ? "Would you like help with another part of your outing?"
      : "Anything else you’d like to know?";
  } else if (mode === "station-choice") {
    reply = "Do you mean Wakefield Westgate or Wakefield Kirkgate?";
  } else if (mode === "event-choice") {
    reply = "Which event are you heading to?";
  } else if (mode === "destination") {
    reply = "Where are you heading?";
  } else if (mode === "no-prior-list") {
    reply =
      "I no longer have the verified event list from that chat. Please ask for the events again so I can filter the right list.";
    question = "What dates would you like me to check?";
  } else if (mode === "half-term") {
    reply =
      "Which dates would you like to plan for? School half-term dates vary. Tell me the dates and the children’s ages so I can check local events.";
  } else if (mode === "guidance" && records[0]) {
    reply = guidanceText(records[0]);
    question = "Would you like help with the next step?";
  } else if (mode === "event-list") {
    reply = state.dateRange
      ? formatWeekCards(
          records.map((r) => ({ ...r.fields, ...r })),
          state.weekday
            ? {
                ...state.dateRange,
                kind: "day",
                start: dayInRange(state),
                end: dayInRange(state),
                from: dayInRange(state),
              }
            : state.dateRange,
          { musicOnly: state.includeCategories.includes("music") },
        )
      : "What day would you like to go?";
    if (!records.length && state.weekday)
      reply = `I could not verify matching ${state.includeCategories.includes("music") ? "music " : ""}events on ${state.dateRange ? dateLabel(state.constraints.eventWeek?.filters?.day && new Date(state.dateRange.start + "T12:00:00Z") ? dayInRange(state) : state.dateRange.start) : state.weekday}${state.timeWindow ? " in the " + state.timeWindow.label : ""}. I’ve kept your original dates and requirements.`;
    if (state.area === "Wakefield city centre")
      reply =
        "For Wakefield city" +
        (state.weekday ? " on " + dateLabel(dayInRange(state)) : "") +
        ", keeping " +
        dateLabel(state.dateRange!.start) +
        " to " +
        dateLabel(state.dateRange!.end) +
        ":\n\n" +
        reply;
    if (state.freeOnly) reply = "Confirmed free entries only.\n\n" + reply;
    if (/what time|when.*start/i.test(state.question))
      reply = records
        .map(
          (r) =>
            r.title +
            " starts at " +
            (timesForCard({ ...r, dates: r.dates }).start ||
              "an unverified time") +
            (r.fields.performanceStart
              ? ", performance at " + r.fields.performanceStart
              : "") +
            (timesForCard({ ...r, dates: r.dates }).end
              ? " (" +
                timesForCard({ ...r, dates: r.dates }).start +
                "–" +
                timesForCard({ ...r, dates: r.dates }).end +
                ")"
              : "") +
            (r.sourceUrl ? " [Event details](" + r.sourceUrl + ")" : ""),
        )
        .join("\n\n");
    if (ctx.unsupported)
      reply =
        "I cannot verify that extra requirement from the event pages. I’ve kept your original dates and requirements.";
    if (!records.length && state.family)
      reply =
        "I could not confirm children’s suitability from the event pages. Some event pages could not be read. Please check the organiser’s page before planning a visit.";
    question =
      state.weekday || state.timeWindow
        ? records.length
          ? "Would you like a closer look at one of these events?"
          : "Would you like to try another date or type of activity?"
        : "Is there a particular day or type of event you’re after?";
  } else if (/^event-(?:detail|time|parking|plan)$/.test(mode)) {
    const r = records.find((r) => r.entityType === "event");
    if (!r) reply = "I couldn’t refresh that event’s details just now.";
    else {
      const fields = r.fields,
        sections = fields.sections || {
          programme: [],
          parking: [],
          parkingLinks: [],
        },
        dates = r.dates?.length
          ? r.dates
          : r.occurrenceDates?.length
            ? r.occurrenceDates
            : [r.startDate].filter(Boolean),
        dateText = dates.map(dateLabel).join(" and "),
        time = timesForCard({ ...r, dates });
      if (mode === "event-parking")
        reply = sections.parking?.length
          ? parkingConversation(r.title, sections.parking)
          : `I still have ${r.title}${r.venue ? " at " + r.venue : ""}, but I couldn’t confirm a suitable car park from its event page.`;
      else if (mode === "event-time") {
        const sessions = cleanSessionTimes(r.sessionTimes).filter((s) =>
          dates.includes(s.date),
        );
        reply = time.start
          ? `${r.title} starts at ${time.start}${dateText ? " on " + dateText : ""}${r.venue ? ", at " + r.venue : ""}.${time.end ? " It runs until " + time.end + "." : ""}`
          : sessions.length
            ? `${r.title}:\n` +
              sessions
                .map((s) => `${dateLabel(s.date)}: ${s.start}–${s.end}`)
                .join("\n")
            : `I couldn’t confirm the start time for ${r.title}.`;
        if (fields.performanceStart && fields.performanceStart !== time.start)
          reply += ` The performance starts at ${fields.performanceStart}.`;
      } else {
        reply = `${r.title} runs on ${dateText || "the published dates"}${time.start ? ", " + time.start + (time.end ? "–" + time.end : "") : ""}${r.venue ? ", at " + r.venue : ""}.${r.priceStatus === "free" ? " Free entry." : ""}`;
        if (sections.programme?.length)
          reply +=
            "\n\n" +
            programmeConversation(sections.programme, {
              from:
                state.dateRange?.today || new Date().toISOString().slice(0, 10),
              year: r.endDate?.slice(0, 4),
            });
        const suggestions =
          mode === "event-plan"
            ? []
            : records.filter((p) => ctx.suggestionIds?.includes(p.id));
        if (suggestions[0]) {
          const p = suggestions[0];
          reply +=
            "\n\n" +
            (ctx.outing?.party?.children
              ? "If you fancy a break with the kids, "
              : "If you fancy making an evening of it, ") +
            renderFoodOption(
              { ...p.fields, name: p.title, sourceUrl: p.sourceUrl },
              { needs: ["coffee", "snack"] },
            );
        }
      }
      if (mode === "event-plan") {
        if (sections.parking?.length)
          reply += "\n\n" + parkingConversation(r.title, sections.parking);
        const phases = ctx.phaseIds || [];
        reply +=
          "\n\n" +
          phases
            .map((ids: string[], i: number) => {
              const picks = records.filter((p) => ids.includes(p.id));
              return (
                (i === 0
                  ? "Before the event (around " +
                    clockLabel(ctx.phaseTimes[0]) +
                    ")"
                  : "After " + clockLabel(ctx.phaseTimes[1])) +
                ":\n" +
                (i === 1 ? "At " + clockLabel(ctx.phaseTimes[1]) + ", " : "") +
                (picks.length
                  ? picks
                      .map((p) =>
                        renderFoodOption(
                          {
                            ...p.fields,
                            name: p.title,
                            sourceUrl: p.sourceUrl,
                          },
                          { needs: i === 0 ? ["dinner"] : ["coffee"] },
                        ),
                      )
                      .join("\n")
                  : "I couldn’t verify a suitable stop for that time.")
              );
            })
            .join("\n\n");
        if (phases.some((ids: string[]) => ids.length))
          reply +=
            "\n\nKitchen or food-counter closing times aren’t confirmed for every option. Drink-counter service until closing isn’t confirmed.";
      }
      if (state.family && !r.familyVerified)
        reply =
          "I couldn’t confirm children’s suitability for " +
          r.title +
          ".\n\n" +
          reply;
      if (state.family && r.familyVerified)
        reply =
          "Yes. " + r.title + " is listed as family-friendly.\n\n" + reply;
      if (fields.refreshFailed)
        reply +=
          "\n\nThese details were checked earlier in this chat. I couldn’t refresh the page just now.";
      if (mode === "event-parking" && sections.parkingLinks?.length) {
        for (const p of sections.parkingLinks)
          reply += `\n[${p.title}](${p.url})`;
        sources.push(...sections.parkingLinks);
      }
      if (r.sourceUrl) reply += `\n\n[Event details](${r.sourceUrl})`;
    }
    question =
      mode === "event-parking"
        ? "Are you planning another stop nearby?"
        : "Would you like help with parking or booking?";
  } else if (mode === "place-detail" || mode === "place-hours") {
    const r = records[0];
    if (r) {
      reply = `${link(r)} is at ${r.address || "the linked address"}${r.postcode ? ", " + r.postcode : ""}.`;
      if (mode === "place-hours") {
        const day =
          r.fields.day ||
          new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            timeZone: "Europe/London",
          }).format(new Date());
        const hours =
          typeof r.openingHours === "string"
            ? r.openingHours.match(
                new RegExp(
                  "\\b" +
                    day +
                    "\\s*:\\s*([^]*?)(?=\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s*:|$)",
                  "i",
                ),
              )?.[1]
            : null;
        reply +=
          "\n\n" +
          (hours
            ? `${day}: ${hours.trim()}. These are listed branch hours, so counter service may finish earlier.`
            : "I couldn’t refresh its published hours for your visit.");
      }
    } else reply = "Which place did you have in mind?";
    question =
      mode === "place-hours"
        ? "Would you like another option in the same area?"
        : "What day are you thinking of going?";
  } else if (mode === "place-list") {
    const scope = state.area || "the Wakefield district";
    reply = records.length
      ? `${state.operation === "more" ? "Some more checked listings" : "A few options"} in ${scope}${ctx.coffeeDiscovery?.nowOnly ? ", listed open now" : ""}:\n\n` +
        records
          .map(
            (r) =>
              `${link(r)}${r.address ? " (" + r.address + ")" : ""} lists ${[
                "hot_chocolate",
                "coffee",
                "food",
              ]
                .filter((v) => r.services?.includes(v))
                .map((v) => (v === "hot_chocolate" ? "hot chocolate" : v))
                .join(
                  " and ",
                )}.${state.operation === "hours" ? hoursLine(r, state.weekday) : ""}`,
          )
          .join("\n\n")
      : `I couldn’t verify suitable ${state.needs.includes("hot_chocolate") ? "places serving both coffee and hot chocolate" : "coffee shops"} in ${scope} from this check. There may be others.`;
    if (/nearby|near me|close by/i.test(state.question))
      reply +=
        "\n\nI haven’t checked walking distances" +
        (state.constraints.indoorArea === "Wakefield city centre"
          ? " from Wakefield One or Merchant Gate."
          : ".");
    question = state.area
      ? "What time are you thinking of going?"
      : "Which part of the district would suit you?";
  } else if (mode === "outing-requirements") {
    reply =
      "I still have " +
      (ctx.anchor?.card?.title || "your outing") +
      " and your " +
      state.restrictions.join(", ") +
      " requirement. I haven’t verified a food or drink stop that meets it yet.";
    question =
      "Would you like me to look for an official menu or contact page?";
  } else if (mode === "outing-unavailable") {
    reply =
      "I still have " +
      (records[0]?.title || state.selectedName || "the event") +
      " as your outing, but I couldn’t refresh its dates and hours. I can’t confirm a drink stop for that time yet.";
    question = "Would you like me to try refreshing the event again?";
  } else if (mode === "outing-food") {
    const anchor = ctx.anchor,
      plan = ctx.plan || { needs: ["coffee"], timing: "during" },
      title = anchor?.card?.title || "the outing";
    const moment = ctx.window?.exactTime
      ? "At " + clockLabel(ctx.window.windowStart)
      : plan.exactTime
        ? "At " + clockLabel(ctx.window?.windowStart)
        : plan.timing === "before"
          ? "Before " + title
          : plan.timing === "after"
            ? "After " + title
            : anchor?.anchorKind === "station"
              ? "Near " + anchor.area
              : "While you’re at " + title;
    if (ctx.closed)
      reply = records
        .map(
          (r) =>
            `${r.title} closes at ${clockLabel(minute(r.fields.endMinute ?? r.fields.end))}, so it would be too late${ctx.outing?.requestedTime ? " at " + clockLabel(minute(ctx.outing.requestedTime)) : ""} for that one.`,
        )
        .join(" ");
    else if (records.some((r) => r.fields.disposition !== "closed-note"))
      reply =
        (plan.namedBrand
          ? "Yes. "
          : `${moment}, you could stop for ${plan.needs.includes("dinner") ? "dinner" : plan.needs.includes("snack") ? "something to eat" : "a drink"}${ctx.party?.children ? " with the kids" : ""}.\n\n`) +
        records
          .filter((r) => r.fields.disposition !== "closed-note")
          .map((r) =>
            renderFoodOption(
              { ...r.fields, name: r.title, sourceUrl: r.sourceUrl },
              plan,
            ),
          )
          .join("\n\n") +
        "\n\nThose are branch opening hours. " +
        (plan.needs.some((n: string) => ["dinner", "snack"].includes(n))
          ? "Kitchen or food-counter closing times aren’t confirmed for every option."
          : "Drink-counter service until closing isn’t confirmed.");
    else
      reply = `${moment}, I haven’t verified ${plan.alternatives ? "another suitable" : "a suitable"} food or drink stop in ${anchor?.area || state.area || "the area"}.`;
    const closedNotes = records.filter(
      (r) => r.fields.disposition === "closed-note",
    );
    if (closedNotes.length)
      reply +=
        "\n\n" +
        closedNotes
          .map(
            (r) =>
              r.title +
              " closes at " +
              clockLabel(minute(r.fields.endMinute ?? r.fields.end)) +
              ", so that would be too late for that one.",
          )
          .join(" ");
    if (ctx.chocolateUnknown && records.length)
      reply +=
        "\n\nI’ve confirmed drink service, but not hot chocolate on their current menus.";
    if (/sit(?:ting)? down|seating/i.test(state.question) && records.length)
      reply +=
        " These branches list dine-in service. I haven’t checked whether a table is free.";
    question = "Would you like to adjust the time or look for another option?";
  } else {
    reply =
      state.topic === "events"
        ? "What day and type of event are you interested in?"
        : "What would you like to know about Wakefield?";
  }
  if (mode === "event-list") {
    const sessionNote = reply.includes(
      "Check the event page for individual session dates and times.",
    );
    reply = reply
      .replace(
        /These published runs overlap the period\. Opening days and individual sessions are not confirmed, so check before planning a visit\.\s*/g,
        "",
      )
      .replace(
        / Check the event page for individual session dates and times\./g,
        "",
      );
    if (sessionNote)
      reply +=
        "\n\nCheck the event page for individual session dates and times.";
  }
  if (ctx.unsupported) sources.length = 0;
  reply = clean(reply);
  // Treat links as atomic tokens so URL query strings cannot become
  // questions, then move the one useful follow-up to the end.
  const links: string[] = [];
  let text = reply.replace(/\[[^\]]*\]\([^)]*\)/g, (m) => {
    links.push(m);
    return "\uE000" + (links.length - 1) + "\uE001";
  });
  const existing = [...text.matchAll(/(?:^|(?<=[.!?\n]))\s*([^.!?\n]+\?)/g)];
  if (existing.length) {
    question = existing.at(-1)![1].trim();
    text = text.replace(/(?:^|(?<=[.!?\n]))\s*([^.!?\n]+\?)/g, " ");
  }
  text = text.trim();
  reply = text.replace(/\uE000(\d+)\uE001/g, (_, i) => links[+i]);
  if (question) reply += (reply ? "\n\n" : "") + question;
  const followups = question ? [question] : [];
  return {
    reply,
    sources: [
      ...new Map(sources.filter((s) => s.url).map((s) => [s.url, s])).values(),
    ].slice(0, 8),
    followups,
    live: !["guidance", "ack", "clarify", "clarify-events"].includes(mode),
    verification: retrieval.provenance,
    pipelineVersion: "unified-v1",
  };
}
function dayInRange(s: any) {
  const i = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].indexOf(s.weekday);
  const d = new Date(s.dateRange.start + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + ((i - ((d.getUTCDay() + 6) % 7) + 7) % 7));
  return d.toISOString().slice(0, 10);
}

function hoursLine(r: CanonicalRecord, day: string | null) {
  const label =
    day ||
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Europe/London",
    }).format(new Date());
  const hours = Array.isArray(r.openingHours)
    ? r.openingHours.find((v) =>
        String(v)
          .toLowerCase()
          .startsWith(label.toLowerCase() + ":"),
      )
    : null;
  return hours
    ? " " + hours + "."
    : " I couldn’t confirm its " + label + " hours.";
}
