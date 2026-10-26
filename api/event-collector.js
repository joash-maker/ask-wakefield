import {collectSource} from '../lib/events/collector.js';
import {getSource} from '../lib/events/sources.js';
import {createSheetsStore,storeConfigured} from '../lib/events/store.js';
import {isAdmin,isCron,noStore} from '../lib/events/auth.js';
export default async function handler(req,res){
 noStore(res);
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(!(req.method==='GET'?isCron(req):isAdmin(req)))return res.status(401).json({error:'Authentication required'});
 if(!storeConfigured())return res.status(503).json({error:'Collector storage is not configured'});
 const id=req.method==='GET'?req.query?.source:req.body?.source;
 if(!getSource(id)?.enabled)return res.status(400).json({error:'Choose a registered source'});
 try{const run=await collectSource(id,{store:createSheetsStore()});return res.status(run.status==='failed'?502:200).json({run});}
 catch(error){console.error('Event collector failed:',error.message);return res.status(503).json({error:'Collection could not be saved. Check collector storage and retry.'});}
}
