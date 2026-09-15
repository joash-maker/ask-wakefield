const SHEET_NAME = 'Listings';
const HEADERS = [
  'Timestamp','Listing Name','Listing Type','Category','Audience','Venue / Address','Area / Postcode','Days & Times','Cost','Description',
  'Website','Instagram','Facebook','TikTok','Public Email','Public Phone','Submitter Name','Submitter Email','Relationship','Featured Interest','Consent','Status','Source'
];

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.EVENTS_SHEET_ID) return res.status(503).json({error:'Directory unavailable'});
    const serviceAccount=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token=await getAccessToken(serviceAccount);
    const sheetId=process.env.EVENTS_SHEET_ID;
    const range=encodeURIComponent(`${SHEET_NAME}!A2:W`);
    const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok) throw new Error(await response.text());
    const data=await response.json();
    const listings=(data.values||[]).map(row=>rowObject(row)).filter(x=>String(x.status||'').toLowerCase()==='approved').map(publicShape);
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({listings});
  }catch(error){console.error('Public listings error:',error);return res.status(500).json({error:'Directory unavailable'});}
}

function rowObject(row){const o={};HEADERS.forEach((h,i)=>o[keyFor(h)]=row[i]||'');return o;}
function keyFor(h){return ({'Listing Name':'listingName','Listing Type':'listingType','Venue / Address':'venue','Area / Postcode':'areaPostcode','Days & Times':'daysTimes','Public Email':'publicEmail','Public Phone':'publicPhone','Featured Interest':'featuredInterest'})[h]||h.toLowerCase().replace(/[^a-z0-9]+(.)/g,(_,c)=>c?c.toUpperCase():'');}
function publicShape(x){return {listingName:x.listingName,listingType:x.listingType,category:x.category,audience:x.audience,venue:x.venue,areaPostcode:x.areaPostcode,daysTimes:x.daysTimes,cost:x.cost,description:x.description,website:x.website&&x.website!=='Not provided'?x.website:'',instagram:x.instagram&&x.instagram!=='Not provided'?x.instagram:'',facebook:x.facebook&&x.facebook!=='Not provided'?x.facebook:'',tiktok:x.tiktok&&x.tiktok!=='Not provided'?x.tiktok:'',publicEmail:x.publicEmail&&x.publicEmail!=='Not provided'?x.publicEmail:'',publicPhone:x.publicPhone&&x.publicPhone!=='Not provided'?x.publicPhone:''};}

async function getAccessToken(serviceAccount){
  const now=Math.floor(Date.now()/1000);
  const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=b64url(JSON.stringify({iss:serviceAccount.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const unsigned=`${header}.${payload}`;
  const pemBody=serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s/g,'');
  const binaryKey=Uint8Array.from(atob(pemBody),c=>c.charCodeAt(0));
  const cryptoKey=await crypto.subtle.importKey('pkcs8',binaryKey.buffer,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',cryptoKey,new TextEncoder().encode(unsigned));
  const signature=b64urlBytes(new Uint8Array(sig));
  const jwt=`${unsigned}.${signature}`;
  const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`});
  const td=await tr.json();if(!tr.ok)throw new Error(td.error_description||'Google token request failed');return td.access_token;
}
function b64url(text){return btoa(text).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function b64urlBytes(bytes){return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
