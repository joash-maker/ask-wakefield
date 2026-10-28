import assert from 'node:assert/strict';
import {menuHighlights,renderMenuSuggestions,foodChoiceFollowUp,renderFoodSuggestions} from '../lib/food-voice.js';
import {restaurantSetState} from '../lib/restaurant-followups.js';
const user=content=>({role:'user',content});
assert.deepEqual(menuHighlights('We have chicken pizza and beef pasta. Vegetarian options are listed separately.','vegetarian'),[],'Do not attach the diet to unrelated dishes');
assert.deepEqual(menuHighlights('Vegetarian pizza and vegan pasta.','vegetarian'),['vegetarian pizzas','vegan pasta']);
assert.deepEqual(menuHighlights('Vegetarian pizza is available.','vegan'),[]);
assert.deepEqual(menuHighlights('No vegetarian pizza is available.','vegetarian'),[]);
assert.deepEqual(menuHighlights('', 'vegetarian',[{heading:'Vegetarian mains',text:'Pasta and curries'},{heading:'Meat menu',text:'Pizza'}]),['vegetarian pasta','vegetarian curries']);
assert.deepEqual(menuHighlights('', 'vegan',[{heading:'Vegetarian mains',text:'Pasta and curries'}]),[]);
const menus=[
 {title:'Italian Place',cuisine:'Italian',url:'https://italian.co.uk/menu',via:'page',highlights:['vegetarian pizzas']},
 {title:'Dosa Place',cuisine:'South Indian',url:'https://dosa.co.uk/menu',via:'page',highlights:['vegetarian dosas']},
 {title:'Thai Place',cuisine:'Thai',url:'https://thai.co.uk/menu',via:'page',highlights:[]},
 {title:'Hidden Place',cuisine:'British',url:'https://hidden.co.uk/menu',via:'page',highlights:[]}
];
const rendered=renderMenuSuggestions(menus,{diet:'vegetarian'});
assert.equal(rendered.picks.length,3);assert.match(rendered.reply,/I'd start with these/);assert.match(rendered.reply,/vegetarian pizzas/);assert.match(rendered.reply,/Which sounds more appealing/);assert.doesNotMatch(rendered.reply,/Hidden Place|published vegetarian|These places publish|entirely vegetarian|perfect|best-rated|cheapest|—/);
assert.equal((rendered.reply.match(/\?/g)||[]).length,1);
const state=restaurantSetState({restaurantSet:rendered.picks.map(m=>({name:m.title,cuisine:m.cuisine,diet:'vegetarian',highlights:m.highlights,menuUrl:m.url}))},{});
const chosen=foodChoiceFollowUp([user('Which of those would you choose?')],state);
assert.equal(chosen.verification,'food-choice-existing');assert.match(chosen.reply,/If Italian appeals, I'd start with/);assert.match(chosen.reply,/South Indian/);assert.doesNotMatch(chosen.reply,/Hidden Place|Thai Place|best|cheapest|quiet|romantic/);
assert.deepEqual(chosen.state.constraints.foodSet.viewNames,['Italian Place','Dosa Place']);
assert.deepEqual(chosen.sources.map(s=>s.title),chosen.state.constraints.foodSet.viewNames);
for(const phrase of ['Italian please',"I'd prefer Italian",'Italian sounds good','The Italian one'])assert.equal(foodChoiceFollowUp([user(phrase)],state)?.verification,'food-choice-existing',phrase);
const italian=foodChoiceFollowUp([user('Italian please')],state);assert.equal(italian.sources.length,1);assert.match(italian.reply,/Italian Place/);assert.doesNotMatch(italian.reply,/Dosa Place|Thai Place/);assert.deepEqual(italian.state.constraints.foodSet.viewNames,['Italian Place']);
assert.equal(foodChoiceFollowUp([user('Japanese please')],state),null,'A new cuisine may use fresh discovery');
const missing=foodChoiceFollowUp([user('Which would you choose for Japanese food?')],state);assert.equal(missing.verification,'food-choice-unconfirmed');assert.doesNotMatch(missing.reply,/I'd start/);
for(const q of ['Which would you choose for a nut allergy?','Which is best for kids?','Which would you choose under £20?','Which would you choose tonight?','Which is best for a quiet meal?','Which would you choose for wheelchair access?'])assert.equal(foodChoiceFollowUp([user(q)],state),null,q);
assert.equal(foodChoiceFollowUp([user('Which would you choose?')],null),null);
const excerpt=renderMenuSuggestions([{...menus[0],via:'search'}],{diet:'vegetarian'});assert.match(excerpt.reply,/couldn't open the full page/);assert.match(excerpt.reply,/Menu excerpt/);
const exclusive=renderMenuSuggestions(menus,{diet:'vegetarian',exclusive:true});assert.match(exclusive.reply,/haven't confirmed which places are entirely vegetarian/);
const broad=renderFoodSuggestions([{name:'Cafe',area:'Ossett',category:'cafe',url:'https://cafe.co.uk',guide:false},{name:'Pub',area:'Horbury',category:'pub',url:'https://pub.co.uk',guide:true}], 'Where can we eat?');assert.match(broad.reply,/for coffee in Ossett/);assert.match(broad.reply,/Guide listing/);assert.doesNotMatch(broad.reply,/open now|cheap|best|—/);
// Exercise the actual API/token boundary, not just the renderer.
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';let modelCalls=0;
globalThis.fetch=async(url,opts)=>{
 if(String(url).includes('anthropic.com')){modelCalls++;return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+JSON.stringify({menus:menus.slice(0,3).map(m=>({name:m.title,url:m.url}))}),citations:menus.slice(0,3).map(m=>({url:m.url,title:m.title,cited_text:m.title+' Wakefield vegetarian menu.'}))}]}));}
 const menu=menus.find(m=>m.url===String(url));
 return menu?new Response(`<title>${menu.title}</title><main><h1>${menu.title}</h1><p>${menu.cuisine} restaurant menu, with ${menu.highlights[0]||'vegetarian options'}.</p></main><footer>Wakefield WF1 1AA</footer>`):new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');let count=0;
async function ask(q,previous){const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'voice-'+(++count)},socket:{},body:{messages,stateToken:previous?.stateToken}},res);assert.equal(res.code,200);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};}
const first=await ask('Where can we eat vegetarian food in Wakefield?');assert.equal(first.verification,'dietary-menu-pages');assert.ok(first.stateToken);assert.equal(first.sources.length,3);assert.equal(first.state.constraints.foodSet.entries.length,3);assert.match(first.reply,/vegetarian pizzas/);
const callsBefore=modelCalls;const answer=await ask('Which would you choose?',first);assert.equal(answer.verification,'food-choice-existing');assert.equal(modelCalls,callsBefore,'Choosing from checked facts must not invoke another model/search');assert.match(answer.reply,/Italian Place/);assert.equal(answer.sources.length,2);
const narrowed=await ask("I'd prefer Italian",answer);assert.equal(narrowed.verification,'food-choice-existing');assert.deepEqual(narrowed.state.constraints.foodSet.viewNames,['Italian Place']);assert.equal(modelCalls,callsBefore);
console.log('Food voice checks passed: evidence-based reasons, shortlists, one useful question, menu-specific highlights, no inferred dietary dishes, signed choices, cuisine preference continuity, matching visible state and no extra model calls.');
