import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,createHmac} from 'node:crypto';
import {inflateRawSync,deflateRawSync} from 'node:zlib';
const NativeDate=Date;
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:['2026-11-13T13:30:00Z']));}static now(){return NativeDate.parse('2026-11-13T13:30:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';process.env.AW_EVENT_CATALOGUE_ENABLED='true';process.env.EVENT_CARDS_FIRST_ENABLED='false';process.env.EVENTS_SHEET_ID='test';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const catalogueEvent={id:'source-other',sourceId:'museums',title:'Museum Art Session',venue:'Wakefield Museum',sourceUrl:'https://museumsandcastles.wakefield.gov.uk/whats-on/art/',startDate:'2026-11-14',endDate:'2026-11-14',startTime:'10:00',endTime:'12:00',familyVerified:true,checkedAt:'2026-11-13T05:00:00Z',contentHash:'facts',issues:[],status:'scheduled',priceStatus:'free',categories:['family'],minAge:null,maxAge:null};process.env.AW_OUTING_PLANNER_ENABLED='true';
let includePartial=false,eventOutage=false;
const outside={...catalogueEvent,id:'outside',title:'Castleford Craft Session',venue:'Castleford Museum',sourceUrl:'https://museumsandcastles.wakefield.gov.uk/whats-on/castleford-craft/'};
const future={...catalogueEvent,id:'future',title:'Next Week City Walk',startDate:'2026-11-18',endDate:'2026-11-18',sourceUrl:'https://museumsandcastles.wakefield.gov.uk/whats-on/next-week/'};
const partial={...catalogueEvent,id:'partial',title:'Light Up Wakefield',venue:'WX Wakefield Exchange',startDate:'2026-11-13',endDate:'2026-11-14',startTime:'17:00',endTime:'21:00',sourceUrl:'https://experiencewakefield.co.uk/event/light-up-wakefield/'};
const eventUrl='https://experiencewakefield.co.uk/event/light-up-wakefield/';
const html='<section class="postHeading"><h1>Light Up Wakefield</h1><div>Fri 13 Nov 2026 - Sat 14 Nov 2026</div><div>17:00 - 21:00</div><div>Wakefield City Centre</div><div>Free</div></section><section class="postContent"><h3>About</h3><p>Explore the Light Trail. Pick up a map from WX Wakefield Exchange.</p></section><section class="postContent--sessions"><div>13 November 2026</div><div>14 November 2026</div></section><main><h4>Car Parking</h4><p>Parking is available at Trinity Walk and The Ridings.</p></main>';
const listing=`<h3><a href="${eventUrl}">Light Up Wakefield</a></h3><p>Calendar Fri 13 Nov 2026 - Sat 14 Nov 2026</p><p>Clock 17:00 - 21:00</p><p>Map pin Wakefield City Centre</p>`;
const origin={latitude:53.683,longitude:-1.497};
const hours={periods:[{open:{day:5,hour:7},close:{day:5,hour:23}},{open:{day:6,hour:7},close:{day:6,hour:23}}]};
const burger={id:'central-mcd',displayName:{text:'McDonald’s Wakefield'},location:origin,businessStatus:'OPERATIONAL',formattedAddress:'1 Westgate, Wakefield WF1 1AA, UK',currentOpeningHours:hours,servesCoffee:true,servesDinner:true,servesDessert:true,goodForChildren:true,googleMapsUri:'https://maps.google.com/?cid=123',websiteUri:'https://www.mcdonalds.com/gb/en-gb.html'};
const menuUrl='https://www.mcdonalds.com/gb/en-gb/product/hot-chocolate.html';
const plans=new Map([
 ['Any place for like a coffee and hot chocolate for us to have in and around that area?',{intent:'unrelated'}],
 ['Wakefield, what we have been chatting about',{intent:'unrelated'}],
 ['Coffee places?',{needs:['coffee'],timing:'before'}],
 ['Haus?',{intent:'unrelated'}],
 ['Would that still work at 8:30pm?',{needs:['coffee'],timing:'during',referencePrevious:true}],
 ['Would it work at 7pm?',{needs:['coffee'],timing:'during',referencePrevious:true}],
 ['Anything quick to eat first?',{needs:['snack'],timing:'before'}],
 ['We will probably be starving afterwards. Any ideas?',{needs:['dinner'],timing:'after'}],
 ['Would that still work at 10pm?',{needs:['dinner'],timing:'after',referencePrevious:true}],
 ['Any other place open around that time for hot chocolate for the kids and a coffee for us?',{needs:['coffee','hot_chocolate'],timing:'during',alternatives:true}],
 ['Could we grab a bite and a coffee instead?',{needs:['snack','coffee'],timing:'during'}],
 ['Something warm for the little ones and caffeine for us?',{needs:['hot_chocolate','coffee'],timing:'during'}]
]);
let plannerCalls=0,searches=0,menus=0;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-only'});
 if(u.startsWith('https://sheets.googleapis.com/')){if(u.includes('?fields='))return Response.json({sheets:['AW_CollectedEvents','AW_CollectorRuns','AW_EventReviews'].map(title=>({properties:{title,gridProperties:{rowCount:1000}}}))});if(decodeURIComponent(u).includes('AW_CollectedEvents'))return Response.json({values:[catalogueEvent,outside,future,...(includePartial?[partial]:[])].map(e=>['run','museums',JSON.stringify(e)])});if(decodeURIComponent(u).includes('AW_CollectorRuns'))return Response.json({values:[['run','museums',catalogueEvent.checkedAt,catalogueEvent.checkedAt,'complete','{}']]});return Response.json({values:[]});}
 if(u===eventUrl)return new Response(eventOutage?'Unavailable':html,{status:eventOutage?503:200});
 if(u==='https://experiencewakefield.co.uk/whats-on/')return new Response(listing);
 if(u==='https://places.googleapis.com/v1/places:searchText') {
  const b=JSON.parse(opts.body);if(b.pageSize===1)return Response.json({places:[{location:origin}]});
  searches++;assert(opts.headers['X-Goog-FieldMask'].includes('servesDinner'));
  return Response.json({places:[burger,...Array.from({length:9},(_,i)=>({...burger,id:'local-'+i,displayName:{text:'Local Food '+i},formattedAddress:(i+2)+' Central Street, Wakefield WF1 1AB, UK',googleMapsUri:'https://maps.google.com/?cid='+i+'&g_mp='+('tracking'.repeat(35)),websiteUri:'https://local-food-'+i+'.co.uk/menus?utm_source='+('tracking'.repeat(30))})),{...burger,id:'outer',displayName:{text:'Ferrybridge Costa'},formattedAddress:'Ferrybridge Services',location:{latitude:53.7,longitude:-1.27}}]});
 }
 if(u===menuUrl)return new Response('<h1>Hot Chocolate</h1><p>Hot Chocolate with milk</p>');
 if(u.includes('anthropic.com')) {
  const b=JSON.parse(opts.body);
  if(b.system.startsWith('OUTING_PLANNER_V2')) {
   plannerCalls++;const q=JSON.parse(b.messages[0].content).question;
   return Response.json({content:[{type:'text',text:JSON.stringify(plans.has(q)?{intent:'food_drink',...plans.get(q)}:{intent:/parking/i.test(q)?'parking':'event'})}]});
  }
  if(b.system.startsWith('OUTING_MENU_CHECK_V2')){menus++;return Response.json({content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:menuUrl}]},{type:'text',text:JSON.stringify({menus:[{id:burger.id,url:menuUrl,quote:'Hot Chocolate with milk'}]})}]});}
  throw new Error('Unexpected generic prose route');
 }
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');
let n=0;
async function ask(q,prior){
 const messages=[...(prior?.messages||[]),{role:'user',content:q}];
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'outing-v2-'+ ++n},socket:{},body:{messages,stateToken:prior?.stateToken}},res);
 assert.equal(res.code,200);assert(res.body.stateToken,'Signed context must survive broad discovery');
 return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const week=await ask("What's on this week in Wakefield?");
assert.equal(week.verification,'weekly-catalogue-v1');
assert.match(week.reply,/Castleford Craft/);assert.doesNotMatch(week.reply,/Next Week City Walk/);
const city=await ask("What's happening in Wakefield City?",week);
assert.equal(city.verification,'weekly-followup-v1');
assert.match(city.reply,/Wakefield city.*Monday 9 November 2026 to Sunday 15 November 2026/s);
assert.match(city.reply,/Museum Art Session/);assert.doesNotMatch(city.reply,/Castleford Craft|Next Week City Walk|18 November/);
assert.equal(city.state.constraints.eventWeek.start,'2026-11-09');
const starts=await ask('What time does Light Up Wakefield start?',city);
assert.equal(starts.verification,'selected-event-discovery-v2');
assert.match(starts.reply,/starts at 17:00.*Friday 13 November 2026 and Saturday 14 November 2026.*Wakefield City Centre.*until 21:00/s);
const focus=starts.state.constraints.eventFocus.id;
const selected=starts.state.resultCards.find(c=>c.id===focus);
assert.equal(selected.venue,'Wakefield City Centre');assert.deepEqual(selected.occurrenceDates,['2026-11-13','2026-11-14']);
const parking=await ask("What's parking like for this event?",starts);
assert.match(parking.reply,/Trinity Walk/);assert.equal(parking.state.constraints.eventFocus.id,focus);
const drinks=await ask('Any place for like a coffee and hot chocolate for us to have in and around that area?',parking);
assert.equal(drinks.verification,'outing-food-v2');assert.match(drinks.reply,/While you’re at Light Up.*McDonald/s);
assert.doesNotMatch(drinks.reply,/which area|where you are|Castleford|Ferrybridge/i);
const correction=await ask('Wakefield, what we have been chatting about',drinks);
assert.equal(correction.verification,'outing-food-v2');assert.match(correction.reply,/Light Up/);
assert.doesNotMatch(correction.reply,/start of our conversation|don.t have a record|which part|which area/i);
const rolled=await ask('Wakefield, what we have been chatting about',{...drinks,messages:[]});
assert.equal(rolled.verification,'outing-food-v2');assert.match(rolled.reply,/Light Up/);
// A second session starts from a catalogue record with a venue-level label.
// Even with an existing time, a named start-time request must read the exact
// page and replace that label with the event's city-centre location.
includePartial=true;
const otherWeek=await ask("What's on this week in Wakefield?");
const alreadyListed=await ask('What time does Light Up Wakefield start?',otherWeek);
assert.equal(alreadyListed.verification,'cards-first-v17');
assert.match(alreadyListed.reply,/starts at 17:00.*Wakefield City Centre/s);
assert.equal(alreadyListed.state.resultCards.find(c=>c.id===alreadyListed.state.constraints.eventFocus.id).venue,'Wakefield City Centre');
const listedParking=await ask("What's parking like for this event?",alreadyListed);
const listedDrinks=await ask('Any place for like a coffee and hot chocolate for us to have in and around that area?',listedParking);
assert.equal(listedDrinks.verification,'outing-food-v2');assert.match(listedDrinks.reply,/Light Up.*McDonald/s);
// The alternative spelling must retain the same week too, even though the
// generic topic scoper would otherwise call this a fresh request.
const cityOn=await ask("What's on in Wakefield City?",week);
assert.equal(cityOn.verification,'weekly-followup-v1');assert.equal(cityOn.state.constraints.eventWeek.start,week.state.constraints.eventWeek.start);
const reset=await ask('Full list again',city);
assert.match(reset.reply,/Castleford Craft/);assert.equal(reset.state.constraints.eventWeek.filters.area,undefined);
const friday=await ask('Friday in Wakefield City?',city);
assert.equal(friday.state.constraints.eventWeek.filters.day,'friday');
assert.match(friday.reply,/Wakefield city on Friday 13 November 2026/);assert.doesNotMatch(friday.reply,/Museum Art Session/);
const directCity=await ask("What's on this week in Wakefield City?");
assert.equal(directCity.state.constraints.eventWeek.filters.area,'Wakefield city');assert.doesNotMatch(directCity.reply,/Castleford Craft/);
const nextWeek=await ask("What's on next week in Wakefield City?",city);
assert.equal(nextWeek.state.constraints.eventWeek.start,'2026-11-16');assert.match(nextWeek.reply,/Next Week City Walk/);assert.doesNotMatch(nextWeek.reply,/Museum Art Session|Castleford Craft/);
// Replay a correctly signed legacy token whose selected event lost dates
// and whose venue label came from the aggregator. Client-supplied unsigned
// fields cannot repair it. Only a successful exact-page read may do so.
const legacy=JSON.parse(inflateRawSync(Buffer.from(starts.stateToken.split('.')[1],'base64url')).toString());
for(const c of legacy.resultCards)if(c.id===legacy.constraints.eventFocus.id)Object.assign(c,{dates:[],occurrenceDates:[],startDate:null,endDate:null,venue:'WX Wakefield Exchange'});
legacy.constraints.outing=null;legacy.constraints.eventWeek=null;
const payload=deflateRawSync(Buffer.from(JSON.stringify(legacy))).toString('base64url');
const key=createHash('sha256').update('aw-state-v3:test').digest('hex');
const signature=createHmac('sha256',key).update(payload).digest('base64url').slice(0,32);
const legacyPrior={stateToken:'s3.'+payload+'.'+signature,messages:[]};
const repaired=await ask('Any place for like a coffee and hot chocolate for us to have in and around that area?',legacyPrior);
assert.equal(repaired.verification,'outing-food-v2');assert.match(repaired.reply,/Light Up.*McDonald/s);
assert.equal(repaired.state.resultCards.find(c=>c.id===focus).venue,'Wakefield City Centre');
eventOutage=true;
const unavailable=await ask('Any coffee around that area?',legacyPrior);
assert.equal(unavailable.verification,'outing-context-unavailable');assert.match(unavailable.reply,/still have Light Up/);
assert.doesNotMatch(unavailable.reply,/which area|start of our conversation|McDonald/i);
eventOutage=false;
console.log('City outing continuity passed: exact six-turn transcript, city/week membership, absent and partial named events, full exact-page hydration, parking, referential drinks, correction and rolled signed context.');
