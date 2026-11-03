import {load} from 'cheerio';
import {getSource} from './events/sources.js';
import {createSourceFetcher} from './events/collector.js';
import {parseEventPage} from './events/parser.js';
import {dateLabel,eventWeekWindow} from './event-week-window.js';

export function seasonalEventTheme(text){
 const q=String(text||'');
 if(/\blight[ -]?up[ -]?wakefield\b/i.test(q))return 'light-up';
 if(/\b(?:fireworks?|bonfire(?:[ -]?night)?)\b/i.test(q)&&! /\b(?:buy|purchase|sell|laws?|legal|safety|dogs?|pets?|scared)\b/i.test(q))return 'fireworks';
 return null;
}
const pages={
 fireworks:[{slug:'thornes-park-fireworks',title:'Thornes Park Fireworks',venue:'Thornes Park'}],
 'light-up':[{slug:'light-up-wakefield',title:'Light Up Wakefield',venue:'Wakefield City Centre'},{slug:'light-up-wakefield-parade',title:'Light Up Wakefield Parade',venue:'Wakefield City Centre'}]
};
const normal=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const civil=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
function displayTime(value){const m=String(value||'').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);if(!m)return null;const h=+m[1]%12+(/pm/i.test(m[3])?12:0);return String(h).padStart(2,'0')+':'+(m[2]||'00');}
export function parseSeasonalPage(html,page,source,now=new Date()){
 const $=load(html);$('script:not([type="application/ld+json"]),style,nav,header,footer,[class*="related"],[id*="related"]').remove();
 const title=$('h1').first().text();if(normal(title)!==normal(page.title))return [];
 $('br').replaceWith(' ');$('div,p,li,h1,h2,h3,h4,span,time').append(' ');
 const root=$('h1').first().closest('main,article');const text=(root.length?root:$('body')).text().replace(/\s+/g,' ').trim();
 if(!normal(text).includes(normal(page.venue))||/\b(?:this|the) event (?:is |has been )?(?:cancelled|postponed)\b/i.test(text))return [];
 const url='https://experiencewakefield.co.uk/event/'+page.slug+'/';
 return parseEventPage(html,{...source,venue:page.venue},url,now.toISOString()).filter(card=>normal(card.title)===normal(page.title)&&!card.issues.length&&!['cancelled','postponed'].includes(card.status)).map(card=>{
  const clock=text.slice(0,700).match(/\b(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})\b/);
  const single=card.startDate===card.endDate;
  const low=text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*:?\s*Low[- ]Impact/i)?.[1];
  const main=text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*:?\s*Main Firework/i)?.[1];
  return {...card,entityType:'event',url,lowImpactTime:displayTime(low),mainDisplayTime:displayTime(main),startTime:single?(card.startTime||clock?.[1]||null):null,endTime:single?(card.endTime||clock?.[2]||null):null,noBonfire:/\b(?:will not feature a bonfire|no bonfire)\b/i.test(text)};
 });
}
export async function seasonalEventAnswer(theme,messages,frame,prior,{now=new Date(),read=null}={}){
 const today=civil(now),year=messages.filter(m=>m.role==='user').at(-1)?.content.match(/\b(20\d{2})\b/)?.[1]||today.slice(0,4);
 const source=getSource('experience'),fetchPage=read||createSourceFetcher(source,{timeoutMs:6500});
 const results=await Promise.all(pages[theme].map(async page=>{try{return parseSeasonalPage(await fetchPage('https://experiencewakefield.co.uk/event/'+page.slug+'/'),page,source,now);}catch{return [];}}));
 const query=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const week=eventWeekWindow(query,now);
 const cards=results.flat().filter(card=>card.startDate?.startsWith(year+'-')&&card.endDate>=today&&(!frame.eventFamily||card.familyVerified)&&card.availability!=='sold-out')
  .filter(card=>!frame.date||card.startDate<=frame.date&&card.endDate>=frame.date)
  .filter(card=>!week||card.startDate<=week.end&&card.endDate>=week.from)
  .filter(card=>!frame.area||/^Wakefield$/i.test(frame.area)||normal(card.venue+' '+card.description).includes(normal(frame.area)));
 const bonfire=year+'-11-05';
 const intro=theme==='fireworks'?`Bonfire Night ${bonfire<today?'was':'is'} ${dateLabel(bonfire)}. `:'';
 const body=cards.length?cards.map(card=>`**${card.title}**\n${card.startDate===card.endDate?dateLabel(card.startDate):dateLabel(card.startDate)+' to '+dateLabel(card.endDate)}${card.startTime?' · '+card.startTime+(card.endTime?'–'+card.endTime:''):''}${card.priceStatus==='free'?' · Free entry':''}${card.familyVerified?' · Listed as family-friendly':''}${card.lowImpactTime?'\nLow-impact display: '+card.lowImpactTime+'.':''}${card.mainDisplayTime?' Main display: '+card.mainDisplayTime+'.':''}${card.noBonfire?' There is no bonfire at this event.':''}\n[Event details](${card.url})`).join('\n\n'):`I couldn’t confirm an upcoming ${year} ${theme==='fireworks'?'fireworks listing':'Light Up Wakefield listing'} from the official event pages just now. That does not mean there are no events.`;
 const state={...prior,version:2,lastIntent:'events.seasonal',lastFilter:null,resultCards:cards,viewIds:cards.map(card=>card.id),constraints:{...prior?.constraints}};
 delete state.constraints.eventWeek;
 return {reply:intro+(cards.length&&theme==='fireworks'?'This upcoming listing is one option to check:\n\n':intro?'\n\n':'')+body,sources:cards.map(card=>({title:card.title,url:card.url})),followups:[],live:cards.length>0,verification:cards.length?'seasonal-event-pages':'seasonal-events-unverified',state};
}
