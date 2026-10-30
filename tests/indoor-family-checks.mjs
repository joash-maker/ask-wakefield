import assert from 'node:assert/strict';
import {indoorFamilyRequest,indoorFamilyAnswer} from '../lib/indoor-family.js';
import {scopeConversation} from '../lib/conversation-scope.js';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
let unavailable=false,modelCalls=0,reads=[];
globalThis.fetch=async url=>{
 const u=String(url);reads.push(u);
 if(u.includes('anthropic.com')){modelCalls++;throw Error('This constrained plan must not use a free-form writer');}
 return unavailable?new Response('Unavailable',{status:503}):new Response('<main><h1>Visit</h1><p>Museum admission is free.</p><p>Special workshop £12.50. Cafe closes at 17:00.</p></main>');
};
const {default:handler}=await import('../api/chat.js');
const user=content=>({role:'user',content});let serial=0;
async function ask(q,previous){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'indoor-family-'+(++serial)},socket:{},body:{messages,stateToken:previous?.stateToken}},res);
 assert.equal(res.code,200);assert.equal(res.body.verification,'indoor-family-candidates');
 assert.doesNotMatch(res.body.reply,/Diggerland|Eureka|Xscape|Pugneys|Hepworth Garden|£25|£17|17:00|open today until|cafe onsite|café onsite|too basic|tight for paid/);
 return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const first=await ask('We’ve got two children and want something indoors. What would you suggest?');
assert.match(first.reply,/How old are the children/);assert.equal(reads.length,0,'An undated candidate list must not make a live lookup claim');
const second=await ask('Ages 7 and 4',first);assert.deepEqual(second.constraints.ages,[7,4]);assert.match(second.reply,/ages 7 and 4/);assert.doesNotMatch(second.reply,/How old are/);
const third=await ask('Something today and a budget of £35',second);
assert.deepEqual(third.constraints,{ages:[7,4],budget:35,day:'today',adults:null});
assert.match(third.reply,/Keeping it indoors/);assert.match(third.reply,/free general admission/);assert.match(third.reply,/haven't confirmed today's opening/);assert.match(third.reply,/can't yet say either fits £35/);assert.match(third.reply,/How many adults/);assert.equal(third.live,false);
assert.equal(reads.length,3);assert.equal(third.sources.length,3);assert.equal(modelCalls,0);
// A workshop price/cafe closing time must never become general entry or museum hours.
assert.doesNotMatch(third.reply,/12\.50|17:00/);
const adultTurn=await ask('Two adults',third);assert.equal(adultTurn.constraints.adults,2);assert.doesNotMatch(adultTurn.reply,/How many adults/);
unavailable=true;
const outage=await indoorFamilyAnswer(third.messages.slice(0,-1));assert.doesNotMatch(outage.reply,/free general admission|17:00/);assert.equal(outage.live,false);
// No assistant-invented outdoor alternative, old price or age can alter the request.
const poisoned=[user('Two children indoors please'),{role:'assistant',content:'Try Diggerland outdoors for £25, ages 10 and 11.'},user('Ages 7 and 4'),user('Budget £35 today')];
assert.deepEqual(indoorFamilyRequest(poisoned),{ages:[7,4],budget:35,day:'today',adults:null});
const reset=scopeConversation([...poisoned,user('Where can we eat vegetarian food in Wakefield?')]);assert.equal(indoorFamilyRequest(reset.messages),null);
assert.equal(indoorFamilyRequest([...poisoned,user('We would rather be outdoors instead')]),null);
for(const q of ['We need wheelchair access','We have no car','Something near Pontefract'])assert.equal(indoorFamilyRequest([...poisoned,user(q)]),null,'Extra unsupported constraints must stay on their specialised path');
console.log('Indoor family replay passed: indoors, ages, today and £35 retained, first-party reads, no old prices/hours, no outdoor substitutions, outage handling and topic reset.');
