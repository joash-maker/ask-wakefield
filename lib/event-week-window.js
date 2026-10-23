// Calendar arithmetic uses London civil dates, never fixed 24h jumps across DST.
const iso = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const add = (value, days) => { const d = new Date(`${value}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); };
const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
export const dateLabel = value => new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(`${value}T12:00:00Z`)).replace(',', '');
export function eventWeekWindow(text, now = new Date()) {
  const q = String(text).toLowerCase();
  const today = iso(now);
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = add(today, -((day + 6) % 7));
  // Keep weekend requests on their existing dedicated path.
  if (/\bweekend\b/.test(q)) return null;
  if (/\bnext week\b/.test(q)) return {kind:'next-week',start:add(monday,7),end:add(monday,13),from:add(monday,7),today};
  if (/\b(?:next|coming) (?:7|seven) days\b/.test(q)) return {kind:'seven-days',start:today,end:add(today,6),from:today,today};
  if (/\bthis week\b/.test(q)) return {kind:'this-week',start:monday,end:add(monday,6),from:today,today};
  return null;
}
export function selectWeekCards(cards, window) {
  return cards.filter(card => {
    const end = card.endDate || card.startDate;
    return card.title && card.venue && /^https:\/\//.test(card.sourceUrl || card.url || '')
      && valid(card.startDate) && valid(end) && end >= card.startDate
      && card.startDate <= window.end && end >= window.from;
  }).sort((a,b)=>a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title)).slice(0,10);
}
export function formatWeekCards(cards, window) {
  const period = `${dateLabel(window.start)} to ${dateLabel(window.end)}`;
  const intro = window.kind === 'this-week' ? `This week means ${period}. Showing listings from ${dateLabel(window.from)} onwards.`
    : window.kind === 'next-week' ? `Next week means ${period}.` : `The next seven days means ${period}, including today.`;
  if (!cards.length) return `${intro}\n\nI couldn't verify any matching dated event listings from the current sources I checked. This does not mean there are no events.`;
  const lines = cards.map(card => {
    const end = card.endDate || card.startDate;
    const run = end !== card.startDate;
    const date = run ? `Published run: ${dateLabel(card.startDate)} to ${dateLabel(end)}. Check the event page for individual session dates and times.` : dateLabel(card.startDate);
    // Times and prices are optional fields, never interpolated as empty placeholders.
    const start = card.startTime || card.start;
    const finish = card.endTime || card.end;
    const clock = value => typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
    const time = !run && clock(start) ? (clock(finish) ? `${start}–${finish}` : `Starts ${start}`) : '';
    const meta = [card.venue,date,time].filter(Boolean).join(' · ');
    return `${card.title}\n${meta}\n[Event details](${card.sourceUrl || card.url})`;
  });
  return `${intro}\n\n${lines.join('\n\n')}\n\nThese are the verified listings I found, rather than a complete district calendar. Check event pages for booking and current prices.`;
}
export function cleanMissingEventFields(reply) {
  return String(reply || '')
    .replace(/\(\s*[,;]?\s*\)/g,'')
    .replace(/\bfrom\s*(?=[—–.,;\n]|$)/gi,'')
    .replace(/,\s*\)/g,')')
    .replace(/\s+([,.!?])/g,'$1')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/,\s*([—–])/g,' $1')
    .replace(/\n{3,}/g,'\n\n').trim();
}
