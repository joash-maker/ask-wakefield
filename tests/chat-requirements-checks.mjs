import assert from 'node:assert/strict';
import {requirementAnswer} from '../lib/chat-requirements.js';
const access=requirementAnswer('Plan a wheelchair-accessible free day out with children in Wakefield city centre');
assert.equal(access.verification,'access-requirements-v1');assert.match(access.reply,/What day/);assert.doesNotMatch(access.reply,/fully accessible|Light Up|open today|£3/);
const budget=requirementAnswer('We only have £20 for everything',access.state);
assert.equal(budget.state.constraints.accessPlan.budget,'20');assert.equal(budget.state.constraints.accessPlan.freeOnly,true);assert.doesNotMatch(budget.reply,/within budget|£3–10|freecitybus|until 9pm/);
const allergy=requirementAnswer('My child has a severe milk allergy. Can we get hot chocolate too?');
assert.equal(allergy.verification,'food-requirements-v1');assert.match(allergy.reply,/plant-based milk option does not establish/);assert.doesNotMatch(allergy.reply,/Corarima|Rustico|safest bet|stock/);assert(allergy.sources[0].url.startsWith('https://www.gov.uk/'));
assert(requirementAnswer('Can we get coffee instead?',allergy.state));
assert.equal(requirementAnswer("What's on this weekend?",allergy.state),null);
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';
globalThis.fetch=async(url,opts={})=>{
 if(String(url).includes('anthropic.com'))throw Error('Unexpected prose generation');
 if(String(url).includes('places.googleapis.com'))return Response.json({places:JSON.parse(opts.body).pageSize===1?[{location:{latitude:53.683,longitude:-1.497}}]:[{id:'far',displayName:{text:'Far Pharmacy'},location:{latitude:53.7,longitude:-1.23},formattedAddress:'Knottingley',primaryType:'pharmacy',businessStatus:'OPERATIONAL',currentOpeningHours:{periods:[{open:{day:0,hour:9},close:{day:0,hour:23}}]},googleMapsUri:'https://maps.google.com/?cid=1'}]});
 return new Response('unavailable',{status:503});
};
const {default:handler}=await import('../api/chat.js');let n=0;
for(const q of ['Which pharmacy is open after 6pm near Trinity Walk?',"What about Sainsbury's pharmacy?",'Asda pharmacy?']){
 const res={setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}};
 await handler({method:'POST',headers:{'x-forwarded-for':'requirements-'+ ++n},socket:{},body:{messages:[{role:'user',content:q}],stateToken:null}},res);
 assert.equal(res.code,200);assert.doesNotMatch(res.body.reply,/Far Pharmacy|Knottingley|White Rose|Ash Grove/);
 assert(res.body.sources.length>0);
 if(/sainsbury|asda/i.test(q))assert.equal(res.body.verification,'named-pharmacy-v1');else assert.equal(res.body.verification,'pharmacy-local-unverified-v1');
}
console.log('Requirements checks passed: access/free/budget continuity, severe-allergy limits, unrelated topic escape, pharmacy geography and exact named-branch lookup.');
