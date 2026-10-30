import {PLACES} from './askwakefield-places-data.js';
import {load} from 'cheerio';

// Read constraints from the scoped USER turns, never the assistant's suggestions.
// Recompute them each turn so cookie-only or unrelated conversations cannot inherit a plan.
export function indoorFamilyRequest(messages) {
 const turns=messages.filter(m=>m.role==='user').map(m=>String(m.content||''));
 const text=turns.join('\n'),last=turns.at(-1)||'';
 if(!/\b(?:children|kids|family)\b/i.test(text))return null;
 let indoors=false;
 for(const turn of turns){
  if(/\b(?:outdoors? instead|outside instead|rather be outdoors?|rather go outside|indoors? and outdoors?|mix of indoor and outdoor)\b/i.test(turn))indoors=false;
  else if(/\bindoors?\b/i.test(turn)&&!/\bnot indoors?\b/i.test(turn))indoors=true;
 }
 if(!indoors)return null;
 // Named-place operational follow-ups stay with their specialised handlers.
 const recommendation=/\b(?:suggest|recommend|options|something|somewhere|things to do|activities|indoors?)\b/i.test(last);
 const adultReply=/\b(?:(?:\d+|one|two|three|four) adults?|just me|one adult)\b/i.test(last)
  || /^\d+[.!?]*$/.test(last.trim())&&/How many adults are coming\?/.test(String(messages.at(-2)?.content||''));
 const refinement=adultReply||/^(?:ages?|aged)\b|^\d{1,2}\s*(?:and|&)\s*\d{1,2}[?.!]*$|\b(?:budget|£\s*\d|something today|something tomorrow)\b/i.test(last);
 if(!recommendation&&!refinement)return null;
 let ages=[],budget=null,day=null,adults=null;
 for(const turn of turns){
  const pair=turn.match(/\b(?:ages?|aged)\s*(\d{1,2})\s*(?:,|and|&)\s*(\d{1,2})\b/i)||turn.match(/^\s*(\d{1,2})\s*(?:and|&)\s*(\d{1,2})[?.!]*\s*$/);
  if(pair)ages=[+pair[1],+pair[2]].filter(n=>n<18);
  const price=turn.match(/£\s*(\d+(?:\.\d{1,2})?)/);if(price)budget=Number(price[1]);
  if(/\btoday\b/i.test(turn))day='today';else if(/\btomorrow\b/i.test(turn))day='tomorrow';
 }
 for(let i=0;i<messages.length;i++){
  if(messages[i].role!=='user')continue;
  const turn=String(messages[i].content||'');
  const adult=turn.match(/\b(\d+|one|two|three|four) adults?\b/i);
  if(adult)adults=Number(adult[1])||({one:1,two:2,three:3,four:4})[adult[1].toLowerCase()];
  if(/\bjust me\b/i.test(turn))adults=1;
  if(/^\d+[.!?]*$/.test(turn.trim())&&/How many adults are coming\?/.test(String(messages[i-1]?.content||'')))adults=Number(turn.replace(/[.!?]/g,''));
 }
 // Other constraints need the existing search/evidence path, not a partial plan.
 if(/\b(?:wheelchair|step[- ]free|allerg\w*|autis\w*|sensory|quiet|no car|without a car|bus|train|free only|only free|events?|this week|next week|weekend|half[ -]term|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|tonight|per (?:person|child)|each)\b|\b\d{1,2}(?::\d{2}|\s*(?:am|pm))\b/i.test(text))return null;
 if(ages.some(age=>age>10))return null; // This small candidate set is not a teen-activity answer.
 const town=text.match(/\b(?:in|near|from|around)\s+(Horbury(?: Bridge)?|Ossett|Castleford|Pontefract|Normanton|Knottingley|Hemsworth|South Elmsall)\b/i)?.[1]||null;
 if(town)return null; // Do not silently replace a requested district town with Wakefield city.
 return {ages,budget,day,adults};
}

async function currentPage(url){
 try{
  const initial=new URL(url);let current=initial;
  const signal=AbortSignal.timeout(5500);
  for(let i=0;i<3;i++){
   const response=await fetch(current.href,{redirect:'manual',signal});
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');if(!location)return null;
    const next=new URL(location,current);
    if(next.protocol!=='https:'||next.hostname!==initial.hostname||next.username||next.password)return null;
    current=next;continue;
   }
   if(!response.ok)return null;
   if(Number(response.headers.get('content-length'))>2_000_000)return null;
   const html=await response.text();if(html.length>2_000_000)return null;
   const $=load(html);$('script,style,nav,header,footer,aside').remove();
   const root=$('main').length?$('main'):$('body');
   return {text:root.text().replace(/\s+/g,' ').trim(),url:current.href};
  }
 }catch{}
 return null;
}

export async function indoorFamilyAnswer(messages){
 const request=indoorFamilyRequest(messages);if(!request)return null;
 const museum=PLACES.find(p=>p.id==='AW-007'),bowling=PLACES.find(p=>p.id==='AW-026'),play=PLACES.find(p=>p.id==='AW-D005');
 // These are indoor candidates from named records, not a claim of today's
 // availability or a group ticket quote. No old numeric hours/prices are rendered.
 const places=[museum,bowling,play];
 const pages=request.day||request.budget!==null?await Promise.all(places.map(p=>currentPage(p.source))):places.map(()=>null);
 const ageText=request.ages.length?` for ages ${request.ages.join(' and ')}`:'';
 const intro=request.budget!==null
  ?`Keeping it indoors${ageText}, with £${request.budget} as your limit${request.day?' for '+request.day:''}, I'd compare these:`
  :`For an indoor outing${ageText}, I'd compare these:`;
 // A general free-admission statement is scoped to the museum page. Ignore
 // references to free event tickets, parking and unrelated facilities.
 const museumFree=!!pages[0]&&/\b(?:museum (?:entry|admission) is free|(?:entry|admission) (?:to (?:the )?(?:Wakefield )?museum )?is free|free (?:general |museum )?admission|free entry to (?:the )?(?:Wakefield )?museum)\b/i.test(pages[0].text)
  &&!/\b(?:no longer free|admission is not free|entry is not free)\b/i.test(pages[0].text);
 const lines=[
  `**${museum.name}**: a museum visit for local history.${museumFree?' The museum page lists free general admission. Special activities may have separate charges.':''} [Plan your visit](${pages[0]?.url||museum.source})`,
  `**${bowling.name}**: bowling at Trinity Walk, with bumpers and ramps listed in its venue information. [Bowling and booking](${pages[1]?.url||bowling.source})`,
  `**${play.name}**: indoor soft play on Grantley Street, if they'd rather climb and play. Check the current age rules for both children before booking. [Play sessions](${pages[2]?.url||play.source})`
 ];
 const choice='For local history, start with the museum. For active play, compare bowling with soft play.';
 const missing=[];
 if(request.day)missing.push(`I haven't confirmed ${request.day}'s opening or available sessions, so these are candidates rather than confirmed plans for ${request.day}.`);
 else missing.push('Check opening and available sessions for your chosen day.');
 if(request.budget!==null)missing.push(`I don't have a checked group price for bowling or soft play, so I can't yet say either fits £${request.budget}. Food and travel would also need to come out of that amount if it's your whole-outing budget.`);
 else missing.push('Bowling and soft-play prices need checking for your group.');
 const question=!request.ages.length?'How old are the children?':request.budget!==null&&request.adults===null?'How many adults are coming?':'Would they prefer bowling, soft play or exploring a museum?';
 return {reply:[intro,lines.join('\n\n'),choice,missing.join(' '),question].join('\n\n'),sources:places.map((p,i)=>({title:p.name,url:pages[i]?.url||p.source})),followups:[],live:false,verification:'indoor-family-candidates',constraints:request};
}
