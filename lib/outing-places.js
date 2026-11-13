// Places supplies exact-branch discovery, coordinates, service flags and hours.
// Venue hours are never represented as kitchen or drink-counter service hours.
const dayMs=86400000;
const dateNumber=d=>Date.parse(d+'T00:00:00Z')/dayMs;
const at=p=>Number(p.hour||0)*60+Number(p.minute||0);
export const clockLabel=minute=>{
  if(minute===1440)return 'midnight';
  const m=((minute%1440)+1440)%1440;
  return `${Math.floor(m/60)%12||12}${m%60?':'+String(m%60).padStart(2,'0'):''}${m<720?'am':'pm'}${minute>1440?' the next morning':''}`;
};
export function dateIntervals(hours,date,checkedDate) {
  if(!hours?.periods?.length || dateNumber(date)<dateNumber(checkedDate) || dateNumber(date)>dateNumber(checkedDate)+6) return [];
  const target=new Date(date+'T12:00:00Z').getUTCDay();
  const result=[];
  for(const period of hours.periods) {
    const open=period.open,close=period.close;
    if(!open)continue;
    if(!close && Number(open.day)===0 && at(open)===0) {result.push({start:0,end:1440,allDay:true});continue;}
    if(!close)continue;
    let offset;
    if(open.date) offset=dateNumber(`${open.date.year}-${String(open.date.month).padStart(2,'0')}-${String(open.date.day).padStart(2,'0')}`)-dateNumber(date);
    else {offset=(Number(open.day)-target+7)%7;if(offset===6)offset=-1;}
    if(offset!==0&&offset!==-1)continue;
    let span=(Number(close.day)-Number(open.day)+7)%7;
    if(close.date&&open.date)span=dateNumber(`${close.date.year}-${String(close.date.month).padStart(2,'0')}-${String(close.date.day).padStart(2,'0')}`)-dateNumber(`${open.date.year}-${String(open.date.month).padStart(2,'0')}-${String(open.date.day).padStart(2,'0')}`);
    const start=offset*1440+at(open),end=(offset+span)*1440+at(close);
    if(end>0&&start<1440&&end>start)result.push({start:Math.max(0,start),end,allDay:false});
  }
  return result;
}
export function distanceMetres(a,b) {
  const rad=x=>x*Math.PI/180,lat=rad(b.latitude-a.latitude),lng=rad(b.longitude-a.longitude);
  const h=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function verifyOutingPlace(place,context,plan,anchor,now=new Date()) {
  if(!place?.id||place.businessStatus!=='OPERATIONAL'||!place.location||!anchor)return null;
  if(![place.location.latitude,place.location.longitude,anchor.latitude,anchor.longitude].every(Number.isFinite))return null;
  const city=/wakefield city centre/i.test(context.area),radius=city?1300:1600;
  if(distanceMetres(anchor,place.location)>radius)return null;
  const address=String(place.formattedAddress||'');
  if(city && /\b(?:castleford|ferrybridge|pontefract|horbury|ossett|normanton|knottingley|glasshoughton)\b/i.test(address))return null;
  if(context.party?.children && place.goodForChildren===false)return null;
  const services=[];
  if(place.servesCoffee===true)services.push('coffee');
  if(place.servesDinner===true)services.push('dinner');
  if(place.servesDessert===true||place.servesDinner===true||place.servesLunch===true)services.push('snack');
  if(!plan.needs.some(n=>services.includes(n)) && !(plan.needs.includes('hot_chocolate')&&services.includes('coffee')))return null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const dates=plan.date?[plan.date]:context.dates;
  const start=context.windowStart,end=context.windowEnd;
  const intervals=dates.map(date=>dateIntervals(place.currentOpeningHours,date,today).filter(p=>plan.exactTime?p.start<=start&&p.end>start:p.start<end&&p.end>start));
  if(intervals.some(list=>!list.length))return null;
  const chosen=intervals.map(list=>list.sort((a,b)=>b.end-a.end)[0]);
  const startMinute=Math.max(...chosen.map(p=>p.start)),endMinute=Math.min(...chosen.map(p=>p.end));
  const secondary=place.currentSecondaryOpeningHours||[];
  const kitchen=secondary.some(h=>h.secondaryHoursType==='KITCHEN')?secondary.filter(h=>h.secondaryHoursType==='KITCHEN'):secondary.filter(h=>h.secondaryHoursType==='DINNER');
  const kitchenPeriods=dates.map(date=>kitchen.flatMap(h=>dateIntervals(h,date,today)).filter(p=>plan.exactTime?p.start<=start&&p.end>start:p.start<end&&p.end>start));
  const kitchenChecked=kitchen.length>0&&kitchenPeriods.every(periods=>periods.length>0);
  if(kitchen.length&&!kitchenChecked)for(const food of ['dinner','snack']) {const i=services.indexOf(food);if(i>=0)services.splice(i,1);}
  if(!plan.needs.some(n=>services.includes(n))&&!(plan.needs.includes('hot_chocolate')&&services.includes('coffee')))return null;
  const kitchenEndMinute=kitchenChecked?Math.min(...kitchenPeriods.map(periods=>Math.max(...periods.map(p=>p.end)))):null;
  return {name:String(place.displayName?.text||place.displayName||'').slice(0,100),id:place.id,
    sourceUrl:place.googleMapsUri||`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(place.id)}`,
    website:place.websiteUri||null,address:address.slice(0,180),dates,start:`${String(Math.floor(startMinute/60)).padStart(2,'0')}:${String(startMinute%60).padStart(2,'0')}`,end:`${String(Math.floor(endMinute/60)%24).padStart(2,'0')}:${String(endMinute%60).padStart(2,'0')}`,
    startMinute,endMinute,hoursByDate:chosen.map((h,i)=>({date:dates[i],start:h.start,end:h.end})),allDay:chosen.every(p=>p.allDay),services,hotChocolate:false,kitchenChecked,kitchenEndMinute,sourceKind:'branch-listing',checkedAt:now.toISOString()};
}
export function foodWindow(context,plan,requested=null) {
  const clock=t=>+t.split(':')[0]*60+ +t.split(':')[1];
  const start=clock(context.start),end=clock(context.end);
  if(requested!=null)return {...context,windowStart:requested,windowEnd:requested+1};
  if(plan.timing==='before')return {...context,windowStart:Math.max(0,start-90),windowEnd:start};
  if(plan.timing==='after')return {...context,windowStart:end,windowEnd:Math.min(1440,end+120)};
  return {...context,windowStart:start,windowEnd:end};
}
export async function discoverOutingPlaces(context,plan,services,now=new Date()) {
  if(!services.search || !services.anchor)return [];
  const anchor=await services.anchor(context.area);
  if(!anchor)return [];
  const food=plan.needs.some(n=>['snack','dinner'].includes(n));
  const queries=food?(plan.needs.includes('dinner')&&!plan.needs.includes('snack')?['restaurants dinner','fast food burgers restaurants']:['fast food snacks burgers','coffee hot drinks cafes']):['coffee hot chocolate cafes fast food restaurants','McDonald’s Costa Starbucks Burger King coffee'];
  const jobs=queries.map(query=>services.search(`${query} in ${context.area}`,{pageSize:10,locationBias:{circle:{center:anchor,radius:1300}},districtRestriction:false,richFields:['servesCoffee','servesDessert','servesDinner','servesLunch','takeout','goodForChildren','currentSecondaryOpeningHours']}));
  const batches=await Promise.allSettled(jobs);
  const places=[...new Map(batches.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(p=>[p.id,p])).values()];
  return places.map(p=>verifyOutingPlace(p,context,plan,anchor,now)).filter(Boolean).slice(0,10);
}
