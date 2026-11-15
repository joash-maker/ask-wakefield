import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import followups from '../api/followups.js';
import {suggestedQuestions} from '../lib/chat-followups.js';
import {chatNavigation} from '../lib/chat-navigation.js';
import {activityDiscovery} from '../lib/activity-discovery.js';
import {ACTIVITY_DIRECTORY} from '../lib/activity-directory.js';
import {isLeisureDiscovery} from '../lib/event-request-policy.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
// Execute every actual starter onclick from the shipped HTML.
const sent=[];const context={sendMsg:q=>sent.push(q),askFromDiscover:q=>sent.push(q)};vm.createContext(context);
const onclicks=[...html.matchAll(/onclick="((?:sendMsg|askFromDiscover)\([^"]+\))"/g)].map(m=>m[1]);
assert.equal(onclicks.length,12);
for(const js of onclicks)vm.runInContext(js,context);
assert.equal(sent.length,12);assert.equal(new Set(sent).size,12);assert(sent.every(q=>typeof q==='string'&&q.length>10));
assert(sent.some(q=>/rainy day with children/.test(q)));
assert(isLeisureDiscovery(sent.find(q=>/low-cost/.test(q))));
// Real fallback-pill callback: success, HTTP errors, reset race, malformed data.
const method=html.slice(html.indexOf('function getFollowups('),html.indexOf('// RESET CHAT'));
let request,rendered=0;const ctx={chatGeneration:0,renderFollowups(){rendered++},XMLHttpRequest:function(){request=this;this.open=()=>{};this.setRequestHeader=()=>{};this.send=()=>{};}};
vm.createContext(ctx);vm.runInContext(method+";getFollowups('Coffee?','Answer',{});",ctx);
request.status=200;request.responseText=JSON.stringify({followups:['Any more?']});assert.doesNotThrow(()=>request.onload());assert.equal(rendered,1);
request.status=500;request.onload();assert.equal(rendered,1);
ctx.chatGeneration++;request.status=200;request.onload();assert.equal(rendered,1);
assert.doesNotThrow(()=>request.onerror());assert.doesNotThrow(()=>request.ontimeout());
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}}}
for(const body of [undefined,{}, {question:[],answer:'a'},{question:'q',answer:4},{question:' ',answer:'a'}]){const res=response();followups({method:'POST',body},res);assert.equal(res.code,400);}
for(const q of sent){const res=response();followups({method:'POST',body:{question:q,answer:'A response'}},res);assert.equal(res.code,200);assert(res.body.followups.length<=3);assert(res.body.followups.every(s=>typeof s==='string'&&s.length<=180));}
for(const q of ['What sports are available?','Find clubs and community groups','Help me with local services','Indoor activities with kids','Food and coffee'])assert(suggestedQuestions(q,'Answer').length>0);
// Directory-linked Ask buttons use their exact source, never generic inventions.
let checked=0;
const noSource=async()=>new Response('Unavailable',{status:503});
for(const record of ACTIVITY_DIRECTORY){const result=await activityDiscovery(record.question,null,noSource);assert(result,record.name);assert(result.sources.some(s=>s.url===record.sourceUrl),record.name);assert(result.reply.includes(record.name));assert.doesNotMatch(result.reply,/aspire\.org\.uk|01924 367|can't find|not able to find|Venturers|Explorers.*17/);checked++;}
assert.equal(checked,20);
for(const q of sent.filter(q=>/sports, gyms|local clubs, walking/.test(q)))assert((await activityDiscovery(q,null,noSource)).sources.length>=3);
for(const q of sent.filter(q=>/local service|official parking|rainy day/.test(q))){const answer=chatNavigation(q);assert(answer,q);assert(answer.sources.length>0,q);assert.doesNotMatch(answer.reply,/two hours free|open daily|10:00|Trinity Walk.*bowling/);}
const late=await activityDiscovery('Find me a running club in Wakefield that suits my ability',null,noSource);
const refined=await activityDiscovery('Actually, Saturday morning in Castleford',late.state,noSource);
assert.equal(refined.state.constraints.activitySearch.area,'Castleford');assert.doesNotMatch(refined.reply,/meets.*Saturday|Sunday.*instead/);
assert.equal(await activityDiscovery('Find an independent running club on Saturday morning',null,noSource),null,'Do not bypass existing timed verification');
console.log('Chat surface checks passed: all 12 starter handlers, all 20 directory Ask references, deterministic follow-up families, malformed requests, fallback callback, reset race, local-service/indoor source links and activity constraints.');

assert.equal(await activityDiscovery('What is the weather tomorrow?',late.state,noSource),null);
