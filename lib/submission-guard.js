import {createHash} from 'node:crypto';
const limits=new Map(),pending=new Map();
export const submissionFetch=(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(6000)});
export function submissionKey(data){const {timestamp,submissionId,...facts}=data;return createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0,32);}
export function submissionAllowed(req){
 const now=Date.now(),key=String(req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 for(const [k,v] of limits)if(v.until<now)limits.delete(k);
 const item=limits.get(key)||{count:0,until:now+60000};item.count++;limits.set(key,item);return item.count<=8;
}
export async function submissionOnce(key,work){
 const now=Date.now();for(const [k,v] of pending)if(v.until<now)pending.delete(k);
 if(pending.has(key))return pending.get(key).promise;
 if(pending.size>=1000)throw new Error('Submission capacity reached');
 const promise=Promise.resolve().then(work);pending.set(key,{until:now+900000,promise});
 try{return await promise;}catch(error){pending.delete(key);throw error;}
}
export function validCivilDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function notificationSummary(results){return {submitter:results[0]||'not-configured',operator:results[1]||'not-configured'};}
