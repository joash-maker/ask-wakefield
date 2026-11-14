import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
const NativeDate=Date;
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:['2026-11-13T13:30:00Z']));}static now(){return NativeDate.parse('2026-11-13T13:30:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';process.env.AW_EVENT_CATALOGUE_ENABLED='true';process.env.EVENT_CARDS_FIRST_ENABLED='false';process.env.EVENTS_SHEET_ID='test';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const catalogueEvent={id:'source-other',sourceId:'museums',title:'Museum Art Session',venue:'Wakefield Museum',sourceUrl:'https://museumsandcastles.wakefield.gov.uk/whats-on/art/',startDate:'2026-11-14',endDate:'2026-11-14',startTime:'10:00',endTime:'12:00',familyVerified:true,checkedAt:'2026-11-13T05:00:00Z',contentHash:'facts',issues:[],status:'scheduled',priceStatus:'free',categories:['family'],minAge:null,maxAge:null};process.env.AW_OUTING_PLANNER_ENABLED='true';
const eventUrl='https://experiencewakefield.co.uk/event/light-up-wakefield/';
const html='<section class="postHeading"><h1>Light Up Wakefield</h1><div>Fri 13 Nov 2026 - Sat 14 Nov 2026</div><div>17:00 - 21:00</div><div>Wakefield City Centre</div><div>Free</div></section><section class="postContent"><h3>About</h3><p>Explore the Light Trail. Pick up a map from WX Wakefield Exchange.</p></section><section class="postContent--sessions"><div>13 November 2026</div><div>14 November 2026</div></section><main><h4>Car Parking</h4><p>Parking is available at Trinity Walk and The Ridings.</p></main>';
const listing=`<h3><a href="${eventUrl}">Light Up Wakefield</a></h3><p>Calendar Fri 13 Nov 2026 - Sat 14 Nov 2026</p><p>Clock 17:00 - 21:00</p><p>Map pin Wakefield City Centre</p>`;
const origin={latitude:53.683,longitude:-1.497};
const hours={periods:[{open:{day:5,hour:7},close:{day:5,hour:23}},{open:{day:6,hour:7},close:{day:6,hour:23}}]};
const burger={id:'central-mcd',displayName:{text:'McDonald’s Wakefield'},location:origin,businessStatus:'OPERATIONAL',formattedAddress:'1 Westgate, Wakefield WF1 1AA, UK',currentOpeningHours:hours,servesCoffee:true,servesDinner:true,servesDessert:true,goodForChildren:true,googleMapsUri:'https://maps.google.com/?cid=123',websiteUri:'https://www.mcdonalds.com/gb/en-gb.html'};
const menuUrl='https://www.mcdonalds.com/gb/en-gb/product/hot-chocolate.html';
const plans=new Map([
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
 if(u.startsWith('https://sheets.googleapis.com/')){if(u.includes('?fields='))return Response.json({sheets:['AW_CollectedEvents','AW_CollectorRuns','AW_EventReviews'].map(title=>({properties:{title,gridProperties:{rowCount:1000}}}))});if(decodeURIComponent(u).includes('AW_CollectedEvents'))return Response.json({values:[['run','museums',JSON.stringify(catalogueEvent)]]});if(decodeURIComponent(u).includes('AW_CollectorRuns'))return Response.json({values:[['run','museums',catalogueEvent.checkedAt,catalogueEvent.checkedAt,'complete','{}']]});return Response.json({values:[]});}
 if(u===eventUrl)return new Response(html);
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
assert.equal(week.verification,'weekly-catalogue-v1');assert.doesNotMatch(week.reply,/Light Up/);
const more=await ask('Light Up Wakefield sounds good. We are taking our children, aged 7 and 4. Tell me more.',week);
assert.equal(more.verification,'selected-event-discovery-v2');assert(more.state.constraints.eventFocus?.id);assert.match(more.reply,/break with the kids.*HAUS/s);
assert.match(more.reply,/Friday 13 November 2026 and Saturday 14 November 2026/,'Both published sessions must appear in the event summary');
assert(more.sources.some(s=>/HAUS/.test(s.title)&&/reviewed business announcement/.test(s.title)),'Dated event opening takes priority and retains its actual provenance');
const coffee=await ask('Coffee places?',more);
assert.equal(coffee.verification,'outing-food-v2');assert.match(coffee.reply,/While you’re at Light Up/);assert.doesNotMatch(coffee.reply,/Before Light Up/);
assert(coffee.state.constraints.outing.options.some(p=>p.name==='HAUS'),'A new branch shortlist must retain checked dated announcements');
const haus=await ask('Haus?',coffee);
assert.equal(haus.verification,'outing-food-v2');assert.match(haus.reply,/HAUS.*8pm/s);assert.doesNotMatch(haus.reply,/McDonald|Local Food|which venue|more detail|Before Light Up/i);
assert(haus.sources.some(s=>/reviewed business announcement/.test(s.title)));
const lateHaus=await ask('Would that still work at 8:30pm?',haus);
assert.match(lateHaus.reply,/HAUS closes at 8pm/);assert.doesNotMatch(lateHaus.reply,/McDonald/);
assert.match(lateHaus.reply,/too late at 8:30pm/);assert.doesNotMatch(lateHaus.reply,/haven’t verified.*Wakefield City Centre/,'A closing-time answer about HAUS must not imply no alternatives exist across the city');
assert(lateHaus.sources.some(s=>/reviewed business announcement/.test(s.title)),'Retain the source for a named closing-time answer');
const earlierHaus=await ask('Would it work at 7pm?',lateHaus);
assert.match(earlierHaus.reply,/At 7pm.*HAUS.*8pm/s);assert.doesNotMatch(earlierHaus.reply,/McDonald|Local Food/,'A rejected time must not erase the named place');
const interest=await ask('Light Up Wakefield sounds lovely.',week);
assert.equal(interest.verification,'selected-event-discovery-v2');assert.match(interest.reply,/Light Up.*HAUS/s);
const acknowledged=await ask('Cheers!',haus);
assert.equal(acknowledged.verification,'outing-acknowledgement');assert.equal(acknowledged.state.constraints.outing.currentIds[0],haus.state.constraints.outing.currentIds[0]);
const exactDetail=await ask('Can you tell me a bit more about Light Up Wakefield?',week);
const exactCoffee=await ask('Coffee places?',exactDetail);
assert.match(exactCoffee.reply,/While you’re at Light Up/);assert.doesNotMatch(exactCoffee.reply,/Before Light Up/);
const exactHaus=await ask('Haus?',exactCoffee);
assert.match(exactHaus.reply,/^Yes\. .*HAUS.*8pm/s);assert.doesNotMatch(exactHaus.reply,/which venue|more detail|Before Light Up/i);
const parking=await ask('How about parking?',more);assert.equal(parking.verification,'cards-first-v17');assert.match(parking.reply,/Trinity Walk/);assert.deepEqual(more.state.constraints.outing.party.ages,[7,4]);
const first=await ask('Anything quick to eat first?',more);
assert.equal(first.verification,'outing-food-v2');assert(first.sources.some(s=>/branch listing/.test(s.title)),'Ordinary branches must retain branch-listing attribution');assert.match(first.reply,/Before Light Up.*McDonald.*food options/s);
const after=await ask('We will probably be starving afterwards. Any ideas?',first);
assert.match(after.reply,/After Light Up.*McDonald.*dinner service/s);assert.match(after.reply,/Kitchen or food-counter/);
const late=await ask('Would that still work at 10pm?',after);
assert.match(late.reply,/At 10pm.*McDonald/s);assert.doesNotMatch(late.reply,/weekly list|Ferrybridge/);
const mixed=await ask('Could we grab a bite and a coffee instead?',more);
assert.match(mixed.reply,/McDonald.*coffee.*food options/s);
const chocolate=await ask('Something warm for the little ones and caffeine for us?',more);
assert.match(chocolate.reply,/menu.*hot chocolate.*branch availability/s);assert(menus>0);assert(chocolate.sources.some(s=>s.url===menuUrl));
assert.doesNotMatch(chocolate.reply,/Ferrybridge|Castleford|nearest|short walk/);
assert(plannerCalls>=5);assert(searches>=2);
console.log('Production catalogue outing handler passed: exact weekly -> Light Up -> Coffee places? -> Haus?, both event dates, correct attribution, named closing-time checks, family/food discovery and signed context.');
