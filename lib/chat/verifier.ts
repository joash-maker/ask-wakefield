import type {
  ConversationState,
  Retrieval,
  VerifiedPayload,
  CanonicalRecord,
} from "./types.ts";
import { renderResponse } from "./presenter.ts";
const clock = (v: unknown) =>
  typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
function hasHours(v: unknown): boolean {
  if (typeof v === "string")
    return /\b\d{1,2}(?::\d{2}|\s*[ap]m)\b|closed|24 hours/i.test(v);
  if (Array.isArray(v)) return v.some(hasHours);
  if (v && typeof v === "object") {
    const h = v as any;
    return (
      (clock(h.start) && clock(h.end)) ||
      (Number.isFinite(h.startMinute) &&
        Number.isFinite(h.endMinute) &&
        h.endMinute > h.startMinute)
    );
  }
  return false;
}
const allowedFields = new Set([
  "title",
  "address",
  "venue",
  "start",
  "end",
  "dates",
  "priceStatus",
  "priceRaw",
  "openingHours",
  "services",
  "programme",
  "parking",
]);
export function verifyResponseDraft(
  retrieval: Retrieval,
  draft: unknown,
  state: ConversationState,
): VerifiedPayload {
  const records = new Map(retrieval.records.map((r) => [r.id, r]));
  const permitted = new Set(retrieval.candidateIds);
  const input =
    draft && typeof draft === "object" && Array.isArray((draft as any).items)
      ? (draft as any).items
      : [];
  const checked: CanonicalRecord[] = [],
    unknownFields: string[] = [];
  for (const item of input) {
    if (
      !item ||
      typeof item.recordId !== "string" ||
      !permitted.has(item.recordId)
    )
      continue;
    const record = records.get(item.recordId);
    if (!record || checked.some((r) => r.id === record.id)) continue;
    if (!record.sourceUrl && record.entityType !== "guidance") continue;
    if (record.sourceUrl) {
      try {
        const u = new URL(record.sourceUrl);
        if (u.protocol !== "https:" || u.username || u.password) continue;
      } catch {
        continue;
      }
    }
    // A draft is a selection, never an authority for a field or a URL. All
    // supplied hours, prose, links and extra properties are deliberately ignored.
    for (const field of Array.isArray(item.fields) ? item.fields : []) {
      if (!allowedFields.has(field)) continue;
      if ((record as any)[field] == null)
        unknownFields.push(record.id + ":" + field);
    }
    if (
      !record.openingHours &&
      state.operation === "hours" &&
      record.entityType === "place"
    )
      unknownFields.push(record.id + ":openingHours");
    if (
      record.entityType === "event" &&
      !record.start &&
      state.operation === "hours" &&
      !record.sessionTimes?.length
    )
      unknownFields.push(record.id + ":start");
    const safe = structuredClone(record);
    if (!clock(safe.start)) safe.start = null;
    if (!clock(safe.end)) safe.end = null;
    const validUrl = (value: unknown) => {
      try {
        const u = new URL(String(value));
        return u.protocol === "https:" && !u.username && !u.password;
      } catch {
        return false;
      }
    };
    for (const field of ["factSourceUrl", "menuSourceUrl"])
      if (safe.evidence[field] && !validUrl(safe.evidence[field]))
        delete safe.evidence[field];
    if (Array.isArray(safe.evidence.sourceList))
      safe.evidence.sourceList = safe.evidence.sourceList.filter((s: any) =>
        validUrl(s.url),
      );
    if (safe.fields.sections?.parkingLinks)
      safe.fields.sections.parkingLinks =
        safe.fields.sections.parkingLinks.filter((s: any) => validUrl(s.url));
    if (record.entityType === "place" && !hasHours(record.openingHours)) {
      safe.start = null;
      safe.end = null;
      for (const key of [
        "start",
        "end",
        "startMinute",
        "endMinute",
        "startTime",
        "endTime",
        "hoursByDate",
        "kitchenEndMinute",
        "performanceStart",
      ])
        delete safe.fields[key];
      unknownFields.push(record.id + ":openingHours");
    }
    if (
      record.entityType === "event" &&
      !safe.start &&
      !record.sessionTimes?.length
    ) {
      safe.start = null;
      safe.end = null;
      for (const key of [
        "start",
        "end",
        "startTime",
        "endTime",
        "performanceStart",
      ])
        delete safe.fields[key];
      unknownFields.push(record.id + ":start");
    }
    if (!safe.evidence.menuSourceUrl) {
      delete safe.fields.menuSourceUrl;
      safe.fields.hotChocolateMenu = false;
    }
    checked.push(safe);
  }
  return {
    records: checked,
    retrieval,
    state,
    unknownFields: [...new Set(unknownFields)],
  };
}
export function verifyAndRenderResponse(
  retrieval: Retrieval,
  state: ConversationState,
  draft?: unknown,
) {
  const selected = draft ?? {
    items: retrieval.candidateIds.map((recordId) => ({ recordId })),
  };
  return renderResponse(verifyResponseDraft(retrieval, selected, state));
}
