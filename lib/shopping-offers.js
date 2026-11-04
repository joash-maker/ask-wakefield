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
 return /\b(?:bicycles?|bikes?|cycles?|cycling)\b/i.test(q)&&/\b(?:deals?|bargains?|discounts?|sale|clearance|cheap(?:er|est)?|second[ -]?hand|pre[ -]?owned|used)\b/i.test(q)&&! /\b(?:repairs?|punctures?|servicing)\b/i.test(q);
}
export function isShoppingMarketplace(value){try{return /(?:^|\.)(?:gumtree\.com|ebay\.(?:co\.uk|com)|vinted\.(?:co\.uk|com)|facebook\.com)$/i.test(new URL(value).hostname);}catch{return true;}}
export function shoppingOfferAnswer(data,result,state){
 const frame=state?.constraints?.requestFrame||{},budget=frame.budget;
 const directory=/^(?:www\.)?(?:yell\.com|yorkshire\.com|wakefield\.co\.uk|bikeypedia\.com|ratingsplus\.co\.uk|mapquest\.com|google\.com)$/;
 const rows=(data.businesses||[]).flatMap(row=>{
  const source=result.sources.find(s=>s.url===row.url&&s.pageBusiness===row.name);if(!source)return [];
  const url=new URL(source.url);if(directory.test(url.hostname))return [];
  if(isShoppingMarketplace(source.url))return [];
  const facts=result.searchEvidence.filter(e=>e.url===row.url).map(e=>e.text).join(' ');
  const area=String(state?.constraints?.requestFrame?.area||'Wakefield');
  const town=area.match(/Horbury|Ossett|Castleford|Pontefract|Normanton|Knottingley|Hemsworth|South Elmsall/i)?.[0]||'Wakefield';
  if(!literal(facts+' '+source.title).includes(literal(town))||/centre/i.test(area)&&!/(?:city|town)[- ]centre/i.test(facts))return [];
  const offerPage=/\b(?:sale|clearance|deals?|offers?|outlet|used|second[- ]?hand|pre[- ]?owned)\b/i.test(url.pathname+' '+source.title);
  const offers=source.pageRead===true?(Array.isArray(row.offers)?row.offers:[]).filter(entry=>{
   const text=typeof entry==='string'?entry:String(entry?.text||'');
   if(text.length<4||text.length>180||/[<>\[\]]|https?:|\b(?:best|cheapest|unbeatable|great deal)\b/i.test(text)||!containsOffer(facts,text))return false;
   if(budget==null&&(! /\b(?:sale|clearance|reduced|discount|second[ -]?hand|pre[ -]?owned|used|outlet|save)\b|%\s*off/i.test(text)||!(offerPage||/\bsave\s*(?:£|\d)|\d+%\s*off/i.test(text))))return false;
   if(frame.shoppingCondition==='used'&&! /\b(?:used|second[ -]?hand|pre[ -]?owned)\b/i.test(text))return false;
   if(frame.shoppingCondition==='new'&&! /\bnew\b/i.test(text))return false;
   if(budget!=null){
    if(! /\b(?:bikes?|bicycles?)\b/i.test(text)||/\b(?:helmets?|tyres?|inner tubes?|gloves|shoes|jerseys?|accessor(?:y|ies)|parts?|locks?|pumps?|bottles?)\b/i.test(text))return false;
    const priceText=typeof entry==='object'?String(entry.cashPriceText||''):'';
    if(!/^£\s*\d[\d,]*(?:\.\d{2})?$/.test(priceText)||!containsOffer(text,priceText)||/\b(?:monthly|per month|per week|instalments?|deposit|credit|finance)\b/i.test(text))return false;
    const value=Number(priceText.replace(/[£,\s]/g,''));
    if(!Number.isFinite(value)||value>budget||value!==Number(entry.cashPriceGBP))return false;
    const at=literal(text).indexOf(literal(priceText));if(/\b(?:was|save|saving|deposit|from)\s*$/.test(literal(text).slice(0,at)))return false;
   }
   return true;
  }).map(entry=>typeof entry==='string'?entry:entry.text).slice(0,2):[];
  return [{name:row.name,url:row.url,offers}];
 });
 const confirmed=rows.filter(row=>row.offers.length),picks=(confirmed.length?confirmed:rows).filter((row,i,list)=>list.findIndex(other=>literal(other.name)===literal(row.name))===i).slice(0,3);
 if(!picks.length)return null;
 const acceptsUsed=['used','either'].includes(frame.shoppingCondition)||/\b(?:used|second[ -]?hand|pre[ -]?owned)\b/i.test(frame.localQuestion||'');
 const question=budget==null?(acceptsUsed||frame.shoppingCondition==='new'?'What’s your budget?':'What’s your budget, and would you consider a second-hand bicycle?'):frame.shoppingBikeType?'':acceptsUsed||frame.shoppingCondition==='new'?'What type of bike are you looking for?':'Would you consider a second-hand bicycle?';
 const intro=confirmed.length?(budget!=null?`These published options are within your £${budget} limit:`:'These published sale or used-stock options are worth comparing:'):budget!=null?`I haven’t confirmed a bicycle at £${budget} or less from these retailers’ pages:`:'I found these retailers, but couldn’t confirm a current deal from their pages:';
 const reply=intro+'\n\n'+picks.map(p=>`**${String(p.name).replace(/[<>\[\]]/g,'')}**${p.offers.length?': '+p.offers.join(' · '):''}. [${p.offers.length?'Published offer':'Retailer details'}](${p.url})`).join('\n\n')+(confirmed.length?'\n\nCompare the model, size, condition and stock before choosing.':'')+(question?'\n\n'+question:'');
 const sources=picks.map(p=>({title:p.name,url:p.url}));
 return {reply,sources,followups:[],live:true,verification:confirmed.length?'local-shopping-offers':'local-shopping-retailers-unconfirmed',state:{...state,lastIntent:'local.question',constraints:{...state.constraints,localSources:sources,localSourcesVerified:true}}};
}
