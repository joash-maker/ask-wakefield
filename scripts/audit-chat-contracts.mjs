// Offline fault-injection audit. All providers and model output are simulated.
// Exit 1 means an acceptance contract still fails, not a provider outage.
import fs from 'node:fs';
import {generateKeyPairSync} from 'node:crypto';
const now='2026-11-26T10:00:00Z',NativeDate=Date;
globalThis.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[now]));}static now(){return NativeDate.parse(now);}};
process.env.ANTHROPIC_API_KEY='fixture';process.env.GOOGLE_PLACES_ENABLED='true';process.env.GOOGLE_PLACES_API_KEY='fixture';process.env.AW_EVENT_CATALOGUE_ENABLED='true';process.env.EVENTS_SHEET_ID='fixture';
process.env.OPENAI_API_KEY='';process.env.LEGACY_LLM_VALIDATORS_ENABLED='false';process.env.FULL_ANSWER_OPENAI_VERIFY_ENABLED='false';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'fixture@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const event=(id,title,date,categories,startTime='13:00',endTime='15:00')=>({id,sourceId:'wx',title,venue:'WX Wakefield Exchange',startDate:date,endDate:date,startTime,endTime,categories,sourceUrl:'https://wxwakefield.co.uk/Whats-On/Details?event='+id,status:'scheduled',availability:'unknown',priceStatus:'paid',priceRaw:'GBP 10',checkedAt:now,contentHash:id,issues:[]});
const events=[event('sat','Saturday Performer','2026-11-28',['music']),event('fri','Friday Performer','2026-11-27',['music']),event('art','Saturday Art Workshop','2026-11-28',['arts']),event('sun','Sunday Concert','2026-11-29',['music'])];
let modelCalls=0;
const injected='Unlisted Fixture Cafe is open until 23:00 and serves hot chocolate.';
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture'});
 if(u.startsWith('https://sheets.googleapis.com/')){
  if(u.includes('?fields='))return Response.json({sheets:['AW_CollectedEvents','AW_CollectorRuns','AW_EventReviews'].map(title=>({properties:{title,gridProperties:{rowCount:1000}}}))});
  const path=decodeURIComponent(u);
  if(path.includes('AW_CollectedEvents'))return Response.json({values:events.map(e=>['run','wx',JSON.stringify(e)])});
  if(path.includes('AW_CollectorRuns'))return Response.json({values:[['run','wx',now,now,'complete','{}']]});
  return Response.json({values:[]});
 }
 if(u.includes('places.googleapis.com')){
  const b=JSON.parse(opts.body);
  if(b.pageSize===1)return Response.json({places:[{location:{latitude:53.683,longitude:-1.497}}]});
  return Response.json({places:[{id:'known',displayName:{text:'Known Fixture Coffee Shop'},formattedAddress:'Wakefield WF1',businessStatus:'OPERATIONAL',googleMapsUri:'https://maps.google.com/?cid=123',location:{latitude:53.683,longitude:-1.497},servesCoffee:true,servesLunch:true}]});
 }
 if(u.includes('anthropic.com')){modelCalls++;return Response.json({content:[{type:'text',text:'FINAL_RESPONSE: '+injected}],stop_reason:'end_turn'});}
 return new Response('No fixture for this URL',{status:404});
};
const {verifyHotChocolate}=await import('../lib/coffee-discovery.js');
let aliasFetches=0;
const aliasRequest=async()=>{aliasFetches++;return new Response('<p>Drink menu: hot chocolate</p>');};
const aliasResult=await verifyHotChocolate({places:[{name:'Bob & Berts Wakefield'}]},aliasRequest);
const exactResult=await verifyHotChocolate({places:[{name:'Bob & Berts, Trinity Walk'}]},aliasRequest);
const identityCheck={scope:'Controlled same-provider-name variation, not a real menu check',googleStyleNameVerified:aliasResult.places[0].hotChocolateVerified===true,curatedStyleNameVerified:exactResult.places[0].hotChocolateVerified===true,operatorFetches:aliasFetches};
const {default:handler}=await import('../api/chat.js');let serial=0;
async function ask(q,prior){
 const messages=[...(prior?.messages||[]),{role:'user',content:q}],headers={};
 const res={setHeader(k,v){headers[k]=v;},status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;}};
 const before=modelCalls;
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'audit-'+ ++serial},socket:{},body:{messages,stateToken:prior?.stateToken}},res);
 return {...res.body,status:res.statusCode,headers,modelCalls:modelCalls-before,messages:[...messages,{role:'assistant',content:res.body.reply||''}]};
}
const rain=await ask('What can I do on a rainy day in Wakefield?');const anchor=await ask('Anything in the city centre with parking?',rain);
const coffeeQuestions=['Somewhere for coffee and hot chocolate nearby?','Can we get coffee and hot chocolate nearby?','Where could we get coffee and hot chocolate nearby?','Coffee and hot chocolate nearby?','Coffee and a hot chocolate nearby?','Something for coffee and hot chocolate nearby?','Hot chocolate and coffee nearby?','Is there anywhere for coffee and hot chocolate near there?','Any good places for coffee and hot chocolate nearby?','Coffee and hot chocolate around here?'];
const answerContract=r=>{const plain=(r.reply||'').replace(/\[[^\]]+\]\([^)]*\)/g,'');return r.pipelineVersion==='unified-v1'&&(plain.match(/\?/g)||[]).length===1&&plain.trim().endsWith('?')&&!/https?:\/\//.test(plain)&&!/named coffee-shop record|local directory|confirmed sessions|collected source pages|partial district calendar/i.test(plain);};
const results=[];
for(const question of coffeeQuestions){const r=await ask(question,anchor);const unsupported=r.reply?.includes('Unlisted Fixture Cafe')||false;results.push({group:'coffee-paraphrase',question,status:r.status,verification:r.verification||null,modelCalls:r.modelCalls,unsupportedClaimReleased:unsupported,passed:r.status===200&&!unsupported&&r.modelCalls===0&&answerContract(r)&&r.verification==='coffee-discovery-v1',reply:r.reply,sources:r.sources});}
const week=await ask("What's on this week?");const saturday=await ask('What about Saturday?',week);
const musicCases=[['Any music events?','music'],['Is there any live music?','music'],['Any gigs?','music'],['What about live bands?','music'],['Anything musical?','music'],['Could we see some live music?','music'],['Any music on that day?','music'],['Is there a concert?','music'],['What about music in the evening?','evening'],['No music, what else?','exclude-music']];
for(const [question,need] of musicCases){const r=await ask(question,saturday);const visible=r.state?.viewIds||[];const satId=r.state?.resultCards?.find(e=>e.title==='Saturday Performer')?.id;const visibleSat=Boolean(satId&&visible.includes(satId));const shown=(r.state?.resultCards||[]).filter(c=>visible.includes(c.id));const correctType=need==='music'?visibleSat&&shown.every(c=>c.categories.includes('music')):need==='evening'?shown.length===0&&r.state?.timeWindow?.startHour===17:!visibleSat&&shown.some(c=>c.title==='Saturday Art Workshop')&&shown.every(c=>!c.categories.includes('music'));const preserved=r.state?.constraints?.eventWeek?.filters?.day==='saturday';results.push({group:'music-followup',question,need,status:r.status,verification:r.verification||null,modelCalls:r.modelCalls,preservedSaturday:preserved,visibleAfternoonMusic:visibleSat,passed:r.status===200&&preserved&&correctType&&r.modelCalls===0&&answerContract(r),reply:r.reply,sources:r.sources});}
const build=week.headers['X-AskWakefield-Build'];
const output={identityCheck,scope:'Offline fault injection against the real handler; external requests mocked; injected model claims are not real provider/model observations',buildHeader:build,total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
fs.mkdirSync(new URL('../docs/unified-pipeline/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/unified-pipeline/acceptance-results.json',import.meta.url),JSON.stringify(output,null,2));
console.log(JSON.stringify({total:output.total,passed:output.passed,failed:output.failed,unsupportedClaimReleased:results.filter(r=>r.unsupportedClaimReleased).map(r=>r.question),musicFailures:results.filter(r=>r.group==='music-followup'&&!r.passed).map(r=>({question:r.question,modelCalls:r.modelCalls,preservedSaturday:r.preservedSaturday,visibleAfternoonMusic:r.visibleAfternoonMusic}))},null,2));
if(!identityCheck.googleStyleNameVerified||!identityCheck.curatedStyleNameVerified)throw Error('Canonical operator join failed');
process.exitCode=output.failed?1:0;
