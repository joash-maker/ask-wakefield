export type Topic =
  "events" | "food" | "guide" | "activities" | "services" | "general";
export type Operation =
  | "discover"
  | "filter"
  | "detail"
  | "hours"
  | "parking"
  | "more"
  | "ack"
  | "clarify";
export interface DateRange {
  start: string;
  end: string;
  from: string;
  today: string;
  kind: string;
}
export interface PlaceTimeConstraint {
  mode: string;
  hour?: number;
  minute?: number;
  day?: number;
  approximate?: boolean;
}
export interface TimeWindow {
  startHour: number;
  endHour: number;
  label: string;
}
export interface TurnDelta {
  question: string;
  topic?: Topic;
  operation: Operation;
  area?: string | null;
  dateRange?: DateRange | null;
  weekday?: string | null;
  placeTime?: PlaceTimeConstraint | null;
  timeWindow?: TimeWindow | null;
  includeCategories?: string[];
  excludeCategories?: string[];
  restrictions?: string[];
  needs?: string[];
  excludeNeeds?: string[];
  freeOnly?: boolean;
  paidOnly?: boolean;
  family?: boolean;
  ages?: number[];
  selectedId?: string;
  selectedName?: string;
  resetFilters?: boolean;
  newTopic?: boolean;
  reference?: boolean;
  party?: unknown;
  planner?: unknown;
  requirements?: Record<string, unknown>;
}
export interface ConversationState {
  version: 4;
  topic: Topic;
  operation: Operation;
  area: string | null;
  dateRange: DateRange | null;
  placeTime: PlaceTimeConstraint | null;
  timeWindow: TimeWindow | null;
  weekday: string | null;
  includeCategories: string[];
  excludeCategories: string[];
  restrictions: string[];
  needs: string[];
  excludeNeeds: string[];
  freeOnly: boolean;
  paidOnly: boolean;
  family: boolean;
  ages: number[];
  selectedId: string | null;
  selectedName: string | null;
  lastIntent: string;
  constraints: Record<string, any>;
  resultCards: any[];
  viewIds: string[];
  lastFilter?: string | null;
  question: string;
  previousQuestion?: string;
}
export interface CanonicalRecord {
  id: string;
  providerIds: string[];
  entityType: "event" | "place" | "guidance";
  title: string;
  sourceUrl: string | null;
  sourceTitle?: string;
  address?: string | null;
  postcode?: string | null;
  venue?: string | null;
  categories: string[];
  startDate?: string | null;
  endDate?: string | null;
  occurrenceDates?: string[];
  dates?: string[];
  sessionTimes?: any[];
  start?: string | null;
  end?: string | null;
  openingHours?: unknown;
  priceStatus?: string;
  priceRaw?: string | null;
  familyVerified?: boolean;
  services?: string[];
  checkedAt?: string | null;
  evidence: Record<string, unknown>;
  fields: Record<string, any>;
}
export interface Retrieval {
  records: CanonicalRecord[];
  candidateIds: string[];
  mode: string;
  provenance: string;
  guidanceId?: string;
  warnings: string[];
  context?: Record<string, any>;
}
export interface ResponseDraft {
  items: { recordId: string; fields?: string[] }[];
  messageCode?: string;
}
export interface VerifiedPayload {
  records: CanonicalRecord[];
  retrieval: Retrieval;
  state: ConversationState;
  unknownFields: string[];
}
