import assert from 'node:assert/strict';
import {eventWeekWindow,eventDiscoveryWindow,confirmedDayCards} from '../lib/event-week-window.js';
const NativeDate=Date;
const now=new NativeDate('2026-11-15T14:00:00Z');
globalThis.Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[now.toISOString()]))}static now(){return now.getTime()}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.AW_EVENT_CATALOGUE_ENABLED='false';
const sunday=eventDiscoveryWindow("What's on today?",null,now);
assert.equal(sunday.start,'2026-11-15');
const monday=eventDiscoveryWindow('Anything for Monday?',sunday,now);
assert.equal(monday.start,'2026-11-16');assert.equal(monday.end,monday.start);
assert.deepEqual(eventDiscoveryWindow('Any music events?',monday,now),monday);
assert.equal(eventDiscoveryWindow('What about Thursday?',eventWeekWindow('next week',now),now),null,'An existing weekly scope retains its weekday path');
const jazz={title:'Kevin Holbrough Sextet at Wakefield Jazz',startDate:'2026-11-13',endDate:'2026-11-16'};
assert.equal(confirmedDayCards([jazz],monday,true).length,0,'A run end is not a performance occurrence');
const concert={title:'Monday Concert',startDate:'2026-11-16',endDate:'2026-11-16'};
assert.equal(confirmedDayCards([concert],monday,true).length,1);
assert.equal(confirmedDayCards([{...jazz,occurrenceDates:['2026-11-16']}],monday,true).length,1,'Explicit Monday occurrence is allowed');
assert.equal(confirmedDayCards([{...concert,title:'Craft session'}],monday,true).length,0);
const records=[['Christmas Festival','Sun 15 November 2026'],['Monday Makers','Mon 16 November 2026'],['Friday Blues Festival','Fri 20 November 2026'],['Kevin Holbrough Sextet at Wakefield Jazz','Fri 13 November 2026 - Mon 16 November 2026']];
const listing='<html><body>'+records.map(([title,date],i)=>`<h3><a href="https://experiencewakefield.co.uk/event/day-${i}/">${title}</a></h3><p>Calendar ${date}</p><p>Clock 14:00 - 16:00</p><p>Map pin WX Wakefield Exchange</p>`).join('')+'</body></html>';
let modelCalls=0;
globalThis.fetch=async url=>{
 if(String(url).includes('anthropic.com')){modelCalls++;throw Error('Day discovery must bypass prose generation')}
 const detail=String(url).match(/\/event\/day-(\d+)\//);
 if(detail){const [title,date]=records[Number(detail[1])];return new Response(`<h1>${title}</h1><p>${date} 14:00 - 16:00 WX Wakefield Exchange</p><h2>About</h2><p>A local event.</p>`,{status:200})}
 return new Response(String(url)==='https://experiencewakefield.co.uk/whats-on/'?listing:'not found',{status:String(url)==='https://experiencewakefield.co.uk/whats-on/'?200:404});
};
const {default:handler}=await import('../api/chat.js');
let messages=[],token=null;
async function ask(q){
 messages.push({role:'user',content:q});const res={setHeader(){},status(n){this.code=n;return this},json(b){this.body=b;return this}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'day-chain-'+messages.length},socket:{},body:{messages,stateToken:token}},res);
 assert.equal(res.code,200);token=res.body.stateToken;messages.push({role:'assistant',content:res.body.reply});return res.body;
}
const today=await ask("What's on today?");
assert.equal(today.verification,'weekly-cards-v1');assert.match(today.reply,/Christmas Festival/);assert.doesNotMatch(today.reply,/Jazz|Friday Blues|Monday Makers/);
const next=await ask('Anything for Monday?');
assert.match(next.reply,/Monday 16 November 2026/);assert.match(next.reply,/Monday Makers/);assert.doesNotMatch(next.reply,/Jazz|Friday Blues|Christmas Festival/);
assert.equal(next.state.constraints.eventWeek.start,'2026-11-16');
const music=await ask('Any music events?');
assert.equal(music.pipelineVersion,'unified-v1');assert.match(music.reply,/Monday 16 November 2026/);assert.match(music.reply,/could(?: not|n['’]t) verify matching music events/i);assert.doesNotMatch(music.reply,/Jazz|Friday Blues|Monday Makers|Christmas Festival/);assert.equal(music.state.constraints.eventWeek.start,'2026-11-16');assert.equal(modelCalls,0);
console.log('Day event checks passed: today → Monday → music, exact occurrence evidence, no silent widening, no model generation.');
