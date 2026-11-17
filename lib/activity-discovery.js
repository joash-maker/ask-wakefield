import { ACTIVITY_DIRECTORY as records } from './activity-directory.js';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const labels=[['swimming',/\bswim(?:ming)?|swimming lessons?\b/i],['padel',/\bpadel\b/i],['hiking',/\b(?:hiking|ramblers|longer walking)\b/i],['walking',/\bwalking\b/i],['running',/\brunning\b/i],['football',/\bfootball\b/i],['athletics',/\bathletics\b/i],['scouts',/\b(?:scouts?|cubs?|beavers?|squirrels?)\b/i],['dance',/\bdance\b/i],['music',/\bmusic lessons?|instrument\b/i],['tutoring',/\b(?:tutoring|maths|english)\b/i],['martial',/\b(?:martial arts|taekwondo)\b/i],['gym',/\b(?:gym|fitness|aspire)\b/i],['parents',/\b(?:dad matters|parent support)\b/i]];
const matches={swimming:[0],padel:[7],hiking:[6],walking:[5,6],running:[4],football:[9],athletics:[2,3],scouts:[12],dance:[13,14],music:[18],tutoring:[17],martial:[15],gym:[1,16],parents:[19]};
export async function activityDiscovery(question,state) {
  const q=String(question||''),n=norm(q),prior=state?.constraints?.activitySearch;
  const handoff=q.match(/^Help me find an activity in (.{1,100})\. Activity: (.{1,100})\. Age: (.{1,100})\. Day: (.{1,100})\. Cost: (.{1,100})\. Keep these as requirements and verify a match\.$/i);
  if(handoff){
    const requirements={area:handoff[1],activity:handoff[2],age:handoff[3],day:handoff[4],cost:handoff[5]};
    const category=records.filter(r=>norm(r.category).includes(norm(requirements.activity)));
    const reply=`I’ve kept your requirements: ${requirements.activity} in ${requirements.area}, ${requirements.age}, ${requirements.day}, ${requirements.cost}.\n\nThe directory did not have an exact match for those filters. I haven’t confirmed a current session that meets them.`+(category.length?'\n\nThese programme pages are starting points to check, rather than confirmed matches:\n\n'+category.map(r=>`[${r.name}](${r.sourceUrl})`).join('\n\n'):'');
    return {reply,sources:category.map(r=>({title:r.name+' - programme source',url:r.sourceUrl})),followups:[],live:false,verification:'activity-directory-handoff-v1',state:{version:2,lastIntent:'activity.discovery',area:requirements.area,resultCards:[],constraints:{activitySearch:{ids:category.map(r=>r.sourceUrl),handoff:requirements}}}};
  }
  if(/\b(?:coffee|caf[eé]|parking|bins?|pharmac|events?|festival|what.s on|canoe|pugneys|free things.*weekend)\b/i.test(q))return null;
  let selected=records.filter(r=>norm(r.question)===n || n.includes(norm(r.name)));
  if(!selected.length && /\bthe verge\b/i.test(q))selected=[records[14]];
  if(!selected.length && /\b(?:performance academy|pa kids)\b/i.test(q))selected=[records[10]];
  if(!selected.length && /\bcode club\b/i.test(q))selected=[records[11]];
  if(!selected.length && /\bellite\b/i.test(q))selected=[records[13]];
  if(!selected.length && !prior && /\b(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday|today|tonight|tomorrow|next|free|independent|wheelchair|accessible)\b|£/i.test(q))return null;
  const broadSport=/^what sports, gyms, running clubs, swimming and fitness activities are available in wakefield[?.!\s]*$/i.test(q);
  const broadCommunity=/^what local clubs, walking groups and community groups can i join in wakefield[?.!\s]*$/i.test(q);
  const initial=/^help me find an activity in wakefield[?.!\s]*$/i.test(q);
  let kind=labels.find(([,re])=>re.test(q))?.[0];
  if(!selected.length && kind)selected=matches[kind].map(i=>records[i]);
  if(broadSport)selected=[records[0],records[1],records[4],records[7]];
  if(broadCommunity)selected=[records[5],records[6],records[12],records[19]];
  const refers=prior && (/^(?:what (?:days?|times?|ages?|about)|which (?:days?|times?|ones?)|how (?:much|do i join|can i join)|when|are (?:they|those)|is (?:it|that)|for (?:a|an|children)|aged?|my child|actually|yes|no|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i.test(q) || /\b(?:beginner|experienced|miles|aged|ages)\b/i.test(q));
  if(!selected.length && refers){selected=records.filter(r=>prior.ids.includes(r.sourceUrl));kind=prior.kind;}
  if(!selected.length && !initial)return null;
  const area=q.match(/\b(castleford|pontefract|horbury|ossett|normanton|knottingley|wakefield city centre)\b/i)?.[1] || prior?.area || null;
  const ages=q.match(/\b(?:ages?|aged|children are|kids are|for (?:a |an )?)\s*(\d{1,2})(?:\s*(?:and|&)\s*(\d{1,2}))?\b/i);
  const ageList=ages?[+ages[1],...(ages[2]?[+ages[2]]:[])]:prior?.ages || [];
  let reply,followups=[];const sources=selected.map(r=>({title:r.name+' - programme source',url:r.sourceUrl}));
  if(initial){reply='What kind of activity would you enjoy, and which part of the district suits you? If it’s for a child, tell me their age too. You can start with swimming, running, walking, performing arts or a community group.';followups=['Help me find the right swimming lesson in Wakefield','Find a running club in Wakefield','Find a walking group near me in Wakefield'];}
  else {
    reply=(selected.length===1?'For '+selected[0].category.toLowerCase()+', our activities directory points to:':'Here are some starting points from our activities directory:')+'\n\n'+selected.map(r=>`[${r.name}](${r.sourceUrl})${selected.length>1?' · '+r.category:''}`).join('\n\n');
    if(area)reply+='\n\nI’ve kept '+area+' as your preferred area. These programme links do not establish the nearest session or a match in that area.';
    if(ageList.length)reply+='\n\nI’ve kept '+ageList.join(' and ')+' as the age'+(ageList.length>1?'s':'')+' to check against the programme.';
    if(prior?.handoff)reply+='\n\nYour directory requirements remain '+Object.values(prior.handoff).join(', ')+'. I haven’t verified these together.';
    reply+='\n\nCheck the programme page for current age groups, fees, session dates and how to join. I haven’t confirmed a place or a session that meets your requirements.';
    if(broadSport)followups=['Find a running club in Wakefield','Help me find the right swimming lesson in Wakefield','Where can I play padel near Wakefield?'];
    if(broadCommunity)followups=['Find a walking group near me in Wakefield','Find me a proper hiking or longer walking group around Wakefield','Tell me about Dad Matters and other parent support groups in Wakefield'];
  }
  return {reply,sources,followups,live:false,verification:'activity-directory-v1',state:{version:2,lastIntent:'activity.discovery',area,resultCards:[],constraints:{activitySearch:{ids:selected.map(r=>r.sourceUrl),kind,area,ages:ageList,...(refers&&prior?.handoff?{handoff:prior.handoff}:{})}}}};
}
