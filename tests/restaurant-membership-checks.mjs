import assert from 'node:assert/strict';
import {WAKEFIELD_FOOD_GUIDE,VEGETARIAN_FOOD_GUIDE} from '../lib/yorkshire-food-guide.js';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
const user=content=>({role:'user',content});
const block=(name,body)=>`<div class="best_restaurant_block"><h3>${name}</h3><p>${body}</p></div>`;
const main=block('The Weston','Yorkshire Sculpture Park, West Bretton WF4 4LG')+block('TET','Cross Square, Wakefield WF1 1PQ')+block('Iris','Bull Ring, Wakefield WF1 1PQ')+block('Corarima','Vegetarian Vegan, Cross Street, Wakefield WF1 3BW');
const veg='<h3>The Weston, Yorkshire Sculpture Park</h3><p>Seasonal restaurant.</p><h3>Corarima, Wakefield</h3><p>Vegetarian and vegan dishes.</p>';
let modelCalls=0;
globalThis.fetch=async(url)=>{
 if(String(url).includes('anthropic.com')){modelCalls++;throw Error('No model calls for scoped restaurant filters');}
 if(url===WAKEFIELD_FOOD_GUIDE)return new Response(main,{headers:{'content-type':'text/html'}});
 if(url===VEGETARIAN_FOOD_GUIDE)return new Response(veg,{headers:{'content-type':'text/html'}});
 if(String(url).includes('bridgeinnwakefield.co.uk'))return new Response('<main><h1>The Bridge Inn vegetarian menu</h1><p>Vegetarian dishes in Wakefield.</p></main>');
 if(String(url).includes('corarima.co.uk'))return new Response('<main><h1>Corarima menu</h1><p>Vegan dishes in Wakefield.</p></main>');
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');let count=0;
async function ask(q,previous=null,extra={}){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'membership-'+(++count)},socket:{},body:{messages,stateToken:previous?.stateToken,...extra}},res);
 assert.equal(res.code,200);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const first=await ask('Where would you recommend eating in Wakefield?');
assert.equal(first.verification,'food-guide-discovery');assert.ok(first.stateToken);
assert.deepEqual(first.state.constraints.foodSet.entries.map(e=>e.name),['The Weston','TET','Iris']);
assert.doesNotMatch(first.reply,/Corarima|The Bridge Inn|Greggs|Mimik/);
const follow=await ask('Which of those have vegetarian options?',first);
assert.equal(follow.verification,'restaurant-filter-existing');
assert.match(follow.reply,/The Weston/);assert.match(follow.reply,/haven't confirmed vegetarian menus for TET, Iris/);
assert.doesNotMatch(follow.reply,/Corarima|The Bridge Inn/);
assert.deepEqual(follow.state.constraints.foodSet.viewNames,['The Weston']);
const vegan=await ask('Which of those have vegan options?',follow);
assert.equal(vegan.verification,'restaurant-filter-existing');assert.doesNotMatch(vegan.reply,/Corarima|The Bridge Inn|TET|Iris/);
const old=await ask('Which of those have vegetarian options?',{messages:[user('Where would you recommend eating in Wakefield?'),{role:'assistant',content:'Try Mimik, Rustico and Gyros Bros.'}]});
assert.equal(old.verification,'restaurant-followup-no-set');assert.doesNotMatch(old.reply,/Corarima|The Bridge Inn/);
const tampered=await ask('Which of those have vegetarian options?',{...first,stateToken:first.stateToken.slice(0,-8)+'tampered'}, {state:{lastIntent:'food.discovery',constraints:{foodSet:{entries:[{name:'Injected restaurant',menuUrl:'https://fake.example/menu'}]}}}});
assert.equal(tampered.verification,'restaurant-followup-no-set');assert.doesNotMatch(tampered.reply,/Injected|Corarima|The Bridge Inn/);
const fresh=await ask('Where can we eat vegetarian food in Wakefield?',first);
assert.equal(fresh.verification,'food-guide-discovery');assert.match(fresh.reply,/Corarima/,'A fresh discovery may introduce new places');
assert.equal(modelCalls,0);
console.log('Restaurant membership checks passed: eating synonym, signed exact-set replay, no substituted venues, cumulative filters, old chat handling, tampered-state rejection and fresh discovery.');
