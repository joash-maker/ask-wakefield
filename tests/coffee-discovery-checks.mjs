import assert from 'node:assert/strict';
const NativeDate=Date;
globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-15T13:00:00Z']));}static now(){return NativeDate.parse('2026-11-15T13:00:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';
process.env.AW_EVENT_CATALOGUE_ENABLED='false';
const {broadCoffeeDiscovery,renderCoffeeDiscovery}=await import('../lib/coffee-discovery.js');
for(const q of ['Where can I get good food or coffee in Wakefield?',"I'm sure there's more coffee shops around Wakefield city",'Any cafes in the city centre?'])assert.equal(broadCoffeeDiscovery([{role:'user',content:q}]),true,q);
for(const q of ['What is coffee?','Where can I get vegan coffee?','Plan coffee and art','Independent coffee near Wakefield','Coffee for children','Starting with brunch and someone recommended a coffee shop/bar called Example'])assert.equal(broadCoffeeDiscovery([{role:'user',content:q}]),false,q);
assert.equal(broadCoffeeDiscovery([{role:'user',content:'Where can I get hot chocolate and coffee?'}]),true);
const anchor={latitude:53.683,longitude:-1.497};
const places=Array.from({length:12},(_,i)=>({id:'coffee-'+i,displayName:{text:'Fixture Coffee '+i},businessStatus:'OPERATIONAL',location:{latitude:53.683+i*.0003,longitude:-1.497},formattedAddress:(i+1)+' Fixture Street, Wakefield WF1 1AA, UK',googleMapsUri:'https://maps.google.com/?cid='+i+'&g_mp=tracking',servesCoffee:true,servesLunch:i%2===0,currentOpeningHours:{openNow:i%2===0,weekdayDescriptions:['Monday: 07:00–16:00','Sunday: 09:00–15:00'],periods:[{open:{day:0,hour:9},close:{day:0,hour:15}}]}}));
let broken=false,unknownServices=false,calls=0,genericCalls=0;
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.includes('places.googleapis.com')){
  calls++;
  if(broken)return new Response('Unavailable',{status:503});
  const body=JSON.parse(opts.body);
  if(body.pageSize===1)return Response.json({places:[{location:anchor}]});
  assert(opts.headers['X-Goog-FieldMask'].includes('servesCoffee'),'Broad discovery must request actual coffee-service evidence');
  return Response.json({places:[...places.map(p=>unknownServices?{...p,servesCoffee:undefined,servesLunch:undefined}:p),{...places[0],id:'wrong-town',displayName:{text:'Outer Horbury Cafe'},formattedAddress:'Horbury, Wakefield',location:{latitude:53.661,longitude:-1.554}},{...places[0],id:'missing-coordinates',location:undefined,displayName:{text:'Missing Coordinates Cafe'}},{...places[0],id:'unknown-coffee',displayName:{text:'Unknown Service Cafe'},servesCoffee:undefined,servesLunch:undefined},{...places[0],id:'closed-permanently',displayName:{text:'Closed Cafe'},businessStatus:'CLOSED_PERMANENTLY'}]});
 }
 if(u.includes('anthropic.com')){genericCalls++;throw new Error('Broad coffee discovery must not generate prose venue facts');}
 return new Response('Not found',{status:404});
};
const {default:handler}=await import('../api/chat.js');
let n=0;
async function ask(q,prior){
 const messages=[...(prior?.messages||[]),{role:'user',content:q}];
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'coffee-discovery-'+ ++n},socket:{},body:{messages,stateToken:prior?.stateToken}},res);
 assert.equal(res.code,200);assert.equal(res.body.verification,'coffee-discovery-v1');assert(res.body.stateToken);
 const result={...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
 assert.equal(result.sources.length,result.state.resultCards.length);
 for(const card of result.state.resultCards){assert(result.reply.includes(card.name));assert(result.reply.includes(card.address));assert(result.sources.some(s=>s.title.startsWith(card.name+' -')&&s.url===card.url));}
 assert(result.sources.every(s=>!s.url.includes('g_mp')));
 assert.doesNotMatch(result.reply,/speciality|relaxed|popular|proper|espresso|sweet treats|solid option|open right now|On Track|RECENT|Esquires/);
 return result;
}
const first=await ask('Where can I get good food or coffee in Wakefield?');
assert.match(first.reply,/Wakefield district/);assert.doesNotMatch(first.reply,/09:00|15:00|open until/);
const city=await ask("I'm sure there's more coffee shops around Wakefield city",first);
assert.equal(city.state.area,'Wakefield city centre');assert.match(city.reply,/more checked listings in Wakefield city centre/);
assert.doesNotMatch(city.reply,/Outer Horbury|Missing Coordinates|Unknown Service|Closed Cafe/);
assert(city.state.resultCards.every(p=>!first.state.resultCards.some(old=>old.id===p.id)),'More should not repeat the previous shortlist');
const next=await ask('Any more?',city);assert.equal(next.state.area,'Wakefield city centre');
assert(next.state.resultCards.every(p=>!city.state.constraints.coffeeDiscovery.shownIds.includes(p.id)));
const now=await ask('Which coffee shops are open now in Wakefield city centre?',city);
assert.match(now.reply,/listed open now/);assert(now.state.resultCards.every(p=>+p.id.split('-').at(-1)%2===0));
const hours=await ask('What are their Sunday opening hours?',city);
assert.match(hours.reply,/Sunday: 09:00–15:00/);assert.doesNotMatch(hours.reply,/Monday:/);assert.deepEqual(hours.state.resultCards.map(p=>p.id),city.state.resultCards.map(p=>p.id),'Their hours must keep the previously displayed branches');
unknownServices=true;
const unknown=await ask('Any cafes in Wakefield city centre?');assert.equal(unknown.sources.length,0);assert.match(unknown.reply,/couldn’t verify/);
broken=true;
const unavailable=await ask('Where can I get coffee in Wakefield city centre?');assert.equal(unavailable.sources.length,0);assert.match(unavailable.reply,/couldn’t verify/);
assert.equal(genericCalls,0);
assert(calls>0);
// A source shown only in the retrieval batch cannot leak into source chips.
const mismatch=renderCoffeeDiscovery([{role:'user',content:'Coffee places?'}],{places:[{id:'a',name:'Only Checked Cafe',businessStatus:'OPERATIONAL',servesCoffee:true,serviceVerified:true,googleMapsUri:'https://maps.google.com/?cid=1'}],sources:[{title:'Unrelated Cafe',url:'https://unrelated.example/'}]},null,'Wakefield city centre');
assert.equal(mismatch.sources.length,1);assert.equal(mismatch.sources[0].title,'Only Checked Cafe - Google Places branch listing');
console.log('Coffee discovery passed: exact source/name/address membership, general vs open-now intent, fresh Sunday hours, city geography, more pagination, signed area retention and unavailable/unknown evidence.');

const resetRes={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'coffee-explicit-reset',cookie:'aw_state='+first.stateToken},socket:{},body:{messages:[{role:'user',content:'Which of those are free?'}],stateToken:null}},resetRes);
assert.equal(resetRes.code,200);assert.equal(resetRes.body.verification,'no-prior-list');
