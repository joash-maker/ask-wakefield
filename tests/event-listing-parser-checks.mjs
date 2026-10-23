import assert from 'node:assert/strict';
import {extractExperienceListingEventCards, extractWxListingEventCards, parseLooseExperienceDateRange} from '../api/chat.js';
import {eventWeekWindow,selectWeekCards,formatWeekCards} from '../lib/event-week-window.js';
// Minimized markup reproduces the nested spans on the current official pages.
const experience=`<h3><a href="https://experiencewakefield.co.uk/event/pumpkin-festival/">Farmer Copleys’ Pumpkin Festival</a></h3><div class="place-time-wrapper"><img alt="Calendar"><span>Now - <span class="event-end-date">Sun 01 Nov 2026<span></span></div><div>10:00 - 16:00</div><div>Farmer Copleys</div><a href="https://experiencewakefield.co.uk/event/pumpkin-festival/">Read more</a>`;
const copleys=extractExperienceListingEventCards(experience,'2026-10-23')[0];
assert.equal(copleys.startDate,'2026-10-23');assert.equal(copleys.endDate,'2026-11-01');
assert.deepEqual(parseLooseExperienceDateRange('Tuesday 27 - Friday 30 October 2026'),{startDate:'2026-10-27',endDate:'2026-10-30'});
assert.deepEqual(parseLooseExperienceDateRange('Sat 26 Sep - Sun 01 Nov 2026'),{startDate:'2026-09-26',endDate:'2026-11-01'});
const wx=`<h2>Halloween in the Wild West</h2><div>Tuesday 27 - Friday 30 October 2026</div><div>Start time:<span>10:30AM</span> - End time:<span>4PM</span></div><a href="https://wxwakefield.co.uk/Whats-On/Details?event=halloween">More Info</a><h2>Cowboy Nerf Shootout</h2><div>Thursday 29 October 2026</div><div>Start time:10:30AM - End time: 4PM</div><div>FREE (bookable)</div><a href="https://wxwakefield.co.uk/Whats-On/Details?event=cowboy-nerf-shootout">More Info</a><div class="not-published-label sold-out bg-danger d-block">Sold out</div><h2>A Night at the MOOsicals</h2><div>Thursday 29 October 2026</div><div>Start time:6PM - End time: 9PM</div><a href="https://wxwakefield.co.uk/Whats-On/Details?event=moosicals">More Info</a>`;
const parsed=extractWxListingEventCards(wx);
assert.equal(parsed.length,3);assert.equal(parsed[0].startDate,'2026-10-27');assert.equal(parsed[0].endDate,'2026-10-30');assert.equal(parsed[0].startTime,'10:30');assert.equal(parsed[1].availability,'sold-out');assert.equal(parsed[2].availability,'unknown');
const window=eventWeekWindow('next week',new Date('2026-10-23T12:00:00Z'));
const runs=Array.from({length:12},(_,i)=>({...copleys,title:'Ongoing '+i,venue:'Venue '+i}));
const chosen=selectWeekCards([...runs,...parsed],window);
assert(chosen.some(card=>card.title==='Cowboy Nerf Shootout'),'Thursday must survive ongoing-run crowding');assert(chosen.some(card=>card.title==='A Night at the MOOsicals'));assert.equal(chosen.length,10);
const answer=formatWeekCards(chosen,window);assert.match(answer,/Listed as sold out/);assert.match(answer,/Published run/);
console.log('Listing parser checks passed: nested Now/end spans, compact ranges, split times, sold-out ownership and weekday shortlist coverage.');
