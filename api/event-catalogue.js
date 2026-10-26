import {createSheetsStore,storeConfigured} from '../lib/events/store.js';
import {buildCatalogue} from '../lib/events/catalogue.js';
import {EVENT_SOURCES} from '../lib/events/sources.js';
import {isAdmin,noStore} from '../lib/events/auth.js';
export default async function handler(req,res){
 noStore(res);if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!isAdmin(req))return res.status(401).json({error:'Authentication required'});
 if(!storeConfigured())return res.status(503).json({error:'Use AW’s existing Google service account and event spreadsheet to configure collector storage.'});
 const store=createSheetsStore();
 try{
  if(req.body.action==='setup'){await store.setup();return res.status(200).json({ok:true});}
  const data=await store.load(),events=buildCatalogue(data);
  if(req.body.action==='review'){
   const event=events.find(e=>e.id===req.body.id);
   if(!event||event.contentHash!==req.body.contentHash)return res.status(409).json({error:'This record changed. Reload before reviewing.'});
   if(!['approved','held'].includes(req.body.decision))return res.status(400).json({error:'Invalid decision'});
   await store.review({id:event.id,contentHash:event.contentHash,decision:req.body.decision,note:req.body.note});return res.status(200).json({ok:true});
  }
  if(req.body.action!=='list')return res.status(400).json({error:'Unknown action'});
  const sources=EVENT_SOURCES.map(source=>{const runs=data.runs.filter(r=>r.sourceId===source.id).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));return {...source,lastRun:runs[0]||null,lastSuccess:runs.find(r=>['complete','partial'].includes(r.status))||null,records:events.filter(e=>e.sources.some(s=>s.name===source.name)).length};});
  return res.status(200).json({sources,events,active:process.env.AW_EVENT_CATALOGUE_ENABLED==='true',scheduled:!!process.env.CRON_SECRET,scope:'Pilot: Wakefield district, next 90 days. First listing page and bounded event-page checks per source. Surrounding areas are not yet enabled.'});
 }catch(error){console.error('Event catalogue admin failed:',error.message);return res.status(503).json({error:'Could not read the collector. Initialise its tabs or check the Google Sheets connection.'});}
}
