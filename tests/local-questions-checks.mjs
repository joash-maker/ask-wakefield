import assert from 'node:assert/strict';
import {localQuestionAnswer,isLocalQuestion} from '../lib/local-questions.js';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
https.request=(url,options,callback)=>{
 const req=new EventEmitter();req.destroy=error=>{req.emit('error',error);req.emit('close');};
 req.end=()=>queueMicrotask(()=>{
  const response=Readable.from([Buffer.from('<html><title>Fixture Cycles Wakefield</title><body><h1>Fixture Cycles</h1><p>Fixture Cycles, Wakefield, Ossett, Horbury and Castleford. Puncture repairs and servicing.</p></body></html>')]);response.statusCode=200;response.headers={'content-type':'text/html'};response.on('end',()=>req.emit('close'));callback(response);
 });return req;
};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.OPENAI_FAILSAFE_ENABLED='false';
const user=content=>({role:'user',content});
const source={url:'https://fixture-repairs.co.uk/repairs',title:'Fixture Cycles Wakefield'};
const council={url:'https://www.wakefield.gov.uk/bins/report-a-missed-bin/',title:'Wakefield Council missed bins'};
let mode='normal',bodies=[],serial=0;
globalThis.fetch=async(url,opts)=>{
 if(!String(url).includes('api.anthropic.com'))return new Response('Unavailable',{status:404});
 const body=JSON.parse(opts.body);bodies.push(body);
 if(mode==='outage')throw Error('test outage');
 if(mode==='no-search')return new Response(JSON.stringify({content:[{type:'text',text:'A guessed answer.'}]}));
 const civic=body.messages.some(m=>/missed bin/i.test(m.content));
 const s=civic?council:source;
 const reply=JSON.stringify(civic?{steps:[{text:'Report a missed bin collection to Wakefield Council.',url:s.url}]}:{businesses:[{name:'Fixture Cycles',url:s.url,services:['Puncture repairs']}]});
 return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+(mode==='two-stage'&&body.tools?'An unpublishable research draft with ratings and hours.':reply),citations:[{url:s.url,title:s.title,cited_text:civic?'Report a missed bin collection to Wakefield Council.':'Fixture Cycles, Wakefield, Ossett, Horbury and Castleford. Puncture repairs and servicing.'}]}]}));
};
const {default:handler}=await import('../api/chat.js');
async function ask(q,previous,extra={}){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'broad-local-'+(++serial)},socket:{},body:{messages:messages.slice(-10),stateToken:previous?.stateToken,...extra}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
for(const q of ['Where can I get my bike repaired in Wakefield?','Where can I get a passport photo in Ossett?','Who can repair a washing machine in Horbury?','How do I report a missed bin?']){
 const a=await ask(q);assert.equal(a.verification,'local-question-sourced',q);assert.ok(a.sources.length);assert.ok(a.stateToken);
 const b=bodies.at(-1);assert.ok(b.tools?.length);assert.equal(b.tools[0].allowed_domains,undefined);assert.equal(b.tool_choice.type,'any');assert.match(b.system,/everyday life across Wakefield district/);assert.doesNotMatch(b.system,/choose only from the exact entity cards/);
 assert.equal(a.state.constraints.requestFrame.localQuestion,q);
 if(/bike repaired/.test(q))assert.match(b.system,/cycle-technology\.co\.uk\/workshop/,'Repair discovery starts with relevant first-party leads, not an inferred service');
}
let a=await ask('Where can I get my bike repaired in Ossett?');
for(const q of ['Do they repair punctures?','What are the prices?','How do I book?','Are they open today?','What services do they offer?','What is their address?']){
 a=await ask(q,a);assert.equal(a.verification,'local-question-sourced');assert.equal(a.state.constraints.requestFrame.area,'Ossett');assert.equal(a.state.constraints.requestFrame.localQuestion,'Where can I get my bike repaired in Ossett?');
 assert.match(bodies.at(-1).system,/fixture-repairs/,'Signed source leads survive the rolling model window and are marked for rechecking');
}
const fresh=await ask('Where can I get a passport photo in Castleford?',a);assert.equal(fresh.state.constraints.requestFrame.area,'Castleford');assert.match(fresh.state.constraints.requestFrame.localQuestion,/passport/);assert.doesNotMatch(bodies.at(-1).messages.map(m=>m.content).join(' '),/bike|puncture/i);
assert.doesNotMatch(bodies.at(-1).system,/cycle-technology\.co\.uk\/workshop/,'Repair seeds must not leak into a different topic');
const councilAnswer=await ask('What is Wakefield Council’s official website?',a);assert.equal(councilAnswer.verification,'official-council-link');assert.equal(councilAnswer.state.constraints.requestFrame.topic,'council');assert.ok(!councilAnswer.state.constraints.localSources);
const fromBarber={messages:[user('Where’s a good barber?'),{role:'assistant',content:'Gaffers Barbering.'}]};
const changed=await ask('Where can I get my bike repaired?',fromBarber);assert.equal(changed.verification,'local-question-sourced');assert.equal(bodies.at(-1).messages.length,1);assert.doesNotMatch(bodies.at(-1).system,/Gaffers Barbering/);
mode='two-stage';const before=bodies.length;const staged=await ask('Where can I get my bike repaired in Wakefield?');assert.equal(staged.verification,'local-question-sourced');assert.equal(bodies.length,before+2);assert.equal(bodies.at(-1).tools,undefined);assert.match(bodies.at(-1).messages[0].content,/Puncture repairs/);assert.doesNotMatch(staged.reply,/ratings|hours|unpublishable/);
mode='no-search';const noSearch=await ask('Who can repair a washing machine?');assert.equal(noSearch.live,false);assert.equal(noSearch.sources.length,0);
mode='outage';const outage=await ask('Where can I get a passport photo?');assert.equal(outage.verification,'local-question-unverified');assert.equal(outage.sources.length,0);
const result={searched:true,reply:JSON.stringify({businesses:[{name:'Fixture Cycles',url:source.url,services:['Puncture repairs']}]}),sources:[source],searchEvidence:[{url:source.url,text:'Fixture Cycles repairs bikes in Wakefield. Puncture repairs.'}]};
const official=localQuestionAnswer({searched:true,reply:JSON.stringify({steps:[{text:'Report the missed bin to us.',url:council.url}]}),sources:[council],searchEvidence:[{url:council.url,text:'Report the missed bin to us.'}]},[user('How do I report a missed bin?')],{constraints:{requestFrame:{localQuestion:'How do I report a missed bin?'}}});assert.match(official.reply,/Wakefield Council’s published guidance/);assert.match(official.reply,/> Report the missed bin to us\./,'First-person Council wording stays inside an attributed quotation');
assert.equal(localQuestionAnswer(result,[],{}).verification,'local-question-sourced');
for(const bad of [{...result,searched:false},{...result,reply:'Try [a made-up booking page](https://invented.example/book)'},{...result,reply:'Check Google Maps for a repair shop.'}])assert.equal(localQuestionAnswer(bad,[],{}).live,false);
assert.doesNotMatch(localQuestionAnswer({...result,searchEvidence:[]},[],{}).reply,/Puncture repairs/);
assert.equal(localQuestionAnswer(result,[user('How do I report a missed bin?')],{constraints:{requestFrame:{localQuestion:'How do I report a missed bin?'}}}).live,false,'A commercial citation cannot establish public-service instructions');
const prose=localQuestionAnswer({...result,reply:'Best shop, open 9 to 5, rated 4.9. Visit Leeds too.'},[],{});assert.equal(prose.live,false,'Unstructured prose must never bypass the evidence renderer');
const injected=localQuestionAnswer({...result,reply:JSON.stringify({businesses:[{name:'Fixture Cycles',url:source.url,services:['Puncture repairs','Exceptional rating of 4.9 stars']}]}),searchEvidence:[{url:source.url,text:'Fixture Cycles Wakefield. Puncture repairs. Exceptional rating of 4.9 stars.'}]},[],{});assert.doesNotMatch(injected.reply,/4.9|Exceptional/);
assert.equal(isLocalQuestion('Thanks!'),false);assert.equal(isLocalQuestion('Do they repair punctures?'),false);
console.log('Broad local question checks passed: new subjects, forced unrestricted research, exact cited links, official-service authority, signed rolling follow-ups, new-topic resets and outages.');
