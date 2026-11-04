import {DINING_MENU_LEADS} from './local-dining.js';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {load} from 'cheerio';
import {BICYCLE_REPAIR_SOURCE_LEADS,BICYCLE_SHOPPING_SOURCE_LEADS} from './local-service-sources.js';
const normal=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid|example|nip\.io|sslip\.io)$/i.test(u.hostname)?u:null;}catch{return null;}};
export function publicIPv4(address){
 if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(String(address)))return false;
 const octets=String(address).split('.').map(Number);if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b]=octets;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);
}
function requestPage(url,timeout=6000){
 return new Promise((resolve,reject)=>{
  const req=https.request(url,{method:'GET',agent:false,headers:{'User-Agent':'AskWakefield/2.2 (+https://www.askwakefield.co.uk)','Accept':'text/html'},lookup:(host,options,callback)=>{
   lookup(host,{all:true,family:4}).then(addresses=>{const item=addresses.find(a=>publicIPv4(a.address));if(!item)return callback(Error('No public address'));callback(null,options.all?[item]:item.address,...(options.all?[]:[4]));},callback);
  }},response=>{
   const chunks=[];let bytes=0;
   response.on('data',chunk=>{bytes+=chunk.length;if(bytes>1_000_000){req.destroy(Error('Page too large'));return;}chunks.push(Buffer.from(chunk));});
   response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,text:Buffer.concat(chunks).toString('utf8')}));response.on('error',reject);
  });
  const timer=setTimeout(()=>req.destroy(Error('Page timed out')),timeout);
  req.on('error',reject);req.on('close',()=>clearTimeout(timer));req.end();
 });
}
export async function readBusinessPage(value){
 const original=safe(value);if(!original)return null;let url=original;const deadline=Date.now()+6500;
 try{
  for(let hop=0;hop<3;hop++){
   const remaining=deadline-Date.now();if(remaining<=0)return {unavailable:true};
   const response=await requestPage(url,Math.min(6000,remaining));
   if([301,302,303,307,308].includes(response.status)){
    const next=safe(new URL(response.headers.location||'',url));
    if(!next||next.hostname.replace(/^www\./,'')!==original.hostname.replace(/^www\./,''))return null;url=next;continue;
   }
   if([401,403,429,500,502,503,504].includes(response.status))return {unavailable:true};
   if(response.status!==200||!/html/i.test(response.headers['content-type']||''))return null;
   const $=load(response.text),title=$('title').first().text().trim();
   const headings=$('h1').map((i,e)=>$(e).text()).get();
   if(/\b404\b|page not found|access denied|just a moment|verify you are human/i.test(title+' '+headings.join(' ')))return null;
   const brands=$('img[alt]').filter((i,e)=>/logo|brand/i.test([$(e).attr('src'),$(e).attr('class'),$(e).attr('id')].join(' '))).map((i,e)=>$(e).attr('alt')).get();
   const owners=brands.map(s=>String(s).replace(/\blogo\b/gi,'').trim()).filter(s=>normal(s).length>=5);
   const identity=[title,...headings,...brands].join(' ');
   $('script,style,noscript,nav,header,aside,[class*="review"],[class*="testimonial"]').remove();
   const text=$('body').text().replace(/\s+/g,' ').trim().slice(0,60000);
   return {url:url.href,title,identity,owners,text};
  }
 }catch{return {unavailable:true};}
 return null;
}
export async function verifyBusinessPages(result,{read=readBusinessPage}={}){
 let data;try{const text=String(result.reply||'');data=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));}catch{return result;}
 if(!Array.isArray(data.businesses)||!data.businesses.length)return result;
 const sources=result.sources||[],cache=new Map(),rejected={source:0,aggregate:0,read:0,identity:0,owner:0};
 const checked=await Promise.all(data.businesses.slice(0,6).map(async row=>{
  const source=sources.find(s=>s.url===row.url),url=safe(row.url);if(!source||!url){rejected.source++;return null;}
  const host=url.hostname.replace(/^www\./,'');
  if(host==='yorkshire.com'&&url.pathname.split('/').filter(Boolean).length<4||host==='yell.com'&&!url.pathname.startsWith('/biz/')){rejected.aggregate++;return null;}
  if(!cache.has(row.url))cache.set(row.url,read(row.url));
  const page=await cache.get(row.url),name=normal(row.name);
  // A mention in body prose or neighbouring directory card is not page identity.
  if(page?.unavailable){
   const pageKey=value=>{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'');};
   const registered=[...BICYCLE_REPAIR_SOURCE_LEADS,...BICYCLE_SHOPPING_SOURCE_LEADS,...DINING_MENU_LEADS].some(lead=>pageKey(lead.url)===pageKey(row.url)&&normal(lead.name)===name.replace(/wakefield$/,''));
   const excerpts=(result.searchEvidence||[]).filter(e=>e.url===row.url&&normal(source.title+' '+e.text).includes(name));
   if(registered&&excerpts.length)return {row,source:{title:source.title,url:row.url,pageBusiness:row.name,pageRead:false},evidence:{url:row.url,text:excerpts.map(e=>e.text).join(' ')}};
   rejected.read++;return null;
  }
  if(!page){rejected.read++;return null;}
  if(name.length<3||!normal(page.identity).includes(name)){rejected.identity++;return null;}
  const platform=/^(?:yorkshire\.com|yell\.com|wakefield\.co\.uk|booksy\.com|fresha\.com|facebook\.com|instagram\.com|bikeypedia\.com|ratingsplus\.co\.uk|google\.com|maps\.apple\.com)$/i.test(host);
  if(!platform&&page.owners?.length&&!page.owners.some(owner=>normal(owner).includes(name)||name.includes(normal(owner)))){rejected.owner++;return null;}
  return {row,source:{title:page.title||row.name,url:row.url,pageBusiness:row.name,pageRead:true},evidence:{url:row.url,text:page.text}};
 }));
 const valid=checked.filter(Boolean);
 if(valid.length<checked.length)console.info('Business page proof',JSON.stringify({candidates:checked.length,accepted:valid.length,rejected}));
 return {...result,reply:JSON.stringify({...data,businesses:valid.map(v=>v.row)}),sources:valid.map(v=>v.source),searchEvidence:valid.map(v=>v.evidence)};
}
