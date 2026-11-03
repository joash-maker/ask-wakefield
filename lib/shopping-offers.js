const literal=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
function containsOffer(facts,offer){
 const hay=literal(facts),needle=literal(offer);let start=hay.indexOf(needle);
 while(start>=0){
  const before=hay[start-1]||'',after=hay.slice(start+needle.length);
  if(!/[a-z0-9]/i.test(before)&&! /^[a-z0-9]|^[.,]\d/i.test(after))return true;
  start=hay.indexOf(needle,start+1);
 }return false;
}
export function shoppingDealRequest(messages,state){
 const q=String(state?.constraints?.requestFrame?.localQuestion||messages.filter(m=>m.role==='user').map(m=>m.content).join(' '));
 return /\b(?:bicycles?|bikes?|cycles?|cycling)\b/i.test(q)&&/\b(?:deals?|bargains?|discounts?|sale|clearance|cheap(?:er|est)?|second[- ]?hand|pre[- ]?owned|used)\b/i.test(q)&&! /\b(?:repairs?|punctures?|servicing)\b/i.test(q);
}
export function shoppingOfferAnswer(data,result,state){
 const directory=/^(?:www\.)?(?:yell\.com|yorkshire\.com|wakefield\.co\.uk|bikeypedia\.com|ratingsplus\.co\.uk|mapquest\.com|google\.com)$/;
 const rows=(data.businesses||[]).flatMap(row=>{
  const source=result.sources.find(s=>s.url===row.url&&s.pageBusiness===row.name);if(!source)return [];
  const url=new URL(source.url);if(directory.test(url.hostname))return [];
  const facts=result.searchEvidence.filter(e=>e.url===row.url).map(e=>e.text).join(' ');
  const area=String(state?.constraints?.requestFrame?.area||'Wakefield');
  const town=area.match(/Horbury|Ossett|Castleford|Pontefract|Normanton|Knottingley|Hemsworth|South Elmsall/i)?.[0]||'Wakefield';
  if(!literal(facts+' '+source.title).includes(literal(town))||/centre/i.test(area)&&!/(?:city|town)[- ]centre/i.test(facts))return [];
  const offerPage=/\b(?:sale|clearance|deals?|offers?|outlet|used|second[- ]?hand|pre[- ]?owned)\b/i.test(url.pathname+' '+source.title);
  const offers=source.pageRead===true?(Array.isArray(row.offers)?row.offers:[]).map(String).filter(offer=>offer.length>=4&&offer.length<=180&&!/[<>\[\]]|https?:|\b(?:best|cheapest|unbeatable|great deal)\b/i.test(offer)&&/\b(?:sale|clearance|reduced|discount|second[- ]?hand|pre[- ]?owned|used|outlet|save)\b|%\s*off/i.test(offer)&&(offerPage||/\bsave\s*(?:£|\d)|\d+%\s*off/i.test(offer))&&containsOffer(facts,offer)).slice(0,2):[];
  return [{name:row.name,url:row.url,offers}];
 });
 const confirmed=rows.filter(row=>row.offers.length),picks=(confirmed.length?confirmed:rows).filter((row,i,list)=>list.findIndex(other=>literal(other.name)===literal(row.name))===i).slice(0,3);
 if(!picks.length)return null;
 const budget=state?.constraints?.requestFrame?.budget;
 const acceptsUsed=/\b(?:used|second[- ]?hand|pre[- ]?owned)\b/i.test(state?.constraints?.requestFrame?.localQuestion||'');
 const question=budget==null?(acceptsUsed?'What’s your budget?':'What’s your budget, and would you consider a second-hand bicycle?'):acceptsUsed?'':'Would you consider a second-hand bicycle?';
 const reply=(confirmed.length?'These published sale or used-stock options are worth comparing:\n\n':"I found these retailers, but couldn’t confirm a current deal from their pages:\n\n")+picks.map(p=>`**${String(p.name).replace(/[<>\[\]]/g,'')}**${p.offers.length?': '+p.offers.join(' · '):''}. [${p.offers.length?'Published offer':'Retailer details'}](${p.url})`).join('\n\n')+(confirmed.length?'\n\nCompare the model, size, condition and stock before choosing.':'')+(budget!=null?`\n\nI haven’t confirmed which offers meet your £${budget} limit.`:'')+(question?'\n\n'+question:'');
 const sources=picks.map(p=>({title:p.name,url:p.url}));
 return {reply,sources,followups:[],live:true,verification:confirmed.length?'local-shopping-offers':'local-shopping-retailers-unconfirmed',state:{...state,lastIntent:'local.question',constraints:{...state.constraints,localSources:sources}}};
}
