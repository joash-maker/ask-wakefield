import {load} from 'cheerio';

export const COUNCIL_CHRISTMAS_URL='https://www.wakefield.gov.uk/wakefield-events/christmas-in-the-wakefield-district';
// Reviewed against the Council's dated announcement of 18 November 2026.
// This page omits the year. Keep the reviewed edition explicit, never infer it
// from the collection date or copyright year when the page is reused.
export function councilSeasonalEvents(html,checkedAt=new Date().toISOString()){
 const $=load(String(html||''));
 const heading=$('h2').filter((_,el)=>$(el).text().trim()==='Wakefield Christmas Market').first();
 if(!heading.length)return [];
 const blocks=$('h2,h3,p'),index=blocks.toArray().indexOf(heading[0]),parts=[];
 for(const el of blocks.toArray().slice(index+1)){if(/^h[23]$/.test(el.tagName))break;parts.push($(el).text());}
 const text=parts.join(' ').replace(/\s+/g,' ').trim();
 if(/\b(?:cancelled|canceled|postponed)\b/i.test(text))return [];
 const checked=Date.parse(checkedAt);
 if(!Number.isFinite(checked)||checked<Date.parse('2026-11-18')||checked>=Date.parse('2027-01-01'))return [];
 // Fail closed if the published dates or hours change. Never use the road
 // closure range or another event's opening hours as market sessions.
 if(!/\bWood Street\b/.test(text)||!/\bDates:\s*11\s+to\s+13\s+December\b/i.test(text)
   ||!/\bTimes:\s*Friday and Saturday:\s*10am\s*[-–]\s*6pm,?\s*Sunday:\s*10am\s*[-–]\s*5pm\b/i.test(text))return [];
 const sessionTimes=[{date:'2026-12-11',start:'10:00',end:'18:00'},{date:'2026-12-12',start:'10:00',end:'18:00'},{date:'2026-12-13',start:'10:00',end:'17:00'}];
 return [{title:'Wakefield Christmas Market',venue:'Wood Street, Wakefield city centre',startDate:'2026-12-11',endDate:'2026-12-13',ongoing:false,sessionTimes,occurrenceDates:sessionTimes.map(s=>s.date),sourceUrl:COUNCIL_CHRISTMAS_URL,description:text,dateEvidence:'11 to 13 December 2026; year confirmed by Council announcement dated 18 November 2026',priceStatus:'unknown',availability:'unknown',parser:'council-seasonal-reviewed-2026'}];
}

export async function fetchCouncilSeasonalContext({request=fetch,now=new Date()}={}){
 try{
  const response=await request(COUNCIL_CHRISTMAS_URL,{headers:{'User-Agent':'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'},signal:AbortSignal.timeout(5500)});
  if(!response.ok)return null;
  const eventCards=councilSeasonalEvents(await response.text(),now.toISOString());
  if(!eventCards.length)return null;
  return {eventCards,source:{title:'Wakefield Council Christmas events',url:COUNCIL_CHRISTMAS_URL}};
 }catch{return null;}
}
