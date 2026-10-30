import {requestTopic,isRequestRefinement} from './conversation-scope.js';

const number=value=>({one:1,two:2,three:3,four:4,five:5})[String(value).toLowerCase()]??Number(value);
const civil=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const add=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function continuesRequest(text,prior){
 const q=String(text||'').trim(),topic=requestTopic(q);
 if(!prior?.topic||topic&&topic!==prior.topic&&!isRequestRefinement(q))return false;
 if(/^(?:new question|start again|forget (?:that|the plan)|something completely different)\b/i.test(q))return false;
 return isRequestRefinement(q)||/^(?:\d{1,2}(?:\s*(?:and|&)\s*\d{1,2})?|(?:one|two|three|four|five) adults?|just me|indoors?|outdoors?|bowling|soft play|museum|library|today|tomorrow|under £\d+|budget\b)[.!?\s]*$/i.test(q)
  || /^(?:something|somewhere) (?:today|tomorrow)|\b(?:budget|how many adults|what about|how about|any more|which would|does that|would that|is it open|are they open|what time|how much|cheaper|instead|actually|rather|prefer|no car|without a car|starting|from|near|ages?|aged)\b/i.test(q);
}

// Preferences are not evidence. Only scoped user turns may change this frame.
// The API persists it inside its existing HMAC-signed state, never raw client state.
export function buildRequestContext(messages,prior=null,now=new Date()){
 const frame=prior?structuredClone(prior):{topic:null,ages:[],adults:null,children:null,environment:null,budget:null,budgetScope:'total',date:null,daypart:null,time:null,area:null,noCar:false,activity:null,durationHours:null,oneLocation:false,requirements:[]};
 const userTurns=messages.filter(m=>m.role==='user');
 for(let i=0;i<userTurns.length;i++){
  const q=String(userTurns[i].content||'');
  const topic=requestTopic(q);if(!frame.topic&&topic)frame.topic=topic;
  let pair=q.match(/\b(?:ages?|aged|kids?|children)\b[^.!?\n]{0,35}?\b(\d{1,2})\s*(?:,|and|&)\s*(\d{1,2})\b/i)||q.match(/^\s*(\d{1,2})\s*(?:and|&)\s*(\d{1,2})[?.!]*\s*$/);
  if(pair)frame.ages=[+pair[1],+pair[2]].filter(n=>n<18);
  const ageList=q.match(/\b(?:ages?|aged)\s*(?:are|is|:)?\s*((?:\d{1,2}\s*(?:(?:years? old|[- ]year[- ]olds?)\s*)?(?:,|and|&)?\s*){1,6})/i);
  if(ageList)frame.ages=[...ageList[1].matchAll(/\d{1,2}/g)].map(m=>+m[0]).filter(n=>n<18);
  const child=q.match(/\b(\d{1,2}|one|two|three|four|five)\s+(?:children|kids)\b/i);if(child)frame.children=number(child[1]);
  const adult=q.match(/\b(\d{1,2}|one|two|three|four|five)\s+adults?\b/i);if(adult)frame.adults=number(adult[1]);
  if(/\bjust me\b/i.test(q))frame.adults=1;
  const actualIndex=messages.indexOf(userTurns[i]);
  if(/^\d{1,2}[.!?\s]*$/.test(q)&&/how many adults/i.test(String(messages[actualIndex-1]?.content||'')))frame.adults=Number(q.replace(/\D/g,''));
  const environments=[...q.matchAll(/\b(indoors?|outdoors?|outside)\b/gi)];
  if(environments.length){
   const latest=environments.at(-1)[1].toLowerCase();
   const next=/indoor and outdoor|indoors and outdoors|mix of both|either indoors or outdoors/i.test(q)?'either':/\bnot indoors?\b/i.test(q)?'outdoor':/\bnot outdoors?\b/i.test(q)?'indoor':latest.startsWith('in')?'indoor':'outdoor';
   if(next!==frame.environment)frame.activity=null;
   frame.environment=next;
  }
  if(/\b(?:raining|rainy|wet weather|in case it rains)\b/i.test(q)&&!environments.length)frame.environment='indoor';
  const cost=q.match(/\b(?:budget|limit|maximum|up to|under|spend|spending|make it)\s*(?:of|is|at|about)?\s*£\s*(\d{1,5}(?:\.\d{1,2})?)/i)
   ||q.match(/£\s*(\d{1,5}(?:\.\d{1,2})?)\s*(?:budget|limit|to spend|for everything)/i)
   ||q.match(/^\s*(?:about|around)?\s*£\s*(\d{1,5}(?:\.\d{1,2})?)/i)
   ||(!prior&&frame.budget===null?q.match(/£\s*(\d{1,5}(?:\.\d{1,2})?)/):null);
  if(cost){frame.budget=+cost[1];frame.budgetScope=/\b(?:each|per (?:person|child))\b/i.test(q)?'per person':'total';}
  if(/\b(?:free only|only free|no money|no spend)\b/i.test(q))frame.budget=0;
  if(/\bno budget limit|budget doesn't matter|ignore (?:the )?budget\b/i.test(q))frame.budget=null;
  const today=civil(now);
  const exactDate=q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if(exactDate&&!Number.isNaN(Date.parse(exactDate[1]))&&new Date(exactDate[1]+'T12:00:00Z').toISOString().slice(0,10)===exactDate[1])frame.date=exactDate[1];
  else if(/\btoday\b/i.test(q))frame.date=today;
  else if(/\btomorrow\b/i.test(q))frame.date=add(today,1);
  else {const named=[...q.matchAll(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi)].at(-1);if(named){const target=days.indexOf(named[1].toLowerCase()),current=new Date(today+'T12:00:00Z').getUTCDay();let delta=(target-current+7)%7;if(/\bnext\b/i.test(q))delta=delta||7;frame.date=add(today,delta);}}
  const part=q.match(/\b(morning|afternoon|evening|tonight)\b/i);if(part)frame.daypart=part[1].toLowerCase()==='tonight'?'evening':part[1].toLowerCase();
  const clock=q.match(/(?:\bat\s+|^)(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|(?:\bat\s+|^)(\d{1,2}):(\d{2})\b/i);
  if(clock){let hour=+(clock[1]||clock[4]),minute=+(clock[2]||clock[5]||0);const period=clock[3]?.toLowerCase();if(period&&hour>0&&hour<=12)hour=hour%12+(period==='pm'?12:0);if(hour<24&&minute<60)frame.time={hour,minute};}
  const area=q.match(/\b(?:in|near|from|around|starting (?:in|at))\s+(Horbury(?: Bridge)?|Ossett|Castleford|Pontefract|Normanton|Knottingley|Hemsworth|South Elmsall|Wakefield(?: (?:city|town) centre)?|Trinity Walk|Pugney['’]?s(?: Country Park)?)\b/i);
  const town=q.match(/^(?:(?:what|how) about\s+)?(Horbury(?: Bridge)?|Ossett|Castleford|Pontefract|Normanton|Knottingley|Hemsworth|South Elmsall)[?.!\s]*$/i);
  if(area)frame.area=area[1];else if(town)frame.area=town[1];else if(/\b(?:city|town) centre\b/i.test(q))frame.area='Wakefield city centre';
  if(/\b(?:no car|without a car|don't drive|do not drive)\b/i.test(q))frame.noCar=true;
  if(/\b(?:we can drive|we have a car|by car|we're driving)\b/i.test(q))frame.noCar=false;
  const duration=q.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five)[ -]hours?\b/i);if(duration)frame.durationHours=number(duration[1]);
  if(/\b(?:one|1) (?:place|location)\b/i.test(q))frame.oneLocation=true;
  const activity=q.match(/\b(bowling|ten[ -]?pin|balling alley|soft play|museum|library|play centres?|playcentres?)\b/i);if(activity)frame.activity=/play/i.test(activity[1])?'soft play':/pin|balling/i.test(activity[1])?'bowling':activity[1].toLowerCase();
  if(/\b(?:different activity|something else|anything else|not bowling|not soft play)\b/i.test(q))frame.activity=null;
  for(const [label,pattern] of [['step-free access',/wheelchair|step[- ]free/i],['sensory suitability',/sensory|autis\w*/i],['quiet setting',/\bquiet\b/i],['allergy requirements',/allerg\w*/i]])if(pattern.test(q)&&!frame.requirements.includes(label))frame.requirements.push(label);
 }
 return frame;
}

export function requestContextText(frame){
 if(!frame?.topic)return '';
 return `\n\nACTIVE REQUEST REQUIREMENTS (user preferences, not verified venue facts):\n${JSON.stringify(frame)}\nKeep these requirements together on every follow-up. Only the user can change them. Do not infer an indoor replacement from an outdoor venue's cafe or covered corner. A shopping/leisure complex has separate operators, prices and age rules, not one universal admission price. Unknown group costs cannot prove within-budget or over-budget. Do not repeat a question whose answer is present here.\n`;
}
