// Shared by conversation scoping and live-event routing. Ordinary leisure
// wording should not bypass the structured event/date/price path.
export function isLeisureDiscovery(text) {
  return /\bwhat\s+(?:(?:free|family|fun|other|different)\s+)*(?:things?|activities)\s+can\s+(?:we|i|you)\s+do\b|\b(?:free|fun)\s+things?\s+to\s+do\b|\bwhat\s+can\s+(?:we|i)\s+do\b|\b(?:free|family|fun)\s+(?:family\s+)?activities\b/i.test(String(text || ''));
}

// Conditional admission must never become a generally-free recommendation,
// even when an offer contains £0 or a header also carries a Free badge.
export function conditionalAdmission(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  const match = value.match(/\bfree\s+(?:(?:entry|admission|tickets?|access)\s+)?(?:only\s+)?(?:for|to|with)\s+(?:(?:all|any|the|a|an)\s+)?(?:[^.!?]{0,65}\b(?:residents?|members?|under[ -]?\d+s?|under[ -]?eighteens?|children|concessions?|passholders?|ticket holders?|paying adults?|paid (?:admission|tickets?)|valid (?:pass|ticket))\b)[^.!?]{0,100}|\b(?:standard|normal|general|paid)\s+admission\s+(?:applies|required|charges? apply)|\b(?:included|free)\s+with\s+(?:(?:a|an)\s+)?(?:paid\s+)?(?:exhibition|admission|entry)\s+ticket\b[^.!?]{0,100}/i);
  return match ? match[0].trim().slice(0, 180) : null;
}

// Advance London civil dates at UTC noon, rather than adding fixed 24h to
// the actual clock across the spring/autumn daylight-saving transitions.
export function londonCalendar(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const add = days => { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const offset = day === 0 ? -1 : (6 - day);
  return { today, tomorrow: add(1), dayAfterTomorrow: add(2), saturday: add(offset), sunday: add(offset + 1), followingSaturday: add(offset + 7) };
}
