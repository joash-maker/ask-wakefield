import {programmeConversation} from '../lib/event-conversation-voice.js';
import assert from 'node:assert/strict';
import {reconcileWeekCards} from '../lib/event-week-window.js';
import {outingTime} from '../lib/outing-time.js';
import {contextualOutingPlan,fallbackOutingPlan} from '../lib/outing-planner.js';
import {answerPlannedOuting} from '../lib/outing-food.js';
import {enrichSelectedOuting,planSelectedEvening} from '../lib/outing-companion.js';
import {verifyAnnouncement,discoverAnnouncements,ownedAnnouncementPages} from '../lib/outing-announcements.js';
const now=new Date('2026-11-14T12:00:00Z');
for(const [q,m] of [['What about half eight?',1230],['half past eight',1230],['quarter to nine',1245],['quarter past eight',1215],['eight thirty',1230],['8:30pm',1230],['at 20:30',1230],['at 8am',480],['midnight',1440]])assert.equal(outingTime(q),m,q);
for(const q of ['the kids are eight','there are 8 of us','at 28:30','8:90pm'])assert.equal(outingTime(q),null,q);
const previous={eventId:'lantern',plan:{needs:['coffee'],timing:'during'}};
assert.equal(contextualOutingPlan('We could really do with a warm drink somewhere while out exploring',{intent:'food_drink',needs:['coffee'],timing:'before'},previous).timing,'during');
assert.deepEqual(fallbackOutingPlan('What about half eight?',previous.plan).needs,['coffee']);
const context={card:{id:'lantern',title:'Lantern Weekend'},area:'Wakefield City Centre',dates:['2026-11-14'],start:'17:00',end:'21:00'};
const branch={id:'willow',name:'Willow Coffee',website:'https://willow-coffee.co.uk/',startMinute:480,endMinute:1320};
const url='https://willow-coffee.co.uk/lantern/';
const candidate={name:'Willow Coffee',url,excerpts:['14 November 2026','For Lantern Weekend in Wakefield City Centre, we are serving coffee and hot chocolate.','Open from 5pm until 8pm.']};
const html='<h1>Willow Coffee</h1>'+candidate.excerpts.map(t=>'<p>'+t+'</p>').join('');
assert(verifyAnnouncement(candidate,html,context,[branch]));
assert.equal(verifyAnnouncement(candidate,html.replace('2026','2025'),context,[branch]),null);
assert.equal(verifyAnnouncement(candidate,html.replace('until 8pm','until 9pm'),context,[branch]),null,'Search excerpts cannot replace actual-page proof');
assert.equal(verifyAnnouncement(candidate,html.replace('Willow Coffee','Other Business'),context,[branch]),null);
assert.equal(verifyAnnouncement(candidate,html, {...context,area:'Pontefract',dates:['2026-11-15']},[]),null);
assert.equal(verifyAnnouncement({...candidate,url:'https://directory.co.uk/listing'},html,context,[branch]),null,'A directory is not the supplied business website');
const social={...candidate,url:'https://www.facebook.com/willow/posts/123',accountUrl:'https://www.facebook.com/willow/'};
const post=html+'<a href="https://www.facebook.com/willow/">Willow Coffee</a>';
assert.equal(verifyAnnouncement(social,post,context,[branch]),null,'Social account ownership requires an actual business-site link');
assert(verifyAnnouncement(social,post,context,[branch],'<a href="https://www.facebook.com/willow/">Facebook</a>'));
let calls=0,reads=0;
globalThis.fetch=async u=>{reads++;return new Response(html);};
const services={model:'test',call:async(body,options)=>{calls++;assert.equal(body.tools[0].max_uses,2);assert.equal(options.timeoutMs,45000);return {response:{ok:true},data:{content:[{type:'web_search_tool_result',content:[{url}]},{type:'text',text:JSON.stringify({announcements:[candidate]})}]}};}};
const found=await discoverAnnouncements(context,[branch],services,now);
assert.equal(calls,1);assert.equal(reads,1);assert.equal(found.length,1);assert.equal(found[0].sourceKind,'discovered-business-announcement');assert.equal(found[0].hotChocolate,true);
const enriched=await enrichSelectedOuting({reply:'A verified event.',sources:[],state:{resultCards:[{...context.card,entityType:'event',venue:context.area,dates:context.dates,start:context.start,end:context.end}],viewIds:['lantern'],constraints:{eventFocus:{id:'lantern'}}}},[{role:'user',content:'Lantern Weekend sounds lovely.'}],{...services,discover:async()=>[branch],announcements:(ctx,branches)=>discoverAnnouncements(ctx,branches,services,now)},now);
assert.match(enriched.reply,/Willow Coffee.*8pm/s);assert(enriched.sources.some(s=>s.url===url));
const late={...found[0],checkedAt:now.toISOString()};
const open={...late,name:'Late Coffee',sourceUrl:'https://late-coffee.co.uk/',end:'22:00'};
let state={constraints:{outing:{...previous,options:[late,open],checkedAt:now.toISOString(),currentIds:[url,open.sourceUrl]}}};
let newBusiness=false;
const ask=async(q,plan)=>{const r=await answerPlannedOuting([{role:'user',content:q}],state,context,plan,{discover:async()=>newBusiness?[{...open,name:'Unrequested Cafe',sourceUrl:'https://unrequested-cafe.co.uk/'}]:[]},now);state=r.state;return r;};
const half=await ask('What about half eight?',{intent:'food_drink',needs:['coffee'],timing:'during',referencePrevious:true});
assert.match(half.reply,/At 8:30pm.*Late Coffee/s);assert.match(half.reply,/Willow Coffee closes at 8pm/);assert.doesNotMatch(half.reply,/Willow Coffee.*serving drinks/s);
newBusiness=true;
const next=await ask('And a hot chocolate?',{intent:'food_drink',needs:['coffee','hot_chocolate'],timing:'during',referencePrevious:true});
assert.match(next.reply,/At 8:30pm.*Late Coffee/s);assert.doesNotMatch(next.reply,/Willow Coffee.*serving drinks/s);
assert.equal(state.constraints.outing.requestedTime,'20:30');assert.doesNotMatch(next.reply,/Unrequested Cafe/,'Adding a drink detail must retain the latest places');
console.log('Natural outing checks passed: British times, long refinements, independent multi-excerpt discovery, social ownership, source/date/identity guards, late options and retained time.');

const wx={title:'Light Up Wakefield',sourceUrl:'https://wxwakefield.co.uk/Whats-On/Details?event=light-up-wakefield',startDate:'2026-11-13',endDate:'2026-11-14',venue:'WX Wakefield Exchange'};
const exp={...wx,sourceUrl:'https://experiencewakefield.co.uk/event/light-up-wakefield/',startDate:null,ongoing:true,venue:'Wakefield City Centre'};
const reconciled=reconcileWeekCards([wx,exp]);assert.equal(reconciled.length,1);assert.equal(reconciled[0].startDate,'2026-11-13');assert.equal(reconciled[0].ongoing,false);assert.equal(reconciled[0].venue,'Wakefield City Centre');
assert.equal(reconcileWeekCards([wx,{...exp,title:'Light Up Wakefield BSL Tours',sourceUrl:'https://experiencewakefield.co.uk/event/light-up-wakefield-bsl-tours/'}]).length,2);

const programme=programmeConversation(['Switch-on: Friday 13 November · 5:30pm · Cathedral','Parade: Saturday 14 November · 5:30pm · County Hall'],{from:'2026-11-14',year:'2026'});assert.doesNotMatch(programme,/Friday/);assert.match(programme,/Saturday/);

let extractionCalls=0;
const extracted=await discoverAnnouncements(context,[branch],{model:'test',call:async body=>{
 extractionCalls++;
 if(body.system.startsWith('OUTING_ANNOUNCEMENTS_EXTRACT_V1')){assert.equal(body.tools,undefined);return {response:{ok:true},data:{content:[{type:'text',text:JSON.stringify({announcements:[candidate]})}]}};}
 return {response:{ok:true},data:{content:[{type:'web_search_tool_result',content:[{url}]},{type:'text',text:'There is a dated announcement, but no JSON.'}]}};
}},now);
assert.equal(extractionCalls,2);assert.equal(extracted.length,1,'Search prose must recover through bounded extraction and actual-page verification');

const drinkFrame={eventId:'lantern',options:[{name:'Willow Coffee'}],plan:{needs:['coffee'],timing:'during'}};
const drift=contextualOutingPlan('Actually, quarter past seven?',{intent:'food_drink',needs:['snack','dinner'],timing:'before'},drinkFrame);
assert.deepEqual(drift.needs,['coffee']);assert.equal(drift.timing,'during');assert.equal(drift.referencePrevious,true);
const added=contextualOutingPlan('And hot chocolate for the little ones?',{intent:'food_drink',needs:['snack','coffee'],timing:'during'},drinkFrame);
assert.deepEqual(added.needs,['hot_chocolate']);

let leadReads=0;
const closedLead={...branch,endMinute:960};
const sourced=await enrichSelectedOuting({reply:'A checked event.',sources:[],state:{resultCards:[{...context.card,entityType:'event',venue:context.area,dates:context.dates,start:context.start,end:context.end}],viewIds:['lantern'],constraints:{eventFocus:{id:'lantern'}}}},[{role:'user',content:'Tell me more.'}],{...services,discover:async()=>[],sources:async()=>[closedLead],announcements:async(ctx,leads)=>{leadReads++;assert.equal(leads[0].endMinute,960);return discoverAnnouncements(ctx,leads,services,now);}},now);
assert.equal(leadReads,1);assert.match(sourced.reply,/Willow Coffee.*8pm/s);assert.doesNotMatch(sourced.reply,/4pm/,'Closed ordinary hours are research leads, never event-opening claims');

globalThis.fetch=async url=>String(url)==='https://willow-coffee.co.uk/'?new Response('<a href="/lantern-weekend/">Lantern Weekend late opening</a><a href="https://unrelated.example/lantern-weekend/">Lantern Weekend</a>'):new Response(html);
const owned=await ownedAnnouncementPages(context,[branch]);assert.equal(owned.length,1);assert.equal(owned[0].url,'https://willow-coffee.co.uk/lantern-weekend/');
let ownedCalls=0;
const indexMiss=await discoverAnnouncements(context,[branch],{model:'test',call:async body=>{
 ownedCalls++;
 if(body.system.startsWith('OUTING_ANNOUNCEMENTS_EXTRACT_V1'))return {response:{ok:true},data:{content:[{type:'text',text:JSON.stringify({announcements:[{...candidate,url:owned[0].url}]})}]}};
 return {response:{ok:true},data:{content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'{"announcements":[]}'}]}};
}},now);
assert.equal(ownedCalls,2);assert.equal(indexMiss.length,1,'An unindexed announcement must be discovered from the local business website');

const itineraryBase={reply:'Lantern Weekend runs 17:00–21:00.',sources:[{title:'Event',url:'https://official.example/event/'}],state:{resultCards:[{...context.card,entityType:'event',venue:context.area,dates:context.dates,start:context.start,end:context.end}],viewIds:['lantern'],constraints:{eventFocus:{id:'lantern'}}}};
const staged=await planSelectedEvening(itineraryBase,[{role:'user',content:'Help plan our evening with children aged 7 and 4'}],{discover:async(ctx,plan)=>{
 assert(ctx.party.children);assert.equal(plan.exactTime,true);
 if(plan.timing==='before')return [{...open,name:'Meal opens too late',sourceKind:'branch-listing',services:['dinner'],startMinute:1000,endMinute:1380}];
 return [{...open,name:'Cafe already closed',sourceKind:'branch-listing',startMinute:480,endMinute:1200}];
}},now);
assert.doesNotMatch(staged.reply,/Meal opens too late/);
assert.doesNotMatch(staged.reply,/Cafe already closed.*serving/);
assert.match(staged.reply,/haven’t verified a suitable/);
assert.deepEqual(staged.state.constraints.outing.party.ages,[7,4]);
const unavailable=await planSelectedEvening(itineraryBase,[{role:'user',content:'Plan a good evening'}],{discover:async()=>{throw new Error('lookup unavailable');}},now);
assert.match(unavailable.reply,/Lantern Weekend runs 17:00–21:00/);
assert.match(unavailable.reply,/couldn’t check a meal before/);
assert.match(unavailable.reply,/couldn’t check a drink after/);
assert.equal(unavailable.state.constraints.eventFocus.id,'lantern');
console.log('Evening evidence checks passed: exact proposed slots, closed/late venues excluded, failed lookups preserve event and party.');
