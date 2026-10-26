import {createSign,randomUUID} from 'node:crypto';
const TABS={events:'AW_CollectedEvents',runs:'AW_CollectorRuns',reviews:'AW_EventReviews'};
let cachedToken;
export function storeConfigured(){return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON&&process.env.EVENTS_SHEET_ID);}
async function accessToken(){
 if(cachedToken&&cachedToken.until>Date.now())return cachedToken.value;
 const account=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'{}');
 if(!account.client_email||!account.private_key)throw new Error('Collector storage is not configured');
 const now=Math.floor(Date.now()/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const sign=createSign('RSA-SHA256');sign.update(unsigned);const assertion=unsigned+'.'+sign.sign(account.private_key,'base64url');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Collector could not authenticate its store');const data=await r.json();cachedToken={value:data.access_token,until:Date.now()+50*60*1000};return cachedToken.value;
}
export function createSheetsStore({request=fetch,tokenProvider=accessToken,sheetId=process.env.EVENTS_SHEET_ID}={}){
 const root=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId||'')}`;
 async function call(path,method='GET',body){const token=await tokenProvider();const r=await request(root+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`Collector store request failed (${r.status})`);return r.json();}
 async function setup(){
  const meta=await call('?fields=sheets.properties');const existing=new Set((meta.sheets||[]).map(x=>x.properties.title));
  const missing=Object.values(TABS).filter(t=>!existing.has(t));
  if(missing.length)await call(':batchUpdate','POST',{requests:missing.map(title=>({addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:6}}}}))});
  // Only the new collector tabs are touched. Existing submissions are unchanged.
  const headers={events:['Run ID','Source ID','Event JSON'],runs:['Run ID','Source ID','Started','Completed','Status','Report JSON'],reviews:['Event ID','Content hash','Decision','Checked','Note']};
  await call('/values:batchUpdate','POST',{valueInputOption:'RAW',data:Object.entries(TABS).map(([key,title])=>({range:`'${title}'!A1`,values:[headers[key]]}))});
 }
 async function rows(key){
  const meta=await call('?fields=sheets.properties');const tab=(meta.sheets||[]).find(s=>s.properties.title===TABS[key]);if(!tab)return [];
  const start=Math.max(2,(tab.properties.gridProperties?.rowCount||1000)-20000+1);
  const d=await call('/values/'+encodeURIComponent(`'${TABS[key]}'!A${start}:F`));return d.values||[];
 }
 async function append(key,values){if(!values.length)return;await call('/values/'+encodeURIComponent(`'${TABS[key]}'!A:F`)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS','POST',{values});}
 const parse=s=>{try{return JSON.parse(s);}catch{return null;}};
 return {
  setup,
  async load(){const [events,runs,reviews]=await Promise.all([rows('events'),rows('runs'),rows('reviews')]);return {events:events.map(r=>({runId:r[0],sourceId:r[1],event:parse(r[2])})).filter(r=>r.event),runs:runs.map(r=>({id:r[0],sourceId:r[1],startedAt:r[2],completedAt:r[3],status:r[4],...(parse(r[5])||{})})),reviews:reviews.map(r=>({id:r[0],contentHash:r[1],decision:r[2],at:r[3],note:r[4]||''}))};},
  async saveRun(report,events=[]){const run={...report,id:report.id||randomUUID()};await append('events',events.map(e=>[run.id,run.sourceId,JSON.stringify(e)]));await append('runs',[[run.id,run.sourceId,run.startedAt,run.completedAt,run.status,JSON.stringify(run)]]);return run;},
  async review({id,contentHash,decision,note=''}){if(!['approved','held'].includes(decision))throw new Error('Invalid review decision');await append('reviews',[[id,contentHash,decision,new Date().toISOString(),String(note).slice(0,500)]]);}
 };
}
export function latestSnapshots(data){
 const runs=[...data.runs].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));const selected=new Map();
 for(const r of runs)if(['complete','partial'].includes(r.status))selected.set(r.sourceId,r);
 return [...selected.values()].flatMap(r=>data.events.filter(e=>e.runId===r.id).map(e=>e.event));
}
