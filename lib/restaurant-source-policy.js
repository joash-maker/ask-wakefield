// Guides can discover venues. They cannot stand in for a venue-owned menu.
const guideHosts=['yorkshirefoodguide.co.uk','opentable.co.uk','opentable.com','tripadvisor.co.uk','tripadvisor.com','happycow.net','yorkshire.com','experiencewakefield.co.uk','facebook.com','instagram.com','yell.com','google.com','trip.com','wanderlog.com','yelp.com','yelp.co.uk','restaurantguru.com','restaurantguru.co.uk','useyourlocal.com','fresha.com','yummyadvisor.com','wftedit.co.uk','wakefieldexpress.co.uk','ubereats.com','just-eat.co.uk','deliveroo.co.uk','designmynight.com','squaremeal.co.uk','quandoo.co.uk','hardens.com'];
const listingTitle=/\b(?:restaurant\s+(?:guide|guides|directory|directories|listings)|(?:guide|directory)\s+(?:to|of)\s+restaurants|(?:best|top|popular)\b.{0,70}\brestaurants\b|restaurants\s+(?:in|near|around)\s+\w+|reviews\s*(?:&|and)\s*restaurant|(?:best|top)\b.{0,60}\bplaces to eat|(?:dining|eating out|food and drink)\s+guide)\b/i;
const types=value=>[value].flat().map(t=>String(t).split(/[\/#]/).at(-1));
function hasVenueCollection(data){
 if(!data||typeof data!=='object')return false;
 if(Array.isArray(data))return data.some(hasVenueCollection);
 if(types(data['@type']).includes('ItemList')){
  const entries=Array.isArray(data.itemListElement)?data.itemListElement:[];
  const names=new Set(entries.flatMap(entry=>{
   const item=entry?.item||entry;
   return types(item?.['@type']).some(t=>['Restaurant','CafeOrCoffeeShop','BarOrPub','FoodEstablishment'].includes(t))&&item?.name?[String(item.name).toLowerCase()]:[];
  }));
  if(names.size>1)return true;
 }
 return Object.values(data).some(value=>value&&typeof value==='object'&&hasVenueCollection(value));
}
export function isRestaurantGuide(source,page={}){
 try{const host=new URL(source.url).hostname.toLowerCase().replace(/^www\./,'');if(guideHosts.some(h=>host===h||host.endsWith('.'+h)))return true;}catch{return true;}
 // Preserve the search publisher's original title even when structured model output supplies a venue name.
 if([source.sourceTitle,source.title,source.name,page.title,page.heading,page.siteName].some(text=>listingTitle.test(String(text||''))))return true;
 return (page.jsonLd||[]).some(raw=>{try{return hasVenueCollection(JSON.parse(raw));}catch{return false;}});
}
