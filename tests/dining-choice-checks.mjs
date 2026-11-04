import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {renderDiningChoices,isDiningRequest,previousDiningChoices} from '../lib/local-dining.js';
import {continuesRequest} from '../lib/request-context.js';
const fixtures=[
 {name:'District Steakhouse',url:'https://district-steak.co.uk/menu',address:'270 Wakefield Road, Wakefield',services:['Rump Steak']},
 {name:'Central Kitchen',url:'https://central-kitchen.co.uk/menu',address:'25 Northgate, Wakefield',services:['Classic Burger']},
 {name:'Central Grill',url:'https://central-grill.co.uk/menu',address:'10 Westgate, Wakefield',services:['Fillet Steak']},
 {name:'Another Kitchen',url:'https://another-kitchen.co.uk/menu',address:'12 Wood Street, Wakefield',services:['Cheese Burger']}
];
let mode='normal';
const recovery={name:'Smokehouse',url:'https://smokehousewakefield.co.uk/smokehouse-menus/',address:'18 Wood Street, Wakefield',services:['Jerk Chicken Burger','10oz Rib Eye']};
https.request=(url,options,callback)=>{
 const req=new EventEmitter();req.destroy=e=>{req.emit('error',e);req.emit('close');};
 req.end=()=>queueMicrotask(()=>{const p=fixtures.find(p=>p.url===String(url))||(mode==='recovery'&&String(url)===recovery.url?recovery:{name:'Unavailable',address:'',services:[]});const res=Readable.from([Buffer.from(`<html><title>${p.name}</title><body><h1>${p.name}</h1><p>${p.address}. ${p.services.join('. ')}.</p></body></html>`)]);res.statusCode=p.name==='Unavailable'?404:200;res.headers={'content-type':'text/html'};res.on('end',()=>req.emit('close'));callback(res);});return req;
};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.OPENAI_FAILSAFE_ENABLED='false';
let turn=0,bodies=[];
globalThis.fetch=async(url,opts)=>{
 if(!String(url).includes('api.anthropic.com'))return new Response('Unavailable',{status:404});
 const body=JSON.parse(opts.body);bodies.push(body);
 const rows=mode==='recovery'&&!body.tools?[recovery]:turn===1?fixtures.slice(0,2):turn===2?fixtures.slice(0,3):fixtures;
 return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+JSON.stringify({businesses:rows}),citations:rows.map(p=>({url:p.url,title:p.name,cited_text:`${p.name}. ${p.address}. ${p.services.join('. ')}.`}))}]}));
};
const {default:handler}=await import('../api/chat.js');
async function ask(q,prior){turn++;const messages=[...(prior?.messages||[]),{role:'user',content:q}],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'dining-'+turn},socket:{},body:{messages:messages.slice(-10),stateToken:prior?.stateToken}},res);assert.equal(res.code,200);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};}
let a=await ask("I'm feeling ravenous, good place for a nice burger or steak?");
assert.equal(a.verification,'dining-menu-choices');assert.equal(a.sources.length,2);assert.match(a.reply,/For a burger.*Central Kitchen.*For steak.*District Steakhouse/s);assert.doesNotMatch(a.reply,/Business details|service you’re looking for|28-day|open|£/);
a=await ask('Any around the city centre?',a);
assert.equal(a.state.constraints.requestFrame.area,'Wakefield city centre');assert.match(a.state.constraints.requestFrame.localQuestion,/burger or steak/);assert.equal(a.verification,'dining-menu-choices');assert.deepEqual(a.sources.map(p=>p.title),['Central Kitchen','Central Grill']);assert.doesNotMatch(a.reply,/District Steakhouse/);
a=await ask("I'm sure there must be more choices and restaurants that do burgers or steaks?",a);
assert.equal(a.verification,'dining-menu-choices');assert.deepEqual(a.sources.map(p=>p.title),['Another Kitchen']);assert.equal(a.state.constraints.requestFrame.area,'Wakefield city centre');assert.ok(bodies.at(-1).system.includes('Already shown dining choices'));assert.match(a.reply,/another option in the city centre/);
const remembered=previousDiningChoices([{role:'user',content:'Any around the city centre?'}],{...a.state,lastIntent:'local.dining'});
assert.ok(remembered);assert.match(remembered.reply,/menus checked earlier/);assert.equal(remembered.live,false);assert.equal(previousDiningChoices([],{constraints:{diningCheckedAt:Date.now()-31*60*1000,diningChoices:[]}}),null);
assert.equal(continuesRequest('Any around the city centre?',{topic:'local',localDining:true}),true);
assert.equal(isDiningRequest('Where can I get my bike repaired?'),false);
assert.equal(continuesRequest('Any barbers in Wakefield?',{topic:'local',localDining:true}),false,'A different subject must clear dining state');
const state={constraints:{requestFrame:{localDining:true,area:'Wakefield city centre',localQuestion:'burger or steak'}}};
const duplicate=renderDiningChoices([{...fixtures[1],lead:false},{...fixtures[1],url:'https://central-kitchen.co.uk/other-menu',lead:false}],[{role:'user',content:'burger'}],state);assert.equal(duplicate.sources.length,1,'The same restaurant on different menu URLs is one choice');
assert.equal(renderDiningChoices([{name:'Remote Place',url:'https://remote.co.uk',services:['Rump Steak'],address:'270 Wakefield Road, Wakefield'}],[{role:'user',content:'Any around the city centre?'}],state),null);
assert.equal(renderDiningChoices([{name:'Central Kitchen',url:'https://central-kitchen.co.uk/menu',services:['Classic Burger'],address:'25 Northgate, Wakefield'}],[],{constraints:{requestFrame:{localDining:true,localQuestion:'burger',budget:15}}}),null,'A menu title cannot establish an in-budget meal');
assert.equal(renderDiningChoices([{name:'Cafe',url:'https://cafe.co.uk',services:['Tea'],address:'25 Northgate, Wakefield'}],[],state),null);
mode='recovery';
const recovered=await ask('Any more choices?',a);
assert.equal(recovered.verification,'dining-menu-choices');assert.deepEqual(recovered.sources.map(p=>p.title),['Smokehouse']);assert.match(recovered.reply,/Jerk Chicken Burger/);
mode='normal';
const preference=await ask('Steak please',a);
assert.equal(preference.verification,'dining-menu-choices');assert.equal(preference.state.constraints.requestFrame.diningPreference,'steak');assert.equal(preference.state.constraints.requestFrame.area,'Wakefield city centre');assert.deepEqual(preference.sources.map(p=>p.title),['Central Grill']);assert.doesNotMatch(preference.reply,/Classic Burger|Which are you leaning/);
const fresh=await ask('Where can I get my bike repaired in Wakefield?',a);assert.ok(!fresh.state.constraints.requestFrame.localDining,'A fresh non-dining request clears food preferences');
console.log('Dining choices: exact three-turn conversation, evidence-led choice, central area, fresh alternatives and topic reset passed.');

for(const q of ['Give a few suggestions for burgers in Wakefield city centre?', 'Burger recommendations in Wakefield?', 'Suggest restaurants for steak in Wakefield', 'Places for cheeseburgers in Wakefield?'])assert.equal(isDiningRequest(q),true,q);
const suggestions=await ask('Give a few suggestions for burgers in Wakefield city centre?');
assert.equal(suggestions.verification,'dining-menu-choices');assert.equal(suggestions.state.constraints.requestFrame.area,'Wakefield city centre');assert.ok(suggestions.sources.length>=2);assert.doesNotMatch(suggestions.reply,/business publishes|Business details|service you’re looking for/i);
