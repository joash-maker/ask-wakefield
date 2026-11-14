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
// Exact title + date range + event slug across the district and venue source
// identifies one event even when one listing omits its clock. Distinct times
// or different slugs stay separate; a child session is never its parent event.
export function reconcileWeekCards(cards) {
  const normal = value => String(value || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const identity = card => {
    try {
      const u = new URL(card.sourceUrl || card.url);
      const host = u.hostname.replace(/^www\./, '');
      const slug = host === 'experiencewakefield.co.uk' ? u.pathname.match(/^\/event\/([^/]+)/)?.[1]
        : host === 'wxwakefield.co.uk' ? u.searchParams.get('event') : null;
      return { host, slug:slug?.toLowerCase() || null, url:u.origin + u.pathname + u.search };
    } catch { return {}; }
  };
  const result = [];
  for (const card of cards) {
    const id = identity(card);
    const previous = result.find(other => {
      const prior = identity(other);
      const sameSource = id.url && prior.url === id.url;
      const crossSource = id.slug && id.slug === prior.slug && prior.host !== id.host
        && ['experiencewakefield.co.uk','wxwakefield.co.uk'].includes(id.host)
        && ['experiencewakefield.co.uk','wxwakefield.co.uk'].includes(prior.host);
      const a=card.startTime || card.start, b=other.startTime || other.start;
      return (sameSource || crossSource) && normal(card.title) === normal(other.title)
        && (card.startDate === other.startDate || card.endDate === other.endDate && (!card.startDate || !other.startDate)) && card.endDate === other.endDate
        && !(a && b && a !== b);
    });
    if (!previous) { result.push({...card}); continue; }
    const primary = id.host === 'experiencewakefield.co.uk' ? card : previous;
    const fallback = primary === card ? previous : card;
    Object.assign(previous, {...fallback,...primary,
      startDate:primary.startDate || fallback.startDate,
      ongoing:!(primary.startDate || fallback.startDate) && (primary.ongoing || fallback.ongoing),
      availability:card.availability === 'sold-out' || previous.availability === 'sold-out' ? 'sold-out' : primary.availability,
      start:primary.start || primary.startTime || fallback.start || fallback.startTime || null,
      startTime:primary.startTime || primary.start || fallback.startTime || fallback.start || null,
      end:primary.end || primary.endTime || fallback.end || fallback.endTime || null,
      endTime:primary.endTime || primary.end || fallback.endTime || fallback.end || null});
  }
  return result;
}

export function selectWeekCards(cards, window) {
  const validCards = reconcileWeekCards(cards).filter(card => {
    const end = card.endDate || card.startDate;
    const ongoing = card.ongoing === true;
    const sourced = card.title && card.venue && /^https:\/\//.test(card.sourceUrl || card.url || '');
    if (!sourced || !valid(end) || end < window.from || card.availability === 'sold-out' || ['cancelled','postponed'].includes(card.status)) return false;
    // Ongoing listings have an unknown start. Include them while the published end is still ahead.
    if (ongoing) return true;
    return valid(card.startDate) && end >= card.startDate && card.startDate <= window.end;
  }).sort((a,b)=>(a.startDate || a.endDate || '').localeCompare(b.startDate || b.endDate || '') || a.title.localeCompare(b.title));
  const scheduled = validCards.filter(card => !card.ongoing && card.startDate === (card.endDate || card.startDate));
  const runs = validCards.filter(card => card.ongoing || card.startDate !== (card.endDate || card.startDate)).sort((a,b)=>{
    const finite=card=>!card.ongoing&&card.startDate>=window.start&&card.endDate<=window.end;
    return Number(finite(b))-Number(finite(a))||(a.endDate||'').localeCompare(b.endDate||'');
  });
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
  const intro = window.kind === 'this-week' ? `This week runs from ${period}. Here’s what’s coming up from ${dateLabel(window.from)}.`
    : window.kind === 'next-week' ? `Next week means ${period}.` : `The next seven days means ${period}, including today.`;
  if (!cards.length) return `${intro}\n\nI couldn't verify any matching dated event listings from the current sources I checked. This does not mean there are no events.`;
  const display = [...cards].sort((a,b) => {
    const first = card => (card.occurrenceDates || []).find(day => day >= window.from && day <= window.end) || card.startDate || card.endDate;
    return Number(a.ongoing === true) - Number(b.ongoing === true) || String(first(a)).localeCompare(String(first(b))) || (a.startTime || a.start || '99:99').localeCompare(b.startTime || b.start || '99:99');
  });
  const evening = display.find(card => !card.ongoing && (card.startDate === card.endDate || card.occurrenceDates?.length) && /^(?:1[7-9]|2[0-3]):/.test(card.startTime || card.start || ''));
  const recommendation = evening ? `If you fancy an evening out, I’d start with ${evening.title}. Here’s what else is coming up.` : '';
  const lines = display.map(card => {
    const end = card.endDate || card.startDate;
    const ongoing = card.ongoing === true;
    const run = !ongoing && end !== card.startDate;
    const sessions = [...new Set(card.occurrenceDates || [])].filter(day => valid(day) && day >= window.from && day <= window.end && (!card.dates?.length || card.dates.includes(day)));
    const date = ongoing
      ? `Ongoing until ${dateLabel(end)}. Check the event page for individual session dates and times.`
      : run && sessions.length ? sessions.map(dateLabel).join(' and ') : run ? `Published run: ${dateLabel(card.startDate)} to ${dateLabel(end)}. Check the event page for individual session dates and times.` : dateLabel(card.startDate);
    // Times and prices are optional fields, never interpolated as empty placeholders.
    const start = card.startTime || card.start;
    const finish = card.endTime || card.end;
    const clock = value => typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value);
    const time = !ongoing && (!run || sessions.length) && clock(start) ? (clock(finish) ? `${start}–${finish}` : `Starts ${start}`) : '';
    const price = options.showPrice && options.priceLabel ? options.priceLabel(card) : '';
    const availability = card.availability === 'sold-out' ? 'Listed as sold out. Check the event page for any returns or drop-in arrangements.' : '';
    const meta = [card.venue,date,time,price,availability].filter(Boolean).join(' · ');
    return `${card.title}\n${meta}\n[Event details](${card.sourceUrl || card.url})`;
  });
  const dated = lines.filter((_, index) => !display[index].ongoing);
  const ongoing = lines.filter((_, index) => display[index].ongoing);
  const sections = [dated.length ? dated.join('\n\n') : '', ongoing.length ? 'Longer-running listings\n\n' + ongoing.join('\n\n') : ''].filter(Boolean);
  return `${intro}${recommendation ? '\n\n' + recommendation : ''}\n\n${sections.join('\n\n')}\n\nThese are the listings I could verify, so there may be others.`;
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
export function wakefieldCityScope(text) {
  return /\b(?:wakefield city|city centre|city center|city itself)\b/i.test(text) && !/\b(?:castleford|pontefract|ossett|horbury|normanton|leeds)\b/i.test(text) ? 'Wakefield city' : null;
}
export function weeklyFollowUp(text) {
  const q=String(text || '').toLowerCase().trim();
  if (eventWeekWindow(q) || /\b(?:weekend|today|tomorrow|tonight|next|coffee|food|lunch|dinner|parking|transport|bus|train|pharmacy)\b/.test(q)) return null;
  const area=wakefieldCityScope(q);
  if(q.split(/\s+/).length>12 && !/\b(those|them|these|that list)\b/.test(q)) return null;
  const family=/\b(kids?|children|families|family)\b/.test(q);
  const reset=/\b(full list|whole list|show all|all again|start again|reset)\b/.test(q);
  const day=q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)?.[1] || null;
  const price=/\bfree\b/.test(q)?'free':/\b(paid|ticketed)\b/.test(q)?'paid':null;
  const showPrice=/\b(how much|prices?|costs?)\b/.test(q);
  const showTime=/\b(what time|times?|when do|when does|start)\b/.test(q);
  const referenced=/\b(those|them|these|ones|that list|the list|they)\b/.test(q);
  if(!reset&&!day&&!price&&!showPrice&&!showTime&&!referenced&&!family&&!area)return null;
  return {reset,day,price,showPrice,showTime,family,...(area?{area}:{}),unsupported:/\b(toddlers?|teens?|wheelchair|accessible|dogs?|indoors?|outdoors?|cheap|budget)\w*\b/.test(q)||(!reset&&!day&&!price&&!showPrice&&!showTime&&!family&&!area)};
}

// A district listing is not evidence of a city location. Use named city
// venues only, and leave unfamiliar venues out rather than guessing.
export function eventInWakefieldCity(card) {
  const venue=String(card.venue || '');
  if (/\b(?:castleford|pontefract|ossett|horbury|normanton|nostell|sculpture park|coal mining|knottingley|glasshoughton)\b/i.test(venue)) return false;
  return /\b(?:wakefield city centre|wakefield exchange|wx wakefield|wakefield cathedral|wakefield museum|wakefield library|wakefield town hall|the art house|hepworth wakefield|theatre royal wakefield|trinity walk|the ridings|thornes park|clarence park)\b/i.test(venue);
}
export function weekdayInWindow(day,window) {
  const index=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(day);
  if(index<0)return null;
  // Seven-day rolling windows may start on any weekday.
  const startDay=(new Date(`${window.start}T12:00:00Z`).getUTCDay()+6)%7;
  const value=add(window.start,(index-startDay+7)%7);
  return value<=window.end?value:null;
}
