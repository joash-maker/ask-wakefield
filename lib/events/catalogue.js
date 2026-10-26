import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex').slice(0,24);
import {createSheetsStore,latestSnapshots,storeConfigured} from './store.js';
import {EVENT_SOURCES} from './sources.js';
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const venueKey=s=>/wakefield exchange|^wx\b/i.test(s||'')?'wakefieldexchange':norm(s);
export function buildCatalogue(data,{now=new Date(),maxAgeHours=48}={}){
 const groups=new Map(),latestReview=new Map();for(const r of [...data.reviews].sort((a,b)=>a.at.localeCompare(b.at)))latestReview.set(r.id,r);
 const latestAttempt=new Map();for(const r of [...data.runs].sort((a,b)=>a.startedAt.localeCompare(b.startedAt)))latestAttempt.set(r.sourceId,r);
 const staged=[...latestAttempt.values()].filter(r=>r.status==='failed').flatMap(r=>data.events.filter(e=>e.runId===r.id).map(({event:e})=>({...e,issues:[...e.issues,'Latest collection incomplete']})));
 for(const e of [...latestSnapshots(data),...staged]){
  const key=e.issues.length?'unverified|'+e.id:[norm(e.title),venueKey(e.venue),e.startDate||'ongoing',e.endDate].join('|');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);
 }
 return [...groups.values()].map(variants=>{
  // Prefer venue sources to the district aggregator, then the newest evidence.
  variants.sort((a,b)=>Number(a.sourceId==='experience')-Number(b.sourceId==='experience')||b.checkedAt.localeCompare(a.checkedAt));
  const primary=variants[0],issues=[...new Set(variants.flatMap(e=>e.issues))];
  for(const field of ['status','priceRaw','startTime','endTime']){
   const values=new Set(variants.map(e=>e[field]).filter(v=>v&&v!=='unknown'));if(values.size>1)issues.push(`Conflicting ${field}`);
  }
  const id=primary.issues.length?hash('unverified|'+primary.id):hash([norm(primary.title),venueKey(primary.venue),primary.startDate||'ongoing',primary.endDate].join('|'));
  const contentHash=hash(variants.map(e=>e.contentHash).sort());const review=latestReview.get(id);
  const checkedAt=primary.checkedAt,age=now-new Date(checkedAt),stale=!Number.isFinite(age)||age< -300000||age>maxAgeHours*3600000;
  const status=variants.some(e=>e.status==='cancelled')?'cancelled':primary.status;
  const decision=review?.decision==='held'?'held':review?.contentHash===contentHash&&review?.decision==='approved'?'approved':issues.length?'needs-review':'automatic';
  const valid=!!primary.title&&!!primary.venue&&!!primary.endDate&&(primary.startDate||primary.ongoing)&&!primary.issues.length;
  return {...primary,id,contentHash,status,issues,decision,stale,checkedAt,visible:!!valid&&!stale&&!['held','needs-review'].includes(decision)&&!['cancelled','postponed'].includes(status),sources:variants.map(e=>({url:e.sourceUrl,name:EVENT_SOURCES.find(s=>s.id===e.sourceId)?.name||e.sourceId,checkedAt:e.checkedAt,evidence:{date:e.dateEvidence,audience:e.audienceEvidence,age:e.ageEvidence,price:e.priceRaw,availability:e.availabilityEvidence||e.availability,availabilitySource:e.availabilitySourceUrl||e.sourceUrl}}))};
 });
}
export function queryCatalogue(events,{from,to,family=false,ages=[],area=null,categories=[]}={}){
 return events.filter(e=>e.visible&&e.endDate>=from&&(!e.startDate||e.startDate<=to)&&(!family||e.familyVerified)&&(!area||e.area===area)&&(!categories.length||categories.some(c=>e.categories.includes(c)))&&(!ages.length||(e.minAge!==null&&ages.every(a=>a>=e.minAge&&(e.maxAge===null||a<=e.maxAge)))));
}
export async function loadCatalogueWeek(window){
 if(process.env.AW_EVENT_CATALOGUE_ENABLED!=='true'||!storeConfigured())return null;
 try{const data=await createSheetsStore().load();if(!data.runs.some(r=>['complete','partial'].includes(r.status)))return null;const events=buildCatalogue(data);const view=queryCatalogue(events,{from:window.from,to:window.end});return view.map(e=>({...e,entityType:'event',catalogueVerified:true,url:e.sourceUrl,start:e.startTime,end:e.endTime}));}catch(error){console.error('Event catalogue unavailable:',error.message);return null;}
}
