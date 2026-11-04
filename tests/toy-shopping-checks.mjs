import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.OPENAI_FAILSAFE_ENABLED='false';
const rows=[{name:'Smyths Toys',url:'https://www.smythstoys.com/uk/en-gb/storefinder/storedetails/wakefield',address:'Unit 8 Westgate Retail Park, Wakefield',services:['Toys']},{name:'The Works',url:'https://www.theworks.co.uk/Store?storeId=0793',address:'Trinity Walk, Wakefield',services:['Toys']}];
https.request=(url,opts,cb)=>{const req=new EventEmitter();req.destroy=e=>{req.emit('error',e);req.emit('close');};req.end=()=>queueMicrotask(()=>{const p=rows.find(p=>p.url===String(url));const response=Readable.from([Buffer.from(`<html><title>${p.name} Wakefield</title><body><h1>${p.name}</h1>${p.address}. Toys.</body></html>`)]);response.statusCode=200;response.headers={'content-type':'text/html'};response.on('end',()=>req.emit('close'));cb(response);});return req;};
let bodies=[];
globalThis.fetch=async(url,opts)=>{if(!String(url).includes('api.anthropic.com'))return new Response('',{status:404});const body=JSON.parse(opts.body);bodies.push(body);return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+JSON.stringify({businesses:rows}),citations:rows.map(p=>({url:p.url,title:p.name,cited_text:p.name+' '+p.address+' Toys.'}))}]}));};
const {default:handler}=await import('../api/chat.js');let token=null,messages=[];
for(const q of ["I need to get my kids some toys, where's the best place?",'My kids are 4 and 7','Toys today, toy shops.','Things like transformers, lego and things like that?','Is there a Smyths toys in Wakefield?','What other toy shops are in Wakefield?']){
 messages.push({role:'user',content:q});const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'toy-'+messages.length},socket:{},body:{messages:messages.slice(-10),stateToken:token}},res);
 const a=res.body;assert.ok(['toy-shopping-stores','toy-shopping-official-store-page','toy-shopping-verified-branch'].includes(a.verification),q);assert.doesNotMatch(a.reply,/Rainbow|Xscape|Thornes|should have|should stock|best bet|opens at|open this afternoon/i);assert.match(bodies.at(-1).system,/TOY SHOPPING/);assert.match(a.state.constraints.requestFrame.localQuestion,/get my kids some toys/);
 if(messages.length>2)assert.deepEqual(a.state.constraints.requestFrame.ages,[4,7]);
 if(/other toy shops/i.test(q))assert.ok(a.sources.every(s=>!/smyths/i.test(s.title)));
 if(/smyths/i.test(q)){assert.equal(a.sources.length,1);assert.match(a.reply,/Yes, I found/);}
 if(/transformers|lego/i.test(q))assert.match(a.reply,/local stock before travelling/);
 token=a.stateToken;messages.push({role:'assistant',content:a.reply});
}
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/xhr.timeout = 120000/);assert.match(html,/xhr.onloadend = function\(\) \{ clearTimeout\(progressTimer\)/);assert.match(html,/You don’t need to send your question again/);
console.log('Toy shopping: six exact turns, signed ages/brands, store evidence, no play outings or invented stock/hours; chat wait/progress lifecycle checked.');

const {confirmNamedToyStore}=await import('../lib/toy-shopping.js');
const toyState={constraints:{requestFrame:{toyShopping:true}}};const named=[{role:'user',content:'Is there a Smyths toys in Wakefield?'}];
assert.equal(confirmNamedToyStore({searched:false},named,toyState),null);
assert.equal(confirmNamedToyStore({searched:true,sources:[{url:'https://invented.co.uk/wakefield',title:'Wakefield Smyths'}],searchEvidence:[{url:'https://invented.co.uk/wakefield',text:'Wakefield Smyths'}]},named,toyState),null);

const {verifiedToyStoreAnswer}=await import('../lib/toy-shopping.js');
assert.ok(verifiedToyStoreAnswer(named,toyState,new Date('2026-11-04T20:00:00Z')));
assert.equal(verifiedToyStoreAnswer(named,toyState,new Date('2026-11-12T20:00:00Z')),null,'Expired branch record must return to current research');
