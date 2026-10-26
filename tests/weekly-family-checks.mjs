import assert from 'node:assert/strict';
const NativeDate=Date;
globalThis.Date=class extends NativeDate {
 constructor(...args){super(...(args.length?args:['2026-10-26T10:00:00Z']));}
 static now(){return NativeDate.parse('2026-10-26T10:00:00Z');}
};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
const fixtures=[['Family Workshop','family-workshop','For children aged 5 and above.'],['Evening Comedy','evening-comedy','Adults only.'],['Unknown Activity','unknown-activity','Tickets available.'],['Negated Activity','negated-activity','Not suitable for children. Family-friendly refreshments nearby.']];
const listing=fixtures.map(([title,slug])=>`<h3><a href="https://experiencewakefield.co.uk/event/${slug}/">${title}</a></h3><div><img alt="Calendar">Tue 27 Oct 2026</div><div>10:00 - 16:00</div><div>Wakefield Museum</div>`).join('');
let modelCalls=0;
globalThis.fetch=async url=>{
 const u=String(url);
 if(u.includes('anthropic.com')){modelCalls++;throw new Error('No model permitted');}
 if(u==='https://experiencewakefield.co.uk/whats-on/')return new Response(listing);
 const fixture=fixtures.find(([,slug])=>u===`https://experiencewakefield.co.uk/event/${slug}/`);
 if(fixture)return new Response(`<html><h1>${fixture[0]}</h1><h2>About</h2><p>${fixture[2]}</p></html>`);
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');
let calls=0;
async function ask(text,prior=[] ,stateToken){
 const messages=[...prior,{role:'user',content:text}];
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':`family-${++calls}`},socket:{},body:{messages,stateToken}},res);
 assert.equal(res.code,200);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const first=await ask("What can we do with the kid's this week?");
assert.equal(first.verification,'weekly-cards-v1');
assert.match(first.reply,/Family Workshop/);
assert.doesNotMatch(first.reply,/Evening Comedy|Unknown Activity|Negated Activity|cannot yet verify a weekly shortlist/);
assert.equal(first.state.constraints.eventWeek.filters.family,true);
assert.ok(first.sources.some(s=>s.url.endsWith('/family-workshop/')));
const second=await ask('For the October half term',first.messages,first.stateToken);
assert.equal(second.verification,'weekly-followup-v1');
assert.match(second.reply,/Family Workshop/);assert.match(second.reply,/Monday 26 October 2026 to Sunday 1 November 2026/);
assert.doesNotMatch(second.reply,/Diggerland|Stockeld|£25|half term in England/i);
assert.equal(second.state.constraints.eventWeek.filters.family,true);
const third=await ask('What about Thursday?',second.messages,second.stateToken);
assert.equal(third.verification,'weekly-followup-v1');
assert.doesNotMatch(third.reply,/Family Workshop/);
const standalone=await ask('What can we do for October half term?');
assert.equal(standalone.verification,'half-term-dates-needed');
assert.match(standalone.reply,/dates vary/);
assert.equal(modelCalls,0);
console.log('Weekly family checks passed: exact-page suitability, exclusions, signed half-term/day context, dates clarification and no model fallback.');
