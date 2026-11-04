import {PLACES} from './askwakefield-places-data.js';
import {isRestaurantGuide} from './restaurant-source-policy.js';
const host=url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port?parsed.hostname.toLowerCase().replace(/^www\./,''):null;}catch{return null;}};
const namesByHost=new Map();
for(const place of PLACES){
 if(!/\b(?:restaurants?|cafes?|coffee|pubs?|bars?|bistros?|tearooms?|baker(?:y|ies)|dining)\b|cafés?/i.test(place.type||''))continue;
 const hostname=host(place.website);if(!hostname||!place.name||isRestaurantGuide({url:place.website}))continue;
 if(!namesByHost.has(hostname))namesByHost.set(hostname,new Set());
 namesByHost.get(hostname).add(place.name);
}
// Use an existing public venue identity only when its own website identifies a unique record.
// This supplies a display name, never dietary, cuisine, opening or pricing evidence.
export function canonicalMenuVenueName(url){
 const names=namesByHost.get(host(url));return names?.size===1?[...names][0]:null;
}
