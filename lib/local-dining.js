// Dining choices use literal menu evidence, with recommendations based on food fit.
export const DINING_MENU_LEADS=[
 {name:'Robatary',url:'https://robatary.co.uk/menu/'},
 {name:'Smokehouse',url:'https://smokehousewakefield.co.uk/smokehouse-menus/'},
 {name:'Calder and Hops',url:'https://www.calderhopswakefield.co.uk/menus'}
];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/[<>\[\]*`\r\n]/g,' ').trim();
export function isDiningRequest(q){
 return /\b(?:(?:burgers?|cheeseburgers?|hamburgers?)|steaks?|steakhouse)\b/i.test(q)&&/\b(?:place|where|eat|eating|restaurant|good|nice|fancy|ravenous|hungry|recommend|suggest|choices?|options?)\b/i.test(q);
}
export function isDiningContinuation(q){
 return /^(?:any|what about|how about|which|more|another|anything else|somewhere|i['’]?m sure)\b/i.test(q)||/\b(?:city centre|town centre|those|these|their|they|more choices|more options)\b/i.test(q);
}
export const DINING_RESEARCH_GUIDANCE=`DINING REQUEST: Keep the original burger/steak preference through area and more-choice follow-ups. Search actual restaurant menus, not general business services. Find up to six candidates across at least two independent business-owned sources where available. Return businesses with exact published name, exact menu URL, address and services containing literal dish names such as Classic Burger, Rump Steak or Fillet Steak. These are dish titles, not promotional descriptions. Seek different choices when asked for more, excluding already shown places. Do not just re-search the previous sources. For city-centre requests find explicit city-centre location evidence or a published Wakefield address on a central street. Do not include a district venue merely because its postal address says Wakefield. Explain neither quality nor opening/booking availability without evidence. No invented menu items, prices, atmosphere or popularity.`;
export function renderDiningChoices(picks,messages,state){
 const frame=state?.constraints?.requestFrame||{};
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const subject=frame.localQuestion||q;
 const more=/\b(?:more|others|another|else)\b/i.test(q);
 const centre=/\b(?:city|town) centre\b/i.test(frame.area||q);
 const seen=state?.constraints?.diningSeen||[];
 const wantedBurger=/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(subject),wantedSteak=/\bsteaks?|steakhouse\b/i.test(subject);
 const items=picks.flatMap(p=>{
  if(p.lead)return [];
  // The address has already been checked literally against this venue's source.
  const central=p.centreEvidence||p.address&&/\b(?:Northgate|Westgate|Kirkgate|Wood Street|Cross Square|Bull Ring|Bullring|Marygate|Silver Street|Market Street)\b/i.test(p.address)&&/\bWakefield\b/i.test(p.address);
  if(centre&&!central)return [];
  const dishes=p.services.filter(s=>(wantedBurger&&/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s))||(wantedSteak&&/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s)));
  if(!dishes.length||more&&seen.some(name=>norm(name)===norm(p.name)))return [];
  return [{...p,dishes,burger:dishes.some(s=>/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s)),steak:dishes.some(s=>/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s))}];
 }).slice(0,3);
 if(!items.length)return null;
 const burger=items.find(p=>p.burger),steak=items.find(p=>p.steak);
 const link=p=>`[${clean(p.name)}](${p.url})`;
 const lines=items.map((p,index)=>{
  const highlights=p.burger&&p.steak?[p.dishes.find(s=>/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s)),p.dishes.find(s=>/\b(?:steaks?|ribeye|rib-eye|sirloin|fillet|rump|wagyu)\b/i.test(s)&&!/\b(?:burgers?|cheeseburgers?|hamburgers?)\b/i.test(s))].filter(Boolean):p.dishes.slice(0,2);
  const reason=p.burger&&p.steak?'if you’re choosing between a burger and steak':p.steak?'if steak is what you fancy':'if you’re leaning towards a burger';
  return `**${clean(p.name)}**${index===0?' is where I’d start ': ' is another option '}${reason}. The menu lists ${highlights.map(clean).join(' and ')}.${p.address?' You’ll find it at '+clean(p.address)+'.':''} [See the menu](${p.url})`;
 });
 let suggestion='';
 if(burger&&steak&&burger!==steak)suggestion=`For a burger, I’d start with ${link(burger)}. For steak, I’d look at ${link(steak)}. Which are you leaning towards?`;
 else if(wantedBurger&&wantedSteak)suggestion=burger&&!steak?'I’ve confirmed burger options here, but haven’t found a separate steak choice yet.':steak&&!burger?'These cover steak. I haven’t confirmed a burger option from the pages I could read yet.':'Are you leaning towards a burger or steak?';
 if(state?.lastIntent==='local.dining'){
  suggestion=suggestion.replace(/ Which are you leaning towards\?$/,'').replace(/^Are you leaning towards a burger or steak\?$/,'');
 }
 const intro=more?'Here’s '+(items.length===1?'another option':'a few more options')+(centre?' in the city centre':'')+':':centre?'Let’s keep it central. '+(items.length===1?'This one matches':'These match')+' what you fancy:':/\bravenous|hungry|starving\b/i.test(q)?'Feeling hungry? Let’s narrow it down:':'For a burger or steak, here’s where I’d look:';
 const sources=items.map(p=>({title:p.name,url:p.url}));
 return {reply:[intro,lines.join('\n\n'),suggestion].filter(Boolean).join('\n\n'),sources,followups:[],live:true,verification:'dining-menu-choices',state:{...state,lastIntent:'local.dining',constraints:{...state.constraints,localSources:sources,localSourcesVerified:true,diningSeen:[...new Set([...seen,...items.map(p=>p.name)])].slice(-20)}}};
}
