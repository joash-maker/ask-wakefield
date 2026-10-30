import assert from 'node:assert/strict';
import {buildRequestContext,continuesRequest} from '../lib/request-context.js';
import {readVenuePage,venueHours} from '../lib/venue-evidence.js';
import {familyPlanAnswer} from '../lib/family-planner.js';
import {PLACES} from '../lib/askwakefield-places-data.js';
const NativeDate=Date;globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:['2026-10-30T10:00:00Z']));}static now(){return NativeDate.parse('2026-10-30T10:00:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
let mode='normal',reads=[],modelCalls=0;
globalThis.fetch=async(url,opts)=>{
 const u=String(url);
 if(u.includes('anthropic.com')){modelCalls++;return new Response(JSON.stringify({content:[{type:'text',text:'FINAL_RESPONSE: What would you like to plan?'}]}));}
 reads.push(u);
 if(mode==='unavailable')return new Response('Unavailable',{status:503});
 if(mode==='redirect')return new Response('',{status:302,headers:{location:'https://unrelated.example/price'}});
 const place=PLACES.find(p=>p.source===u)||PLACES.find(p=>p.id==='AW-007');
 const name=mode==='wrong-schema'?'A different venue':place.name;
 const hours=mode==='closed'?'00:00':'17:00';
 const content=mode==='workshop'?'<p>Free museum workshop entry for children under 3.</p>':'<h2>Admission</h2><p>Museum admission is free.</p>';
 return new Response(`<title>${place.name}</title><script type="application/ld+json">${JSON.stringify({'@type':'LocalBusiness',name,openingHoursSpecification:[{dayOfWeek:'https://schema.org/Friday',opens:mode==='closed'?'00:00':'09:00',closes:hours}]})}</script><main><h1>${place.name}</h1>${content}<h2>Cafe</h2><p>Cafe closes at 23:00. Special party £99.99.</p></main>`,{headers:{'content-type':'text/html'}});
};
const {default:handler}=await import('../api/chat.js');
const user=content=>({role:'user',content});let serial=0;
async function ask(q,previous,{rolling=false,token=true}={}){
 const messages=[...(previous?.messages||[]),user(q)],sent=rolling?messages.slice(-10):messages;
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'family-review-'+(++serial)},socket:{},body:{messages:sent,stateToken:token?previous?.stateToken:null}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));
 return {...res.body,messages:[...sent,{role:'assistant',content:res.body.reply}]};
}
let result=await ask('We’ve got two children and want something indoors. What would you suggest?');
assert.match(result.reply,/How old/);assert.ok(result.stateToken);assert.equal(result.state.constraints.requestFrame.environment,'indoor');
result=await ask('Ages 7 and 4',result);assert.doesNotMatch(result.reply,/How old/);
result=await ask('Something today and a budget of £35',result);
assert.equal(result.verification,'family-source-candidates');assert.equal(result.state.constraints.requestFrame.budget,35);
assert.equal(result.state.constraints.requestFrame.date,'2026-10-30');assert.match(result.reply,/35/);assert.match(result.reply,/staying indoors/);
assert.doesNotMatch(result.reply,/Diggerland|Eureka|Pugneys|Hepworth Garden|£25|£17|23:00|99\.99|cafe onsite|too basic|tight for paid/);
assert.match(result.reply,/free general admission/);assert.match(result.reply,/09:00–17:00/);assert.match(result.reply,/How many adults/);
result=await ask('Two adults',result);assert.equal(result.state.constraints.requestFrame.adults,2);assert.doesNotMatch(result.reply,/How many adults|How old/);
// Keep exercising the real handler beyond its ten-message model window.
for(const q of ['What about bowling?','How much would that cost?','Is it open?','Would that fit our budget?']){
 result=await ask(q,result,{rolling:true});
 const f=result.state.constraints.requestFrame;
 assert.deepEqual(f.ages,[7,4]);assert.equal(f.environment,'indoor');assert.equal(f.budget,35);assert.equal(f.adults,2);assert.equal(f.date,'2026-10-30');
 assert.equal(result.sources.length,1);assert.match(result.reply,/Tenpin/);assert.doesNotMatch(result.reply,/Pugneys|Diggerland|£9\.95|fits (?:your|the) budget|How many adults|How old/);
}
assert.equal(modelCalls,0,'No free-form writer can invent facts in this family plan');
result=await ask('Actually outdoors instead',result,{rolling:true});
assert.equal(result.state.constraints.requestFrame.environment,'outdoor');assert.equal(result.state.constraints.requestFrame.activity,null);assert.ok(result.sources.every(s=>/Park/.test(s.title)));assert.doesNotMatch(result.reply,/Tenpin|Cheeky/);
result=await ask('Actually indoors again, near Horbury',result,{rolling:true});assert.match(result.reply,/Secret Garden/);assert.doesNotMatch(result.reply,/Museum|Tenpin|£6\.95|£13\.90/);assert.equal(result.state.constraints.requestFrame.budget,35);
const reset=await ask('What is Wakefield Council’s official website?',result,{rolling:true});assert.equal(reset.state.constraints.requestFrame.topic,'council');assert.equal(reset.state.constraints.requestFrame.budget,null);assert.deepEqual(reset.state.constraints.requestFrame.ages,[]);
const thanks=await ask('Thanks',result);assert.equal(thanks.reply,'You’re welcome.');assert.equal(thanks.sources.length,0);
mode='unavailable';const outage=await ask('How much would that cost?',result);assert.doesNotMatch(outage.reply,/free general admission|09:00|17:00|fits.*35/);assert.equal(outage.live,false);
const museum=PLACES.find(p=>p.id==='AW-007');mode='wrong-schema';assert.equal(venueHours(await readVenuePage(museum),'2026-10-30'),null);
mode='workshop';assert.equal((await readVenuePage(museum)).free,false);
mode='redirect';assert.equal(await readVenuePage(museum),null);
mode='closed';const closed=await ask('Two children, ages 7 and 4, indoors today please');assert.doesNotMatch(closed.reply,/I’d compare|\*\*Wakefield Museum/);assert.match(closed.reply,/don’t overlap/);
const frame=buildRequestContext([user('Two children indoors, ages 6 and 9, budget £25 tomorrow')]);
assert.equal(continuesRequest('Ages 7 and 4',frame),true);assert.equal(continuesRequest('Where can we eat vegetarian food?',frame),false);
const newFrame=buildRequestContext([user('Outdoors instead, budget £50 each')],frame);assert.equal(newFrame.environment,'outdoor');assert.equal(newFrame.budget,50);assert.equal(newFrame.budgetScope,'per person');
const threeAges=buildRequestContext([user('Family indoors, ages 3, 7 and 12, at 2 pm on 2026-11-02')]);
assert.deepEqual(threeAges.ages,[3,7,12]);assert.equal(threeAges.date,'2026-11-02');assert.deepEqual(threeAges.time,{hour:14,minute:0});
assert.equal(await familyPlanAnswer([user('Which restaurants can we try with the kids?')],threeAges,null),null,'Family audience must not hijack restaurant discovery');
const oneAge=buildRequestContext([user('Family indoors, aged 4')]);assert.deepEqual(oneAge.ages,[4]);
mode='normal';const tooLate=await ask('Two children ages 7 and 4, indoors today at 6 pm');assert.match(tooLate.reply,/don’t overlap/);assert.equal(tooLate.sources.length,0);
const fakeToken={...result,stateToken:result.stateToken.slice(0,-1)+(result.stateToken.endsWith('a')?'b':'a'),messages:[]};
const lost=await ask('3 adults',fakeToken);assert.equal(lost.state.constraints.requestFrame.topic,null);assert.equal(lost.state.constraints.requestFrame.budget,null);
console.log('Family conversation checks passed: real signed-state rolling replay, constraints, exact selection, date/age/budget changes, topic reset, truthful costs, current own-page hours, outages, schema identity and redirect isolation.');
