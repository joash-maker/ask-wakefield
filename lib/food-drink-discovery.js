import {foodGuideLocality} from './yorkshire-food-guide.js';
import {useDietaryDiscovery,cuisinePreference} from './dietary-discovery.js';
import {renderFoodSuggestions} from './food-voice.js';
// General discovery uses live search, rather than returning a fixed guide shortlist.
const food = /\b(?:restaurants?|caf[eé]s?|coffee(?: shops?)?|pubs?|bars?|drinks?|cocktails?|eat|eating|dining|food|brunch|breakfast|lunch|dinner|places to eat)\b/i;
export function isFoodDrinkDiscovery(messages) {
 const users=messages.filter(m=>m.role==='user');
 const q=String(users.at(-1)?.content||'').trim();
 if(cuisinePreference(q)&&users.slice(0,-1).some(m=>food.test(m.content)))return true;
 if(/^(?:caf[eé]s?|coffee shops?|pubs?|bars?|taprooms?|restaurants?)\b/i.test(q)&&/\b(?:in|near|around)\b/i.test(q))return true;
 if(food.test(q)&&/\b(?:where|which|recommend|suggest|find|any|best|popular|unique|unusual|independent|somewhere|places|good|nice)\b/i.test(q))return true;
 return /^(?:any others|any more|anything else|more options)[?.!\s]*$/i.test(q)&&users.slice(0,-1).some(m=>food.test(m.content));
}
export function useBroadFoodDiscovery(messages){
 const users=messages.filter(m=>m.role==='user');
 const last=String(users.at(-1)?.content||'');
 const q=/^(?:any others|any more|anything else|more options)[?.!\s]*$/i.test(last)?users.map(m=>m.content).join(' '):last;
 return !useDietaryDiscovery(messages)&&isFoodDrinkDiscovery(messages)&&! /\b(?:yorkshire food guide|vegetarian|vegan|halal|gluten|coeliac|allerg\w*|open|today|tonight|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hours?|prices?|costs?|budget|under|cheap|free|accessible|wheelchair|dog[- ]friendly|book|booking|reserve|those|these|them)\b|£|\d/i.test(q);
}
export const FOOD_DRINK_SEARCH_GUIDANCE=`
FOOD AND DRINK DISCOVERY OUTPUT CONTRACT, overriding prose formatting for this request:
Search for the actual requested category and locality, beyond Yorkshire Food Guide and the curated venue list. Use independent cafes and coffee shops, restaurants, pubs, bars, taprooms or distinctive food venues as relevant. A coffee request must not become a restaurant list. For a mixed request cover the requested categories where evidence permits. For a broad eating request seek different styles of venue rather than three entries from one guide. Search at least two distinct sources when available, then follow venue-owned websites or attributable official social pages. Do not invent places to fill categories. Stay in the requested town, defaulting to Wakefield district, and clearly name each area. Exclude places already suggested when asked for more.
Find up to five choices. A first-party source must explicitly connect each name, locality and venue category. Editorial guides can supply discovery leads, clearly labelled guide listings. Never infer current opening, dietary suitability, popularity rankings, prices, booking availability, independence or a unique experience from the category. For unique/unusual requests, use only explicitly described distinguishing features in source evidence, otherwise explain the gap.
After searching, output FINAL_RESPONSE: followed by a JSON object: {"places":[{"name":"Published venue name","area":"Published town or district area","category":"cafe|restaurant|pub|bar|taproom|food venue","url":"exact cited HTTPS page","sourceKind":"official|guide"}]}. After the JSON, add a short evidence paragraph for each venue with actual web citations supporting its published name, town and category. This citation section is mandatory, because JSON fields alone do not supply citations. The server strips these paragraphs and shows only checked fields. Do not output unsupported options. Empty places is acceptable if evidence is insufficient. These structured fields are used to render the user-facing answer and save its exact membership.
`;
const clean=s=>String(s||'').replace(/[\[\]\\\r\n<>*`]/g,' ').replace(/\s+/g,' ').trim();
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const categories={cafe:/\bcaf[eé]s?\b|\bcoffee\b/i,restaurant:/\brestaurant|dining\b/i,pub:/\bpub|public house\b/i,bar:/\bbar|cocktail/i,taproom:/\btaproom|tap room\b/i,'food venue':/\bfood|eat|kitchen|bakery\b/i};
export function foodDrinkSearchAnswer(reply,sources,evidence,messages){
 let parsed;
 // Citation prose or a Markdown wrapper can surround the JSON. Parse only the balanced object.
 const start=reply.indexOf('{');let depth=0,quoted=false,escape=false,end=-1;
 for(let i=start;i>=0&&i<reply.length;i++){const c=reply[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='\"')quoted=false;}else if(c==='\"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth){end=i+1;break;}}
 try{parsed=JSON.parse(reply.slice(start,end));}catch{return null;}
 if(!Array.isArray(parsed?.places))return null;
 const prior=messages.slice(0,-1).filter(m=>m.role==='assistant').map(m=>norm(m.content)).join(' ');
 const more=/^(?:any others|any more|anything else|more options)[?.!\s]*$/i.test(String(messages.at(-1)?.content||''));
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const towns=['Ossett','Horbury','Castleford','Pontefract','Normanton','Hemsworth','Knottingley','South Elmsall','West Bretton','Wentbridge','Newmillerdam','Sandal','Durkar','Netherton','Walton','Outwood','Wrenthorpe','Stanley','Crofton','Ackworth','Featherstone','Overton','Heath','Middlestown','Wakefield'];
 const locality=foodGuideLocality(messages);if(!locality)return null;
 const requested=towns.find(t=>t!=='Wakefield'&&new RegExp('\\b'+t+'\\b','i').test(q))||(towns.includes(locality)&&locality!=='Wakefield'?locality:null);
 const cityCentre=locality==='Wakefield city centre';
 const picks=[],seen=new Set();
 const coffeeOnly=/\b(?:coffee|caf[eé]s?)\b/i.test(q)&&!/\b(?:restaurants?|pubs?|bars?|drinks?|eat|eating|food)\b/i.test(q);
 const drinksOnly=/\b(?:pubs?|bars?|cocktails?|drinks?|taprooms?)\b/i.test(q)&&!/\b(?:caf[eé]s?|coffee|restaurants?|eat|eating|food)\b/i.test(q);
 for(const raw of parsed.places.slice(0,15)){
  if(!raw||typeof raw!=='object')continue;
  const name=clean(raw.name).slice(0,120),publishedArea=clean(raw.area).slice(0,100),category=raw.category;
  const area=towns.find(t=>new RegExp('\\b'+t+'\\b','i').test(publishedArea))||'';
  if(coffeeOnly&&category!=='cafe')continue;
  if(drinksOnly&&!['pub','bar','taproom'].includes(category))continue;
  if(!name||!area||!categories[category]||seen.has(norm(name))||(more&&prior.includes(norm(name))))continue;
  if(!towns.some(t=>new RegExp('\\b'+t+'\\b','i').test(area)))continue;
  if(requested&&!new RegExp('\\b'+requested+'\\b','i').test(area))continue;
  if(cityCentre&&!requested&&area!=='Wakefield')continue;
  let url;try{url=new URL(raw.url);if(url.protocol!=='https:'||url.username||url.password||url.port)continue;}catch{continue;}
  let source=sources.find(s=>s.url===url.href);
  if(!source){source=sources.find(s=>evidence.some(e=>e.url===s.url&&norm(e.text+' '+(e.title||'')).includes(norm(name))));}
  if(!source)continue;
  const usedRequestedUrl=source.url===url.href;
  try{url=new URL(source.url);if(url.protocol!=='https:'||url.username||url.password||url.port)continue;}catch{continue;}
  const proof=evidence.filter(e=>e.url===url.href).map(e=>e.text+' '+(e.title||'')).join(' ');
  // A citation alone is insufficient. Its evidence must locate and classify this exact venue.
  if(/\b(?:permanently closed|ceased trading|closed down)\b/i.test(proof))continue;
  if(/\bindependent\b/i.test(q)&&!/\bindependent(?:ly)?\b/i.test(proof))continue;
  if(cityCentre&&!/\bcity[- ]centre\b/i.test(proof))continue;
  if(!norm(proof).includes(norm(name))||!norm(proof).includes(norm(area))||!categories[category].test(proof))continue;
  const guide=!usedRequestedUrl||raw.sourceKind!=='official'||/yorkshirefoodguide|experiencewakefield|tripadvisor|yell\.com|yorkshire\.com|yelp\.|wanderlog|useyourlocal|wftedit/i.test(url.hostname);
  picks.push({name,area,category,url:url.href,guide});seen.add(norm(name));if(picks.length===5)break;
 }
 if(!picks.length)return null;
 const rendered=renderFoodSuggestions(picks,q);
 return {reply:rendered.reply,sources:rendered.picks.map(p=>({title:p.name,url:p.url})),restaurantSet:rendered.picks.map(p=>({name:p.name,area:p.area,category:p.category,menuUrl:p.guide?null:p.url,guideUrl:p.guide?p.url:null})),live:true,verification:'food-drink-discovery'};
}
