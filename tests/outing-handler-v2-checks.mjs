import assert from 'node:assert/strict';
const NativeDate=Date;
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:['2026-11-13T13:30:00Z']));}static now(){return NativeDate.parse('2026-11-13T13:30:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';process.env.AW_EVENT_CATALOGUE_ENABLED='false';process.env.AW_OUTING_PLANNER_ENABLED='true';
const eventUrl='https://experiencewakefield.co.uk/event/light-up-wakefield/';
const html='<section class="postHeading"><h1>Light Up Wakefield</h1><div>Fri 13 Nov 2026 - Sat 14 Nov 2026</div><div>17:00 - 21:00</div><div>Wakefield City Centre</div><div>Free</div></section><section class="postContent"><h3>About</h3><p>Explore the Light Trail. Pick up a map from WX Wakefield Exchange.</p></section><section class="postContent--sessions"><div>13 November 2026</div><div>14 November 2026</div></section><main><h4>Car Parking</h4><p>Parking is available at Trinity Walk and The Ridings.</p></main>';
const listing=`<h3><a href="${eventUrl}">Light Up Wakefield</a></h3><p>Calendar Fri 13 Nov 2026 - Sat 14 Nov 2026</p><p>Clock 17:00 - 21:00</p><p>Map pin Wakefield City Centre</p>`;
const origin={latitude:53.683,longitude:-1.497};
const hours={periods:[{open:{day:5,hour:7},close:{day:5,hour:23}},{open:{day:6,hour:7},close:{day:6,hour:23}}]};
const burger={id:'central-mcd',displayName:{text:'McDonald’s Wakefield'},location:origin,businessStatus:'OPERATIONAL',formattedAddress:'1 Westgate, Wakefield WF1 1AA, UK',currentOpeningHours:hours,servesCoffee:true,servesDinner:true,servesDessert:true,goodForChildren:true,googleMapsUri:'https://maps.google.com/?cid=123',websiteUri:'https://www.mcdonalds.com/gb/en-gb.html'};
const menuUrl='https://www.mcdonalds.com/gb/en-gb/product/hot-chocolate.html';
const plans=new Map([
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
const more=await ask('Light Up Wakefield sounds good. We are taking our children, aged 7 and 4. Tell me more.',week);
assert.match(more.reply,/break with the kids.*McDonald/s);assert.deepEqual(more.state.constraints.outing.party.ages,[7,4]);
const first=await ask('Anything quick to eat first?',more);
assert.equal(first.verification,'outing-food-v2');assert.match(first.reply,/Before Light Up.*McDonald.*food options/s);
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
console.log('Outing v2 handler passed: signed weekly -> selected event -> proactive fast food -> eat first -> dinner afterwards -> late timing -> natural mixed request -> UK menu proof.');
