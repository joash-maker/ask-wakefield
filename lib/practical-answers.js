import {menuHighlights,renderMenuSuggestions} from './food-voice.js';
import {isRestaurantGuide} from './restaurant-source-policy.js';
import {useDietaryDiscovery,publishedCuisine,requestedCuisine} from './dietary-discovery.js';
import {isFoodDrinkDiscovery} from './food-drink-discovery.js';
import {discoverFoodGuide,foodGuideLocality,guideRestaurantReply} from './yorkshire-food-guide.js';
import {RESTAURANT_MENU_SOURCES} from './restaurant-menu-sources.js';
import {load} from 'cheerio';
const last=messages=>String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
const users=messages=>messages.filter(m=>m.role==='user').map(m=>m.content).join('\n');
export function isRestaurantDiscovery(messages){
 const q=last(messages);
 return useDietaryDiscovery(messages) || isFoodDrinkDiscovery(messages) || /\b(?:vegetarian|vegan|plant[- ]based|halal|gluten[- ]free|coeliac)\b/i.test(q)&&/\b(?:restaurants?|menus?|eat|food|dining|options?|ones?)\b/i.test(q)
  || /\b(?:popular|best|recommend|recommendations|suggest)\b/i.test(q)&&/\b(?:restaurants?|eat|eating|dining|food|meals?)\b/i.test(q)
  || /\brestaurants?\b/i.test(q)&&/\b(?:wakefield|ossett|horbury|castleford|pontefract|normanton|yorkshire food guide)\b/i.test(q);
}
export const RESTAURANT_GUIDANCE=`
RESTAURANT DISCOVERY: Search current first-party restaurant menus, including short dietary refinements. Give up to three supported choices with direct menu or booking links. Distinguish vegetarian-only or vegan-only restaurants from mixed restaurants with explicitly listed dishes. Never infer vegetarian suitability from Italian, Indian or Japanese cuisine. Do not invent a best/popular ranking or imply popularity without current attributed evidence. Say why a venue matches, using the actual menu, rather than unsupported praise. Do not claim open tonight unless independently verified for the requested date and time. If menu evidence is unavailable, explain that specific gap. Do not send the user to search directories instead of using the available search tool. Ask at most one useful question after giving the supported options.`;
export function practicalTopic(messages){
 const q=last(messages),context=users(messages);
 if(/\b(?:council|wakefield(?:'s)? official)\b/i.test(q)&&/\b(?:contact|website|out[- ]of[- ]hours|outside hours|phone|telephone)\b/i.test(q))return 'contact';
 if(/\b(?:out[- ]of[- ]hours|outside hours|contact them)\b/i.test(q)&&/\bcouncil\b/i.test(context))return 'contact';
 if(/\b(?:ossett|horbury|castleford|pontefract|normanton|hemsworth|knottingley|south elmsall)\b/i.test(context))return null;
 if(/\b(?:events?|festival|parade|concert|meal|restaurant|coffee|itinerary|fine|appeal|penalty|pcn)\b/i.test(q))return null;
 if(/\b(?:parking|car parks?)\b/i.test(q))return 'parking';
 if(/\b(?:display|ticket|restrictions?|time limit|charges?)\b/i.test(q)&&/\b(?:parking|car parks?)\b/i.test(context))return 'parking';
 return null;
}
const PARKING='https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-across-the-district/car-parks-in-wakefield';
const CONTACT='https://www.wakefield.gov.uk/contact-wakefield-council/contact-us/';
const CHANGE='https://www.wakefield.gov.uk/your-district/new-parking-proposals-to-boost-investment-in-car-parks-and-parking-services';
async function page(url){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(5500),headers:{'User-Agent':'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'}});
  if(!response.ok)return null;
  const final=new URL(response.url||url);if(final.protocol!=='https:'||!/(^|\.)wakefield\.gov\.uk$/.test(final.hostname))return null;
  const $=load(await response.text());$('script,style,nav,header,footer').remove();
  const root=$('main').length?$('main'):$('body');return root.text().replace(/\s+/g,' ').trim();
 }catch{return null;}
}
export async function practicalAnswer(messages){
 const topic=practicalTopic(messages);if(!topic)return null;
 const q=last(messages),sources=[];
 if(topic==='contact'){
  if(/\bwebsite\b/i.test(q)&&!/\b(?:phone|contact|outside|out[- ]of)\b/i.test(q))return {reply:"Wakefield Council's official website is [wakefield.gov.uk](https://www.wakefield.gov.uk/). You can find service-specific contact details on its [contact page]("+CONTACT+").",sources:[{title:'Wakefield Council',url:'https://www.wakefield.gov.uk/'}],live:false,verification:'official-council-link'};
  const text=await page(CONTACT);
  if(text)sources.push({title:'Wakefield Council — Contact us',url:CONTACT});
  const section=text?.split(/General enquiries/i)[1]?.split(/Council Tax and Benefits/i)[0]||'';
  const number=section.match(/0345\s*8\s*506\s*506/);
  const allHours=/24\s*hours[\s\S]{0,40}7\s*days/i.test(section);
  return {reply:number?`The Council's current contact page lists 0345 8 506 506 for general enquiries.${allHours?' Customer Services is available 24 hours a day, seven days a week, but that does not cover every council service.':''}\n\n[Contact details by service](${CONTACT}). Which service do you need?`:`I couldn't check the current phone details just now. Use the Council's [contact page](${CONTACT}) for the right service and any out-of-hours arrangements.`,sources,live:!!number,verification:'council-contact-current'};
 }
 const [text,notice]=await Promise.all([page(PARKING),page(CHANGE)]);
 if(text)sources.push({title:'Wakefield Council — Car parks in Wakefield',url:PARKING});
 const link=`[Council car parks and map](${PARKING})`;
 if(!text)return {reply:`I couldn't read the Council's current parking details just now. ${link} has the official information. Check the signs at your chosen car park for charges and restrictions.`,sources:[],live:false,verification:'parking-page-unavailable'};
 const changed=!!notice&&/remov(?:al|e|ing)[\s\S]{0,60}two[- ]hour free parking/i.test(notice);
 if(changed)sources.push({title:'Wakefield Council — Parking change proposals',url:CHANGE});
 const caution=changed?`The Council has also published a proposal to remove the two-hour free offer. I haven't confirmed the implementation date, so don't assume the free period still applies. Check the current tariff and signs.`:`I haven't confirmed which car parks currently offer a free period. Check the current tariff and signs before leaving your vehicle.`;
 let reply;
 if(/\bdisplay\b/i.test(q)){
  reply=/ticket[\s\S]{0,160}clearly displayed in the vehicle/i.test(text)?`For a printed pay-and-display ticket, put it inside the vehicle where its printed details can be clearly read from outside. Follow any placement instructions on the ticket or machine.\n\nThe Council says the ticket must be clearly displayed. ${link}.`:`I couldn't confirm ticket-placement instructions on the page. Follow the instructions on your printed ticket or parking machine. ${link}.`;
 }else if(/\b(?:restrictions?|time limits?|how long|maximum stay)\b/i.test(q)){
  reply=`Time limits and charging hours depend on the car park. The Council directs you to select its on-street or off-street icon on the [parking map](${PARKING}) for hours and charges. Check maximum-stay and return restrictions on the signs too.\n\nWhich car park are you using?`;
 }else if(/\bfree\b/i.test(q)){
  reply=`I can't confirm a current list of free car parks from the overview alone. ${caution}\n\nSelect the car park on the ${link} to check its hours and charges.`;
 }else reply=`Use the ${link} for locations, hours and charges. Select a car-park icon to see its details.\n\n${caution}`;
 return {reply,sources,live:true,verification:'parking-specific-help'};
}
export function tonightResponse(cards,now=new Date(),options={}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const minute=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
 const clock=v=>/^([01]?\d|2[0-3]):[0-5]\d$/.test(v||'')?Number(v.split(':')[0])*60+Number(v.split(':')[1]):null;
 const selected=cards.filter(c=>{
  if(['cancelled','postponed'].includes(c.status)||['cancelled','postponed'].includes(c.availability)||c.ongoing||c.startDate!==today||(c.endDate||c.startDate)!==today||!c.title||!c.venue||!/^https:\/\//.test(c.sourceUrl||c.url||''))return false;
  const start=clock(c.startTime||c.start),finish=clock(c.endTime||c.end);
  if(start===null)return false;
  const end=finish!==null&&finish<=start?finish+1440:finish;
  return end===null?start>=Math.max(17*60,minute):end>Math.max(17*60,minute);
 }).sort((a,b)=>(a.startTime||a.start).localeCompare(b.startTime||b.start)).slice(0,5);
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(now);
 const reply=selected.length?`For tonight, ${date}:\n\n`+selected.map(c=>`${c.title}\n${c.venue} · ${c.startTime||c.start}${c.endTime||c.end?'–'+(c.endTime||c.end):''}${options.showPrice && options.priceLabel?' · '+options.priceLabel(c):''}${c.availability==='sold-out'?' · Listed as sold out':''}\n[Event details](${c.sourceUrl||c.url})`).join('\n\n')+`\n\nThese are the matching listings I could check, rather than a complete evening calendar. Check booking availability on the event pages.`:`I couldn't confirm any scheduled events for tonight, ${date}, from the listings I checked. That doesn't mean nothing is happening. Would you like me to check another evening?`;
 return {reply,cards:selected};
}


async function menuResponse(url){
 const original=new URL(url);let current=original;const signal=AbortSignal.timeout(5500);
 for(let hop=0;hop<4;hop++){
  const response=await fetch(current.href,{redirect:'manual',signal,headers:{'User-Agent':'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'}});
  if(![301,302,303,307,308].includes(response.status))return {response,url:current.href};
  const location=response.headers.get('location');if(!location)return null;
  const next=new URL(location,current);
  if(next.protocol!=='https:'||next.username||next.password||next.port||next.hostname.replace(/^www\./,'')!==original.hostname.replace(/^www\./,''))return null;
  current=next;
 }
 return null;
}
export async function dietaryMenuAnswer(messages,sources,searchEvidence=[],requestedDiet=null,options={}){
 const q=last(messages),dietText=messages.filter(m=>m.role==='user').map(m=>m.content).reverse().find(t=>/\b(?:vegan|vegetarian)\b/i.test(t))||'',need=requestedDiet||(/\bvegan\b/i.test(dietText)?'vegan':/\bvegetarian\b/i.test(dietText)?'vegetarian':null);
 const cuisine= requestedCuisine(messages),locality=foodGuideLocality(messages);
 const identity=(name,text)=>!name||String(text).normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase().includes(String(name).normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase());
 const locationMatches=text=>!!locality&&((locality==='Wakefield district'||locality==='Wakefield city centre')?/\bWakefield\b|\bWF\d{1,2}\s*\d[A-Z]{2}\b/i.test(text):new RegExp('\\b'+locality+'\\b','i').test(text))&&(locality!=='Wakefield city centre'||/\bcity[- ]centre\b/i.test(text));
 const dietPattern = need === 'vegetarian' ? /\b(?:vegetarian|vegan)\b/i : /\bvegan\b/i;
 if(!need)return null;
 // A menu-only renderer must not replace a reply that also needs current hours, price or access checks.
 if(/\b(?:open|now|today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|prices?|costs?|how much|budget|under|allerg(?:y|ies|ic)|coeliac|wheelchair|accessible|halal)\b|£/i.test(users(messages)))return null;
 const candidates=sources.filter(source=>{
  try{const url=new URL(source.url);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid|example|nip\.io|sslip\.io)$/i.test(url.hostname)&&!isRestaurantGuide(source);}catch{return false;}
 }).filter((source,index,list)=>list.findIndex(s=>s.url===source.url)===index).slice(0,8);
 // An exact first-party search excerpt can still identify a published menu when direct reads fail.
 // Keep that provenance explicit; never use a directory excerpt as an equivalent substitute.
 const fromSearch=source=>{
  const evidence=searchEvidence.find(e=>e.url===source.url&&typeof e.text==='string'&&e.text.trim());
  if(!evidence)return null;
  if(isRestaurantGuide(source,{title:evidence.title}))return null;
  const text=String(evidence.title||source.title||'')+' '+evidence.text;
  if(!identity(source.name,text)||!locationMatches(text)||publishedCuisine(text,cuisine)===null)return null;
  if(!dietPattern.test(evidence.text)||!/\b(?:menu|dishes)\b/i.test(text)||!locationMatches(text))return null;
  if(new RegExp("\\b(?:no|not|without|unavailable|do not offer|don't offer)\\b[^.!?]{0,45}\\b"+need+"\\b",'i').test(text))return null;
  const title=menuName(source);if(!title)return null;
  return {title,url:source.url,via:'search',cuisine:publishedCuisine(text,cuisine),category:/\bpub\b/i.test(evidence.title||source.title||'')?'pub':'',highlights:menuHighlights(evidence.text,need)};
 };
 const checked=await Promise.all(candidates.map(async source=>{
  try{
   const fetched=await menuResponse(source.url);
   if(!fetched?.response.ok)return fromSearch(source);
   const response=fetched.response;
   if(/pdf/i.test(response.headers.get('content-type')||''))return fromSearch(source);
   if(Number(response.headers.get('content-length')||0)>2_000_000)return fromSearch(source);
   const final=new URL(fetched.url),original=new URL(source.url);
   if(final.protocol!=='https:'||final.hostname.replace(/^www\./,'')!==original.hostname.replace(/^www\./,''))return null;
   const html=await response.text();if(html.length>2_000_000)return fromSearch(source);
   const $=load(html);
   const brandNames=[];
   const collectBrand=data=>{if(!data||typeof data!=='object')return;if(Array.isArray(data)){data.forEach(collectBrand);return;}const types=[data['@type']].flat();if(types.some(t=>['Restaurant','FoodEstablishment','CafeOrCoffeeShop','BarOrPub'].includes(String(t).split(/[\/#]/).at(-1)))&&data.name)brandNames.push(data.name);Object.values(data).filter(v=>v&&typeof v==='object').forEach(collectBrand);};
   $('script[type="application/ld+json"]').each((_,el)=>{try{collectBrand(JSON.parse($(el).text()));}catch{}});
   brandNames.push(...$('header img[alt],img.custom-logo,img[class*=logo],a[rel=home] img').map((_,el)=>$(el).attr('alt')).get(),$('h1').first().text());
   if(isRestaurantGuide(source,{title:$('title').first().text(),heading:$('h1').first().text(),siteName:$('meta[property="og:site_name"]').attr('content'),jsonLd:$('script[type="application/ld+json"]').map((_,el)=>$(el).text()).get()}))return null;
   $('script,style,noscript').remove();
   $('p,h1,h2,h3,h4,li,footer,address,div,section').append(' ');
   const locationText=$('body').text().replace(/\s+/g,' ');
   const pageTitle=$('title').text();
   if(!identity(source.name,locationText+' '+pageTitle)||!locationMatches(locationText)||publishedCuisine(locationText+' '+pageTitle,cuisine)===null)return null;
   const siteName=$('meta[property="og:site_name"]').attr('content');
   $('nav,header,footer').remove();
   const root=$('main').length?$('main'):$('body');const text=root.text().replace(/\s+/g,' ').trim();
   // Cuisine or directory tags never establish suitability. Require an actual local menu page.
   if(!dietPattern.test(text)||!/(?:\bmenu\b|\bdishes\b)/i.test(text)||!locationMatches(locationText))return null;
   if(new RegExp("\\b(?:no|not|without|unavailable|do not offer|don't offer)\\b[^.!?]{0,45}\\b"+need+"\\b",'i').test(text))return null;
   const heading=$('title').first().text()||$('h1').first().text().replace(/\s+/g,' ').trim();
   const title=menuName(source,siteName||heading,brandNames);if(!title)return null;
   const sections=$('h2,h3,h4').map((_,el)=>({heading:$(el).text().trim(),text:$(el).nextUntil('h1,h2,h3,h4').text()})).get();
   return {title,url:final.href,via:'page',cuisine:publishedCuisine(locationText+' '+pageTitle,cuisine),category:/\bpub\b/i.test(pageTitle+' '+$('h1').first().text())?'pub':'',highlights:menuHighlights(text,need,sections)};
  }catch{return fromSearch(source);}
 }));
 const excluded=new Set((options.excludeNames||[]).map(n=>String(n).toLowerCase()));
 const verified=checked.filter(m=>m&&!excluded.has(m.title.toLowerCase()));
 const distinct=[];const other=[];const cuisines=new Set();
 for(const item of verified){const key=item.cuisine||'';if(key&&!cuisines.has(key)){distinct.push(item);cuisines.add(key);}else other.push(item);}
 const menus=[...distinct,...other].filter((m,i,list)=>list.findIndex(x=>x.title.toLowerCase()===m.title.toLowerCase())===i).slice(0,5);
 if(!menus.length)return {reply:`I couldn't confirm ${need} options for that request from the menus I checked. That doesn't mean there aren't any. Is there a particular restaurant you'd like me to check?`,sources:[],live:false,verification:'dietary-menu-unverified'};
 const exclusive=/\b(?:vegetarian|vegan)[ -]only\b|\bentirely (?:vegetarian|vegan)\b/i.test(q);
 const refinement=/^(?:what about|how about)/i.test(q);
 const {picks,reply}=renderMenuSuggestions(menus,{diet:need,exclusive,refinement});
 return {reply,sources:picks.map(({title,url})=>({title,url})),restaurantSet:picks.map(m=>({name:m.title,area:locality||'Wakefield district',menuUrl:m.url,guideUrl:null,cuisine:m.cuisine,category:m.category,diet:need,highlights:m.highlights})),live:true,verification:picks.some(m=>m.via==='search')?'dietary-menu-search-evidence':'dietary-menu-pages'};
}

function menuName(source,pageTitle,brandNames=[]){
 const registered=RESTAURANT_MENU_SOURCES.find(s=>s.url===source.url);
 const generic=name=>!String(name).replace(/\b(?:our|the|a|and|or|vegan|vegetarian|vegeterian|plant|based|v|ve|vg|menu|menus|options|food|drinks|main|breakfast|lunch|dinner|dessert|all|day|view|download|home|welcome|official|website|logo|image|icon|header|brand|restaurant|cafe|pub|bar|dark|light|white|black|retina|mobile|desktop|inverse|normal)\b/gi,'').replace(/[^a-z]/gi,'');
 for(const candidate of [registered?.name,source.name,pageTitle,source.title,...brandNames]){
  for(const part of String(candidate||'').split(/\s[|]\s|\s[-–]\s/)){
   const name=part.replace(/\b(?:logo|official website)\b/gi,'').replace(/^welcome to\s+/i,'').replace(/[\[\]\\\r\n]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);
   if(!generic(name))return name;
  }
 }
 return null;
}
export async function knownDietaryMenuAnswer(messages){
 const q=last(messages);
 if(useDietaryDiscovery(messages)||!isRestaurantDiscovery(messages)||/\b(?:those|them|these)\b/i.test(q))return null;
 const dietaryText=/\b(?:vegan|vegetarian)\b/i.test(q)?q:users(messages);
 const diet=/\bvegan\b/i.test(dietaryText)?'vegan':/\bvegetarian\b/i.test(dietaryText)?'vegetarian':null;
 // Leave named-venue detail requests and extra cuisine/service filters on their existing paths.
 if(!/^(?:where|which|what|any|best|popular|recommend|suggest|find|show|can you (?:recommend|suggest|find)|restaurants?)\b/i.test(q))return null;
 if(/\b(?:at|about)\s+\S|\b(?:steak|sushi|tapas|japanese|korean|thai|vietnamese|chinese|italian|indian|turkish|independent|chains?|pubs?|bars?|buffet|outdoor|romantic)\b/i.test(q))return null;
 // A menu check does not establish price, opening, availability, accessibility or ingredient safety.
 if(/\b(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|open|now|lunch|dinner|breakfast|cheap|budget|under|less than|free|halal|gluten|coeliac|allerg(?:y|ies|ic)|wheelchair|accessible|near|nearest|delivery|takeaway|only|entirely)\b|£|\d+(?:[.:]\d+)?/i.test(users(messages)))return null;
 const locality=foodGuideLocality(messages);if(!locality||/\b(?:sandal|durkar|northgate|kirkgate)\b/i.test(q))return null;
 if(!diet&&!/yorkshire food guide/i.test(q))return null;
 const guide=await discoverFoodGuide({diet,locality});
 const candidates=RESTAURANT_MENU_SOURCES.filter(s=>locality==='Wakefield district'||s.area===locality||(locality==='Wakefield city centre'&&s.area==='Wakefield'));
 const result=diet?await dietaryMenuAnswer(messages,candidates,[],diet):null;
 if(guide.length)return guideRestaurantReply(guide,result,diet);
 return result?.sources?.length?result:null;
}
