import { PLACES } from './askwakefield-places-data.js';
const parking='https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-across-the-district/car-parks-in-wakefield/';
const bins='https://www.wakefield.gov.uk/bincollections';
const council='https://www.wakefield.gov.uk/';
const sources=items=>items.map(([title,url])=>({title,url}));
export function chatNavigation(question,state) {
  const q=String(question||'').trim();
  const indoor=!state?.constraints?.familyPlan && (/\b(?:indoor activities|rainy day)\b/i.test(q) || state?.constraints?.indoorGuide && /^(?:what|which|how|for|aged?|we|my|can|actually|sunday|saturday)\b/i.test(q));
  const menu=/^help me with a wakefield local service such as\b/i.test(q);
  let reply,links,followups,kind;
  if(indoor && !/\b(?:coffee|parking|bus|train|events?|what.s on)\b/i.test(q)){
    kind='indoor';const picks=PLACES.filter(p=>['Wakefield Museum','Castleford Museum','The Hepworth Wakefield'].includes(p.name));
    reply='For a rainy day, you could start with a museum or gallery:\n\n'+picks.map(p=>`[${p.name}](${p.source}) · ${p.type}.`).join('\n\n')+'\n\nThese are indoor ideas rather than confirmed sessions for your visit. Check the official visit pages for opening days, admission and any children’s activity or booking requirements. How old are the children, and which part of the district suits you?';
    links=picks.map(p=>[p.name+' - official visit page',p.source]);followups=['What free things can we do in Wakefield this weekend?','Help me find an activity in Wakefield'];
  } else if(menu){
    kind='services';reply='What do you need help with: bin collections, parking, a journey, or another council service? For bins, the answer depends on your property. For transport, I’ll need your start, destination and travel time.';
    links=[['Wakefield Council',council],['Bin collection lookup',bins],['Wakefield car parks',parking]];
    followups=['Help me find my bin collection day','Help me find official parking information for Wakefield city centre','Help me plan a journey in Wakefield'];
  } else if(/\b(?:official parking|parking information|parking in town)\b/i.test(q) && !/\b(?:event|festival|light up|parade)\b/i.test(q)){
    kind='parking';reply=`Use [Wakefield Council’s car-park guide](${parking}) for the city-centre locations, hours, charges and restrictions. Choose the individual car park and check its signs before leaving your vehicle. Shopping-centre and privately operated car parks have their own terms.\n\nWhere in the city centre are you heading? I haven’t checked live spaces or a particular car park’s current tariff.`;
    links=[['Wakefield Council car parks',parking]];followups=[];
  } else if(/^(?:help me (?:find|check) (?:my |the )?bin collection day|(?:when (?:is|are) |what day (?:is|are) )(?:my |the )?bins?(?: (?:collected|collection|emptied|due|going out))?)[?.!\s]*$/i.test(q) || state?.constraints?.serviceMenu && /^bins?[?.!\s]*$/i.test(q)){
    kind='bins';reply=`Use the [Council’s bin collection lookup](${bins}) and enter your full postcode or house number and street, then choose the property. A nearby landmark does not identify the collection schedule. I haven’t retrieved a collection date for your home.`;
    links=[['Council bin collection lookup',bins]];followups=[];
  } else if(/^help me plan a journey in wakefield[?.!\s]*$/i.test(q)){
    kind='journey';reply='Where are you starting, where are you heading, and when do you want to travel? Also let me know whether you want to go by bus, train, car or on foot.';links=[];followups=[];
  }
  if(!reply)return null;
  return {reply,sources:sources(links),followups,state:{version:2,lastIntent:'navigation.'+kind,resultCards:[],constraints:{serviceMenu:kind==='services',indoorGuide:kind==='indoor'}},live:false,verification:'local-navigation-v1'};
}
