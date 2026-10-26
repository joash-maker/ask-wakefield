import assert from 'node:assert/strict';import {generateKeyPairSync} from 'node:crypto';
const NativeDate=Date;globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-26T12:00:00Z']));}static now(){return NativeDate.parse('2026-10-26T12:00:00Z');}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.AW_EVENT_CATALOGUE_ENABLED='true';process.env.EVENTS_SHEET_ID='test';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
const event={id:'source-event',sourceId:'museums',title:'Family Makers',venue:'Wakefield Museum',sourceUrl:'https://museumsandcastles.wakefield.gov.uk/whats-on/family-makers/',startDate:'2026-10-28',endDate:'2026-10-28',familyVerified:true,checkedAt:'2026-10-26T05:00:00Z',contentHash:'facts',issues:[],status:'scheduled',priceStatus:'unknown',categories:['family','arts'],minAge:null,maxAge:null};
let network=0;globalThis.fetch=async(u,opts)=>{
 const s=String(u);
 if(s==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-only'});
 if(s.startsWith('https://sheets.googleapis.com/')){
  if(s.includes('?fields='))return Response.json({sheets:['AW_CollectedEvents','AW_CollectorRuns','AW_EventReviews'].map(title=>({properties:{title,gridProperties:{rowCount:1000}}}))});
  if(decodeURIComponent(s).includes('AW_CollectedEvents'))return Response.json({values:[['run','museums',JSON.stringify(event)]]});
  if(decodeURIComponent(s).includes('AW_CollectorRuns'))return Response.json({values:[['run','museums',event.checkedAt,event.checkedAt,'complete','{}']]});
  return Response.json({values:[]});
 }
 network++;throw new Error('Catalogue answer must not call website/model: '+s);
};
const {default:handler}=await import('../api/chat.js');
async function ask(text,messages=[],stateToken){const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};const conversation=[...messages,{role:'user',content:text}];await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'catalogue-'+messages.length},socket:{},body:{messages:conversation,stateToken}},res);assert.equal(res.code,200);return {...res.body,messages:[...conversation,{role:'assistant',content:res.body.reply}]};}
const first=await ask('What can we do with the kids this week?');assert.equal(first.verification,'weekly-catalogue-v1');assert.match(first.reply,/Family Makers/);assert.match(first.reply,/48 hours/);assert(first.stateToken);assert(first.sources.some(s=>s.url===event.sourceUrl));
const follow=await ask('For the October half term',first.messages,first.stateToken);assert.equal(follow.verification,'weekly-followup-v1');assert.match(follow.reply,/Family Makers/);assert.equal(network,0);assert.equal(follow.state.resultCards[0].catalogueVerified,true);
event.status='cancelled';const empty=await ask('What can we do with the kids this week?');assert.equal(empty.verification,'weekly-catalogue-v1');assert.doesNotMatch(empty.reply,/Family Makers/);assert.equal(empty.sources.length,0);assert.equal(network,0,'Empty catalogue must not revive cancelled records through fallback');
console.log('Catalogue handler checks passed: persistent Sheets data to sourced weekly answer and signed family follow-up, with no live-source/model calls.');
