import assert from 'node:assert/strict';
import {eventWeekWindow,selectWeekCards,formatWeekCards,cleanMissingEventFields} from '../lib/event-week-window.js';
const fri = new Date('2026-10-23T12:00:00Z');
const window = eventWeekWindow('What’s on this week in Wakefield?',fri);
assert.equal(window.start,'2026-10-19');assert.equal(window.end,'2026-10-25');assert.equal(window.from,'2026-10-23');
assert.equal(eventWeekWindow('next week',fri).end,'2026-11-01');
assert.equal(eventWeekWindow('next seven days',fri).end,'2026-10-29');
assert.equal(eventWeekWindow('this weekend',fri),null);
assert.equal(eventWeekWindow('this week',new Date('2026-10-25T23:30:00Z')).start,'2026-10-19');
assert.equal(eventWeekWindow('this week',new Date('2026-10-26T00:30:00Z')).start,'2026-10-26');
assert.equal(eventWeekWindow('this week',new Date('2026-12-31T12:00:00Z')).end,'2027-01-03');
assert.equal(eventWeekWindow('this week',new Date('2026-06-28T23:30:00Z')).start,'2026-06-29','London date differs from UTC in summer');
const card=(title,date,endDate=date)=>({title,startDate:date,endDate,venue:'WX',sourceUrl:'https://wxwakefield.co.uk/Whats-On/Details?event='+title});
const selected=selectWeekCards([card('Beer Festival','2026-10-23','2026-10-25'),card('Concert','2026-10-27'),card('MOOsicals','2026-10-30'),card('Expired','2026-10-18'),card('Invalid','2026-02-30'),{...card('No source','2026-10-24'),sourceUrl:null}],window);
assert.deepEqual(selected.map(c=>c.title),['Beer Festival']);
const answer=formatWeekCards(selected,window);assert.match(answer,/Monday 19 October 2026 to Sunday 25 October 2026/);assert.match(answer,/\[Event details\]\(https/);assert.doesNotMatch(answer,/Concert|MOOsicals|\(\s*\)|from —/);
assert.match(formatWeekCards([],window),/does not mean there are no events/);
assert.equal(cleanMissingEventFields('Concert 13:00–13:45 (). Disco (2–4pm, ). Show, from — a showcase.'),'Concert 13:00–13:45. Disco (2–4pm). Show — a showcase.');
// Replay the actual request handler with dated first-party fixtures. No model calls.
const NativeDate=Date;globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-23T12:00:00Z']))}static now(){return NativeDate.parse('2026-10-23T12:00:00Z')}};
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';
let modelCalls=0;
let listing='<html><body>'+[['Beer Festival','Fri 23 October 2026 - Sun 25 October 2026'],['Next Week Concert','Tue 27 October 2026'],['MOOsicals','Fri 30 October 2026'],['Thursday Club','Thu 29 October 2026'],['Saturday Free Event','Sat 31 October 2026']].map(([name,dates],i)=>`<h3><a href="https://experiencewakefield.co.uk/event/event-${i}/">${name}</a></h3><p>Calendar ${dates}</p><p>Clock 13:00 - 14:00</p><p>Map pin WX Wakefield Exchange</p>`).join('')+'</body></html>';
globalThis.fetch=async(url)=>{
  const detail=String(url).match(/experiencewakefield\.co\.uk\/event\/event-(\d+)\//);
  if(detail){
    const records=[['Beer Festival','Fri 23 October 2026 - Sun 25 October 2026'],['Next Week Concert','Tue 27 October 2026'],['MOOsicals','Fri 30 October 2026'],['Thursday Club','Thu 29 October 2026'],['Saturday Free Event','Sat 31 October 2026']];
    const [title,date]=records[Number(detail[1])];
    return new Response(`<html><h1>${title}</h1><p>${date} 13:00 - 14:00 WX Wakefield Exchange Free event</p><h2>About</h2><p>A local event.</p></html>`,{status:200});
  }
if(String(url).includes('anthropic.com')){modelCalls++;throw Error('Weekly view must bypass model')}return new Response(String(url)==='https://experiencewakefield.co.uk/whats-on/'?listing:'not found',{status:String(url)==='https://experiencewakefield.co.uk/whats-on/'?200:404})};
const {default:handler}=await import('../api/chat.js');
const res={headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'weekly-regression'},socket:{},body:{messages:[{role:'user',content:"What's on this week in Wakefield?"}]}},res);
assert.equal(res.statusCode,200);assert.equal(res.body.verification,'weekly-cards-v1');assert.match(res.body.reply,/Beer Festival/);assert.doesNotMatch(res.body.reply,/Next Week Concert|MOOsicals/);assert(res.body.sources.length);assert.equal(modelCalls,0);

import {formatWeekCards as fmt} from '../lib/event-week-window.js';
const ongoing={title:'Pumpkin Festival',venue:'Farmer Copleys',sourceUrl:'https://experiencewakefield.co.uk/event/pumpkin-festival/',startDate:null,endDate:'2026-11-01',ongoing:true};
const thisWeek=eventWeekWindow('this week',fri);
const first=formatWeekCards(selectWeekCards([ongoing,card('Concert','2026-10-27')],thisWeek),thisWeek);
assert.match(first,/Ongoing until Sunday 1 November 2026/);
assert.doesNotMatch(first,/Friday 23 October 2026 to Sunday 1 November/);
const followUp=formatWeekCards([ongoing],thisWeek);
assert.match(followUp,/Ongoing until Sunday 1 November 2026\. Check the event page/);
assert.equal(ongoing.startDate,null);

console.log('Weekly checks passed: exact calendar ranges, DST/year boundaries, out-of-range exclusion, source links, missing fields and actual handler replay without model calls.');

async function askWithState(q,previous){
 const result={headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(b){this.body=b;return this}};
 const prior=previous?[{role:'user',content:"What's on next week in Wakefield?"},{role:'assistant',content:previous.reply}]:[];
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'weekly-followup-'+q},socket:{},body:{messages:[...prior,{role:'user',content:q}],stateToken:previous?.stateToken}},result);
 return result.body;
}
const next=await askWithState("What's on next week in Wakefield?");
assert.equal(next.state.constraints.eventWeek.start,'2026-10-26');assert(next.stateToken);
const thursday=await askWithState('What about Thursday?',next);
assert.equal(thursday.verification,'weekly-followup-v1');assert.match(thursday.reply,/Thursday 29 October 2026/);assert.match(thursday.reply,/Thursday Club/);assert.doesNotMatch(thursday.reply,/Saturday Free Event/);
const free=await askWithState('Any free ones?',thursday);
assert.equal(free.verification,'weekly-followup-v1');assert.match(free.reply,/Confirmed free entries only/);assert.match(free.reply,/Thursday Club/);assert.equal(free.state.constraints.eventWeek.start,'2026-10-26');assert.equal(free.state.constraints.eventWeek.filters.day,'thursday');assert.equal(free.state.constraints.eventWeek.filters.price,'free');assert.doesNotMatch(free.reply,/this weekend|Saturday Free Event/);
const reset=await askWithState('Show the full list again',free);
assert.match(reset.reply,/Saturday Free Event/);assert.deepEqual(reset.state.constraints.eventWeek.filters,{});
const times=await askWithState('What time do they start?',next);
assert.equal(times.verification,'weekly-followup-v1');assert.match(times.reply,/13:00/);
const unsupported=await askWithState('Are those wheelchair accessible?',next);
assert.equal(unsupported.verification,'weekly-followup-v1');assert.match(unsupported.reply,/haven’t confirmed that extra detail/);
assert.equal(unsupported.sources.length,0);
assert.doesNotMatch(thursday.reply,/Next week means|missing price|saved weekly records/);
assert.equal(modelCalls,0);
console.log('Weekly follow-up replay passed: signed state, next-week Thursday, cumulative free/day filters, reset, times and unsupported constraints.');
