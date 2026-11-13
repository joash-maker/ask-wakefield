import assert from 'node:assert/strict';
import { extractEventDetailSections, eventDetailOperation } from '../lib/event-detail-sections.js';
const D = Date;
globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : ['2026-11-13T10:00:00Z'])); } static now() { return D.parse('2026-11-13T10:00:00Z'); } };
process.env.ANTHROPIC_API_KEY='test';process.env.GOOGLE_PLACES_ENABLED='false';process.env.AW_EVENT_CATALOGUE_ENABLED='false';
const url='https://experiencewakefield.co.uk/event/light-up-wakefield/';
const html=`<html><nav><h4>Car Parking</h4><p>Invented Hotel has free parking.</p></nav>
<section class="postHeading"><h1>Light Up Wakefield</h1><div>Fri 13 Nov 2026 - Sat 14 Nov 2026</div><div>17:00 - 21:00</div><div>Wakefield City Centre</div><div>Free</div></section>
<section class="postContent"><div>Family friendly</div><h3>About</h3><p>Visitors can explore interactive artworks along the Light Trail. Pick up a free trail map from WX Wakefield Exchange.</p><h3>Key Details</h3><h4>Light Switch-On</h4><p>Date: Friday 13 November</p><p>Time: 5:30pm</p><p>Location: Cathedral Precinct</p><h4>Parade</h4><p>Date: Saturday 14 November</p><p>Time: 5:30pm</p><p>Location: County Hall via Wood Street to Brook Street</p></section>
<main><div class="accordion-content"><h4>Accessible Parking</h4><p>Trinity Walk and The Ridings have accessible parking.</p><h4>Car Parking</h4><p>There are numerous car parking spaces in Wakefield.</p><p>Find a full list <a href="https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-in-wakefield/">here</a>.</p><p>Parking is available at Trinity Walk and The Ridings Shopping Centre.</p><p>WX Wakefield Exchange does not have a car park.</p><p><a href="https://untrusted.example/parking">More information</a></p><h4>Bus</h4><p>A nearby bus station.</p></div></main>
<div class="related-events"><h4>Car Parking</h4><p>Park for free at Bogus Park.</p></div><footer>Free parking everywhere</footer></html>`;
const evidence=extractEventDetailSections(html,url,'Light Up Wakefield');
assert(evidence.programme.some(t=>/Light Switch-On.*Friday 13 November.*5:30pm/.test(t)));
assert(evidence.programme.some(t=>/Light Trail/.test(t)));
assert(evidence.parking.some(t=>/Trinity Walk.*The Ridings/.test(t)));
assert.doesNotMatch(JSON.stringify(evidence),/Bogus|Invented|untrusted/);
assert.equal(extractEventDetailSections(html,url,'Different Festival'),null);
assert.equal(eventDetailOperation('Any more events?'),null);
let outage=false,modelCalls=0;
const listing=`<h3><a href="${url}">Light Up Wakefield</a></h3><p>Calendar Fri 13 Nov 2026 - Sat 14 Nov 2026</p><p>Clock 17:00 - 21:00</p><p>Map pin Wakefield City Centre</p><h3><a href="https://experiencewakefield.co.uk/event/sunday-fair/">Sunday Fair</a></h3><p>Calendar Sun 15 Nov 2026</p><p>Clock 10:00 - 15:00</p><p>Map pin Wakefield</p>`;
globalThis.fetch=async u=>{
 const s=String(u);
 if(s==='https://experiencewakefield.co.uk/whats-on/')return new Response(listing);
 if(s===url)return new Response(outage?'Unavailable':html,{status:outage?503:200});
 if(s.includes('anthropic.com')){modelCalls++;return Response.json({},{status:503});}
 return new Response('Not found',{status:404});
};
const { default:handler }=await import('../api/chat.js');
let calls=0;
async function ask(q,prior,extra={},expectedStatus=200){
 const messages=[...(prior?.messages||[]),{role:'user',content:q}];
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://www.askwakefield.co.uk','x-forwarded-for':'event-detail-'+ ++calls},socket:{},body:{messages,stateToken:prior?.stateToken,...extra}},res);
 assert.equal(res.code,expectedStatus);
 return {...res.body,messages:[...messages,{role:'assistant',content:res.body.reply}]};
}
const first=await ask("What's on this week in Wakefield?");assert.equal(first.verification,'weekly-cards-v1');
const more=await ask('Can you tell me a bit more about Light Up Wakefield?',first);
assert.equal(more.verification,'cards-first-v17');assert.match(more.reply,/Light Trail|interactive artworks/);assert.match(more.reply,/light switch-on.*5:30pm/i);
assert.doesNotMatch(more.reply,/I hope that hits the mark|visit experiencewakefield|Sunday Fair|Bogus|Invented/);
assert.equal(more.state.viewIds.length,1);assert(more.stateToken);
const parking=await ask('Is parking available near the event?',more);
assert.equal(parking.verification,'cards-first-v17');assert.match(parking.reply,/Light Up Wakefield/);assert.match(parking.reply,/Trinity Walk.*The Ridings/);
assert.match(parking.reply,/does not have a car park/);assert.match(parking.reply,/live spaces or evening closing times/);
assert.doesNotMatch(parking.reply,/start time, route|two hours free|free parking everywhere|Bogus|Invented/);
assert(parking.sources.some(s=>s.url===url));assert(parking.sources.some(s=>s.url.includes('wakefield.gov.uk/')));
const rolling=await ask('Is parking available near the event?',{...more,messages:more.messages.slice(-1)});
assert.match(rolling.reply,/Trinity Walk/,'The selected event must survive a rolled message window');
outage=true;
const retained=await ask('Is parking available near the event?',more);
assert.match(retained.reply,/Trinity Walk/);assert.match(retained.reply,/checked earlier in this chat/);
assert.equal(retained.state.constraints.eventFocus.checkedAt,more.state.constraints.eventFocus.checkedAt,'Reusing evidence must not extend its age');
assert.equal(modelCalls,0,'The entire selected-event conversation must bypass generic prose');
const unsigned=await ask('Is parking available near the event?',{...more,stateToken:undefined},{state:{...more.state,constraints:{...more.state.constraints,eventFocus:{...more.state.constraints.eventFocus,checkedAt:'2026-11-13T10:00:00Z'}}}},502);
assert.doesNotMatch(unsigned.reply,/Trinity Walk/,'Unsigned client evidence must never establish a parking claim');
outage=false;
const newTown=await ask('Is parking available in Pontefract?',more,{},502);
assert.doesNotMatch(newTown.reply,/Trinity Walk|Light Up Wakefield/,'A new parking area must not inherit the selected event');
assert.equal(modelCalls,2,'Only unsigned/missing state and the new-town request reach the legacy writer');
console.log('Event detail follow-ups passed: exact weekly -> more info -> parking, main/travel sections, source identity, related-card exclusion, signed focus/cache, outage reuse and new-town isolation.');
