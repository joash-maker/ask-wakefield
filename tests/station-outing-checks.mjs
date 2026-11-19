import assert from 'node:assert/strict';
const NativeDate=Date;
globalThis.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:['2026-11-14T13:00:00Z']));}static now(){return NativeDate.parse('2026-11-14T13:00:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='true';process.env.AW_OUTING_PLANNER_ENABLED='true';process.env.AW_EVENT_CATALOGUE_ENABLED='false';
const west={latitude:53.683,longitude:-1.505},kirk={latitude:53.678,longitude:-1.488};
globalThis.fetch=async(url,options={})=>{
 if(String(url).includes('places.googleapis.com')){
  const b=JSON.parse(options.body),isKirk=/kirkgate/i.test(b.textQuery),at=isKirk?kirk:west;
  if(b.pageSize===1)return Response.json({places:[{location:at}]});
  assert.equal(b.locationBias.circle.radius,500);
  const place={id:isKirk?'kirk':'west',displayName:{text:isKirk?'Kirkgate Coffee':'Westgate Coffee'},location:at,formattedAddress:isKirk?'Kirkgate, Wakefield':'Mulberry Way, Wakefield',businessStatus:'OPERATIONAL',servesCoffee:true,dineIn:true,goodForChildren:true,currentOpeningHours:{periods:[{open:{day:6,hour:7},close:{day:6,hour:22}}]},googleMapsUri:'https://maps.google.com/?cid='+(isKirk?'2':'1')};
  return Response.json({places:[place,{...place,id:'distant',displayName:{text:'Distant Cafe'},location:{latitude:at.latitude+0.02,longitude:at.longitude}}]});
 }
 if(String(url).includes('anthropic.com')){
  const b=JSON.parse(options.body);assert(b.system.startsWith('OUTING_PLANNER_V2'),'No generic prose may invent a station recommendation');
  const data=JSON.parse(b.messages[0].content);
  return Response.json({content:[{type:'text',text:JSON.stringify(/sit down/i.test(data.question)?{intent:'unrelated'}:{intent:'food_drink',needs:['coffee'],timing:'during',referencePrevious:true})}]});
 }
 throw new Error('Unexpected source '+url);
};
const {default:handler}=await import('../api/chat.js');
let n=0;
async function ask(q,prior){const messages=[...(prior?.messages||[]),{role:'user',content:q}];const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'station-'+ ++n},socket:{},body:{messages,stateToken:prior?.stateToken}},res);assert.equal(res.code,200);assert(res.body.stateToken);return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};}
const first=await ask('Is there a coffee shop near Wakefield Westgate station?');
assert.equal(first.verification,'station-food-v1');assert.match(first.reply,/Near Wakefield Westgate station.*Westgate Coffee/s);assert.doesNotMatch(first.reply,/Distant|minutes|short walk|best bet/);
const seated=await ask('Somewhere to sit down with the kids would be good.',first);
assert.equal(seated.verification,'outing-food-v2');assert.match(seated.reply,/dine-in service/);assert.deepEqual(seated.state.constraints.outing.party.children,true);
const thanks=await ask('Cheers!',seated);assert.equal(thanks.verification,'outing-acknowledgement');
const change=await ask('Actually, I meant Kirkgate station.',thanks);
assert.equal(change.verification,'station-food-v1');assert.match(change.reply,/with the kids/);assert.match(change.reply,/Kirkgate Coffee/);assert.doesNotMatch(change.reply,/Westgate Coffee/);
const late=await ask('What about at half six?',change);
assert.equal(late.verification,'outing-food-v2');assert.match(late.reply,/At 6:30pm.*Kirkgate Coffee/s);assert.doesNotMatch(late.reply,/5:30pm|Westgate Coffee/);
const ambiguous=await ask('Is there a coffee shop near Wakefield train station?');assert.equal(ambiguous.verification,'station-choice');
const clarified=await ask('Westgate',ambiguous);assert.equal(clarified.verification,'station-food-v1');assert.match(clarified.reply,/Westgate Coffee/);
console.log('Station outing passed: 500m branch proof, seating evidence, kids, thanks interruption, station correction, half six, and genuine station ambiguity.');
