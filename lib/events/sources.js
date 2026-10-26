// Public source directory. A successful run means pages were read, not a complete calendar.
const source=(id,name,url,venue,linkPattern,area='Wakefield district')=>({id,name,url,venue,area,linkPattern,enabled:true,maxPages:12,horizonDays:90});
export const EVENT_SOURCES=[
 source('experience','Experience Wakefield','https://experiencewakefield.co.uk/whats-on/',null,'/event/'),
 source('wx','WX Wakefield Exchange','https://wxwakefield.co.uk/whats-on','WX Wakefield Exchange','/Whats-On/Details'),
 source('museums','Wakefield Museums and Castles','https://museumsandcastles.wakefield.gov.uk/whats-on/',null,'/whats-on/'),
 source('hepworth','The Hepworth Wakefield','https://hepworthwakefield.org/whats-on/','The Hepworth Wakefield','/whats-on/'),
 source('ncm','National Coal Mining Museum','https://www.ncm.org.uk/whats-on/','National Coal Mining Museum','/whats-on/'),
 source('ysp','Yorkshire Sculpture Park','https://ysp.org.uk/whats-on/events','Yorkshire Sculpture Park','/whats-on/'),
 source('cathedral','Wakefield Cathedral','https://www.wakefieldcathedral.org.uk/whats-happening/events/','Wakefield Cathedral','/events/'),
 source('theatre','Theatre Royal Wakefield','https://www.theatreroyalwakefield.co.uk/whats-on/','Theatre Royal Wakefield','/events/'),
 source('arthouse','The Art House','https://the-arthouse.org.uk/exhibitions-events/','The Art House','/(?:events|exhibitions)/'),
 source('nostell','National Trust Nostell','https://www.nationaltrust.org.uk/visit/yorkshire/nostell/events','Nostell','/visit/yorkshire/nostell/events/'),
 source('fairburn','RSPB Fairburn Ings','https://www.rspb.org.uk/days-out/reserves/fairburn-ings','RSPB Fairburn Ings','/events/'),
 source('blacker-hall','Blacker Hall Farm','https://www.blackerhallfarmshop.co.uk/','Blacker Hall Farm Shop','/(?:blogs/news|products|pages)/'),
 source('copleys','Farmer Copleys','https://farmercopleys.co.uk/','Farmer Copleys','/(?:events|event|pumpkin|christmas)/'),
 source('libraries','Wakefield Libraries WordFest','https://www.wakefield.gov.uk/libraries-and-local-history/wordfest',null,'/libraries-and-local-history/'),
 source('races','Pontefract Racecourse','https://www.pontefract-races.co.uk/2026-fixtures/','Pontefract Racecourse','/(?:race|fixture|event)'),
];
export function getSource(id){return EVENT_SOURCES.find(s=>s.id===id);}
export function allowedUrl(value,source,base=source.url){
 try{const u=new URL(value,base),h=new URL(source.url).hostname.replace(/^www\./,'');
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.replace(/^www\./,'')!==h)return null;
 if(/\.(?:pdf|png|jpe?g|webp|svg|zip|css|js)$/i.test(u.pathname))return null;
 u.hash='';['utm_source','utm_medium','utm_campaign','fbclid','gclid'].forEach(k=>u.searchParams.delete(k));
 return u.toString();}catch{return null;}
}
