import type { CanonicalRecord } from "./types.ts";
import { resolvePlace } from "./entityIdentity.ts";
import { musicEventCard } from "../event-week-window.js";
import { cleanSessionTimes } from "../event-session-times.js";
import { sourceKey } from "../outing-food.js";
export const slug = (s: any) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const normal = (s: any) => slug(s).replace(/-/g, " ");
const postcode = (s: any) =>
  String(s || "")
    .toUpperCase()
    .match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/)?.[0]
    ?.replace(/\s/g, "") || null;
const venueName = (v: any) =>
  /^(?:nostell(?: national trust)?|national trust nostell)$/.test(normal(v))
    ? "Nostell"
    : /^(?:wx|wx wakefield exchange|wakefield exchange)$/.test(normal(v))
      ? "WX Wakefield Exchange"
      : v;
export const url = (v: any) => {
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return sourceKey(u.href);
  } catch {
    return null;
  }
};
export function canonicalise(
  raw: any,
  kind: "event" | "place" = "event",
): CanonicalRecord {
  const local = kind === "place" ? resolvePlace(raw) : null,
    title = raw.title || raw.name || raw.displayName?.text || "",
    venue = venueName(raw.venue),
    code =
      postcode(raw.postcode || raw.address || raw.formattedAddress) ||
      local?.postcode?.replace(/\s/g, "") ||
      null;
  const providerUrl = url(
    raw.evidence?.factSourceUrl ||
      raw.sourceUrl ||
      raw.url ||
      raw.googleMapsUri ||
      local?.source,
  );
  const sourceUrl = url(
    local?.source ||
      raw.sourceUrl ||
      raw.url ||
      raw.googleMapsUri ||
      raw.googleMapsUri ||
      local?.source,
  );
  const id =
    kind === "place"
      ? `place:${slug(local?.name || title)}:${code || slug(raw.address || raw.formattedAddress) || slug(raw.id)}`
      : `event:${slug(title)}:${slug(venue)}:${raw.startDate || "ongoing"}:${raw.endDate || raw.startDate || ""}`;
  const start = Object.hasOwn(raw, "start") ? raw.start : raw.startTime || null,
    end = Object.hasOwn(raw, "end") ? raw.end : raw.endTime || null;
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  if (musicEventCard(raw) && !categories.includes("music"))
    categories.push("music");
  return {
    ...raw,
    name: title,
    url: sourceUrl,
    id,
    providerIds: [
      ...new Set(
        [...(raw.providerIds || []), raw.id, raw.sourceId, local?.id].filter(
          Boolean,
        ),
      ),
    ],
    entityType: kind,
    title,
    sourceUrl,
    sourceTitle: raw.sourceTitle,
    address: raw.address || raw.formattedAddress || null,
    postcode: code,
    venue,
    categories,
    startDate: raw.startDate || null,
    endDate: raw.endDate || raw.startDate || null,
    occurrenceDates: raw.occurrenceDates || [],
    dates: raw.dates || [],
    sessionTimes: cleanSessionTimes(raw.sessionTimes),
    start,
    end,
    openingHours: Object.hasOwn(raw, "openingHours")
      ? raw.openingHours
      : raw.weekdayDescriptions ||
        raw.hoursByDate ||
        (start && end ? { start, end } : null),
    priceStatus: raw.priceStatus || "unknown",
    priceRaw: raw.priceRaw || null,
    familyVerified: raw.familyVerified === true,
    services: raw.services || [],
    checkedAt: raw.checkedAt || new Date().toISOString(),
    evidence: {
      sourceUrl,
      ...(providerUrl && providerUrl !== sourceUrl
        ? { factSourceUrl: providerUrl }
        : {}),
      checkedAt: raw.checkedAt || new Date().toISOString(),
      ...(raw.hotChocolateSource || raw.menuSourceUrl
        ? { menuSourceUrl: raw.hotChocolateSource || raw.menuSourceUrl }
        : {}),
    },
    fields: {
      ...raw,
      id,
      sourceUrl,
      url: sourceUrl,
      venue,
      start,
      end,
      startTime: start,
      endTime: end,
      entityType: kind,
      categories,
    },
  };
}

// A provider variant must never silently win because it arrived last. Prefer
// an organiser over an aggregator and suppress conflicting facts.
export function mergeCanonicalRecords(
  records: CanonicalRecord[],
): CanonicalRecord[] {
  const groups = new Map<string, CanonicalRecord[]>();
  for (const record of records) {
    const variants = groups.get(record.id) || [];
    variants.push(record);
    groups.set(record.id, variants);
  }
  return [...groups.values()].map((variants) => {
    const ranked = [...variants].sort(
      (a, b) =>
        Number(a.fields.sourceId === "experience") -
          Number(b.fields.sourceId === "experience") ||
        String(b.checkedAt || "").localeCompare(String(a.checkedAt || "")),
    );
    const primary = structuredClone(ranked[0]);
    primary.providerIds = [...new Set(variants.flatMap((r) => r.providerIds))];
    const conflicts: string[] = [];
    const differs = (field: "start" | "end" | "priceStatus") =>
      new Set(variants.map((r) => r[field]).filter((v) => v && v !== "unknown"))
        .size > 1;
    const datedTimes = new Map<string, Set<string>>();
    for (const r of variants)
      for (const t of r.sessionTimes || []) {
        const values = datedTimes.get(t.date) || new Set<string>();
        values.add(t.start + "-" + t.end);
        datedTimes.set(t.date, values);
      }
    const badDates = [...datedTimes]
      .filter(([, times]) => times.size > 1)
      .map(([d]) => d);
    if (differs("start") || differs("end") || badDates.length) {
      conflicts.push("time");
      primary.start = null;
      primary.end = null;
      primary.openingHours = null;
      primary.sessionTimes = badDates.length
        ? (primary.sessionTimes || []).filter((t) => !badDates.includes(t.date))
        : [];
      for (const field of [
        "start",
        "end",
        "startTime",
        "endTime",
        "performanceStart",
      ])
        primary.fields[field] = null;
      primary.fields.sessionTimes = primary.sessionTimes;
    }
    if (differs("priceStatus")) {
      conflicts.push("price");
      primary.priceStatus = "unknown";
      primary.priceRaw = null;
      primary.fields.priceStatus = "unknown";
      primary.fields.priceRaw = null;
    }
    primary.evidence = {
      ...primary.evidence,
      conflicts,
      variantSourceUrls: [
        ...new Set(variants.map((r) => r.sourceUrl).filter(Boolean)),
      ],
    };
    return primary;
  });
}
