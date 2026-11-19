import {load} from 'cheerio';
const clock=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export function sessionTimesFromHtml(html){
 const $=load(String(html||'')),sessions=[];
 $('.postContent--sessions .session').each((_,el)=>{
  const text=$(el).children().map((_,child)=>$(child).text()).get().join(' ').replace(/\s+/g,' '),date=text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/),time=text.match(/\b(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/);
  if(!date||!time)return;
  const d=new Date(`${date[1]} ${date[2]} ${date[3]} 12:00:00 GMT`),start=time[1].padStart(5,'0'),end=time[2].padStart(5,'0');
  if(!Number.isNaN(+d)&&clock(start)&&clock(end)&&end>=start)sessions.push({date:d.toISOString().slice(0,10),start,end});
 });
 return cleanSessionTimes(sessions);
}
export function cleanSessionTimes(value){return Array.isArray(value)?value.filter(s=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&!Number.isNaN(Date.parse(s.date))&&new Date(s.date+'T12:00:00Z').toISOString().slice(0,10)===s.date&&clock(s.start)&&clock(s.end)&&s.end>=s.start).slice(0,30).map(({date,start,end})=>({date,start,end})):[];}
export function timesForCard(card){
 const dates=card.dates?.length?card.dates:card.occurrenceDates?.length?card.occurrenceDates:[card.startDate];
 const sessions=cleanSessionTimes(card.sessionTimes).filter(s=>dates.includes(s.date));
 if(sessions.length){const pairs=new Set(sessions.map(s=>s.start+'–'+s.end));if(pairs.size===1&&dates.every(date=>sessions.some(s=>s.date===date)))return {start:sessions[0].start,end:sessions[0].end};return {start:null,end:null};}
 if(cleanSessionTimes(card.sessionTimes).length)return {start:null,end:null};
 const start=card.startTime||card.start,end=card.endTime||card.end;
 return clock(start)&&(!end||clock(end)&&end>=start)?{start,end:end||null}:{start:null,end:null};
}
