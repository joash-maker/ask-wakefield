import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {buildRequestContext,continuesRequest} from '../lib/request-context.js';
import {shoppingOfferAnswer} from '../lib/shopping-offers.js';
import {seasonalEventTheme,seasonalEventAnswer} from '../lib/seasonal-events.js';
import {localQuestionAnswer} from '../lib/local-questions.js';
const NativeDate=Date;globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-03T12:00:00Z']));}static now(){return NativeDate.parse('2026-11-03T12:00:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.OPENAI_FAILSAFE_ENABLED='false';
const user=content=>({role:'user',content});
const shop='https://fixture-cycle-shop.co.uk/sale/';
const copy='Verified Bike Store Wakefield. Used hybrid bicycle sale £240. New road bicycle sale £900.';
let calls=[],pageYear=2026,mode='normal';
https.request=(url,options,callback)=>{
 const req=new EventEmitter();req.destroy=error=>{req.emit('error',error);req.emit('close');};req.end=()=>queueMicrotask(()=>{
  const response=Readable.from([Buffer.from(`<title>Sale | Verified Bike Store Wakefield</title><body><h1>Verified Bike Store</h1><p>${copy}</p></body>`)]);response.statusCode=200;response.headers={'content-type':'text/html'};response.on('end',()=>req.emit('close'));callback(response);
 });return req;
};
function eventHTML(url){
 const light=url.includes('light-up'),parade=url.includes('parade'),title=light?(parade?'Light Up Wakefield Parade':'Light Up Wakefield'):'Thornes Park Fireworks';
 const date=light?(parade?`Sat 14 Nov ${pageYear} - Sat 14 Nov ${pageYear}`:`Fri 13 Nov ${pageYear} - Sat 14 Nov ${pageYear}`):`Sat 07 Nov ${pageYear} - Sat 07 Nov ${pageYear}`;
 return `<section class="postHeading"><h1>${title}</h1><div class="event-date">${date}</div><span>16:30 - 20:00</span><div class="event-venue">${light?'Wakefield City Centre':'Thornes Park'}</div><div class="price">Free</div></section><section class="postContent"><p>Free event. Family friendly.</p>${light?'':'<p>6:00pm: Low Impact Firework Display. 7:30pm: Main Firework Display. This display will not feature a bonfire.</p>'}</section><main><h2>Accessibility and travel information</h2><p>Previous notices 14 Nov 2025</p></main>`;
}
globalThis.fetch=async(url,opts)=>{
 const href=String(url);
 if(href.includes('api.anthropic.com')){
  const body=JSON.parse(opts.body);calls.push(body);
  const budget=body.system.includes('"budget":250');
  const offers=budget?[{text:'Used hybrid bicycle sale £240',cashPriceGBP:240,cashPriceText:'£240'},{text:'New road bicycle sale £900',cashPriceGBP:900,cashPriceText:'£900'}]:['Used hybrid bicycle sale £240'];
  return new Response(JSON.stringify({content:[{type:'web_search_tool_result',content:[]},{type:'text',text:'FINAL_RESPONSE: '+JSON.stringify({businesses:[{name:'Verified Bike Store',url:shop,offers}]}),citations:[{url:shop,title:'Verified Bike Store Wakefield',cited_text:copy}]}]}));
 }
 if(href.includes('/robots.txt'))return new Response('',{status:404});
 if(href.includes('experiencewakefield.co.uk/event/'))return mode==='outage'?new Response('Unavailable',{status:503}):new Response(eventHTML(href),{headers:{'content-type':'text/html'}});
 return new Response('Unavailable',{status:404});
};
const {default:handler}=await import('../api/chat.js');let serial=0;
async function ask(q,previous){
 const messages=[...(previous?.messages||[]),user(q)],res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'budget-seasonal-'+(++serial)},socket:{},body:{messages:messages.slice(-10),stateToken:previous?.stateToken}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
let answer=await ask('Where can I get a good deal on bicycles');assert.equal(answer.verification,'local-shopping-offers');
answer=await ask('Budgets £250 and yes I could consider a second hand bike',answer);
assert.equal(answer.state.constraints.requestFrame.budget,250);assert.equal(answer.state.constraints.requestFrame.shoppingCondition,'either');assert.match(answer.state.constraints.requestFrame.localQuestion,/good deal on bicycles/);
assert.equal(answer.verification,'local-shopping-offers');assert.match(answer.reply,/£240/);assert.doesNotMatch(answer.reply,/£900|Facebook|Vinted|eBay|Decathlon|What’s your budget|would you consider/i);
assert.ok(calls.at(-1).tools?.length,'A budget/condition follow-up must still search');assert.match(calls.at(-1).system,/"budget":250/);
answer=await ask('Hybrid',answer);assert.equal(answer.state.constraints.requestFrame.shoppingBikeType,'hybrid');assert.equal(answer.state.constraints.requestFrame.budget,250);assert.doesNotMatch(answer.reply,/What type of bike/);
const beforeEvents=calls.length;
let event=await ask('I want to take my kids to a some fireworks and Bonfire night in wakefield, any ideas?',answer);
assert.equal(event.verification,'seasonal-event-pages');assert.match(event.reply,/Thursday 5 November 2026/);assert.match(event.reply,/Saturday 7 November 2026/);assert.match(event.reply,/18:00/);assert.match(event.reply,/19:30/);assert.match(event.reply,/no bonfire/);assert.doesNotMatch(event.reply,/28 October|passed for this year|next year/);assert.equal(event.state.constraints.requestFrame.budget,null,'A new event request clears shopping requirements');
event=await ask('Oh, ok. what about lightup wakefield?',event);assert.equal(event.verification,'seasonal-event-pages');assert.match(event.reply,/Friday 13 November 2026 to Saturday 14 November 2026/);assert.match(event.reply,/Free entry/);assert.ok(event.sources.every(s=>s.url.startsWith('https://experiencewakefield.co.uk/event/')));assert.equal(calls.length,beforeEvents,'Dated official event answers must not invoke the generic model');
pageYear=2025;const stale=await ask('Any Bonfire Night fireworks?');assert.equal(stale.verification,'seasonal-events-unverified');assert.equal(stale.sources.length,0);assert.match(stale.reply,/Thursday 5 November 2026/);assert.doesNotMatch(stale.reply,/Saturday 7 November 2025/);
mode='outage';const outage=await ask('Light up Wakefield?');assert.equal(outage.verification,'seasonal-events-unverified');assert.equal(outage.sources.length,0);assert.doesNotMatch(outage.reply,/typically|usually|free entry/i);
assert.equal(seasonalEventTheme('How do I keep dogs safe during fireworks?'),null);assert.equal(seasonalEventTheme('light-up Wakefield'),'light-up');
const frame=buildRequestContext([user('Budgets £250 and yes I could consider a second hand bike')],{topic:'local',localQuestion:'Bicycle deals',budget:null});assert.equal(frame.budget,250);assert.equal(frame.shoppingCondition,'either');assert.equal(continuesRequest('Budgets £250 and yes I could consider a second hand bike',{topic:'local'}),true);
const result={sources:[{url:shop,title:'Sale | Verified Bike Store Wakefield',pageBusiness:'Verified Bike Store',pageRead:true}],searchEvidence:[{url:shop,text:copy}]};
const cap={constraints:{requestFrame:{budget:250,shoppingCondition:'either'}}};
const expensive=shoppingOfferAnswer({businesses:[{name:'Verified Bike Store',url:shop,offers:[{text:'New road bicycle sale £900',cashPriceGBP:900,cashPriceText:'£900'}]}]},result,cap);assert.match(expensive.reply,/haven’t confirmed a bicycle at £250 or less/);assert.doesNotMatch(expensive.reply,/within your|£900/);
const marketplace=shoppingOfferAnswer({businesses:[{name:'Gumtree',url:'https://www.gumtree.com/for-sale/bicycles/wakefield',offers:['Second-hand bikes for sale in Wakefield']}]},{sources:[{title:'Gumtree Wakefield',url:'https://www.gumtree.com/for-sale/bicycles/wakefield',pageBusiness:'Gumtree',pageRead:true}],searchEvidence:[{url:'https://www.gumtree.com/for-sale/bicycles/wakefield',text:'Second-hand bikes for sale in Wakefield'}]},{});assert.equal(marketplace,null,'A marketplace category is not a specific current bicycle offer');
const alternate='https://another-fixture-bike-store.co.uk/bicycles';
const normalPrice='New hybrid bicycle £240';
const newMatch=localQuestionAnswer({searched:true,reply:JSON.stringify({businesses:[{name:'Another Bike Store',url:alternate,offers:[{text:normalPrice,cashPriceGBP:240,cashPriceText:'£240'}]}]}),sources:[{title:'Another Bike Store Wakefield',url:alternate,pageBusiness:'Another Bike Store',pageRead:true}],searchEvidence:[{url:alternate,text:'Another Bike Store Wakefield. '+normalPrice}]},[user('Budgets £250 and yes I could consider a second hand bike')],{constraints:{...cap.constraints,localSources:[{title:'Verified Bike Store',url:shop}],localSourcesVerified:true}});assert.equal(newMatch.verification,'local-shopping-offers');assert.equal(newMatch.sources[0].title,'Another Bike Store','A new budget can discover suitable retailers beyond the previous shortlist');assert.match(newMatch.reply,/within your £250/);
console.log('Budget/seasonal regressions passed: exact shopping follow-up, £250 cap, used preference, bike type, Bonfire date, dated fireworks and Light Up, year/source failures and no generic model fallback.');
