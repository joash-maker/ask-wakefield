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
  const validCards = cards.filter(card => {
    const end = card.endDate || card.startDate;
    const ongoing = card.ongoing === true;
    const sourced = card.title && card.venue && /^https:\/\//.test(card.sourceUrl || card.url || '');
    if (!sourced || !valid(end) || end < window.from) return false;
    // Ongoing listings have an unknown start. Include them while the published end is still ahead.
    if (ongoing) return true;
    return valid(card.startDate) && end >= card.startDate && card.startDate <= window.end;
  }).sort((a,b)=>(a.startDate || a.endDate || '').localeCompare(b.startDate || b.endDate || '') || a.title.localeCompare(b.title));
  const scheduled = validCards.filter(card => !card.ongoing && card.startDate === (card.endDate || card.startDate));
  const runs = validCards.filter(card => card.ongoing || card.startDate !== (card.endDate || card.startDate));
  // A long run must not crowd every dated weekday event out of a ten-card list.
  // Reserve a small mix of ongoing venues, then round-robin the scheduled dates.
  const selectedRuns = [];
  for (const card of runs) {
    if (!selectedRuns.some(other => other.venue === card.venue)) selectedRuns.push(card);
    if (selectedRuns.length === 2) break;
  }
  const groups = [...new Set(scheduled.map(card => card.startDate))].sort().map(date => scheduled.filter(card => card.startDate === date).sort((a,b)=>Number(a.availability === 'sold-out')-Number(b.availability === 'sold-out') || (a.startTime || a.start || '99:99').localeCompare(b.startTime || b.start || '99:99') || a.title.localeCompare(b.title)));
  const selected = [];
  for (let round = 0; selected.length < 10 - selectedRuns.length; round++) {
    let added = false;
    for (const group of groups) {
      if (group[round] && selected.length < 10 - selectedRuns.length) { selected.push(group[round]); added = true; }
    }
    if (!added) break;
  }
  selected.push(...selectedRuns);
  for (const card of runs) {
    if (selected.length === 10) break;
    if (!selected.includes(card)) selected.push(card);
  }
  return selected.sort((a,b)=>{
    const ar=a.startDate !== (a.endDate || a.startDate),br=b.startDate !== (b.endDate || b.startDate);
    return Number(ar)-Number(br)||(a.startDate || a.endDate || '').localeCompare(b.startDate || b.endDate || '')||a.title.localeCompare(b.title);
  });
}
export function formatWeekCards(cards, window, options = {}) {
  const period = `${dateLabel(window.start)} to ${dateLabel(window.end)}`;
  const intro = window.kind === 'this-week' ? `This week means ${period}. Showing listings from ${dateLabel(window.from)} onwards.`
    : window.kind === 'next-week' ? `Next week means ${period}.` : `The next seven days means ${period}, including today.`;
  if (!cards.length) return `${intro}\n\nI couldn't verify any matching dated event listings from the current sources I checked. This does not mean there are no events.`;
  const lines = cards.map(card => {
    const end = card.endDate || card.startDate;
    const ongoing = card.ongoing === true;
    const run = !ongoing && end !== card.startDate;
    const date = ongoing
      ? `Ongoing until ${dateLabel(end)}. Check the event page for individual session dates and times.`
      : run ? `Published run: ${dateLabel(card.startDate)} to ${dateLabel(end)}. Check the event page for individual session dates and times.` : dateLabel(card.startDate);
    // Times and prices are optional fields, never interpolated as empty placeholders.
    const start = card.startTime || card.start;
    const finish = card.endTime || card.end;
    const clock = value => typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
    const time = !run && clock(start) ? (clock(finish) ? `${start}–${finish}` : `Starts ${start}`) : '';
    const price = options.showPrice && options.priceLabel ? options.priceLabel(card) : '';
    const availability = card.availability === 'sold-out' ? 'Listed as sold out. Check the event page for any returns or drop-in arrangements.' : '';
    const meta = [card.venue,date,time,price,availability].filter(Boolean).join(' · ');
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

// Only short refinements or explicit references stay attached to a stored list.
// New topics and new date windows must be handled as fresh requests.
export function weeklyFollowUp(text) {
  const q=String(text || '').toLowerCase().trim();
  if (eventWeekWindow(q) || /\b(?:weekend|today|tomorrow|tonight|next|coffee|food|lunch|dinner|parking|transport|bus|train|pharmacy)\b/.test(q)) return null;
  if(q.split(/\s+/).length>12 && !/\b(those|them|these|that list)\b/.test(q)) return null;
  const reset=/\b(full list|whole list|show all|all again|start again|reset)\b/.test(q);
  const day=q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)?.[1] || null;
  const price=/\bfree\b/.test(q)?'free':/\b(paid|ticketed)\b/.test(q)?'paid':null;
  const showPrice=/\b(how much|prices?|costs?)\b/.test(q);
  const showTime=/\b(what time|times?|when do|when does|start)\b/.test(q);
  const referenced=/\b(those|them|these|ones|that list|the list|they)\b/.test(q);
  if(!reset&&!day&&!price&&!showPrice&&!showTime&&!referenced)return null;
  return {reset,day,price,showPrice,showTime,unsupported:/\b(kids?|children|famil|wheelchair|accessible|dogs?|indoors?|outdoors?|cheap|budget)\w*\b/.test(q)||(!reset&&!day&&!price&&!showPrice&&!showTime)};
}
export function weekdayInWindow(day,window) {
  const index=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(day);
  if(index<0)return null;
  // Seven-day rolling windows may start on any weekday.
  const startDay=(new Date(`${window.start}T12:00:00Z`).getUTCDay()+6)%7;
  const value=add(window.start,(index-startDay+7)%7);
  return value<=window.end?value:null;
}
