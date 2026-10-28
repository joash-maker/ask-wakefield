import {CUISINES,cuisinePreference} from './dietary-discovery.js';
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/[\[\]\\\r\n<>*`]/g,' ').replace(/\s+/g,' ').trim();
const joined=(items,word='or')=>items.length<2?items[0]||'':items.length===2?items.join(' '+word+' '):items.slice(0,-1).join(', ')+' '+word+' '+items.at(-1);
const foods=[['pizzas','pizza(?:s)?'],['pasta','pasta'],['curries','curr(?:y|ies)'],['dosas','dosa(?:s)?'],['burgers','burger(?:s)?'],['meze','me[sz]ze'],['salads','salad(?:s)?'],['ramen','ramen']];
export function menuHighlights(text,diet,sections=[]){
 const result=[];
 const add=(label,name)=>{const value=label.toLowerCase()+' '+name;if(!result.includes(value))result.push(value);};
 for(const label of diet==='vegan'?['vegan']:['vegetarian','vegan']){
  for(const [name,pattern] of foods){
   const positive=new RegExp('\\b'+label+'\\s+(?:friendly\\s+)?'+pattern+'\\b','i');
   if(positive.test(text)&&!new RegExp('\\b(?:no|not|without|unavailable)\\b[^.!?]{0,25}'+label+'\\s+'+pattern,'i').test(text))add(label,name);
  }
  for(const section of sections){
   if(!new RegExp('^\\s*'+label+'(?:\\s+(?:menu|options|dishes|mains|starters))?\\s*$','i').test(section.heading))continue;
   for(const [name,pattern] of foods){
    if(new RegExp('\\b'+pattern+'\\b','i').test(section.text)&&!new RegExp('\\b(?:no|not|without|unavailable)\\b[^.!?]{0,25}'+pattern,'i').test(section.text))add(label,name);
   }
  }
 }
 return result.slice(0,2);
}
function menuReason(item,diet){
 const dishes=(item.highlights||[]).slice(0,2);
 if(dishes.length)return (item.cuisine?item.cuisine+' food, including ':'')+joined(dishes,'and');
 return item.cuisine?item.cuisine+' food with '+diet+' options':diet[0].toUpperCase()+diet.slice(1)+' options on the menu';
}
function choiceQuestion(items){
 const cuisines=[...new Set(items.map(m=>m.cuisine).filter(Boolean))];
 if(cuisines.length>1)return `Which sounds more appealing: ${joined(cuisines)}?`;
 const hints=[...new Set(items.flatMap(m=>m.highlights||[]))];
 if(hints.length>1)return `Are you more in the mood for ${joined(hints.slice(0,3))}?`;
 if(items.length>1)return 'Would you like to choose by area or by what’s on the menu?';
 return '';
}
export function renderMenuSuggestions(menus,{diet='vegetarian',exclusive=false,refinement=false}={}){
 const picks=menus.slice(0,3);
 const cuisine=picks[0]?.cuisine;
 const intro=exclusive?`These menus have ${diet} options, but I haven't confirmed which places are entirely ${diet}.`:refinement&&cuisine?`For ${cuisine}, I'd look at ${picks.length===1?'this place':'these'}:`:picks.length===1?`This ${cuisine?cuisine+' ':''}place has ${diet} options:`:`For ${diet} food, I'd start with these:`;
 const lines=picks.map(m=>`**${clean(m.title)}**: ${menuReason(m,diet)}. [${m.via==='search'?'Menu excerpt':'See options'}](${m.url})`);
 const question=choiceQuestion(picks);
 const disclosure=picks.some(m=>m.via==='search')?"I couldn't open the full page for every option, so some details come from a menu search excerpt.":'';
 return {picks,reply:[intro,lines.join('\n\n'),disclosure,question].filter(Boolean).join('\n\n')};
}
const categoryReason={cafe:'for coffee',restaurant:'for a meal',pub:'for a pub visit',bar:'for a drink',taproom:'for a taproom visit','food venue':'for something to eat'};
export function renderFoodSuggestions(items,q){
 const picks=items.slice(0,3);
 const intro=picks.length===1?'One place to look at:':'Here are a few places I’d look at:';
 const lines=picks.map(p=>`**${clean(p.name)}** ${categoryReason[p.category]||'for food'} in ${clean(p.area)}. [${p.guide?'Guide listing':'Venue details'}](${p.url})`);
 const categories=[...new Set(picks.map(p=>p.category))];
 const styles=[...new Set(categories.map(c=>({cafe:'a coffee stop',restaurant:'a meal',pub:'a pub visit',bar:'a drink',taproom:'a drink','food venue':'something to eat'})[c]))];
 const areas=[...new Set(picks.map(p=>p.area))];
 const question=styles.length>1?`Are you thinking more of ${joined(styles)}?`:areas.length>1?`Would you rather be in ${joined(areas)}?`:'';
 const unique=/\b(?:unique|unusual|quirky|different)\b/i.test(q)?"I haven't confirmed what makes each place unusual yet.":'';
 return {picks,reply:[intro,lines.join('\n\n'),unique,question].filter(Boolean).join('\n\n')};
}
export function foodChoiceFollowUp(messages,state){
 const q=String(messages.filter(m=>m.role==='user').at(-1)?.content||'').trim();
 const stored=state?.constraints?.foodSet;if(!stored?.entries?.length)return null;
 const plainCuisine=cuisinePreference(q);
 const plainArea=stored.entries.find(e=>e.area&&norm(q.replace(/\bplease\b/ig,''))===norm(e.area))?.area;
 const choiceQuestion=/\b(?:which would you|which should (?:i|we)|what would you (?:choose|pick|recommend)|help (?:me|us) (?:choose|decide)|can['’]?t decide|what['’]s the difference|compare (?:those|them|these)|which is (?:best|better)|which one (?:would|should|do you|is best|is better)|which of (?:those|these|them) would you)\b|^which one[?.!]*$/i.test(q);
 if(!plainCuisine&&!plainArea&&!choiceQuestion)return null;
 // New operational requirements need their own evidence, rather than a warmer guess.
 if(/\b(?:open|tonight|today|tomorrow|weekend|price|cost|cheap|budget|under|free|parking|allerg\w*|coeliac|gluten|halal|accessible|wheelchair|dog|kids?|children|romantic|quiet|lively|reviews?|ratings?|best[- ]rated)\b|£/i.test(q))return null;
 const names=new Set((stored.viewNames||stored.entries.map(e=>e.name)).map(norm));
 let entries=stored.entries.filter(e=>names.has(norm(e.name)));if(!entries.length)return null;
 const diet=/\bvegan\b/i.test(q)?'vegan':/\bvegetarian\b/i.test(q)?'vegetarian':null;
 if(diet&&entries.some(e=>e.diet&&e.diet!==diet))return null;
 const requested=plainCuisine||CUISINES.find(c=>new RegExp('\\b'+c+'\\b','i').test(q));
 if(requested&&!entries.some(e=>e.cuisine===requested)){
  if(plainCuisine)return null; // A new preference may trigger fresh discovery.
  return {reply:`I haven't confirmed ${requested} food among those places. The cuisines I checked here are ${joined([...new Set(entries.map(e=>e.cuisine).filter(Boolean))])||'still unclear'}.`,sources:[],live:false,verification:'food-choice-unconfirmed',state};
 }
 if(requested)entries=entries.filter(e=>e.cuisine===requested);
 if(plainArea)entries=entries.filter(e=>e.area===plainArea);
 const first=entries[0],alternative=entries.find(e=>e.cuisine&&e.cuisine!==first.cuisine);
 const link=e=>`[${clean(e.name)}](${e.menuUrl||e.guideUrl})`;
 let reply,shown=entries;
 if(alternative&&first.cuisine){
  shown=[first,alternative];
  reply=`If ${first.cuisine} appeals, I'd start with ${link(first)}${first.diet?': its menu has '+first.diet+' options':''}. If you'd rather have ${alternative.cuisine}, look at ${link(alternative)}.\n\nWhich of those cuisines do you fancy?`;
 }else if(entries.length===1){
  reply=`For ${first.cuisine||'that choice'}, I'd look at ${link(first)}${first.diet?'. Its menu has '+first.diet+' options':'. It matches the type of place you asked for'}.`;
 }else{
  const dishes=entries.filter(e=>e.highlights?.length);
  if(dishes.length){shown=dishes;reply=dishes.map(e=>`${link(e)} lists ${joined(e.highlights,'and')}.`).join('\n\n')+(dishes.length===1?'\n\nDoes that sound like what you fancy?':'\n\nDoes one of those sound more like what you fancy?');}
  else reply=`${joined(entries.map(link),'and')} ${entries.length===2?'both':'all'} have ${first.diet?first.diet+' options':first.category||'food options'}${first.cuisine?' for '+first.cuisine+' food':''}. I’d narrow it down by what you fancy eating or where you'd like to be.\n\nWhich matters more to you?`;
 }
 const sources=shown.map(e=>({title:e.name,url:e.menuUrl||e.guideUrl})).filter(e=>/^https:\/\//.test(e.url||''));
 const next={...state,lastIntent:'food.choose_existing',constraints:{...state.constraints,foodSet:{...stored,viewNames:shown.map(e=>e.name)}}};
 return {reply,sources,live:false,verification:'food-choice-existing',state:next};
}
