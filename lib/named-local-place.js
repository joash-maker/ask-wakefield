import {PLACES} from './askwakefield-places-data.js';
const plain=html=>String(html).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export async function namedLocalPlace(question,state,messages=[],request=fetch,now=new Date()){
 const q=String(question||'').trim(),hours=/\b(?:hours?|open|closes?|closing)\b/i.test(q);
 if(/\b(?:allerg|vegan|gluten|wheelchair|menu|price|cost|parking)\b/i.test(q))return null;
 const named=/\bhaus\b/i.test(q)?PLACES.find(p=>p.name==='Haus Coffee & Plants'):null;
 const prior=state?.constraints?.namedLocalPlace;
 const place=named || (hours&&/^(?:what (?:are|time)|when|is it|are they|does it|opening|hours)/i.test(q)&&!/\b(?:library|museum|costa|nero|starbucks|bob|kraft|restaurant|festival|event)\b/i.test(q)&&q.split(/\s+/).length<=12&&prior?PLACES.find(p=>p.id===prior):null);
 if(!place)return null;
 let reply=`[${place.name}](${place.source}) is listed at ${place.address}, ${place.postcode}.`,live=false;
 if(hours){
  let text='';try{const r=await request(place.source,{signal:AbortSignal.timeout(6000)});if(r.ok){const body=await r.text();if(/<h1[^>]*>\s*Haus\s*<\/h1>/i.test(body)){text=plain(body).split(/Venue opening hours/i)[1]?.split(/Venue Details|Access facilities/i)[0]||'';live=Boolean(text);}}}catch{}
  const day=q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1]||new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long'}).format(now);
  const match=text.match(new RegExp('\\b'+day+'\\s*:\\s*([^]*?)(?=\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s*:|$)','i'));
  reply+='\n\n'+(match?.[1]?.trim()?`The current linked directory lists ${day}: ${match[1].trim()}. These are listed branch hours, not a guarantee of service at a particular time.`:'I couldn’t refresh its published hours, so I haven’t confirmed when it closes for your visit. Use the linked venue page or contact the café.');
 }else reply+='\n\nIt is a named coffee-shop record in the local directory. Opening hours, today’s service and availability need checking for your visit.';
 return {reply,sources:[{title:place.name+' - venue listing',url:place.source}],followups:hours?[]:['What time does it close today?'],state:{version:2,lastIntent:'food.venue_reference',area:'Wakefield city centre',resultCards:[{id:place.id,title:place.name,entityType:'place',url:place.source}],constraints:{namedLocalPlace:place.id}},live,verification:'named-local-place-v1'};
}
