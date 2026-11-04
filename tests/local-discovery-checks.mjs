import assert from 'node:assert/strict';
import {isLocalDiscoveryQuery} from '../lib/local-discovery.js';
import {scopeConversation} from '../lib/conversation-scope.js';
const user=content=>({role:'user',content}), assistant=content=>({role:'assistant',content});
process.env.ANTHROPIC_API_KEY='test';
process.env.GOOGLE_PLACES_ENABLED='false';
process.env.OPENAI_FAILSAFE_ENABLED='false';
let bodies=[], mode='verified';
globalThis.fetch=async (url,options)=>{
 if(String(url).includes('api.anthropic.com')) {
  const body=JSON.parse(options.body);bodies.push(body);
  return new Response(JSON.stringify({content:['verified','directory'].includes(mode) ? [
   {type:'web_search_tool_result',content:[]},
   {type:'text',text:'FINAL_RESPONSE: Elevate offers published fitness sessions. [Joining details](https://fitness.example/join)',citations:[{type:'web_search_result_location',url:mode==='directory'?'https://wellhub.com/en-uk/search/partners/elevate/':'https://fitness.example/join',title:'Official joining page',cited_text:'Elevate offers fitness sessions. Join using our booking page.'}]}
  ] : [{type:'text',text:'There are definitely no HYROX gyms in Wakefield.',citations:mode==='citation-only'?[{url:'https://fitness.example/join',title:'Unsearched citation'}]:[]}]}));
 }
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');
let count=0;
async function ask(text,prior=[]) {
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':`discovery-${++count}`},socket:{},body:{messages:[...prior,user(text)]}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));return res.body;
}
for(const text of ['HYROX gyms?','ATHX training gyms','What local clubs, walking groups and community groups can I join in Wakefield?','Walking groups in Ossett','Book clubs in Pontefract','What can I join in Wakefield?']) {
 const result=await ask(text);const body=bodies.at(-1);
 assert.ok(body.tools?.some(t=>t.name==='web_search'),text);
 assert.equal(body.tool_choice?.type,'any');
 assert.equal(body.tools[0].allowed_domains,undefined,'New organisations must be discoverable');
 assert.match(body.system,/LOCAL CLUBS AND FITNESS DISCOVERY/);
 assert.match(result.reply,/Elevate/);assert.ok(result.sources.some(s=>s.url==='https://fitness.example/join'));
 assert.equal(result.live,true);
}
const history=[user('HYROX gyms in Wakefield?'),assistant('Elevate and Astar offer training.')];
for(const q of ['What about Elevate?','How much are those?','Any beginner sessions?','On Thursday?']) {
 await ask(q,history);assert.ok(bodies.at(-1).tools?.length,q);
 assert.ok(bodies.at(-1).messages.some(m=>m.content.includes('HYROX gyms in Wakefield')),q);
}
const other=scopeConversation([...history,user('Where can I have coffee in Castleford?')]);
assert.equal(other.messages.length,1);assert.equal(isLocalDiscoveryQuery(other.messages),false);
const afterEvents=scopeConversation([user("What's on this week?"),assistant('Some events'),user('HYROX gyms?')]);
assert.equal(afterEvents.messages.length,1);assert.equal(afterEvents.topic,'clubs');
for(mode of ['no-search','citation-only']) {
 const result=await ask('HYROX gyms?');
 assert.equal(result.verification,'local-discovery-unverified');assert.equal(result.live,false);
 assert.equal(result.sources.length,0);assert.doesNotMatch(result.reply,/definitely no/);
}
mode='directory';
const directoryResult=await ask('What about Elevate?',history);
assert.equal(directoryResult.verification,'local-discovery-leads-only');
assert.match(directoryResult.reply,/directory listings/);
assert.doesNotMatch(directoryResult.reply,/Elevate offers published fitness sessions/);
mode='no-search';
const beginnerFailure=await ask('Any beginner sessions?',history);
assert.match(beginnerFailure.reply,/haven.t confirmed which sessions welcome beginners/);
assert.doesNotMatch(beginnerFailure.reply,/no beginner sessions|definitely no/);
console.log('Local discovery checks passed: search activation, unrestricted discovery, short follow-ups, topic resets and failure without actual search evidence.');
