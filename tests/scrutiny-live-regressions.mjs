import assert from 'node:assert/strict';
import {chatNavigation} from '../lib/chat-navigation.js';
import {activityDiscovery} from '../lib/activity-discovery.js';
import {genericEventTitle} from '../lib/events/title-quality.js';
import {buildCatalogue} from '../lib/events/catalogue.js';
import {parseEventPage} from '../lib/events/parser.js';
const menu=chatNavigation('Help me with a Wakefield local service such as bins, parking, transport, council tax, roads, libraries or finding an official source.');assert.equal(menu.state.lastIntent,'navigation.services');assert.match(menu.reply,/What do you need help with/);assert.doesNotMatch(menu.reply,/Library is at/);
const question='Help me find an activity in Wakefield. Activity: Music. Age: Under 5. Day: Monday. Cost: Free. Keep these as requirements and verify a match.';
const initial=await activityDiscovery(question,{});
for(const q of ['Any more?','Anything else?','Other options?']){const more=await activityDiscovery(q,initial.state);assert.equal(more.verification,'activity-directory-handoff-v1');assert.deepEqual(more.state.constraints.activitySearch.handoff,initial.state.constraints.activitySearch.handoff);assert.match(more.reply,/haven’t verified another session/);assert.doesNotMatch(more.reply,/Moo Music|strongest verified|free session/);}
assert.equal(await activityDiscovery('Where can I get coffee?',initial.state),null,'Explicit new topics escape activity constraints');
for(const title of ['Dates for the diary',"What's on",'Upcoming events','Events calendar'])assert(genericEventTitle(title));assert(!genericEventTitle('The Christmas Orchestra'));assert(!genericEventTitle('Calendar Girls'));
const now=new Date('2026-11-17T12:00:00Z'),date=now.toISOString(),event={id:'generic',sourceId:'experience',title:'Dates for the diary',venue:'Farmer Copleys',startDate:'2026-11-17',endDate:'2026-11-17',sourceUrl:'https://farmercopleys.co.uk/events/',checkedAt:date,contentHash:'existing',issues:[],status:'scheduled'};
const data={events:[{runId:'run',sourceId:'experience',event}],runs:[{id:'run',sourceId:'experience',startedAt:date,status:'complete'}],reviews:[]};assert.equal(buildCatalogue(data,{now})[0].visible,false,'Previously collected generic heading must stop being shown without recollection');
const parsed=parseEventPage('<main><h1>Dates for the diary</h1><time>17 November 2026</time></main>',{id:'experience',venue:'Farmer Copleys'},event.sourceUrl,date)[0];assert(parsed.issues.some(s=>/Generic calendar/.test(s)));
console.log('Fresh live regressions passed: service menu, constrained more requests, parser calendar-heading rejection and existing catalogue suppression.');
