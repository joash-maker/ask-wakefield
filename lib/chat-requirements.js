export function requirementAnswer(question,state) {
  const q=String(question||''),prior=state?.constraints || {};
  const food=/\b(?:food|coffee|chocolate|eat|meal|lunch|dinner|caf[eé]|restaurant|drink)\b/i.test(q);
  const allergy=/\b(?:severe .{0,20}allergy|milk allergy|nut allergy|anaphylaxis)\b/i.test(q) || prior.foodRequirements?.allergy && food;
  if(allergy){
    const url='https://www.gov.uk/food-allergies';
    return {reply:'I haven’t verified a food or drink option suitable for the allergy you described. A vegan label or plant-based milk option does not establish allergy-safe preparation. Ask the venue about the specific ingredients and cross-contact controls before ordering.\n\n[Official information about allergens when eating out]('+url+')',sources:[{title:'GOV.UK - eating out with a food allergy',url}],followups:[],live:false,verification:'food-requirements-v1',state:{version:2,lastIntent:'food.requirements',resultCards:[],constraints:{foodRequirements:{...prior.foodRequirements,allergy:true}}}};
  }
  const accessible=/\b(?:wheelchair|step.free|accessible)\b/i.test(q) && /\b(?:plan|day out|outing|visit|free)\b/i.test(q);
  const refinement=prior.accessPlan && (/£\s*\d|\b(?:budget|children|kids|adults|saturday|sunday|monday|tuesday|wednesday|thursday|friday|today|tomorrow)\b/i.test(q));
  if(accessible || refinement){
    const budget=q.match(/£\s*(\d+(?:\.\d{1,2})?)/)?.[1] || prior.accessPlan?.budget || null;
    const freeOnly=prior.accessPlan?.freeOnly || /\bfree\b/i.test(q);
    const plan={budget,freeOnly};
    const sources=[{title:'The Hepworth - official access information',url:'https://hepworthwakefield.org/your-visit/access/'},{title:'Wakefield Museum - official visit information',url:'https://museumsandcastles.wakefield.gov.uk/visit/wakefield-museum/plan-your-visit-to-wakefield-museum/'}];
    return {reply:'I’ll keep wheelchair access'+(freeOnly?' and free admission':'')+(budget?' within your £'+budget+' total budget':'')+' as requirements. I haven’t verified a complete outing that meets them yet. What day are you going, how many adults and children, and would you prefer one venue?\n\nI need to check opening on that day, step-free entry, toilets and the connection between stops separately. '+(budget?'Food, parking and travel must also fit your total. ':'')+'These official pages are useful starting points, rather than a confirmed itinerary:\n\n'+sources.map(s=>'['+s.title+']('+s.url+')').join('\n'),sources,followups:[],live:false,verification:'access-requirements-v1',state:{version:2,lastIntent:'access.requirements',resultCards:[],constraints:{accessPlan:plan}}};
  }
  return null;
}
