import {PLACES} from './askwakefield-places-data.js';
import { sourceKey } from './outing-food.js';

const latest=messages=>messages.filter(m=>m.role==='user').at(-1)?.content || '';
const coffee=/\b(?:coffee|caf[eé]s?)\b/i;
export const moreCoffee=question=>/\b(?:more|others?|another|else|alternatives?)\b/i.test(question);

// The broad shortlist has no model-written venue facts. Specialised requests
// retain their existing verification routes rather than losing constraints.
export function broadCoffeeDiscovery(messages,state) {
  const q=latest(messages),prior=state?.constraints?.coffeeDiscovery;
  if(/\b(?:independent|quiet|work|wifi|wi-fi|vegan|vegetarian|gluten|coeliac|dairy|allerg|wheelchair|accessible|dog|children|kids|desserts?|cakes?|pudding|station|event|festival|parking|bus|train|walk|art|books?|plan|itinerary|leeds|york|huddersfield|tomorrow|next|20\d{2})\b/i.test(q))return false;
  if(coffee.test(q))return /\b(?:where can|where should|recommend|suggest|find|looking for|more|(?:which|what) coffee shops)\b|^\s*(?:any|some)\b/i.test(q)
    || /^\s*(?:coffee(?: shops?| places?)?|caf[eé]s?)(?:\s+(?:in|near|around)\s+[a-z ]+)?[?.!\s]*$/i.test(q);
  return Boolean(prior && !/\b(?:restaurants?|pharmacy|chemist|shops?|services|weather)\b/i.test(q) && (moreCoffee(q) || /\b(?:opening hours|what time.*(?:open|close)|(?:which|are).*open)\b/i.test(q)));
}

export function renderCoffeeDiscovery(messages,context,priorState,area=null,now=new Date()) {
  const q=latest(messages),prior=priorState?.constraints?.coffeeDiscovery;
  const hotChocolate=/\bhot chocolate\b/i.test(q) || (!coffee.test(q) && prior?.hotChocolate===true);
  const foodOrCoffee=/\bfood\s+or\s+(?:a\s+)?coffee\b/i.test(q)
    || (!coffee.test(q) && prior?.foodOrCoffee===true);
  const foodAndCoffee=/\bfood\s+and\s+coffee\b/i.test(q) || (!coffee.test(q) && prior?.foodAndCoffee===true);
  const localArea=context?.area || area;
  const scope=localArea || 'the Wakefield district';
  const excluded=moreCoffee(q)?new Set(prior?.shownIds || []):new Set();
  const asksHours=/\b(?:hours|when|what time|open|close|closing)\b/i.test(q);
  const referenced=prior && asksHours && (!coffee.test(q) || /\b(?:their|those|these|them)\b/i.test(q))
    ? new Set((priorState.resultCards || []).map(p=>p.id)):null;
  const suitable=(context?.places || []).filter(p=>p.id && p.name && (p.googleMapsUri||p.websiteUri)
    && p.businessStatus==='OPERATIONAL' && p.serviceVerified===true
    && (context.constraint?p.timeMatch===true:p.timeMatch!==false)
    && (foodOrCoffee?(p.servesCoffee===true||p.servesLunch===true||p.servesDinner===true):p.servesCoffee===true)
    && (!foodAndCoffee || p.servesCoffee===true && (p.servesLunch===true || p.servesDinner===true))
    && (!hotChocolate || p.hotChocolateVerified===true)
    && !excluded.has(p.id) && (!referenced || referenced.has(p.id)));
  const shown=[...new Map(suitable.map(p=>[p.id,p])).values()].slice(0,5);
  const namedDay=q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const day=namedDay || new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long'}).format(now);
  const lines=shown.map(p=>{
    const services=[hotChocolate?'hot chocolate':null,p.servesCoffee===true?'coffee':null,p.servesLunch===true||p.servesDinner===true?'food':null].filter(Boolean).join(' and ');
    let line=`[${p.name}](${sourceKey(p.googleMapsUri || p.websiteUri)})${p.address?' ('+p.address+')':''} lists ${services}.`;
    if(asksHours){
      const hours=p.weekdayDescriptions?.find(h=>h.toLowerCase().startsWith(day.toLowerCase()+':'));
      line+=hours?' '+hours+'.':` I couldn’t confirm its ${day} hours.`;
    }
    return line;
  });
  const nowOnly=context?.constraint?.mode==='now';
  let reply=shown.length?`${moreCoffee(q)?'Here are some more checked listings':'Here are some checked listings'} in ${scope}${nowOnly?', listed open now':''}:\n\n${lines.join('\n\n')}`
    :`I couldn’t verify ${moreCoffee(q)?'additional':'suitable'} ${hotChocolate?'places serving both coffee and hot chocolate':foodOrCoffee?'food or coffee places':'coffee shops'} in ${scope}${nowOnly?' open now':''} from this check. There may be others.`;
  if(shown.length && (nowOnly||asksHours))reply+='\n\nThose are branch hours. Counter and kitchen service times aren’t confirmed.';
  if(shown.length && !localArea)reply+='\n\nThese cover the district. I can narrow this to Wakefield city centre or another town.';
  const sources=shown.map(p=>({title:p.name+' - Google Places branch listing',url:sourceKey(p.googleMapsUri || p.websiteUri)}));
  for(const p of shown)if(p.hotChocolateSource)sources.push({title:p.name+' - published drink menu',url:p.hotChocolateSource});
  const state={version:2,lastIntent:'food.discovery',area:localArea || null,
    resultCards:shown.map(p=>({id:p.id,entityType:'place',title:p.name,name:p.name,address:p.address,url:sourceKey(p.googleMapsUri || p.websiteUri)})),
    viewIds:shown.map(p=>p.id),constraints:{coffeeDiscovery:{area:localArea || null,foodOrCoffee,foodAndCoffee,hotChocolate,shownIds:[...new Set([...(prior?.shownIds || []),...shown.map(p=>p.id)])].slice(-40)}}};
  return {reply,sources,state,followups:shown.length?['Any more?','Which are open now?','What are their opening hours?']:[],live:Boolean(context),verification:'coffee-discovery-v1'};
}

// Places coffee flags do not establish a hot-chocolate menu. Only read an
// exact operator website already present in the reviewed local records.
export async function verifyHotChocolate(context,request=fetch){
 if(!context?.places)return context;
 const places=await Promise.all(context.places.slice(0,5).map(async p=>{
  const record=PLACES.find(r=>r.name.toLowerCase()===p.name.toLowerCase());
  if(!record?.website?.startsWith('https://'))return p;
  try{const r=await request(record.website,{signal:AbortSignal.timeout(5000)});if(!r.ok)return p;const html=await r.text();const text=html.replace(/<script\b[^]*?<\/script>|<style\b[^]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');if(/\bhot chocolate\b/i.test(text)&&!/(?:no|not serving|unavailable) hot chocolate/i.test(text))return {...p,hotChocolateVerified:true,hotChocolateSource:record.website};}catch{}return p;
 }));return {...context,places};
}
