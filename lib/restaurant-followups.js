import {discoverFoodGuide} from './yorkshire-food-guide.js';
import {dietaryMenuAnswer,isRestaurantDiscovery} from './practical-answers.js';
import {RESTAURANT_MENU_SOURCES} from './restaurant-menu-sources.js';
const key=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function restaurantSetState(answer,base){
 const entries=(answer.restaurantSet||[]).slice(0,5).map(e=>({name:String(e.name).slice(0,150),area:String(e.area||'').slice(0,100),menuUrl:e.menuUrl||null,guideUrl:e.guideUrl||null,cuisine:String(e.cuisine||'').slice(0,60),category:String(e.category||'').slice(0,30),diet:['vegetarian','vegan'].includes(e.diet)?e.diet:null,highlights:(e.highlights||[]).filter(h=>typeof h==='string').slice(0,2).map(h=>h.slice(0,100))}));
 return {...base,lastIntent:'food.discovery',constraints:{foodSet:{entries,viewNames:entries.map(e=>e.name)}}};
}
export async function restaurantDietFollowUp(messages,state){
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 const prior=messages.slice(0,-1);
 const explicit=/\b(?:vegan|vegetarian)\b/i.test(q);
 if(!explicit&&!/\b(?:options?|menus?)\b/i.test(q))return null;
 const dietaryText=explicit?q:prior.filter(m=>m.role==='user').map(m=>m.content).join(' ');
 const diet=/\bvegan\b/i.test(dietaryText)?'vegan':/\bvegetarian\b/i.test(dietaryText)?'vegetarian':null;
 if(!diet||!/\b(?:those|them|these|which ones|any of)\b/i.test(q))return null;
 const stored=state?.constraints?.foodSet;
 if(!stored&&!isRestaurantDiscovery(prior))return null;
 if(!stored?.entries?.length)return {reply:`I haven't confirmed ${diet} menus for the places in that earlier answer. I won't substitute different restaurants. Ask me for a fresh restaurant list and I can check that exact set.`,sources:[],live:false,verification:'restaurant-followup-no-set',state};
 const names=new Set((stored.viewNames||stored.entries.map(e=>e.name)).map(key));
 const entries=stored.entries.filter(e=>names.has(key(e.name)));
 if(/\b(?:only|entirely|open|tonight|today|tomorrow|weekend|allerg(?:y|ies|ic)|coeliac|gluten|accessible|wheelchair|halal|budget|cheap|under|prices?|costs?|hours?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ossett|horbury|castleford|pontefract|normanton|leeds)\b|£/i.test(q))return {reply:`I haven't confirmed that extra requirement for the places in this list. I haven't substituted different restaurants.`,sources:[],live:false,verification:'restaurant-followup-constraints',state};
 const guide=await discoverFoodGuide({diet});
 const candidates=entries.flatMap(e=>{
  const registered=RESTAURANT_MENU_SOURCES.find(s=>key(s.name)===key(e.name));
  return registered?[registered]:e.menuUrl?[{name:e.name,title:e.name,url:e.menuUrl}]:[];
 });
 const checked=candidates.length?await dietaryMenuAnswer(messages,candidates,[],diet):null;
 const menus=new Map((checked?.sources||[]).map(s=>[key(s.title),s]));
 const matches=entries.filter(e=>menus.has(key(e.name))||guide.some(c=>key(c.name)===key(e.name)));
 const unknown=entries.filter(e=>!matches.includes(e));
 const sources=new Map();
 const lines=matches.map(e=>{
  const menu=menus.get(key(e.name));if(menu){sources.set(menu.url,menu);return `${e.name}\n[View ${diet} menu](${menu.url})`;}
  const c=guide.find(c=>key(c.name)===key(e.name)),url=c.vegetarianGuideUrl||c.guideUrl;
  sources.set(url,{title:'Yorkshire Food Guide — restaurant guide',url});
  return `${e.name} appears in Yorkshire Food Guide's ${diet}-friendly recommendations. I haven't checked its current menu.\n[Guide listing](${url})`;
 });
 const intro=matches.length?`From those places, here's what I could confirm:`:`I haven't confirmed ${diet} options for ${entries.map(e=>e.name).join(', ')||'the places in that list'}. That doesn't mean they don't offer them.`;
 const humanNames=items=>items.length<2?items[0]||'':items.slice(0,-1).join(', ')+' or '+items.at(-1);
 const caveat=matches.length&&unknown.length?`\n\nI haven't confirmed ${diet} menus for ${humanNames(unknown.map(e=>e.name))}. That doesn't mean they don't offer them.`:'';
 const next={...state,lastIntent:'food.filter_existing',constraints:{...state.constraints,foodSet:{...stored,viewNames:matches.map(e=>e.name)}}};
 return {reply:intro+(lines.length?'\n\n'+lines.join('\n\n'):'')+caveat,sources:[...sources.values()],live:!!sources.size,verification:'restaurant-filter-existing',state:next};
}
