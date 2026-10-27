import assert from 'node:assert/strict';
import {isFoodDrinkDiscovery,useBroadFoodDiscovery,foodDrinkSearchAnswer} from '../lib/food-drink-discovery.js';
const user=content=>({role:'user',content});
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
let mode='good',bodies=[];
const places=[{name:'Test Coffee House',area:'Wakefield',category:'cafe',url:'https://coffee.test/about',sourceKind:'official'},{name:'Test Tap',area:'Ossett',category:'taproom',url:'https://tap.test/about',sourceKind:'official'}];
const citations=places.map(p=>({url:p.url,title:p.name,cited_text:`${p.name} is an independent ${p.category} in ${p.area}.`}));
globalThis.fetch=async(url,options)=>{
 if(String(url).includes('anthropic.com')){
  const body=JSON.parse(options.body);bodies.push(body);
  const picks=/coffee|caf[eé]/i.test(body.messages.at(-1).content)&&!/drink/i.test(body.messages.at(-1).content)?[places[0]]:places;
  return new Response(JSON.stringify({content:[...(mode==='no-search'?[]:[{type:'web_search_tool_result',content:[]}]),{type:'text',text:'FINAL_RESPONSE: '+(mode==='malformed'?'some unsupported prose':JSON.stringify({places:picks})),citations:mode==='no-proof'?citations.map(c=>({...c,cited_text:''})):citations}]}));
 }
 return new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');let i=0;
async function ask(q,previous=null){
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 const messages=[...(previous?.messages||[]),user(q)];
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'food-drink-'+(++i)},socket:{},body:{messages,stateToken:previous?.stateToken}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
for(const q of ['Where would you recommend eating in Wakefield?','Independent coffee shops in Wakefield?','Cafes in Wakefield?','Where can I go out for a drink?','Any good pubs in Ossett?','Somewhere unusual to eat?']){
 assert.ok(isFoodDrinkDiscovery([user(q)]),q);assert.ok(useBroadFoodDiscovery([user(q)]),q);
 const r=await ask(q);assert.equal(r.verification,'food-drink-discovery',q);assert.ok(r.stateToken);
 assert.equal(bodies.at(-1).tools[0].allowed_domains,undefined);assert.equal(bodies.at(-1).tool_choice.type,'any');
 assert.match(bodies.at(-1).system,/beyond Yorkshire Food Guide/);
 if(/coffee|Cafes/.test(q)){assert.match(r.reply,/Test Coffee House/);assert.doesNotMatch(r.reply,/Test Tap/);}
 if(/Ossett/.test(q)){assert.match(r.reply,/Test Tap/);assert.doesNotMatch(r.reply,/Test Coffee House/);}
}
const initial=await ask('Where would you recommend eating in Wakefield?');
const follow=await ask('Which of those have vegetarian options?',initial);
assert.equal(follow.verification,'restaurant-filter-existing');assert.doesNotMatch(follow.reply,/Corarima|Bridge Inn/);
for(const m of ['no-search','no-proof','malformed']){mode=m;const r=await ask('Where would you recommend eating in Wakefield?');assert.equal(r.live,false);assert.equal(r.sources.length,0);assert.doesNotMatch(r.reply,/Test Coffee House|"places"/);}
for(const q of ['Vegetarian restaurants in Wakefield?','Restaurants open tonight?','Restaurants under £20?','Dog-friendly cafes in Wakefield?','Restaurants from Yorkshire Food Guide?'])assert.equal(useBroadFoodDiscovery([user(q)]),false,q);
assert.equal(useBroadFoodDiscovery([user('How do I display a parking ticket?')]),false);
const sources=citations.map(({url,title})=>({url,title})),evidence=citations.map(c=>({url:c.url,text:c.cited_text}));
const wrong={places:[{...places[0],area:'Leeds'}, {...places[0],url:'https://invented.test/'}]};
assert.equal(foodDrinkSearchAnswer(JSON.stringify(wrong),sources,evidence,[user('Coffee in Wakefield?')]),null);
console.log('Food/drink discovery checks passed: categories, fresh search, open domains, locality, signed list follow-up, constraints and unverified/malformed failures.');
