import {load} from 'cheerio';

const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function booksyProfileUrl(value){
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||!['booksy.com','www.booksy.com'].includes(u.hostname)||u.port||u.username||u.password||!/^\/en-gb\/\d+_[^/]+$/.test(u.pathname))return null;
  u.hash='';u.search='';return u.href;
 }catch{return null;}
}

// Parse only the named business's Services section. Reviews, platform navigation
// and nearby/sponsored businesses must never supply its service menu or prices.
export function parseBooksyProfile(html,url){
 const safe=booksyProfileUrl(url);if(!safe)return null;
 const $=load(html),heading=$('h1').first(),name=heading.text().replace(/\s+/g,' ').trim();
 const slug=new URL(safe).pathname.match(/\/\d+_([^_]+)_/)?.[1];
 if(!name||!slug||normal(name)!==normal(slug)||/access denied|verify you are human|just a moment/i.test($('title').text()))return null;
 $('script,style,nav,header,footer,aside,[class*="review"],[class*="nearby"],[class*="sponsor"]').remove();
 const elements=$('body').find('*').toArray();
 const start=elements.findIndex(e=>/^h[2-4]$/i.test(e.tagName)&&/^services$/i.test($(e).text().trim()));
 if(start<0)return null;
 let end=elements.findIndex((e,i)=>i>start&&/^h[1-2]$/i.test(e.tagName)&&/reviews|about us|business hours|staffers|fresh finds|nearby/i.test($(e).text()));
 if(end<0)end=elements.length;
 const services=[];
 for(let i=start+1;i<end;i++){
  const el=elements[i];if(!/^h[3-5]$/i.test(el.tagName))continue;
  const label=$(el).text().replace(/\s+/g,' ').trim();
  if(!label||label.length>140||/^(?:popular services|other services|services|book now|reviews)$/i.test(label))continue;
  const parts=[];
  for(let j=i+1;j<end&&!/^h[1-5]$/i.test(elements[j].tagName);j++){
   for(const child of elements[j].childNodes||[])if(child.type==='text')parts.push(child.data);
  }
  const following=parts.join(' ').replace(/\s+/g,' ').trim();
  const price=following.match(/£\s*(\d+(?:\s*\.\s*\d{2})?)(\s*\+)?/);
  const from=/\bfrom\b/i.test(label)||!!price?.[2];
  const title=label.replace(/\s+FROM\s*$/i,'').trim();
  const key=normal(title);
  const prior=services.find(s=>normal(s.name)===key);
  const item={name:title,price:price?Number(price[1].replace(/\s/g,'')):null,from};
  if(!prior)services.push(item);
  else if(prior.price!==item.price||prior.from!==item.from){prior.price=null;prior.varies=true;}
 }
 if(!services.length)return null;
 return {name,url:safe,services:services.slice(0,35)};
}

export async function readBooksyProfile(url){
 const safe=booksyProfileUrl(url);if(!safe)return null;
 const original=new URL(safe);let current=original;
 const signal=AbortSignal.timeout(6500);
 try{
  for(let n=0;n<3;n++){
   const response=await fetch(current.href,{redirect:'manual',signal,headers:{'User-Agent':'AskWakefield/2.1 (+https://www.askwakefield.co.uk)'}});
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');if(!location)return null;
    const next=new URL(location,current);
    if(next.origin!==original.origin||!booksyProfileUrl(next.href)||next.pathname.match(/\/\d+_/)?.[0]!==original.pathname.match(/\/\d+_/)?.[0])return null;
    current=next;continue;
   }
   if(!response.ok||Number(response.headers.get('content-length'))>2_000_000)return null;
   const contentType=response.headers.get('content-type');if(contentType&&!/html/i.test(contentType))return null;
   let html='';const reader=response.body?.getReader();
   if(reader){const decoder=new TextDecoder();let bytes=0;for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000){await reader.cancel();return null;}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}
   else html=await response.text();
   return parseBooksyProfile(html,current.href);
  }
 }catch{}
 return null;
}

export function bookingRequest(messages,state){
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const explicit=(q.match(/https:\/\/[^\s<>()]+/g)||[]).map(s=>booksyProfileUrl(s.replace(/[.,;]+$/,''))).find(Boolean);
 if(explicit)return {url:explicit,explicit:true};
 let previous=state?.constraints?.bookingBusiness;
 if(!previous){
  const supplied=messages.filter(m=>m.role==='user').slice(0,-1).reverse().flatMap(m=>(String(m.content).match(/https:\/\/[^\s<>()]+/g)||[]).map(booksyProfileUrl).filter(Boolean))[0];
  if(supplied)previous={url:supplied,name:new URL(supplied).pathname.match(/\/\d+_([^_]+)_/)?.[1]?.replace(/-/g,' ')};
 }
 if(!previous?.url||!booksyProfileUrl(previous.url))return null;
 if(/\b(?:other|another|different|else|instead)\b/i.test(q))return null;
 const nameMention=normal(q).includes(normal(previous.name))||normal(q).length>=3&&normal(previous.name).startsWith(normal(q));
 const named=q.match(/\b(?:does|do)\s+(.+?)\s+(?:offer|provide|charge)|\b(?:services?|prices?)\s+(?:at|for)\s+(.+?)[?.!]*$/i);
 if(named&&!/^(?:it|they|the barber|the business)$/i.test(named[1]||named[2])&&!normal(named[1]||named[2]).includes(normal(previous.name)))return null;
 const reference=/\b(?:services?|prices?|cost|how much|haircuts?|skin ?fades?|beard|shaves?|book|appointments?|slots?|availability|open|hours|do they|does it|that one|this one)\b/i.test(q);
 if(nameMention||reference)return {url:previous.url,name:previous.name,explicit:false};
 return null;
}

export function renderBookingBusiness(profile,messages,prior){
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const prices=/\b(?:prices?|cost|how much|£)\b/i.test(q);
 const operational=/\b(?:open|hours|available|availability|appointments?|slots?|today|tomorrow)\b/i.test(q);
 const allServices=/\b(?:what|which|list|full|all)\b.*\bservices?\b|\bservices? (?:does|offered|available)\b/i.test(q);
 const state={...prior,lastIntent:'services.business',constraints:{...prior?.constraints,bookingBusiness:{name:profile.name,url:profile.url}}};
 if(operational&&!/\bservices?\b/i.test(q))return {reply:`I could read ${profile.name}’s public service menu, but haven’t confirmed its opening hours or live appointment slots. [Venue details and booking](${profile.url}).`,sources:[{title:profile.name+' — Booksy service menu',url:profile.url}],followups:[],live:false,verification:'booking-business-operational-unverified',state};
 let selected=profile.services;
 const serviceFilter=/\bbeard|shave/i.test(q)?/beard|shave/i:/\bskin ?fade|\bfades?\b/i.test(q)?/skin ?fade/i:null;
 if(serviceFilter)selected=selected.filter(s=>serviceFilter.test(s.name));
 const limit=allServices?18:prices?10:6;
 const rows=selected.slice(0,limit).map(s=>'- '+s.name+(prices?(s.price!==null?' · '+(s.from?'from ':'')+'£'+s.price.toFixed(2):' · price varies or wasn’t readable'):''));
 let reply=`${profile.name}’s Booksy page lists${serviceFilter?' these matching services':' these services'}:\n\n${rows.length?rows.join('\n'):'I couldn’t find that specific service in the menu I could read.'}`;
 if(selected.length>limit)reply+='\n\nThere are more options on the full service menu.';
 reply+=`\n\n[${prices?'Listed prices and booking':'Full services and booking'}](${profile.url}).`;
 if(operational)reply+=' I read the public service menu, but haven’t checked opening hours or live appointment slots.';
 else if(prices)reply+=' These are listed service prices, not a quote for an available appointment.';
 else if(!serviceFilter&&profile.services.some(s=>/beard|shave/i.test(s.name))&&profile.services.some(s=>/haircut|skin ?fade/i.test(s.name)))reply+=' Are you after a haircut, a fade or beard work?';
 return {reply,sources:[{title:profile.name+' — Booksy service menu',url:profile.url}],followups:[],live:true,verification:'booking-business-page',state};
}
