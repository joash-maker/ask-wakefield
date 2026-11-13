import { load } from 'cheerio';
import { londonCalendar } from './event-request-policy.js';
// Reviewed from the business-account screenshot supplied on 13 November 2026.
// The caption says 'this week'; the poster says Fri 13th & Sat 14th Nov, 8am–8pm.
// This is a dated announcement, not an automated Instagram ingestion claim.
const HAUS = {name:'HAUS',dates:['2026-11-13','2026-11-14'],start:'08:00',end:'20:00',reviewedOn:'2026-11-13',sourceKind:'reviewed-business-announcement',sourceUrl:'https://www.instagram.com/hauswakefield/',evidenceFile:'AAC1536E-257B-4144-9975-8B3CF35D3A8A.jpeg'};
const artUrl='https://the-arthouse.org.uk/events/light-up-at-the-art-house/';
const minute=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]*60+ +m[2]:null;};
export function eventCoffeeContext(messages,state,now=new Date()) {
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 if(!/\b(?:coffee|caf[eé]s?|hot drinks?)\b/i.test(q)||!/\b(?:at that time|then|during (?:it|the event|the festival)|in the area|near(?:by| there)|around there)\b/i.test(q))return null;
 // Explicit new dates, areas and 'now' override the selected event.
 if(/\b(?:now|tomorrow|next|pontefract|castleford|ossett|horbury|normanton)\b/i.test(q)||/\b20\d{2}\b|\bafter (?:it|the event|the festival)\b/i.test(q))return null;
 const newArea=q.match(/\b(?:in|near|around)\s+([a-z]+)\b/i)?.[1];
 if(newArea&&!['the','there','here','wakefield'].includes(newArea.toLowerCase()))return null;
 const id=state?.constraints?.eventFocus?.id || (state?.viewIds?.length===1?state.viewIds[0]:null);
 const card=state?.resultCards?.find(c=>c.id===id&&c.entityType==='event');
 if(!card||!card.venue||minute(card.start)==null||minute(card.end)==null)return null;
 const today=londonCalendar(now).today;
 let dates=[...new Set(card.dates?.length?card.dates:card.occurrenceDates?.length?card.occurrenceDates:card.startDate?[card.startDate]:[])].filter(d=>d>=today);
 const weekday=q.match(/\b(friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b/i)?.[1];
 if(weekday) dates=dates.filter(d=>new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'Europe/London'}).format(new Date(d+'T12:00:00Z')).toLowerCase()===weekday.toLowerCase());
 if(!dates.length)return null;
 const explicit=q.match(/\b(?:at|after)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
 let start=card.start;
 if(explicit){let h=+explicit[1];if(explicit[3])h=h%12+(/pm/i.test(explicit[3])?12:0);else if(h<12&&minute(card.start)>=720)h+=12;if(h>23||+(explicit[2]||'00')>59)return null;start=String(h).padStart(2,'0')+':'+(explicit[2]||'00');}
 return {card,dates,start,end:card.end,area:card.venue,original:q};
}
export async function eventCoffeeOptions(context,now=new Date()) {
 const {card,dates,start,end}=context;
 if(!/^Light Up Wakefield$/i.test(card.title)||!/Wakefield City Centre/i.test(card.venue)||!dates.length||!dates.every(d=>HAUS.dates.includes(d))||minute(start)>=minute(end))return null;
 const picks=[];
 // A partial evening match must state its closing time; never imply until 21:00.
 if(londonCalendar(now).today>=HAUS.reviewedOn&&londonCalendar(now).today<=HAUS.dates.at(-1)&&minute(start)<minute(HAUS.end)&&minute(end)>minute(HAUS.start))picks.push({...HAUS,note:'is opening until 8pm on 13 and 14 November, according to its Light Up announcement shared with us. A handy stop for a drink before the lights finish at 9pm.'});
 try {
  const r=await fetch(artUrl,{signal:AbortSignal.timeout(5500)});
  if(r.ok){const $=load(await r.text());$('nav,header,footer,script,style,[class*="related"]').remove();$('p,div,h1,h2,h3,li').append(' ');const text=$('body').text().replace(/\s+/g,' ');
   if(/^Light Up at The Art House$/i.test($('h1').first().text().trim())&&/13 November 2026\s*[-–]\s*14 November 2026/i.test(text)&&/Coffee House will be serving[^.]{0,200}throughout the event/i.test(text)){
    const sessions=dates.map(date=>{const label=date.endsWith('-13')?'Friday 13 November':'Saturday 14 November';const at=text.indexOf(label,text.indexOf('Opening Times'));const m=at>=0?text.slice(at,at+90).match(/\((\d{1,2}(?:[.:]\d{2})?)\s*[-–]\s*(\d{1,2}(?:[.:]\d{2})?)\)/):null;return m?{start:m[1].replace('.',':'),end:m[2].replace('.',':')}:null;});
    if(sessions.every(s=>s&&minute(s.end)>minute(start)&&minute(s.start)<minute(end)))picks.push({name:'The Art House Coffee House',sourceUrl:artUrl,note:'is an option for warming up. Its event page says it is serving winter drinks and festive treats throughout Light Up, with the venue open until 9pm on both evenings.'});
   }
  }
 } catch {}
 if(!picks.length)return null;
 return {picks,reply:`Yes, ${picks.length>1?'there are a couple of options':'there’s an option'} for a coffee break in the city centre while you’re enjoying Light Up.\n\n${picks.map(p=>`[${p.name}](${p.sourceUrl}) ${p.note}`).join('\n\n')}`,sources:picks.map(p=>({title:p.name+(p.sourceKind?' - reviewed business announcement':' - venue event page'),url:p.sourceUrl}))};
}
