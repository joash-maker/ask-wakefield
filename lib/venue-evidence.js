import {load} from 'cheerio';
const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export async function readVenuePage(place){
 const original=new URL(place.source);let url=original;
 const signal=AbortSignal.timeout(5500);
 try{
  for(let i=0;i<4;i++){
   const response=await fetch(url.href,{redirect:'manual',signal,headers:{'User-Agent':'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'}});
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');if(!location)return null;
    const next=new URL(location,url);
    if(next.protocol!=='https:'||next.hostname!==original.hostname||next.username||next.password||next.port)return null;
    url=next;continue;
   }
   if(!response.ok||Number(response.headers.get('content-length'))>2_000_000)return null;
   if(response.headers.get('content-type')&&!/html/i.test(response.headers.get('content-type')))return null;
   const reader=response.body?.getReader();let html='';
   if(reader){let length=0;const decoder=new TextDecoder();for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>2_000_000){await reader.cancel();return null;}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}
   else html=await response.text();
   const $=load(html),nodes=[];
   $('script[type="application/ld+json"]').each((_,el)=>{try{const parsed=JSON.parse($(el).text());for(const node of (Array.isArray(parsed)?parsed:[parsed]))nodes.push(node,...(Array.isArray(node?.['@graph'])?node['@graph']:[]));}catch{}});
   $('script,style,nav,header,footer,aside,.related-events,.related,.cookie-banner').remove();
   const root=$('main').length?$('main'):$('body');
   const textRoot=root.clone();
   textRoot.find('h1,h2,h3,h4,p,li,div,section,tr,td').prepend(' ').append(' ');
   const text=textRoot.text().replace(/\s+/g,' ').trim();
   if(text.length<25||/verify you are human|checking your browser|access denied|just a moment\.\.\./i.test($('title').text()))return null;
   const sections=[];
   root.find('h2,h3,h4').each((_,heading)=>{
    if(!/^(?:opening(?: times| hours)?|admission|entry|prices?|age (?:limits?|range))[:\s]*$/i.test($(heading).text().trim()))return;
    let block='',next=$(heading).next();
    for(let n=0;n<6&&next.length&&!/^h[1-4]$/i.test(next[0].tagName);n++,next=next.next())block+=' '+next.text();
    sections.push({heading:$(heading).text().trim(),text:block.replace(/\s+/g,' ').trim()});
   });
   // A restaurant or related event's schema cannot supply this venue's hours.
   const schema=nodes.filter(n=>n?.name&&key(n.name)===key(place.name));
   const admission=sections.filter(s=>/admission|entry|prices?/i.test(s.heading)).map(s=>s.text).join(' ');
   const sentences=text.match(/[^.!?]{0,180}[.!?]|[^.!?]+$/g)||[];
   const freeText=[admission,...sentences.filter(s=>/museum.{0,35}(entry|admission)|(entry|admission).{0,35}museum/i.test(s))].join(' ');
   const free=freeText.split(/[.!?]/).some(clause=>(!/\bmuseum\b/i.test(clause)||/museum/i.test(place.type))&&/\b(?:free (?:general |museum )?(?:entry|admission)|(?:museum )?(?:entry|admission)(?: to (?:the )?(?:Wakefield )?museum)? is free)\b/i.test(clause)
    &&!/\b(?:not free|no longer free|workshop|event|parking|members?|carers?|under|children only|school)\b/i.test(clause));
   const closed=/\b(?:we are|the museum is|this venue is) (?:temporarily |currently |permanently )?closed\b/i.test(text)
    || /^(?:temporarily closed|closed until further notice)\b/i.test(root.find('h1').first().text().trim());
   return {url:url.href,text,sections,schema,free,closed,checkedAt:new Date().toISOString()};
  }
 }catch{}
 return null;
}

function clock(value){
 const m=String(value||'').trim().match(/^(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?$|^(\d{1,2})\s*(am|pm)$/i);if(!m)return null;
 let h=Number(m[1]||m[4]),minute=Number(m[2]||0),period=(m[3]||m[5]||'').toLowerCase();
 if(period){if(h<1||h>12)return null;h=h%12+(period==='pm'?12:0);}
 return h<24&&minute<60?h*60+minute:null;
}
const weekday=date=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long'}).format(new Date(date+'T12:00:00Z'));
export function venueHours(page,date){
 if(!page||!date)return null;
 const day=weekday(date),matches=[];
 for(const node of page.schema){
  for(const spec of [node.openingHoursSpecification].flat().filter(Boolean)){
   const names=[spec.dayOfWeek].flat().map(s=>String(s).split('/').at(-1));
   if(!names.includes(day)||spec.validFrom&&date<spec.validFrom||spec.validThrough&&date>spec.validThrough)continue;
   const open=clock(spec.opens),close=clock(spec.closes);
   if(open!==null&&close!==null)matches.push({open,close,day});
  }
 }
 for(const section of page.sections.filter(s=>/^opening/i.test(s.heading))){
  // Only same-day statements within an opening-hours section. No cafe/event text.
  const escaped=day.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=section.text.match(new RegExp('\\b'+escaped+'\\b\\s*:?\\s*(Closed|\\d{1,2}(?:(?::|\\.)\\d{2})?\\s*(?:am|pm)?\\s*[-–—]\\s*\\d{1,2}(?:(?::|\\.)\\d{2})?\\s*(?:am|pm)?)','i'));
  if(match){
   if(/^closed$/i.test(match[1]))matches.push({open:0,close:0,day});
   else{const times=match[1].split(/[-–—]/).map(s=>s.trim());const open=clock(times[0]),close=clock(times[1]);if(open!==null&&close!==null)matches.push({open,close,day});}
  }
 }
 if(!matches.length)return null;
 const unique=new Map(matches.map(m=>[m.open+':'+m.close,m]));
 // Multiple contradictory or split sessions need a richer timetable, not a guessed window.
 return unique.size===1?[...unique.values()][0]:null;
}
export const formatClock=minutes=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
