const SHEET_NAME='Listings';
const HEADERS=[
  'Timestamp','Listing Name','Listing Type','Category','Audience','Venue / Address','Area / Postcode','Days & Times','Cost','Description',
  'Website','Instagram','Facebook','TikTok','Public Email','Public Phone','Submitter Name','Submitter Email','Relationship','Featured Interest','Consent','Status','Source'
];
const ALLOWED_STATUS=['New','Approved','Needs changes','Rejected'];

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{};
  if(!process.env.ASK_WAKEFIELD_ADMIN_PASSWORD) return res.status(503).json({error:'Admin access is not configured'});
  if(!safeEqual(String(body.password||''),String(process.env.ASK_WAKEFIELD_ADMIN_PASSWORD))) return res.status(401).json({error:'Incorrect password'});
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON||!process.env.EVENTS_SHEET_ID) return res.status(503).json({error:'Google Sheets access is not configured'});
  try{
    const serviceAccount=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), token=await getAccessToken(serviceAccount), sheetId=process.env.EVENTS_SHEET_ID;
    if(body.action==='list'){
      const listings=await readListings(sheetId,token);return res.status(200).json({listings});
    }
    if(body.action==='update'){
      const rowNumber=Number(body.rowNumber), status=String(body.status||''), note=clean(body.note,1000);
      if(!Number.isInteger(rowNumber)||rowNumber<2||!ALLOWED_STATUS.includes(status)) return res.status(400).json({error:'Invalid update'});
      const listing=await getRow(sheetId,token,rowNumber);if(!listing) return res.status(404).json({error:'Listing not found'});
      await updateStatus(sheetId,token,rowNumber,status);
      await notifySubmitter({...listing,status,note});
      return res.status(200).json({ok:true,status});
    }
    return res.status(400).json({error:'Unknown action'});
  }catch(error){console.error('Admin listings error:',error);return res.status(500).json({error:'Could not complete that action'});}
}

async function readListings(sheetId,token){
  const range=encodeURIComponent(`${SHEET_NAME}!A2:W`);const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(await r.text());const d=await r.json();return (d.values||[]).map((row,i)=>({...rowObject(row),rowNumber:i+2})).reverse();
}
async function getRow(sheetId,token,rowNumber){const range=encodeURIComponent(`${SHEET_NAME}!A${rowNumber}:W${rowNumber}`);const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(await r.text());const d=await r.json();return d.values&&d.values[0]?rowObject(d.values[0]):null;}
async function updateStatus(sheetId,token,rowNumber,status){const range=encodeURIComponent(`${SHEET_NAME}!V${rowNumber}`);const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[[status]]})});if(!r.ok)throw new Error(await r.text());}
function rowObject(row){const o={};HEADERS.forEach((h,i)=>o[keyFor(h)]=row[i]||'');return o;}
function keyFor(h){return ({'Listing Name':'listingName','Listing Type':'listingType','Venue / Address':'venue','Area / Postcode':'areaPostcode','Days & Times':'daysTimes','Public Email':'publicEmail','Public Phone':'publicPhone','Submitter Name':'submitterName','Submitter Email':'submitterEmail','Featured Interest':'featuredInterest'})[h]||h.toLowerCase().replace(/[^a-z0-9]+(.)/g,(_,c)=>c?c.toUpperCase():'');}
function clean(v,max){return String(v||'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);}
function safeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}

async function notifySubmitter(item){
  const key=process.env.RESEND_API_KEY;if(!key||!item.submitterEmail)return;
  const name=escapeHtml(item.listingName||'your listing'), note=escapeHtml(item.note||'');let subject='',message='';
  if(item.status==='Approved'){subject=`Approved: ${item.listingName}`;message=`Good news — <strong>${name}</strong> has been approved for the Ask Wakefield directory. It should appear publicly shortly. Please let us know if any details change.`;}
  else if(item.status==='Needs changes'){subject=`A quick update needed: ${item.listingName}`;message=`Thanks again for submitting <strong>${name}</strong>. We need a little more information before we can publish it.${note?`<br/><br/><strong>What we need:</strong><br/>${note}`:''}<br/><br/>Reply to this email with the updated details and we’ll review it again.`;}
  else if(item.status==='Rejected'){subject=`Update on your Ask Wakefield listing: ${item.listingName}`;message=`Thanks for submitting <strong>${name}</strong>. We’re not able to publish this listing at the moment.${note?`<br/><br/>${note}`:''}`;}
  else return;
  const html=`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;border-top:3px solid #e61c5d"><p style="font-family:Georgia,serif;font-size:24px;color:#111">Ask Wakefield directory</p><p style="font-size:15px;color:#555;line-height:1.7">${message}</p><p style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:18px;margin-top:24px">Ask Wakefield · Independent local assistant · Built by Mediahubink Limited</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Ask Wakefield <hello@mediahubink.com>',to:item.submitterEmail,subject,html})});if(!r.ok)console.error('Admin status email error:',await r.text());
}
function escapeHtml(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}

async function getAccessToken(serviceAccount){
  const now=Math.floor(Date.now()/1000),header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'})),payload=b64url(JSON.stringify({iss:serviceAccount.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})),unsigned=`${header}.${payload}`;
  const pemBody=serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s/g,''),binaryKey=Uint8Array.from(atob(pemBody),c=>c.charCodeAt(0));
  const cryptoKey=await crypto.subtle.importKey('pkcs8',binaryKey.buffer,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',cryptoKey,new TextEncoder().encode(unsigned)),signature=b64urlBytes(new Uint8Array(sig)),jwt=`${unsigned}.${signature}`;
  const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`});const td=await tr.json();if(!tr.ok)throw new Error(td.error_description||'Google token request failed');return td.access_token;
}
function b64url(text){return btoa(text).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}function b64urlBytes(bytes){return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
