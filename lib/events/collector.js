import {getSource,allowedUrl} from './sources.js';
import {listingLinks,parseEventPage,parseListingStructured,hash} from './parser.js';
import {latestSnapshots} from './store.js';
const BOT='AskWakefieldBot/1.0 (+https://www.askwakefield.co.uk)';
export function robotsAllows(text,path){
 let groups=[],agents=[],rules=[];const finish=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];};
 for(const line of text.split(/\r?\n/)){const [key,...rest]=line.split('#')[0].split(':');const value=rest.join(':').trim();if(!key)continue;
  if(key.trim().toLowerCase()==='user-agent'){if(rules.length)finish();agents.push(value.toLowerCase());}
  else if(['allow','disallow'].includes(key.trim().toLowerCase())&&value)rules.push({allow:key.trim().toLowerCase()==='allow',path:value});
 }finish();
 const matching=groups.filter(g=>g.agents.some(a=>a==='*'||'askwakefieldbot'.includes(a)));const specific=matching.filter(g=>!g.agents.includes('*'));
 const all=(specific.length?specific:matching).flatMap(g=>g.rules).filter(r=>{const escaped=r.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$');try{return new RegExp('^'+escaped).test(path);}catch{return true;}}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return !all.length||all[0].allow;
}
export function createSourceFetcher(source,{request=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),timeoutMs=12000}={}){
 let last=0,delay=600;const robots=new Map();
 async function raw(value,robotsRequest=false){
  let url=allowedUrl(value,source);if(!url)throw new Error('URL outside approved source');
  for(let hop=0;hop<5;hop++){
   const gap=delay-(Date.now()-last);if(gap>0)await wait(gap);last=Date.now();
   const r=await request(url,{redirect:'manual',headers:{'User-Agent':BOT,Accept:'text/html,application/ld+json;q=0.9,text/plain;q=0.5'},signal:AbortSignal.timeout(timeoutMs)});
   if([301,302,303,307,308].includes(r.status)){url=allowedUrl(r.headers.get('location'),source,url);if(!url)throw new Error('Redirect outside approved source');if(!robotsRequest)await policy(url);continue;}
   if(robotsRequest&&r.status===404)return '';
   if(!r.ok)throw new Error(`Source returned HTTP ${r.status}`);
   if(Number(r.headers.get('content-length'))>2_000_000)throw new Error('Source page too large');
   const reader=r.body?.getReader();if(!reader)return r.text();let n=0,chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>2_000_000){await reader.cancel();throw new Error('Source page too large');}chunks.push(value);}
   return Buffer.concat(chunks).toString('utf8');
  }throw new Error('Too many redirects');
 }
 async function policy(url){const u=new URL(url);if(!robots.has(u.origin))robots.set(u.origin,await raw(u.origin+'/robots.txt',true));const declared=[...robots.get(u.origin).matchAll(/Crawl-delay:\s*([\d.]+)/gi)].map(m=>Number(m[1])*1000);if(declared.length)delay=Math.max(600,...declared);if(delay>5000)throw new Error('Source needs a slower collection schedule');if(!robotsAllows(robots.get(u.origin),u.pathname+u.search))throw new Error('Source robots policy excludes this page');}
 return async url=>{await policy(url);return raw(url);};
}
export async function collectSource(sourceId,{store,request=fetch,now=new Date(),fetchPage=null}={}){
 const source=getSource(sourceId);if(!source?.enabled)throw new Error('Unknown or disabled source');
 const startedAt=now.toISOString(),run={sourceId,id:hash(sourceId+'|'+startedAt+'|'+Math.random()),startedAt,status:'failed',pages:0,errors:[],discovered:0,scope:'First listing page and up to '+source.maxPages+' linked event pages. Not a complete calendar.'};
 const read=fetchPage||createSourceFetcher(source,{request});let found=[],seen=new Set();
 try{
  const html=await read(source.url);run.pages++;const links=listingLinks(html,source);run.discovered=links.length;found.push(...parseListingStructured(html,source,startedAt));
  for(const url of links){try{const detail=await read(url);run.pages++;seen.add(url);found.push(...parseEventPage(detail,source,url,startedAt));}catch(e){run.errors.push({url,message:e.message});}}
  const end=new Date(now);end.setUTCDate(end.getUTCDate()+source.horizonDays);const today=startedAt.slice(0,10),horizon=end.toISOString().slice(0,10);
  found=found.filter(e=>(!e.endDate||e.endDate>=today)&&(!e.startDate||e.startDate<=horizon));
  found=[...new Map(found.map(e=>[e.id,e])).values()];run.records=found.length;run.valid=found.filter(e=>!e.issues.length).length;
  if(!run.valid)throw new Error('No valid upcoming events parsed; previous snapshot retained. Source may need a parser or have no upcoming events.');
  const old=latestSnapshots(await store.load()).filter(e=>e.sourceId===sourceId&&!seen.has(e.sourceUrl));
  const events=[...new Map([...old.filter(e=>e.endDate>=today),...found].map(e=>[e.id,e])).values()];run.status=run.errors.length?'partial':'complete';run.completedAt=new Date().toISOString();await store.saveRun(run,events);return run;
 }catch(error){run.status='failed';run.errors.push({url:source.url,message:error.message});run.completedAt=new Date().toISOString();await store.saveRun(run,found);return run;}
}
