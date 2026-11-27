import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {generateKeyPairSync} from 'node:crypto';
import {submissionKey} from '../lib/submission-guard.js';
import eventHandler,{sanitiseSubmission as eventInput} from '../api/submit-event.js';
import listingHandler,{sanitiseSubmission as listingInput} from '../api/submit-listing.js';
const event={eventName:'Synthetic event',eventType:'Other',startDate:'2026-11-20',venue:'Fixture venue',description:'Test only',submitterName:'Synthetic QA',submitterEmail:'qa@example.invalid',consent:'Yes'};
assert(eventInput(event));for(const change of [{startDate:'2026-02-30'},{endDate:'2026-11-19'},{consent:'No'},{submitterEmail:'invalid'},{eventType:'Invented'},{eventName:{}},{startTime:'25:00'},{eventName:'x'.repeat(161)},{organisation:{}}])assert.equal(eventInput({...event,...change}),null,JSON.stringify(change));
const listing={listingName:'Synthetic club',listingType:'Club',category:'Music',description:'Test only',venue:'Fixture venue',areaPostcode:'Wakefield',submitterName:'Synthetic QA',submitterEmail:'qa@example.invalid',relationship:'Organiser',consent:'Yes',website:'https://example.invalid'};
assert(listingInput(listing));assert.equal(listingInput({...listing,consent:'No'}),null);assert.equal(listingInput({...listing,listingName:{}}),null);
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});process.env.GOOGLE_SERVICE_ACCOUNT_JSON=JSON.stringify({client_email:'qa@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})});process.env.EVENTS_SHEET_ID='fixture';process.env.RESEND_API_KEY='fixture';
let appends=0,mails=0,mailFailure=true,saveFailure=false;const rows={event:[],listing:[]};
globalThis.fetch=async(url,options={})=>{
 const u=decodeURIComponent(String(url));assert(options.signal,'All external submission requests are bounded');
 if(u.includes('oauth2.googleapis.com'))return Response.json({access_token:'fixture'});
 if(u.includes('api.resend.com')){mails++;assert.equal(JSON.parse(options.body).to.endsWith('@example.invalid')||JSON.parse(options.body).to==='hello@mediahubink.com',true);return Response.json({}, {status:mailFailure?503:200});}
 assert(u.includes('sheets.googleapis.com'),'No unmocked network');
 if(u.includes('?fields=sheets.properties'))return Response.json({sheets:[{properties:{title:'Listings'}}]});
 const kind=u.includes('Listings')?'listing':'event';
 if(u.includes(':append')){if(saveFailure)return Response.json({}, {status:503});appends++;const row=JSON.parse(options.body).values[0];rows[kind].push(row);return Response.json({updates:{updatedRange:(kind==='event'?'Sheet1':'Listings')+'!A2:Z2'}});}
 if(options.method==='PUT')return Response.json({});
 if(u.includes('A1:W1'))return Response.json({values:[['Timestamp']]});
 return Response.json({values:rows[kind]});
};
let requestId=0;
async function invoke(handler,body,ip){const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};await handler({method:'POST',headers:{'x-forwarded-for':ip||'submission-fixture-'+requestId++},body},res);return res;}
for(const [handler,body,kind] of [[eventHandler,event,'event'],[listingHandler,listing,'listing']]){
 const before=appends,mailBefore=mails;const [a,b]=await Promise.all([invoke(handler,body),invoke(handler,body)]);assert.equal(a.code,200);assert.equal(b.code,200);assert.equal(a.body.ok,true);assert.equal(a.body.notification.submitter,'failed');assert.equal(appends,before+1,'Concurrent retry saves once in this process');assert.equal(mails,mailBefore+2,'Retry does not duplicate mail');assert(rows[kind][0].includes('Yes'),'Consent recorded');assert(rows[kind][0].some(v=>/^[a-f0-9]{32}$/.test(v)),'Receipt identity recorded');
}
const durableBody={...event,eventName:'Existing durable receipt'},durableRow=[...rows.event[0]];durableRow[0]=new Date().toISOString();durableRow[16]=submissionKey(eventInput(durableBody));durableRow[17]='accepted';durableRow[18]='failed';rows.event.push(durableRow);const appendBefore=appends,mailBefore=mails;const durable=await invoke(eventHandler,durableBody);assert.equal(durable.body.duplicate,true);assert.equal(durable.body.notification.submitter,'accepted');assert.equal(appends,appendBefore);assert.equal(mails,mailBefore);
for(let i=0;i<9;i++){const r=await invoke(eventHandler,event,'rate-fixture');assert.equal(r.code,i<8?200:429);}
saveFailure=true;const failed=await invoke(eventHandler,{...event,eventName:'Failed fixture'});assert.equal(failed.code,503);assert.notEqual(failed.body.ok,true);saveFailure=false;mailFailure=false;const retry=await invoke(eventHandler,{...event,eventName:'Failed fixture'});assert.equal(retry.code,200);assert.equal(retry.body.notification.submitter,'accepted');
// Execute the actual page callback, with network and DOM effects controlled.
const html=fs.readFileSync('submit-event.html','utf8'),script=html.match(/<script>\s*\/\/ Save receipt[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
function client(status,response,mode='load',invalid=false){
 let submit,request,focused;const fields={};for(const name of ['eventName','eventType','startDate','endDate','startTime','endTime','venue','description','ticketPrice','eventUrl','submitterName','submitterEmail','organisation','consent'])fields[name]={name,value:name==='endDate'?'':event[name]||'',checked:true,validity:{valid:!(invalid&&name==='submitterEmail')},labels:[{textContent:name}],setAttribute(){},removeAttribute(){},setCustomValidity(){},focus(){focused=name;}};
 const form={...fields,elements:fields,querySelectorAll:()=>Object.values(fields),reportValidity(){},addEventListener(_,fn){submit=fn;}};
 const dom={eventForm:form,submitBtn:{disabled:false},errorMsg:{style:{},focus(){focused='error'}},formState:{style:{}},successState:{style:{display:'none'},focus(){focused='success'}},notificationStatus:{}};
 class XHR{constructor(){request=this;this.status=status;this.responseText=response;}open(){}setRequestHeader(){}send(payload){this.payload=JSON.parse(payload);if(mode!=='pending')this[mode==='load'?'onload':mode]();}}
 vm.runInNewContext(script,{document:{getElementById:id=>dom[id]},XMLHttpRequest:XHR});submit({preventDefault(){},target:form});if(mode==='pending')submit({preventDefault(){},target:form});return {dom,request,focused,fields};
}
for(const status of [400,429,500]){const r=client(status,JSON.stringify({error:'Rejected'}));assert.equal(r.dom.successState.style.display,'none');assert.equal(r.dom.submitBtn.disabled,false);assert.equal(r.focused,'error');assert.equal(r.fields.eventName.value,event.eventName);}
for(const [response,mode] of [['invalid json','load'],['null','load'],['{}','onerror'],['{}','ontimeout']]){const r=client(200,response,mode);assert.equal(r.dom.successState.style.display,'none');}
assert.equal(client(200,'{}','load',true).request,undefined,'Invalid email blocks network');
const success=client(200,JSON.stringify({ok:true,notification:{submitter:'failed'}}));assert.equal(success.focused,'success');assert.match(success.dom.notificationStatus.textContent,/has not been confirmed/);assert.equal(success.request.payload.consent,'Yes');
console.log('Submission scrutiny passed: real validation, controlled save/provider outcomes, retry guard, recorded consent, client failure states and accessible focus.');
