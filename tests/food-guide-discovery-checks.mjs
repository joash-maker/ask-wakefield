import assert from 'node:assert/strict';
import {dietaryMenuAnswer} from '../lib/practical-answers.js';
import {parseWakefieldGuide,addVegetarianGuide,WAKEFIELD_FOOD_GUIDE,VEGETARIAN_FOOD_GUIDE} from '../lib/yorkshire-food-guide.js';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
const block=(name,body)=>`<div class="best_restaurant_block"><h3>${name}</h3>${body}</div>`;
const main='<nav>Vegan restaurants in Leeds</nav>'+block('The Weston','<p>Restaurant at Yorkshire Sculpture Park, West Bretton, WF4 4LG</p>')+block('TET','<p>Thai restaurant. Cross Square, Wakefield WF1 1PQ</p><div class="contentBlock"><h3>TET vegetarian restaurant voucher</h3><p>Vegan meal deals from £5</p></div>')+block('Corarima','<p>Restaurant Vegan Vegetarian</p><p>10 Cross Street, Wakefield WF1 3BW</p>')+block('Malagor','<p>Thai restaurant, Queens Drive, Ossett WF5 0NH</p>')+block('Wrong city','<p>Leeds LS1 1AA</p>')+'<div class="contentBlock"><h3>Vegan Sheffield Voucher</h3><p>Wakefield WF1 1AA</p></div>';
const veg='<h1>Vegetarian-friendly restaurants</h1><h2>West Yorkshire</h2><h3>Leeds Spot, Leeds</h3><p>Vegan restaurant</p><h3>Corarima, Wakefield</h3><p>Vegetarian and vegan dishes</p><h3>The Weston, Yorkshire Sculpture Park</h3><p>Seasonal restaurant dishes.</p><h3>Mango, Wetherby</h3><p>Vegetarian food</p>';
const cards=addVegetarianGuide(veg,parseWakefieldGuide(main));
assert.deepEqual(cards.map(c=>c.name),['The Weston','TET','Corarima','Malagor']);
assert.equal(cards.find(c=>c.name==='TET').vegetarianFriendly,false,'An adjacent voucher must not supply dietary evidence');
assert.equal(cards.find(c=>c.name==='The Weston').vegetarianFriendly,true);
assert.equal(cards.find(c=>c.name==='The Weston').veganFriendly,false,'Vegetarian guide membership does not establish vegan suitability');
let calls=[],guideAvailable=true,modelCalls=0;
globalThis.fetch=async(url)=>{
 calls.push(String(url));
 if(String(url).includes('anthropic.com')){modelCalls++;throw new Error('Guide-backed replies should not need model guesses');}
 if(url===WAKEFIELD_FOOD_GUIDE)return new Response(guideAvailable?main:'Unavailable',{status:guideAvailable?200:503,headers:{'content-type':'text/html'}});
 if(url===VEGETARIAN_FOOD_GUIDE)return new Response(veg,{headers:{'content-type':'text/html'}});
 if(String(url).includes('bridgeinnwakefield.co.uk'))return new Response('<main><h1>The Bridge Inn vegetarian menu</h1><p>Vegetarian dishes in Wakefield.</p></main>');
 if(String(url).includes('corarima.co.uk'))return new Response('<main><h1>Corarima menu</h1><p>Vegan and vegetarian dishes in Wakefield.</p></main>');
 return new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');let i=0;
async function ask(q,prior=[]){
 const res={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'guide-'+(++i)},socket:{},body:{messages:[...prior,{role:'user',content:q}]}},res);
 assert.equal(res.code,200);return res.body;
}
assert.equal(await dietaryMenuAnswer([{role:'user',content:'Vegetarian restaurants open tonight?'}],[]),null,'Menu-only rendering must not discard an opening-hours constraint');
const first=await ask('Where can we eat vegetarian food in Wakefield?');
assert.equal(first.verification,'food-guide-discovery');assert.equal(first.state.lastIntent,'food.discovery');assert.equal(first.state.resultCards.length,0);assert.match(first.reply,/The Weston/);assert.match(first.reply,/Corarima/);assert.match(first.reply,/The Bridge Inn/);
assert.match(first.reply,/Yorkshire Food Guide/);assert.match(first.reply,/haven't checked its current menu/);
assert.doesNotMatch(first.reply,/Leeds Spot|Mango|Wrong city|TET|£5|Vegan Sheffield/);
assert.ok(first.sources.some(s=>s.url===VEGETARIAN_FOOD_GUIDE));
assert.ok(first.sources.some(s=>s.url.includes('corarima.co.uk')));
assert.ok(!first.sources.some(s=>s.url.includes('weston.co.uk')),'Do not invent a restaurant website');
const second=await ask('Which restaurants in Wakefield serve vegetarian options?');assert.equal(second.reply,first.reply);
const general=await ask('Where are popular restaurants in Wakefield?');assert.equal(general.verification,'food-guide-discovery');assert.match(general.reply,/The Weston/);assert.match(general.reply,/TET/);assert.match(general.reply,/recommendations/);assert.doesNotMatch(general.reply,/£|open now|most popular/);
const refined=await ask('Which restaurants in Wakefield have those options?',[{role:'user',content:'Where can we eat vegetarian food in Wakefield?'},{role:'assistant',content:first.reply}]);assert.doesNotMatch(refined.reply,/TET/);
const town=await ask('Best restaurants in Ossett?');assert.match(town.reply,/Malagor/);assert.doesNotMatch(town.reply,/Corarima|The Weston|TET/);
const centre=await ask('Best restaurants in Wakefield city centre?');assert.doesNotMatch(centre.reply,/The Weston|Malagor/);
const vegan=await ask('Which vegan restaurants are in Wakefield?');assert.doesNotMatch(vegan.reply,/The Weston/);assert.match(vegan.reply,/Corarima/);
guideAvailable=false;const degraded=await ask('Where can we eat vegetarian food in Wakefield?');assert.equal(degraded.verification,'dietary-menu-pages');assert.doesNotMatch(degraded.reply,/Yorkshire Food Guide|The Weston/);assert.match(degraded.reply,/Corarima/);
assert.equal(modelCalls,0);assert.ok(calls.includes(WAKEFIELD_FOOD_GUIDE));
console.log('Food guide checks passed: new discovery, attributed leads versus checked menus, offer isolation, exact venue joins, geography, vegan distinction, paraphrases and source failure.');
