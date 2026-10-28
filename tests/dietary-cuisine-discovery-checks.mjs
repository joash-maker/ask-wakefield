import assert from 'node:assert/strict';
import {useDietaryDiscovery,dietarySearchCandidates} from '../lib/dietary-discovery.js';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
const user=content=>({role:'user',content});
const venues=[
 {name:'Test Indian Kitchen',area:'Wakefield',cuisine:'Indian',url:'https://indian-fixture.co.uk/menu',diet:'Vegetarian',meat:'Chicken tikka'},
 {name:'Test Thai Table',area:'Wakefield',cuisine:'Thai',url:'https://thai-fixture.co.uk/menu',diet:'Vegetarian',meat:'Beef noodles'},
 {name:'Test Italian House',area:'Ossett',cuisine:'Italian',url:'https://italian-fixture.co.uk/menu',diet:'Vegetarian',meat:'Meat lasagne'},
 {name:'Test Turkish Table',area:'Wakefield',cuisine:'Turkish',url:'https://turkish-fixture.co.uk/menu',diet:'Vegan',meat:'Lamb kebab'},
 {name:'Unconfirmed Japanese Place',area:'Wakefield',cuisine:'Japanese',url:'https://japanese-fixture.co.uk/menu',diet:'',meat:'Sushi menu'},
 {name:'Wrong Town Thai',area:'Leeds',cuisine:'Thai',url:'https://leeds-fixture.co.uk/menu',diet:'Vegetarian',meat:''}
];
let bodies=[],mode='normal',i=0;
globalThis.fetch=async(url,opts)=>{
 const href=String(url);
 if(href.includes('anthropic.com')){
  bodies.push(JSON.parse(opts.body));
  const citations=mode==='no-search'?[]:venues.map(v=>({url:v.url,title:v.name,cited_text:`${v.name} ${v.area} ${v.cuisine} restaurant menu ${v.diet? v.diet+' dishes listed.':''}`}));
  return new Response(JSON.stringify({content:[...(mode==='no-search'?[]:[{type:'web_search_tool_result',content:[]}]),{type:'text',text:'FINAL_RESPONSE: **```json\n'+JSON.stringify({menus:venues})+'\n```\nEvidence with citations.',citations}]}));
 }
 const v=venues.find(v=>v.url===href);
 if(v){
  if(mode==='pdf'&&v===venues[1])return new Response('%PDF fixture',{headers:{'content-type':'application/pdf'}});
  if(mode==='down')return new Response('Unavailable',{status:503});
  return new Response(`<html><head><title>${v.name} menu</title></head><body><main><h1>${v.name}</h1><p>${v.cuisine} restaurant menu. ${v.diet? v.diet+' dishes.':''} ${v.meat}</p></main><footer>${v.area} ${v.area==='Ossett'?'WF5 0AA':''}</footer></body></html>`);
 }
 return new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');
async function ask(q,previous){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'cuisine-'+(++i)},socket:{},body:{messages,stateToken:previous?.stateToken}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const all=await ask('Where can we eat vegetarian food in Wakefield?');
assert.equal(all.verification,'dietary-menu-pages');assert.ok(all.stateToken);
for(const name of ['Test Indian Kitchen','Test Thai Table','Test Turkish Table'])assert.match(all.reply,new RegExp(name));
assert.doesNotMatch(all.reply,/Unconfirmed Japanese|Wrong Town|Leeds/);
for(const cuisine of ['Indian','Thai','Turkish'])assert.match(all.reply,new RegExp(cuisine+' cuisine'));
assert.match(all.reply,/does not mean each restaurant is entirely vegetarian/);
assert.equal(bodies.at(-1).tools[0].allowed_domains,undefined);assert.equal(bodies.at(-1).tool_choice.type,'any');
assert.match(bodies.at(-1).system,/Vegetarian and vegan are dietary requirements, not cuisines/);
const more=await ask('Any others?',all);assert.equal(more.verification,'dietary-menu-unverified');assert.doesNotMatch(more.reply,/Test Indian|Test Thai|Test Italian|Test Turkish/,'More must not repeat the signed shortlist');
const thai=await ask('Any Thai restaurants with vegetarian options in Wakefield?');assert.equal(thai.verification,'dietary-menu-pages');assert.match(thai.reply,/Test Thai Table/);assert.doesNotMatch(thai.reply,/Indian|Italian|Turkish|Wrong Town/);
const ossett=await ask('Vegetarian restaurants in Ossett?');assert.equal(ossett.verification,'dietary-menu-pages');assert.match(ossett.reply,/Test Italian House/);assert.doesNotMatch(ossett.reply,/Test Thai Table|Test Indian/);
const vegan=await ask('Where can we eat vegan food in Wakefield?');assert.equal(vegan.verification,'dietary-menu-pages');assert.match(vegan.reply,/Test Turkish Table/);assert.doesNotMatch(vegan.reply,/Test Indian|Test Thai|Test Italian/);
const refined=await ask('What about Italian?',all);assert.equal(refined.verification,'dietary-menu-pages');assert.match(refined.reply,/Test Italian House/);assert.doesNotMatch(refined.reply,/Test Thai Table|Test Indian/);
const filtered=await ask('Which of those have vegan options?',all);assert.equal(filtered.verification,'restaurant-filter-existing');assert.match(filtered.reply,/Test Turkish Table/);assert.deepEqual(filtered.state.constraints.foodSet.viewNames,['Test Turkish Table']);
mode='pdf';const pdf=await ask('Any Thai restaurants with vegetarian options in Wakefield?');assert.equal(pdf.verification,'dietary-menu-search-evidence');assert.match(pdf.reply,/excerpt/);
mode='no-search';const failed=await ask('Where can we eat vegetarian food in Wakefield?');assert.equal(failed.live,false);assert.equal(failed.sources.length,0);assert.doesNotMatch(failed.reply,/Test Indian/);
for(const q of ['Vegetarian restaurants open tonight?','Vegetarian options under £20?','Vegetarian food suitable for a nut allergy?','Vegetarian-only restaurants?','What does Tanvi offer vegetarians?'])assert.equal(useDietaryDiscovery([user(q)]),false,q);
assert.equal(useDietaryDiscovery([user('Vegetarian food under £20?'),user('Any others?')]),false);
assert.equal(dietarySearchCandidates('{"menus":[{"name":"Injected","url":"https://invented.co.uk/menu"}]}',[]).length,0);
console.log('Dietary cuisine checks passed: fresh multi-cuisine search, mixed menus, actual menu proof, diet/cuisine/town refinements, signed membership, PDF excerpts, no-search failures and constraints.');
