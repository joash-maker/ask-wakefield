import {PLACES} from './askwakefield-places-data.js';
import {readVenuePage,venueHours,formatClock} from './venue-evidence.js';

// Stable descriptions come from the canonical venue records. Operational details
// below come only from the exact venue page read for this response.
const profiles=[
 {id:'AW-007',environment:'indoor',category:'museum',reason:'local history and museum displays'},
 {id:'AW-026',environment:'indoor',category:'bowling',reason:'bowling, with bumpers and ramps listed by the operator'},
 {id:'AW-D005',environment:'indoor',category:'soft play',reason:'soft play on Grantley Street',maxAge:10},
 {id:'AW-D001',environment:'indoor',category:'soft play',reason:'soft play in Horbury Bridge',maxAge:9},
 {id:'AW-D004',environment:'indoor',category:'soft play',reason:'multi-level soft play on Flanshaw Way'},
 {id:'AW-004',environment:'indoor',category:'library',reason:"books and the children's section, rather than a play centre"},
 {id:'AW-046',environment:'outdoor',category:'park',reason:'playground and green space'},
 {id:'AW-044',environment:'outdoor',category:'park',reason:'park and playground, rather than an indoor activity'}
].map(profile=>({...profile,place:PLACES.find(p=>p.id===profile.id)})).filter(p=>p.place);

function candidates(frame,last,prior){
 let pool=profiles.filter(p=>!frame.environment||frame.environment==='either'||p.environment===frame.environment);
 if(frame.ages.length)pool=pool.filter(p=>!p.maxAge||frame.ages.every(age=>age<=p.maxAge));
 const area=String(frame.area||'').toLowerCase();
 if(/city centre|town centre|trinity walk/.test(area))pool=pool.filter(p=>p.place.cityCentre);
 else if(area&&!/^wakefield$|pugney/.test(area))pool=pool.filter(p=>p.place.locality.toLowerCase().includes(area)||area.includes(p.place.locality.toLowerCase()));
 if(/pugney/.test(area)&&frame.environment!=='indoor')pool=pool.filter(p=>p.id==='AW-044');
 const selected=pool.filter(p=>last.toLowerCase().includes(p.place.name.toLowerCase())||p.category===last.toLowerCase().replace(/[?.!]/g,'').trim());
 if(selected.length)return selected.slice(0,3);
 const reference=last.match(/\b(first|second|third) (?:one|option|place)\b/i);
 if(reference){const id=prior?.constraints?.familyOptions?.ids?.[{first:0,second:1,third:2}[reference[1].toLowerCase()]];return pool.filter(p=>p.id===id);}
 if(frame.activity)pool=pool.filter(p=>p.category===frame.activity);
 if(!frame.activity&&prior?.constraints?.familyOptions?.ids?.length===1&&/\b(?:it|that|price|cost|open|hours|how much)\b/i.test(last))pool=pool.filter(p=>prior.constraints.familyOptions.ids.includes(p.id));
 if(/\b(?:more|others?|alternatives?)\b/i.test(last))pool=pool.filter(p=>!(prior?.constraints?.familyOptions?.ids||[]).includes(p.id));
 const ordered=[];
 for(const p of pool)if(!ordered.some(other=>other.category===p.category))ordered.push(p);
 for(const p of pool)if(!ordered.includes(p))ordered.push(p);
 return ordered.slice(0,frame.oneLocation?1:3);
}

function currentDay(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function minuteNow(now){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);return +parts.find(p=>p.type==='hour').value*60+(+parts.find(p=>p.type==='minute').value);}
function timeFits(hours,frame,now){
 if(!hours)return null;
 if(hours.open===hours.close)return false;
 const end=hours.close<=hours.open?hours.close+1440:hours.close;
 const start=frame.time?frame.time.hour*60+frame.time.minute:frame.daypart==='afternoon'?12*60:frame.daypart==='evening'?17*60:0;
 const cutoff=frame.daypart==='morning'?12*60:frame.daypart==='afternoon'?17*60:1440;
 const earliest=frame.date===currentDay(now)?Math.max(start,minuteNow(now)):start;
 if(frame.oneLocation&&frame.durationHours)return Math.min(end,cutoff)-Math.max(hours.open,earliest)>=frame.durationHours*60;
 return hours.open<cutoff&&end>earliest;
}

export async function familyPlanAnswer(messages,frame,prior,now=new Date()){
 if(frame?.topic!=='family')return null;
 const last=String(messages.filter(m=>m.role==='user').at(-1)?.content||'');
 // A family audience must not turn a restaurant/club/service request into an
 // activity shortlist. Those paths still receive the shared request frame.
 if(/\b(?:restaurants?|caf[eé]s?|coffee|dining|where (?:can|should) (?:we|I) eat|gyms?|clubs?|council|pharmac(?:y|ies)|parking)\b/i.test(last))return null;
 // Event calendars retain their dedicated signed list and date-window handlers.
 if(/\b(?:events?|what(?:['’]s| is) on|this week|next week|half[ -]term|next seven days|next 7 days|weekend)\b/i.test(messages.filter(m=>m.role==='user').map(m=>m.content).join('\n')))return null;
 const extra=frame.requirements||[];
 let picks=candidates(frame,last,prior);
 const lookup=!!(frame.date||frame.budget!==null||frame.ages.length||/\b(?:open|hours?|cost|price|book|available|free)\b/i.test(last));
 const pages=lookup?await Promise.all(picks.map(p=>readVenuePage(p.place))):picks.map(()=>null);
 let cards=picks.map((p,i)=>({...p,page:pages[i],hours:venueHours(pages[i],frame.date)}));
 const excluded=cards.filter(c=>c.page?.closed||timeFits(c.hours,frame,now)===false);
 cards=cards.filter(c=>!excluded.includes(c));
 if(frame.budget===0)cards=cards.filter(c=>c.page?.free);
 const sourceCards=cards.map(c=>({title:c.place.name,url:c.page?.url||c.place.source}));
 const state={...prior,lastIntent:'places.family_plan',area:frame.area,constraints:{...prior?.constraints,requestFrame:frame,familyOptions:{ids:cards.map(c=>c.id)}}};
 const env=frame.environment==='indoor'?'indoor ':frame.environment==='outdoor'?'outdoor ':'';
 const ageLabel=frame.ages.length?' for ages '+frame.ages.join(' and '):'';
 const dateLabel=frame.date?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(new Date(frame.date+'T12:00:00Z')):null;
 const operational=/\b(?:how much|cost|price|budget|fit|afford)\b|£/i.test(last);
 const hoursQuestion=/\b(?:open|hours|close|what time)\b/i.test(last);
 const adultAnswer=/^(?:(?:one|two|three|four|\d+) adults?|just me|\d+)[.!?\s]*$/i.test(last);
 const list=values=>new Intl.ListFormat('en-GB',{type:'disjunction',style:'long'}).format(values);
 const finish=reply=>({reply,sources:sourceCards,followups:[],live:false,verification:'family-source-candidates',state});
 const link=c=>`[${c.place.name}](${c.page?.url||c.place.source})`;
 const group=[frame.adults!==null?frame.adults+' adult'+(frame.adults===1?'':'s'):null,frame.ages.length?'children aged '+frame.ages.join(' and '):null].filter(Boolean).join(' and ');
 // Answer the new question. Do not replay the whole shortlist and all caveats
 // merely because the user supplied an age, group size or asked for one field.
 if(cards.length===1&&hoursQuestion){
  const c=cards[0];
  return finish(c.hours
   ?`${link(c)} lists ${c.hours.day} opening hours of ${formatClock(c.hours.open)}–${formatClock(c.hours.close)}.${/bowling|soft play/.test(c.category)?' You’ll still need an available session or lane.':''}`
   :`I couldn’t confirm ${c.place.name}’s opening hours${dateLabel?' for '+dateLabel:''}. ${link(c)} has the venue and booking details, but I can’t call it open from the information I could read.`);
 }
 const costQuestion=/\b(?:how much|what.*cost|would that fit|does that fit|fit our budget|afford|what.*price)\b/i.test(last);
 if(cards.length&&costQuestion){
  const lines=cards.map(c=>c.page?.free?`${link(c)} lists free general admission. Paid extras are separate.`:`I don’t have a current ticket quote from ${link(c)}${group?' for '+group:''}.`);
  const caveat=cards.every(c=>c.page?.free)?'General admission is free. I haven’t priced any paid activities, food or travel.':frame.budget!==null?`I can’t confirm it fits your £${frame.budget} ${frame.budgetScope==='total'?'group':'per-person'} limit until the ticket price is known. Food and travel would be additional unless you include them in that limit.`:'The booking page needs the group and chosen session before there’s a reliable total.';
  return finish(lines.join('\n\n')+'\n\n'+caveat);
 }
 if(cards.length&&adultAnswer&&frame.adults!==null){
  const free=cards.find(c=>c.page?.free);
  const known=free?`${link(free)} lists free general admission${free.hours?' and '+free.hours.day+' hours of '+formatClock(free.hours.open)+'–'+formatClock(free.hours.close):''}.`:'I still need a current group ticket quote before comparing costs.';
  const choices=[...new Set(cards.map(c=>c.category==='museum'?'local history':c.category==='park'?'outdoor play':c.category))];
  return finish(`Thanks, that’s ${group}.${frame.budget!==null?' I’ll keep £'+frame.budget+' as your '+(frame.budgetScope==='total'?'group':'per-person')+' limit.':''}\n\n${known}${free&&cards.some(c=>!c.page?.free)?' The paid options still need a group ticket quote.':''}${choices.length>1?'\n\nWould they prefer '+list(choices)+'?':''}`);
 }
 if(cards.length&&/^\s*(?:ages?|aged)\b/i.test(last)){
  const options=cards.map(c=>`${link(c)} for ${c.reason}${c.page?.free?' (free general admission)':''}`).join('. ');
  const choices=[...new Set(cards.map(c=>c.category==='museum'?'local history':c.category))];
  return finish(`For ages ${frame.ages.join(' and ')}, the choice is ${options}.\n\n${cards.some(c=>/bowling|soft play/.test(c.category))?'Check the play or bowling session’s age rules before booking. ':''}${choices.length>1?'Would they prefer '+list(choices)+'?':''}`);
 }
 let intro;
 if(adultAnswer&&frame.adults!==null)intro=`Thanks, ${frame.adults} adult${frame.adults===1?'':'s'}${frame.ages.length?' and children aged '+frame.ages.join(' and '):''}.${frame.budget!==null?' I’ll keep £'+frame.budget+' as the '+(frame.budgetScope==='total'?'group limit':'per-person limit')+'.':''}`;
 else if(operational&&frame.budget!==null)intro=`With £${frame.budget} as your ${frame.budgetScope==='total'?'group':'per-person'} limit${dateLabel?' for '+dateLabel:''}${frame.environment?', staying '+(frame.environment==='indoor'?'indoors':frame.environment==='outdoor'?'outdoors':'with either setting'):''}, here’s what I can establish:`;
 else if(hoursQuestion)intro='For '+(dateLabel||'your chosen day')+':';
 else intro=`${frame.ages.length?'For ages '+frame.ages.join(' and ')+', ':''}I’d ${cards.length===1?'check this '+env+'option':'compare these '+env+'options'}${dateLabel?' for '+dateLabel:''}:`;
 const lines=cards.map(c=>{
  let detail=c.reason+'.';
  if(c.page?.free)detail+=' The venue page lists free general admission. Extras are separate.';
  if(c.hours)detail+=` Published ${c.hours.day} hours: ${formatClock(c.hours.open)}–${formatClock(c.hours.close)}.`;
  else if(hoursQuestion)detail+=' I couldn’t confirm the opening hours for that day.';
  if(operational&&c.category!=='museum'&&c.category!=='library')detail+=' I don’t have a current group ticket quote.';
  return `**${c.place.name}**: ${detail} [${c.category==='bowling'?'Bowling and booking':c.category==='soft play'?'Play sessions':'Visit details'}](${c.page?.url||c.place.source})`;
 });
 const sections=[cards.length?intro:`I couldn’t establish a matching ${env}visit${dateLabel?' for '+dateLabel:''}.`];
 if(lines.length)sections.push(lines.join('\n\n'));
 else sections.push(frame.budget===0?'I couldn’t confirm a free-admission option matching those requirements from the venue pages I checked.':'I don’t have a matching option in the local places I can check for those requirements.');
 if(excluded.length)sections.push(excluded.map(c=>c.place.name+(c.page?.closed?' has a closure notice on its page.':' has published hours that don’t overlap your remaining visit window.')+` [Venue details](${c.page?.url||c.place.source})`).join(' '));
 if(cards.length>1&&!operational&&!hoursQuestion&&!adultAnswer){
  const museum=cards.find(c=>c.category==='museum'),active=cards.find(c=>/bowling|soft play/.test(c.category)),park=cards.find(c=>c.category==='park');
  if(museum&&active)sections.push(`For local history, start with ${museum.place.name}. If they’d rather play, compare the ${active.category} option.`);
 }
 const gaps=[];
 if(frame.durationHours)gaps.push('This is a shortlist for your '+frame.durationHours+'-hour window, not a checked timetable including travel.');
 if(frame.date&&cards.some(c=>!c.hours))gaps.push('I haven’t confirmed every opening window.');
 if(cards.some(c=>/bowling|soft play/.test(c.category)))gaps.push('For bowling or soft play, check the session’s age rules'+(frame.budget!==null?', available slot and group price':' and available slot')+' before booking.');
 if(frame.budget!==null&&cards.length)gaps.push(`I can’t confirm the complete £${frame.budget} ${frame.budgetScope==='total'?'outing total':'per-person total'} including any food, parking or travel.`);
 if(frame.noCar)gaps.push('I haven’t checked a walking or public-transport route from your starting point.');
 if(extra.length)gaps.push('I haven’t confirmed '+extra.join(' or ')+', so these are leads to check, not confirmed matches for that requirement.');
 if(gaps.length)sections.push(gaps.join(' '));
 let question=null;
 if(frame.noCar&&!frame.area)question='Where are you starting from?';
 else if(!frame.ages.length&&!hoursQuestion)question='How old are the children?';
 else if(frame.budget!==null&&frame.adults===null&&cards.some(c=>!c.page?.free))question='How many adults are coming?';
 else if(cards.length>1&&!frame.activity&&!operational&&!adultAnswer){const choices=[...new Set(cards.map(c=>c.category==='museum'?'local history':c.category==='library'?'books':c.category==='park'?'outdoor play':c.category))];if(choices.length>1)question='Would they prefer '+list(choices)+'?';}
 if(question)sections.push(question);
 return {reply:sections.join('\n\n'),sources:sourceCards,followups:[],live:false,verification:'family-source-candidates',state};
}
