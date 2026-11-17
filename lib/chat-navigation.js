import { isLeisureDiscovery } from './event-request-policy.js';
import { PLACES } from './askwakefield-places-data.js';
const parking='https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-across-the-district/car-parks-in-wakefield/';
const bins='https://www.wakefield.gov.uk/bincollections';
const council='https://www.wakefield.gov.uk/';
const sources=items=>items.map(([title,url])=>({title,url}));
export function chatNavigation(question,state,messages = []) {
  const q=String(question||'').trim();
  const rainy = /\b(?:indoor activities|rainy day|wet weather)\b/i;
  const previousQuestion = messages.slice(0,-1).reverse().find(message=>message.role==='user')?.content || '';
  const priorIndoor = state?.constraints?.indoorGuide || rainy.test(previousQuestion);
  const refinement = priorIndoor && /^(?:any(?:thing)?|what|which|how|for|aged?|we|my|can|actually|sunday|saturday|parking)\b/i.test(q)
    && !/\b(?:events?|what.s on|coffee|restaurants?|pharmacy|bins?|potholes?|council tax|weather forecast|weather tomorrow|bus|train)\b/i.test(q);
  const indoor = !state?.constraints?.familyPlan && (rainy.test(q) || refinement);
  const cityIndoor = /\b(?:wakefield city|city cent(?:re|er)|city itself)\b/i.test(q) || priorIndoor && state?.constraints?.indoorArea === 'Wakefield city centre';
  const indoorParking = /\b(?:parking|car parks?)\b/i.test(q) || priorIndoor && state?.constraints?.indoorParking;
  const children = /\b(?:children|kids?|families|family)\b/i.test(q) || priorIndoor && state?.constraints?.indoorChildren;

  const menu=/^help me with a wakefield local service such as\b/i.test(q);
  let reply,links,followups,kind;
  if(isLeisureDiscovery(q) && !rainy.test(q))return null;
  if(state?.constraints?.journey && /\b(?:last|first|next) bus\b/i.test(q)){
    kind='journey';reply='I still have the journey between Wakefield Cathedral and Yorkshire Sculpture Park. I haven’t verified the last, first or next bus for your travel date. Check the current service using [West Yorkshire Metro](https://www.wymetro.com/) and [YSP’s getting-here guide](https://ysp.org.uk/visit-us/getting-here).';links=[['West Yorkshire Metro','https://www.wymetro.com/'],['YSP getting-here guide','https://ysp.org.uk/visit-us/getting-here']];followups=[];
  } else if(indoor){
    kind='indoor';const names=cityIndoor?['Wakefield Museum','Wakefield Library']:['Wakefield Museum','Castleford Museum','The Hepworth Wakefield'];
    const picks=PLACES.filter(p=>names.includes(p.name));
    reply=(cityIndoor?'For a rainy day in Wakefield city centre, start with Wakefield Museum and Wakefield Library, both at Wakefield One on Burton Street:':'For a rainy day, you could start with a museum or gallery:')+'\n\n'+picks.map(p=>`[${p.name}](${p.source}) · ${p.type}.`).join('\n\n');
    links=picks.map(p=>[p.name+' - official visit page',p.source]);
    if(indoorParking && cityIndoor){
      const merchant='https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-across-the-district/merchant-gate-car-park';
      reply+=`\n\nFor parking, the museum’s visit guide names Merchant Gate as the nearest car park. [Check the Council’s Merchant Gate details](${merchant}) for its current terms. I haven’t checked live spaces, so availability is not guaranteed.`;
      links.push(['Merchant Gate car park - Wakefield Council',merchant]);
    } else if(indoorParking){reply+=`\n\n[Wakefield Council’s car-park guide](${parking}) covers Council parking options. Tell me which venue or town you prefer so I can keep the activity and parking advice together. I haven’t checked live spaces.`;links.push(['Wakefield Council car parks',parking]);}
    reply+='\n\nThese are indoor ideas rather than confirmed sessions for your visit. Check the official pages for opening days, admission and booking requirements. '+(children?'What day are you visiting, and how old are the children?':'What day and roughly what time are you visiting?');
    followups=['What free things can we do in Wakefield this weekend?','Help me find an activity in Wakefield'];
  } else if(/\b(?:library|libraries)\b/i.test(q) && /\b(?:where|find|address|location|wakefield)\b/i.test(q) && !/\b(?:castleford|pontefract|ossett|horbury|normanton)\b/i.test(q)){
    kind='library';const p=PLACES.find(place=>place.name==='Wakefield Library');reply=`Wakefield Library is at ${p.address}, ${p.postcode}. [Use the Council’s library page](${p.source}) for current opening hours, events and contact details.`;links=[['Wakefield Library - Wakefield Council',p.source]];followups=[];
  } else if(/\b(?:report|reporting)\b.*\bpotholes?\b/i.test(q)){
    kind='roads';reply=`Use [Wakefield Council’s road reporting service](https://www.wakefield.gov.uk/roads-and-travel/) to find the current pothole reporting form. Give the road and location, and add a photo if the form offers that option. I haven’t submitted a report for you.`;links=[['Wakefield Council roads and travel','https://www.wakefield.gov.uk/roads-and-travel/']];followups=[];
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
  return {reply,sources:sources(links),followups,state:{version:2,lastIntent:'navigation.'+kind,resultCards:[],constraints:{serviceMenu:kind==='services',indoorGuide:kind==='indoor',...(kind==='indoor'?{indoorArea:cityIndoor?'Wakefield city centre':null,indoorParking:Boolean(indoorParking),indoorChildren:Boolean(children)}:{}),...(state?.constraints?.journey?{journey:state.constraints.journey}:{})}},live:false,verification:'local-navigation-v1'};
}
