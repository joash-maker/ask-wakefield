import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {reconcileWeekCards,weeklyFollowUp} from '../lib/event-week-window.js';
import {broadCoffeeDiscovery} from '../lib/coffee-discovery.js';
const NativeDate=Date,now='2026-11-26T10:00:00Z';
globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return NativeDate.parse(now);}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';process.env.GOOGLE_PLACES_API_KEY='test';
process.env.AW_EVENT_CATALOGUE_ENABLED='true';process.env.EVENTS_SHEET_ID='test';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const record=(id,title,date,categories=[],extra={})=>({id,sourceId:'wx',title,venue:'WX Wakefield Exchange',sourceUrl:'https://wxwakefield.co.uk/Whats-On/Details?event='+id,startDate:date,endDate:date,startTime:'13:00',endTime:'15:00',categories,checkedAt:now,contentHash:id,issues:[],status:'scheduled',priceStatus:'paid',priceRaw:'GBP 10',...extra});
const nt=record('nt-ghost','Nostell Ghost Walks','2026-11-28',['heritage'],{sourceId:'nostell',venue:'Nostell',sourceUrl:'https://www.nationaltrust.org.uk/visit/yorkshire/nostell/events/ghost',startTime:'17:30',endTime:'19:30'});
const ew={...nt,id:'ew-ghost',sourceId:'experience',venue:'Nostell, National Trust',sourceUrl:'https://experiencewakefield.co.uk/event/nostell-ghost-walks/',startDate:'2026-11-14',startTime:null,endTime:null,occurrenceDates:['2026-11-14','2026-11-21','2026-11-28'],sessionTimes:['2026-11-14','2026-11-21','2026-11-28'].map(date=>({date,start:'17:30',end:'19:30'}))};
const window={from:'2026-11-26',start:'2026-11-23',end:'2026-11-29'};
assert.equal(reconcileWeekCards([ew,nt],window).length,1);
assert.equal(reconcileWeekCards([nt,ew],window)[0].sourceUrl,nt.sourceUrl,'Prefer the organiser in either source order');
for(const changed of [{...nt,startTime:'18:00'},{...nt,endTime:null},{...nt,venue:'Another venue'},{...nt,startDate:'2026-11-29',endDate:'2026-11-29'},{...nt,priceStatus:'free'},{...nt,priceRaw:'GBP 12'}])assert.equal(reconcileWeekCards([ew,changed],window).length,2,'Do not merge conflicting or unproven sessions');
assert.equal(weeklyFollowUp('Any music events?').musicOnly,true);
for(const q of ['Somewhere for coffee and hot chocolate nearby?','Coffee and hot chocolate nearby?','Hot chocolate and coffee nearby?','Coffee & hot chocolate nearby?'])assert.equal(broadCoffeeDiscovery([{role:'user',content:q}]),true,q);
const collected=JSON.parse(readFileSync(new URL('./fixtures/nostell-collected-2026-11-26.json',import.meta.url)));
const detail=readFileSync(new URL('./fixtures/nostell-detail-2026-11-26.html',import.meta.url),'utf8');
let music=true,menu=true,menuCopy=null,modelCalls=0;const placeQueries=[];
const events=()=>[...collected,record('bill','An Evening with Bill Nelson','2026-11-28',music?['music']:['heritage']),record('friday','Rodeo Night','2026-11-27',['music']),record('sunday','Sunday Concert','2026-11-29',['music']),record('craft','Autumn Craft Fair','2026-11-28',['arts'])];
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture-token'});
 if(u.startsWith('https://sheets.googleapis.com/')){
  if(u.includes('?fields='))return Response.json({sheets:['AW_CollectedEvents','AW_CollectorRuns','AW_EventReviews'].map(title=>({properties:{title,gridProperties:{rowCount:1000}}}))});
  const path=decodeURIComponent(u);
  if(path.includes('AW_CollectedEvents'))return Response.json({values:events().map(e=>['run-'+e.sourceId,e.sourceId,JSON.stringify(e)])});
  if(path.includes('AW_CollectorRuns'))return Response.json({values:['nostell','experience','wx'].map(id=>['run-'+id,id,now,now,'complete','{}'])});
  return Response.json({values:[]});
 }
 if(u.includes('places.googleapis.com')){
  const body=JSON.parse(opts.body);placeQueries.push(body.textQuery);
  if(body.pageSize===1)return Response.json({places:[{location:{latitude:53.683,longitude:-1.497}}]});
  return Response.json({places:[{id:'recent',displayName:{text:'RECENT Coffee Roasters'},formattedAddress:'97-99 Westgate, Wakefield WF1',businessStatus:'OPERATIONAL',location:{latitude:53.683,longitude:-1.497},googleMapsUri:'https://maps.google.com/?cid=11',servesCoffee:true,servesLunch:true},{id:'unverified',displayName:{text:'Unverified Drink Cafe'},formattedAddress:'Wakefield WF1',businessStatus:'OPERATIONAL',location:{latitude:53.683,longitude:-1.497},googleMapsUri:'https://maps.google.com/?cid=12',servesCoffee:true}]});
 }
 if(u==='https://recent.coffee/')return new Response(menuCopy||(menu?'<h1>RECENT Coffee Roasters</h1><p>Drink menu: Coffee and hot chocolate</p>':'<h1>RECENT Coffee Roasters</h1><p>Drink menu: Coffee</p>'));
 if(u===ew.sourceUrl)return new Response(detail);
 if(u.includes('anthropic.com')){modelCalls++;throw Error('These refinements must not generate venue or event facts');}
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');let count=0;
async function ask(q,prior,{history=true}={}){
 const messages=[...(history?prior?.messages||[]:[]),{role:'user',content:q}];
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'nov26-'+ ++count},socket:{},body:{messages,stateToken:prior?.stateToken}},res);
 assert.equal(res.code,200);assert(res.body.stateToken);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const rain=await ask('What can I do on a rainy day in Wakefield?');
const parking=await ask('Anything in the city centre with parking?',rain);
const coffee=await ask('Somewhere for coffee and hot chocolate nearby?',parking);
assert.equal(coffee.verification,'coffee-discovery-v1');assert.equal(coffee.state.area,'Wakefield city centre');
assert.match(coffee.reply,/RECENT Coffee Roasters/);assert.match(coffee.reply,/hot chocolate and coffee/);
assert.match(coffee.reply,/haven’t checked walking distances from Wakefield One or Merchant Gate/);
assert.doesNotMatch(coffee.reply,/Unverified Drink Cafe|comfortable|straightforward|open until|Monday|Sunday|Starbucks/);
assert.equal(coffee.sources.length,3);assert(coffee.sources.some(s=>s.url==='https://maps.google.com/?cid=11'));assert(coffee.sources.some(s=>s.url==='https://recent.coffee/'));
assert(coffee.sources.every(s=>s.title.startsWith('RECENT Coffee Roasters')),'Source chips must describe the places actually named');
menu=false;
const noMenu=await ask('Somewhere for coffee and hot chocolate nearby?',parking);
assert.equal(noMenu.verification,'coffee-discovery-v1');assert.match(noMenu.reply,/couldn’t verify/);assert.equal(noMenu.sources.length,0);
for(const unavailable of ['We do not serve hot chocolate.','Hot chocolate is not currently available.','Coffee, not hot chocolate.','Hot chocolate is sold out.']){
 menuCopy='<h1>RECENT Coffee Roasters</h1><p>'+unavailable+'</p>';
 const negative=await ask('Somewhere for coffee and hot chocolate nearby?',parking);
 assert.equal(negative.verification,'coffee-discovery-v1');assert.match(negative.reply,/couldn’t verify/);assert.equal(negative.sources.length,0);
}
menuCopy=null;
const week=await ask('What’s on this week?');
assert.equal(week.verification,'weekly-catalogue-v1');assert.equal((week.reply.match(/^Nostell Ghost Walks$/gm)||[]).length,1);
assert(week.sources.some(s=>s.url===collected.find(e=>e.sourceId==='nostell').sourceUrl));
const saturday=await ask('What about Saturday?',week);
assert.equal((saturday.reply.match(/^Nostell Ghost Walks$/gm)||[]).length,1);
const musicOnly=await ask('Any music events?',saturday);
assert.equal(musicOnly.verification,'weekly-followup-v1');assert.equal(musicOnly.state.constraints.eventWeek.filters.day,'saturday');
assert.equal(musicOnly.state.constraints.eventWeek.filters.musicOnly,true);
assert.match(musicOnly.reply,/An Evening with Bill Nelson/);assert.doesNotMatch(musicOnly.reply,/Rodeo|Sunday Concert|Nostell Ghost Walks|Autumn Craft Fair/);
assert.equal(musicOnly.sources.length,1);assert.equal(musicOnly.sources[0].url,events()[2].sourceUrl);
const signedOnly=await ask('Any music events?',saturday,{history:false});
assert.equal(signedOnly.verification,'weekly-followup-v1');assert.equal(signedOnly.state.constraints.eventWeek.filters.day,'saturday');assert.match(signedOnly.reply,/Bill Nelson/);assert.doesNotMatch(signedOnly.reply,/Rodeo|Sunday Concert/);
const sunday=await ask('What about Sunday?',musicOnly);
assert.match(sunday.reply,/Sunday Concert/);assert.doesNotMatch(sunday.reply,/Bill Nelson|Rodeo|Craft Fair/);
music=false;
const emptySaturday=await ask('What about Saturday?',await ask('What’s on this week?'));
const none=await ask('Any music events?',emptySaturday);
assert.equal(none.verification,'weekly-followup-v1');assert.match(none.reply,/could not verify matching music events on Saturday 28 November 2026/);assert.equal(none.sources.length,0);
assert.doesNotMatch(none.reply,/Rodeo|Sunday Concert|Friday/);
assert.equal(modelCalls,0);assert(placeQueries.some(q=>/Wakefield city centre/i.test(q)));
console.log('26 November replays passed: rainy-day → parking → verified coffee/hot chocolate; source parity; no menu/no invented match; organiser duplicate reconciliation; signed category and Saturday/music continuity; empty matches stay within Saturday.');
