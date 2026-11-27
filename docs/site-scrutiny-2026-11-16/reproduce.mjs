import fs from 'node:fs';import vm from 'node:vm';
const root=process.cwd()+'/';
const html=fs.readFileSync(root+'submit-event.html','utf8');const js=html.match(/<script>\s*\/\/ Posts[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
const results=[];
for(const status of [400,429,500,200]){
 let submit;let request;const field=value=>({value,style:{},type:'text'});
 const form={querySelectorAll:()=>[]};
 for(const k of ['eventName','eventType','startDate','endDate','startTime','endTime','venue','description','ticketPrice','eventUrl','submitterName','submitterEmail','organisation'])form[k]=field(k==='submitterEmail'?'not-an-email':'QA');
 form.addEventListener=(type,fn)=>submit=fn;
 const dom={eventForm:form,submitBtn:{style:{}},errorMsg:{style:{}},formState:{style:{display:'block'}},successState:{style:{display:'none'}}};
 class XHR{constructor(){request=this;this.status=status;this.responseText=JSON.stringify({error:'rejected'});}open(){}setRequestHeader(){}send(payload){this.payload=JSON.parse(payload);this.onload();}}
 vm.runInNewContext(js,{document:{getElementById:id=>dom[id]},XMLHttpRequest:XHR,window:{scrollTo(){}},Date,JSON});submit({preventDefault(){},target:form});
 results.push({case:'event-client-response',status,successVisible:dom.successState.style.display==='block',emailValidationBypassed:request.payload.submitterEmail==='not-an-email',consentSent:Object.hasOwn(request.payload,'consent')});
}
const code=fs.readFileSync(root+'api/submit-event.js','utf8').replace('export default async function handler','async function handler');const ctx=vm.createContext({URL,Date});vm.runInContext(code,ctx);
const required={eventName:'QA',eventType:'Music',startDate:'not-a-date',venue:'QA',description:'QA',submitterName:'Synthetic QA',submitterEmail:'qa@example.invalid'};
results.push({case:'event-server-input',acceptsInvalidDateAndMissingConsent:Boolean(ctx.sanitiseSubmission(required)),acceptsEndBeforeStart:Boolean(ctx.sanitiseSubmission({...required,startDate:'2026-11-20',endDate:'2026-11-16'}))});
fs.writeFileSync('/tmp/aw-site-audit/reproduction.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
