import {timingSafeEqual} from 'node:crypto';
function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);}
export function isAdmin(req){return !!process.env.ASK_WAKEFIELD_ADMIN_PASSWORD&&equal(req.body?.password,process.env.ASK_WAKEFIELD_ADMIN_PASSWORD);}
export function isCron(req){return !!process.env.CRON_SECRET&&equal(req.headers?.authorization,'Bearer '+process.env.CRON_SECRET);}
export function noStore(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');}
