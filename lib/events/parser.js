import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {allowedUrl} from './sources.js';
export const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
export const hash=s=>createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex').slice(0,24);
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function isoDate(s){
 const value=String(s||''),m=value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);if(!m)return null;
 const d=new Date(m[1]+'T12:00:00Z');if(isNaN(d)||d.toISOString().slice(0,10)!==m[1])return null;
 if(/T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value)){const instant=new Date(value);if(isNaN(instant))return null;return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);}
 return m[1];
}
function clockLabel(value){const m=clean(value).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);if(!m)return null;let h=+m[1],minute=+(m[2]||0);if(m[3]){if(h<1||h>12)return null;h=h%12+(/pm/i.test(m[3])?12:0);}return h<24&&minute<60?String(h).padStart(2,'0')+':'+String(minute).padStart(2,'0'):null;}
function publishedTime(value){if(typeof value!=='string'||!value.includes('T'))return null;if(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)){const date=new Date(value);return isNaN(date)?null:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}return value.match(/T(\d{2}:\d{2})/)?.[1]||null;}
export function humanDates(text){
 const t=clean(text).replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi,' ').replace(/(\d)(st|nd|rd|th)\b/gi,'$1');
 const make=(day,month,year)=>{const n=months.indexOf(month.toLowerCase().slice(0,3))+1;return n?isoDate(`${year}-${String(n).padStart(2,'0')}-${String(day).padStart(2,'0')}`):null;};
 const range=t.match(/(?:(Now)|(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?|(\d{1,2}))\s*(?:[-–—]|\bto\b)\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
 if(range){const endDate=make(range[6],range[7],range[8]);const startDate=range[1]?null:make(range[2]||range[5],range[3]||range[7],range[4]||range[8]);return {startDate,endDate,ongoing:!!range[1],dateEvidence:clean(range[0])};}
 const one=t.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);if(one){const d=make(one[1],one[2],one[3]);return {startDate:d,endDate:d,ongoing:false,dateEvidence:clean(one[0])};}
 return {startDate:null,endDate:null,ongoing:false,dateEvidence:null};
}
function flatten(node,out=[]){if(Array.isArray(node))node.forEach(n=>flatten(n,out));else if(node&&typeof node==='object'){out.push(node);if(node['@graph'])flatten(node['@graph'],out);}return out;}
function eventNodes($){const out=[];$('script[type="application/ld+json"]').each((_,el)=>{try{flatten(JSON.parse($(el).text()),out);}catch{}});return out.filter(n=>[].concat(n['@type']||[]).some(t=>/(?:^|\/)\w*Event$/.test(t)));}
function ownPage($,source){
 $('script,style,nav,header,footer,noscript,[class*="related"],[id*="related"],.cookie-banner').remove();
 $('br').replaceWith(' ');$('div,p,li,section,h1,h2,h3,h4,time,span').append(' ');
 const h=$('h1').first();let root=h.closest('article,main,.event-details-view,.event-item-wrapper');if(!root.length)root=$('main').first();if(!root.length)root=$('body');
 return {title:clean(h.text()),text:clean(root.text()),root};
}
function audience(text,explicit='',ageText=''){
 const t=clean(text),field=t.match(/AGE RANGE\s*:\s*(.{0,160}?)(?=\b(?:Join|Step|About|This|PRICE|DATE)\b|$)/i)?.[1]||clean(explicit);
 const negative=/\b(?:adults only|18\+|not (?:suitable )?for (?:children|kids))\b/i.test(t);
 const familyVerified=!negative&&(/\b(?:Children|Families)\b/i.test(field)||/\b(?:family[- ]friendly|for families|for children|children aged|all ages|open to kids)\b/i.test(t));
 const age=clean(ageText||explicit);
 const range=age.match(/\b(?:ages?|aged|children aged|for children aged)\s*:?\s*(\d{1,2})\s*(?:[-–]|to)\s*(\d{1,2})\b/i);
 const over=age.match(/\b(?:ages?|aged)\s*:?\s*(\d{1,2})\s*\+/i);
 const all=/\ball ages\b/i.test(age);
 return {familyVerified,minAge:range?+range[1]:over?+over[1]:all?0:null,maxAge:range?+range[2]:null,ageEvidence:range?.[0]||over?.[0]||(all?'All ages':field)||null,audienceEvidence:familyVerified?(field||t.match(/.{0,35}(?:family[- ]friendly|for families|for children|children aged|all ages|open to kids).{0,80}/i)?.[0]):null};
}
const categories=[['family',/\b(famil|children|kids|toddler)/i],['music',/\b(music|concert|gig|choir)/i],['sport',/\b(sport|fitness|football|rugby|cricket|running)/i],['theatre',/\b(theatre|pantomime|musical)/i],['comedy',/\b(comedy|comedian|stand.up)/i],['arts',/\b(art|sculpture|exhibition|craft|workshop)/i],['heritage',/\b(heritage|history|castle|museum)/i],['outdoors',/\b(walk|nature|outdoor|trail)/i],['community',/\b(community|church|volunteer)/i],['food',/\b(food|drink|coffee|beer)/i],['market',/\b(market|fair|fayre)/i]];
function offersPrice(node,text){
 const offers=[].concat(node?.offers||[]);const values=offers.map(o=>o.price??o.lowPrice).filter(v=>v!==undefined&&v!==null&&v!=='').map(Number).filter(Number.isFinite);
 const conditional=/\b(?:standard admission|with (?:an? )?(?:exhibition |admission )?ticket|free for (?:members|under)|admission applies)\b/i.test(text);
 if(conditional)return {priceStatus:'conditional',priceRaw:text.match(/.{0,50}(?:standard admission|with (?:an? )?(?:exhibition |admission )?ticket|free for (?:members|under)).{0,90}/i)?.[0]||'Admission conditions apply'};
 if(values.length){const low=Math.min(...values),high=Math.max(...offers.map(o=>Number(o.highPrice??o.price??o.lowPrice)).filter(Number.isFinite));return {priceStatus:low===0&&high===0?'free':low===0?'variable':'paid',priceRaw:low===0&&high===0?'Free':`${offers[0]?.priceCurrency||'GBP'} ${low}${high>low?'–'+high:''}`};}
 if(node?.isAccessibleForFree===true||/\b(?:free entry|free event|admission:? free|price:? free)\b/i.test(text))return {priceStatus:'free',priceRaw:'Free'};
 return {priceStatus:'unknown',priceRaw:null};
}
function structuredRecord(node,source,url,checkedAt,text){
 const startDate=isoDate(node.startDate),endDate=isoDate(node.endDate)||startDate;
 const venue=clean(typeof node.location==='string'?node.location:node.location?.name)||source.venue;
 const description=clean(node.description||text),a=audience(description,node.audience?.audienceType||'',node.typicalAgeRange?'Ages '+node.typicalAgeRange:'');
 return record({title:clean(node.name),venue,startDate,endDate,ongoing:false,sourceUrl:url,
 startTime:startDate===endDate?publishedTime(node.startDate):null,
 endTime:startDate===endDate?publishedTime(node.endDate):null,
 description,...a,...offersPrice(node,description),status:/Cancelled/.test(node.eventStatus||'')?'cancelled':/Postponed/.test(node.eventStatus||'')?'postponed':/Rescheduled/.test(node.eventStatus||'')?'rescheduled':'scheduled',
 availability:[].concat(node.offers||[]).some(o=>/SoldOut/.test(o.availability||''))?'sold-out':'unknown',dateEvidence:clean(node.startDate+(node.endDate?' to '+node.endDate:'')),parser:'schema.org'},source,checkedAt);
}
function record(data,source,checkedAt){
 const facts={title:data.title,venue:data.venue,startDate:data.startDate,endDate:data.endDate,ongoing:data.ongoing,startTime:data.startTime||null,endTime:data.endTime||null,sourceUrl:data.sourceUrl,status:data.status||'scheduled',availability:data.availability||'unknown',familyVerified:data.familyVerified||false,minAge:data.minAge??null,maxAge:data.maxAge??null,ageEvidence:data.ageEvidence||null,priceStatus:data.priceStatus||'unknown',priceRaw:data.priceRaw||null};
 const issues=[];if(!facts.title)issues.push('Missing title');if(!facts.venue)issues.push('Missing venue');if(!facts.endDate||(!facts.startDate&&!facts.ongoing))issues.push('Missing published date');if(facts.startDate&&facts.endDate<facts.startDate)issues.push('End precedes start');
 return {...facts,id:hash(data.sourceUrl+'|'+data.title+'|'+(data.startDate||'ongoing')+'|'+data.endDate),sourceId:source.id,area:source.area,categories:categories.filter(([,re])=>re.test(data.title+' '+(data.description||''))).map(([name])=>name),description:clean(data.description).slice(0,900),dateEvidence:data.dateEvidence||null,audienceEvidence:data.audienceEvidence||null,parser:data.parser,checkedAt,contentHash:hash(facts),issues};
}
export function parseEventPage(html,source,url,checkedAt=new Date().toISOString()){
 const $=load(html);const nodes=eventNodes($);const {title,text,root}=ownPage($,source);
 const events=nodes.map(n=>structuredRecord(n,source,allowedUrl(n.url||url,source,url)||url,checkedAt,text));
 if(events.length)return events;
 if(!title)return [];
 const dateText=clean(root.find('time,[class*="date"],[class*="calendar"]').map((_,e)=>$(e).attr('datetime')||$(e).text()).get().join(' '));
 const machineDates=root.find('time[datetime]').map((_,e)=>isoDate($(e).attr('datetime'))).get().filter(Boolean);
 const date=machineDates.length?{startDate:machineDates[0],endDate:machineDates.at(-1),ongoing:false,dateEvidence:machineDates.join(' to ')}:humanDates(dateText||text.slice(title.length,2500));
 // Generic parsers never assign a guessed year, venue or session to a record.
 const venue=source.venue||clean(root.find('[itemprop="location"],.event-venue,.event-where,[class*="venue-name"],.location,[class*="venue"] a').first().text())||null;
 const metadata=clean(root.find('[class*="price"]').first().text());
 const clock=text.match(/Start time\s*:\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*End time\s*:\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
 const single=date.startDate&&date.startDate===date.endDate&&!date.ongoing;
 const audienceText=clean(root.find('[class*="age-range"],[class*="agerange"],[itemprop="typicalAgeRange"]').first().text());
 const a=audience(text,audienceText,audienceText);const p=offersPrice(null,metadata==='Free'?'Price: Free':text);
 return [record({title,venue,...date,startTime:single?clockLabel(clock?.[1]):null,endTime:single?clockLabel(clock?.[2]):null,sourceUrl:url,description:text.slice(title.length),...a,...p,status:/\b(?:event cancelled|this event (?:has been|is) cancelled)\b/i.test(text)?'cancelled':/\bpostponed\b/i.test(text)?'postponed':'scheduled',availability:root.find('.sold-out:not(.d-none)').length||/\bthis event is sold out\b/i.test(text)?'sold-out':'unknown',parser:'visible-page'},source,checkedAt)];
}
export function listingLinks(html,source,url=source.url){
 const $=load(html),re=new RegExp(source.linkPattern,'i'),out=new Map();
 $('nav,header,footer,script,style').remove();
 $('a[href]').each((_,a)=>{
  const el=$(a),u=allowedUrl(el.attr('href'),source,url);
  if(!u||u===url||!re.test(new URL(u).pathname)||/\/(?:categories|category|page|tag|venue-hire|event-highlights)(?:\/|$)/i.test(new URL(u).pathname))return;
  let node=el,score=0;
  for(let level=0;level<5&&node.length;level++,node=node.parent()){
   const t=clean(node.text());if(t.length>2500)break;
   if(/\b20[2-9]\d\b|\bNow\s*[-–]|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(t))score=Math.max(score,20-level);
  }
  if(el.find('h2,h3,h4').length||el.closest('h2,h3,h4').length)score+=5;
  if(!out.has(u)||out.get(u)<score)out.set(u,score);
 });
 return [...out].sort((a,b)=>b[1]-a[1]).slice(0,source.maxPages).map(([u])=>u);
}
export function parseListingStructured(html,source,checkedAt){
 const $=load(html);const records=eventNodes($).flatMap(n=>{const u=allowedUrl(n.url||n['@id'],source);return u?[structuredRecord(n,source,u,checkedAt,clean(n.description))]:[];});
 if(source.id==='cathedral'){
  $('.info-container').each((_,el)=>{const box=$(el),title=clean(box.find('h4').text());if(!title)return;
   const text=clean(box.text()),date=humanDates(clean(box.find('.event-details').text()));
   const time=text.match(/\b(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})\b/);
   const familyVerified=/^Family Fun workshop$/i.test(title);
   records.push(record({title,venue:source.venue,...date,sourceUrl:source.url,startTime:time?.[1],endTime:time?.[2],familyVerified,audienceEvidence:familyVerified?title:null,description:clean(box.find('.description').text()),parser:'cathedral-listing'},source,checkedAt));
  });
 }
 return records;
}

export function listingAvailability(html,source){
 const $=load(html),hints=new Map();
 $('a[href]').each((_,a)=>{const url=allowedUrl($(a).attr('href'),source);if(!url)return;const card=$(a).closest('.events-col,article,.event-card');if(card.length&&card.find('.sold-out.d-block,.sold-out:not(.d-none):not([class*=d-])').length)hints.set(url,'sold-out');});
 return hints;
}
