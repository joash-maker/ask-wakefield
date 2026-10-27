import {load} from 'cheerio';
export const WAKEFIELD_FOOD_GUIDE='https://yorkshirefoodguide.co.uk/wakefield-restaurants/';
export const VEGETARIAN_FOOD_GUIDE='https://yorkshirefoodguide.co.uk/blog/vegetarian-restaurants/';
const key=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const areas=['West Bretton','Wentbridge','Pontefract','Castleford','Ossett','Horbury','Normanton','Hemsworth','Knottingley','South Elmsall','Wakefield'];
export function foodGuideLocality(messages){
 for(const message of messages.filter(m=>m.role==='user').slice().reverse()){
  const q=String(message.content||'');
  if(/\b(?:leeds|bradford|wetherby|sheffield|york|harrogate)\b/i.test(q))return null;
  const area=areas.slice(0,-1).find(area=>new RegExp('\\b'+area+'\\b','i').test(q));
  if(area)return area;
  if(/\bcity centre\b/i.test(q))return 'Wakefield city centre';
  if(/\bwakefield\b/i.test(q))return 'Wakefield district';
 }
 return 'Wakefield district';
}
export function parseWakefieldGuide(html){
 const $=load(html);$('script,style,nav,header,footer,form').remove();
 const cards=[];
 $('.best_restaurant_block').each((_,node)=>{
  const block=$(node).clone();block.find('.contentBlock,.woocommerce,.advertisement,.adsbygoogle').remove();
  const name=clean(block.find('h3').first().text());if(!name||/voucher|£|offer|save\s+\d/i.test(name))return;
  const text=clean(block.text());const postcode=text.match(/\bWF\d{1,2}\s*\d[A-Z]{2}\b/i);if(!postcode)return;
  const address=text.slice(Math.max(0,postcode.index-110),postcode.index+postcode[0].length);
  const localities=areas.filter(area=>new RegExp('\\b'+area+'\\b','i').test(address));
  if(/Yorkshire Sculpture Park/i.test(address)&&!localities.includes('West Bretton'))localities.unshift('West Bretton');
  if(!localities.length&&/^WF[12]\s/i.test(postcode[0]))localities.push('Wakefield');
  if(localities.length>1&&localities.includes('Wakefield'))localities.splice(localities.indexOf('Wakefield'),1);
  const area=localities.length?localities.join(', '):'Wakefield district';
  const detail=block.find('a[href]').map((_,a)=>$(a).attr('href')).get().find(h=>/^https:\/\/yorkshirefoodguide\.co\.uk\/restaurant\//.test(h))||null;
  const negated=/\b(?:no|not|without)\b[^.!?]{0,35}\b(?:vegetarian|vegan)\b/i.test(text);
  cards.push({name,area,localities,guideUrl:WAKEFIELD_FOOD_GUIDE,detailUrl:detail,vegetarianFriendly:!negated&&/\b(?:vegetarian|vegan)\b/i.test(text),veganFriendly:!negated&&/\bvegan\b/i.test(text)});
 });
 return cards;
}
export function addVegetarianGuide(html,cards){
 const $=load(html);$('script,style,nav,header,footer,form').remove();
 const byName=new Map(cards.map(c=>[key(c.name),c]));
 $('h3').each((_,node)=>{
  const name=clean($(node).text());if(!name||/voucher|£|offer|save\s+\d/i.test(name))return;
  const card=byName.get(key(name.split(',')[0]));if(!card)return;
  // Join by an exact venue name already located in the Wakefield guide, never by the regional heading.
  const section=clean($(node).nextUntil('h2,h3').text());
  if(/\b(?:not|no)\b[^.!?]{0,35}\bvegetarian\b/i.test(section))return;
  card.vegetarianFriendly=true;card.vegetarianGuideUrl=VEGETARIAN_FOOD_GUIDE;
  if(/\bvegan\b/i.test(section))card.veganFriendly=true;
 });
 return cards;
}
async function readGuide(url){
 try{
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'}});
  if(!response.ok)return null;
  const type=response.headers.get('content-type')||'';if(type&&!/html/i.test(type))return null;
  const html=await response.text();return html.length<=2_000_000?html:null;
 }catch{return null;}
}
export async function discoverFoodGuide({diet=null,locality='Wakefield district'}={}){
 const [main,vegetarian]=await Promise.all([readGuide(WAKEFIELD_FOOD_GUIDE),diet?readGuide(VEGETARIAN_FOOD_GUIDE):Promise.resolve(null)]);
 if(!main)return [];
 const cards=parseWakefieldGuide(main);if(vegetarian)addVegetarianGuide(vegetarian,cards);
 return cards.filter(c=>(locality==='Wakefield district'||(locality==='Wakefield city centre'?c.localities[0]==='Wakefield':c.localities[0]===locality))&&(!diet||(diet==='vegan'?c.veganFriendly:c.vegetarianFriendly)));
}
export function guideRestaurantReply(cards,menus,diet){
 const checked=new Map((menus?.sources||[]).map(s=>[key(s.title),s]));
 const picks=cards.slice(0,3);
 const lines=picks.map(c=>{
  const menu=checked.get(key(c.name));
  const guide=c.vegetarianGuideUrl||c.guideUrl;
  return `${c.name} · ${c.area}\n${menu?`[View ${diet||'restaurant'} menu](${menu.url})`:`[Yorkshire Food Guide listing](${guide})${diet?". I haven't checked its current menu.":''}`}`;
 });
 // A checked option outside the guide is clearly distinguished from the guide's recommendations.
 const extras=(menus?.sources||[]).filter(s=>!picks.some(c=>key(c.name)===key(s.title))).slice(0,Math.max(0,3-picks.length));
 for(const s of extras)lines.push(`I also checked ${s.title}'s own ${diet} menu:\n[View menu](${s.url})`);
 const intro=diet?`Yorkshire Food Guide features these ${diet}-friendly options in the Wakefield district:`:'Yorkshire Food Guide features these restaurants in the Wakefield district:';
 const sourceMap=new Map();
 for(const c of picks){const url=c.vegetarianGuideUrl||c.guideUrl;sourceMap.set(url,{title:'Yorkshire Food Guide — '+(c.vegetarianGuideUrl?'vegetarian-friendly restaurants':'Wakefield restaurants'),url});const m=checked.get(key(c.name));if(m)sourceMap.set(m.url,m);}
 for(const s of extras)sourceMap.set(s.url,s);
 return {reply:intro+'\n\n'+lines.join('\n\n')+(diet?'':"\n\nThese are the guide's recommendations. I haven't checked today's opening times or table availability."),sources:[...sourceMap.values()],live:true,verification:'food-guide-discovery'};
}
