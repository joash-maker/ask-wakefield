// Dining choices use literal menu evidence, with recommendations based on food fit.
export const DINING_MENU_LEADS=[
 {name:'Robatary',url:'https://robatary.co.uk/menu/'},
 {name:'Smokehouse',url:'https://smokehousewakefield.co.uk/smokehouse-menus/'},
 {name:'Calder and Hops',url:'https://www.calderhopswakefield.co.uk/menus'}
];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/[<>\[\]*`\r\n]/g,' ').trim();
export function isDiningRequest(q){
 return /\b(?:(?:burgers?|cheeseburgers?|hamburgers?)|steaks?|steakhouse)\b/i.test(q)&&/\b(?:places?|where|eat|eating|restaurants?|good|nice|fancy|ravenous|hungry|recommend(?:ations?)?|suggest(?:ions?)?|choices?|options?)\b/i.test(q);
}
export function diningPreference(q){
 const match=String(q||'').match(/^(?:a |the |just |i(?:['’]d| would) (?:prefer|like) |i['’]?m leaning (?:towards )?)?(burger|steak)s?(?: please)?[.!?\s]*$/i);return match?.[1].toLowerCase()||null;
}
export function isDiningContinuation(q){
 if(diningPreference(q))return true;
 return /^(?:any|what about|how about|which|more|another|anything else|somewhere|i['’]?m sure)\b/i.test(q)||/\b(?:city centre|town centre|those|these|their|they|more choices|more options)\b/i.test(q);
}
export const DINING_RESEARCH_GUIDANCE=`DINING REQUEST: Keep the original burger/steak preference through area and more-choice follow-ups. Search actual restaurant menus, not general business services. Find up to six candidates across at least two independent business-owned sources where available. Return businesses with exact published name, exact menu URL, address and services containing literal dish names such as Classic Burger, Rump Steak or Fillet Steak. These are dish titles, not promotional descriptions. Seek different choices when asked for more, excluding already shown places. Do not just re-search the previous sources. For city-centre requests find explicit city-centre location evidence or a published Wakefield address on a central street. Do not include a district venue merely because its postal address says Wakefield. Explain neither quality nor opening/booking availability without evidence. No invented menu items, prices, atmosphere or popularity.`;
export function diningTarget(messages){return /\b(?:five|5)\b/i.test(String(messages.filter(m=>m.role==='user').at(-1)?.content||''))?5:3;}
export function renderDiningChoices(picks,messages,state){
 const frame=state?.constraints?.requestFrame||{};
 if(frame.budget!=null||frame.environment||frame.requirements?.length||frame.date||frame.time||frame.daypart)return null;
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const subject=frame.diningPreference||frame.localQuestion||q;
 const more=/\b(?:more|others|another|else)\b/i.test(q);
 const centre=/\b(?:city|town) centre\b/i.test(frame.area||q);
 const seen=state?.constraints?.diningSeen||[];
 const wantedBurger=/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(subject),wantedSteak=/\bsteaks?|steakhouse\b/i.test(subject);
 const unique=picks.filter((p,i)=>picks.findIndex(other=>norm(other.name)===norm(p.name))===i);
 const items=unique.flatMap(p=>{
  if(p.lead)return [];
  // The address has already been checked literally against this venue's source.
  const central=p.centreEvidence||p.address&&/\b(?:Northgate|Westgate|Kirkgate|Wood Street|Cross Square|Bull Ring|Bullring|Marygate|Silver Street|Market Street)\b/i.test(p.address)&&/\bWakefield\b/i.test(p.address);
  if(centre&&!central)return [];
  const dishes=p.services.filter(s=>(wantedBurger&&/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s))||(wantedSteak&&/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s)));
  if(!dishes.length||more&&seen.some(name=>norm(name)===norm(p.name)))return [];
  return [{...p,dishes,burger:dishes.some(s=>/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s)),steak:dishes.some(s=>/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s))}];
 }).slice(0,diningTarget(messages));
 if(!items.length)return null;
 const burger=items.find(p=>p.burger),steak=items.find(p=>p.steak);
 const link=p=>`[${clean(p.name)}](${p.url})`;
 const lines=items.map((p,index)=>{
  const highlights=p.burger&&p.steak?[p.dishes.find(s=>/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s)),p.dishes.find(s=>/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s)&&!/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s))].filter(Boolean):p.dishes.slice(0,2);
  const dishes=highlights.map(clean).join(' and ');
  const food=p.burger&&p.steak?'burgers and steak':p.steak?'steak':'burgers';
  const descriptions=[`I’d start with **${clean(p.name)}** for ${food}. You’ll find ${dishes} on the menu.`,`**${clean(p.name)}** is worth a look too, with ${dishes} on its menu.`,`For another option, **${clean(p.name)}** lists ${dishes}.`,`You could also try **${clean(p.name)}** for ${dishes}.`,`**${clean(p.name)}** rounds out the shortlist, with ${dishes}.`];
  return descriptions[index]+(p.address?' '+clean(p.address)+'.':'')+` [Menu](${p.url})`;
 });
 let suggestion='';
 if(burger&&steak&&burger!==steak)suggestion=`For a burger, I’d start with ${link(burger)}. For steak, I’d look at ${link(steak)}. Which are you leaning towards?`;
 else if(wantedBurger&&wantedSteak)suggestion=burger&&steak?'Are you leaning towards a burger or steak?':'';
 if(state?.lastIntent==='local.dining'){
  suggestion=suggestion.replace(/ Which are you leaning towards\?$/,'').replace(/^Are you leaning towards a burger or steak\?$/,'');
 }
 const food=wantedBurger&&!wantedSteak?'burgers':wantedSteak&&!wantedBurger?'steak':'a burger or steak';
 const location=centre?' in the city centre':'';
 const intro=items.length===1?`I could verify one ${more?'more ':''}place for ${food}${location}:`:more?`Here are ${items.length} more places to consider${location}:`:`For ${food}${location}, I’d try these ${items.length} places:`;
 const sources=items.map(p=>({title:p.name,url:p.url}));
 return {reply:[intro,lines.join('\n\n'),suggestion].filter(Boolean).join('\n\n'),sources,followups:[],live:true,verification:'dining-menu-choices',state:{...state,lastIntent:'local.dining',constraints:{...state.constraints,localSources:sources,localSourcesVerified:true,diningChoices:items.map(p=>({name:p.name,url:p.url,address:p.address,services:p.services,centreEvidence:p.centreEvidence,lead:false})),diningCheckedAt:Date.now(),diningSeen:[...new Set([...seen,...items.map(p=>p.name)])].slice(-20)}}};
}

export function previousDiningChoices(messages,state){
 const constraints=state?.constraints||{};
 if(!constraints.diningCheckedAt||Date.now()-constraints.diningCheckedAt>30*60*1000)return null;
 const answer=renderDiningChoices(constraints.diningChoices||[],messages,state);
 if(!answer)return null;
 answer.live=false;answer.verification='dining-previous-menu-choices';
 answer.reply='From the menus checked earlier in this chat:\n\n'+answer.reply;
 // Reusing earlier evidence does not refresh its timestamp.
 answer.state.constraints.diningCheckedAt=constraints.diningCheckedAt;
 return answer;
}
