// A planning pass interprets the conversation. It cannot invent venues, widen
// geography or manufacture dates. Retrieval and deterministic checks follow it.
const intents = new Set(['food_drink','event','parking','unrelated']);
const needs = new Set(['coffee','hot_chocolate','snack','dinner']);
const latest = messages => messages.filter(m=>m.role==='user').at(-1)?.content || '';
export function validateOutingPlan(raw, context) {
  if(!raw || !intents.has(raw.intent)) return null;
  if(raw.newArea || raw.newDate || (raw.date && !context.dates.includes(raw.date))) return {intent:'unrelated'};
  const wanted=[...new Set((Array.isArray(raw.needs)?raw.needs:[]).filter(n=>needs.has(n)))];
  if(raw.intent==='food_drink' && !wanted.length) return null;
  const day=raw.date && context.dates.includes(raw.date) ? raw.date : null;
  return {intent:raw.intent,needs:wanted,timing:['before','during','after'].includes(raw.timing)?raw.timing:'during',
    date:day,alternatives:raw.alternatives===true,referencePrevious:raw.referencePrevious===true,
    namedBrand:typeof raw.namedBrand==='string'?raw.namedBrand.slice(0,50):null};
}
export async function planOutingTurn(messages, state, context, services) {
  try {
    const {response,data}=await services.call({model:services.model,max_tokens:450,
      system:`OUTING_PLANNER_V2. Interpret the latest message as part of a local outing. You do not answer it or name places. Resolve vague wording and pronouns using the event, party and latest suggestions. A bite, something quick, starving, eating first, making an evening of it, chains/fast food, drinks for adults/children can be food_drink. Warm-up can mean drinks. A new town or date outside this event is unrelated, even if food is mentioned. Event programme and parking questions remain event/parking. Do not turn every question into food. Return only JSON {"intent":"food_drink|event|parking|unrelated","needs":["coffee","hot_chocolate","snack","dinner"],"timing":"before|during|after","date":null,"alternatives":false,"referencePrevious":false,"namedBrand":null,"newArea":false,"newDate":false}. Quick bites/snacks/fast food mean snack, not automatically dinner. Dinner is for an actual meal/dinner request or hunger after the event. Include only expressed needs or a sensible food/drink suggestion when asked how to make this outing an evening. Retain prior food needs on a timing-only follow-up. Do not invent dietary, travel, budget, family or accessibility preferences. namedBrand is a single brand explicitly requested in this message, never one you choose. Multiple brands mentioned as examples (Starbucks, Costa, McDonalds, Burger King) mean broad discovery, so namedBrand=null.`,
      messages:[{role:'user',content:JSON.stringify({event:{title:context.card.title,area:context.area,dates:context.dates,start:context.start,end:context.end},party:state.constraints?.outing?.party,previousPlan:state.constraints?.outing?.plan,latestPlaces:(state.constraints?.outing?.options||[]).filter(p=>(state.constraints?.outing?.currentIds||[]).includes(p.sourceUrl)).map(p=>({name:p.name,end:p.end})),conversation:messages.slice(-6).map(m=>({role:m.role,content:m.content.slice(0,1600)})),question:latest(messages)})}]}, {timeoutMs:6500});
    if(!response.ok) return null;
    const output=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').replace(/^```(?:json)?\s*|\s*```$/g,'');
    return validateOutingPlan(JSON.parse(output),context);
  } catch {return null;}
}

export function fallbackOutingPlan(question, previous={}) {
  if(/\b(?:parking|bus|train|tickets?|parade|switch.on)\b/i.test(question)) return null;
  if(/\b(?:tomorrow|next week|castleford|castle ford|ferrybridge|pontefract|leeds|horbury|ossett|normanton)\b/i.test(question)) return null;
  const wanted=[];
  if(/\b(?:coffee|cappuccino|latte|espresso)\b/i.test(question)) wanted.push('coffee');
  if(/hot chocolate|cocoa/i.test(question)) wanted.push('hot_chocolate');
  if(/\b(?:snack|bite|quick food|fast food|burgers?|chips|fries|peckish|something quick|mcdonald|burger king|greggs)\b/i.test(question)) wanted.push('snack');
  if(/\b(?:dinner|meal|eat|eating|hungry|starving|restaurant)\b/i.test(question)) wanted.push('dinner');
  if(/warm up|warming up|drink|costa|starbucks/i.test(question)&&!wanted.length) wanted.push('coffee');
  if(!wanted.length && /\b(?:those|that|them|still|which|open|close)\b/i.test(question)) wanted.push(...(previous.needs||[]));
  if(!wanted.length) return null;
  return {intent:'food_drink',needs:[...new Set(wanted)],timing:/\b(?:before|first)\b/i.test(question)?'before':/\b(?:after|afterwards?|afterward)\b/i.test(question)?'after':previous.timing||'during',alternatives:/\b(?:other|else|another|alternatives?)\b/i.test(question),referencePrevious:/\b(?:those|that|them|these|still)\b/i.test(question),namedBrand:null};
}
