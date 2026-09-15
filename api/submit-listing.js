const SHEET_NAME = 'Listings';
const HEADERS = [
  'Timestamp','Listing Name','Listing Type','Category','Audience','Venue / Address','Area / Postcode','Days & Times','Cost','Description',
  'Website','Instagram','Facebook','TikTok','Public Email','Public Phone','Submitter Name','Submitter Email','Relationship','Featured Interest','Consent','Status','Source'
];

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const data=sanitiseSubmission(req.body);
  if(!data) return res.status(400).json({error:'Invalid or missing required fields'});
  if(data.middleName) return res.status(200).json({ok:true}); // honeypot: silently accept bots
  if(![data.website,data.instagram,data.facebook,data.tiktok].some(Boolean)) return res.status(400).json({error:'Verification link required'});

  try{
    if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.EVENTS_SHEET_ID){
      console.error('Listing submission: missing Google Sheets environment variables');
      return res.status(503).json({error:'Submission service unavailable'});
    }
    const serviceAccount=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const sheetId=process.env.EVENTS_SHEET_ID;
    const token=await getAccessToken(serviceAccount);
    if(!token) throw new Error('Could not get Google access token');

    await ensureListingsSheet(sheetId,token);

    const row=[
      data.timestamp,data.listingName,data.listingType,data.category,data.audience,data.venue,data.areaPostcode,data.daysTimes,data.cost,data.description,
      data.website||'Not provided',data.instagram||'Not provided',data.facebook||'Not provided',data.tiktok||'Not provided',data.publicEmail||'Not provided',data.publicPhone||'Not provided',
      data.submitterName,data.submitterEmail,data.relationship,data.featuredInterest,data.consent,'New',data.source
    ].map(sheetSafe);

    const range=encodeURIComponent(`${SHEET_NAME}!A:W`);
    const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[row]})
    });
    if(!response.ok){console.error('Listings sheet append error:',await response.text());return res.status(500).json({error:'Failed to save listing'});}

    await sendEmails(data);
    return res.status(200).json({ok:true});
  }catch(error){console.error('Submit listing error:',error);return res.status(500).json({error:'Server error'});}
}

function cleanText(value,max=1000){return String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);}
function validEmail(value){return !value || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254);}
function safeHttpUrl(value){const raw=cleanText(value,500);if(!raw)return'';try{const u=new URL(raw);return(u.protocol==='https:'||u.protocol==='http:')?u.toString():'';}catch{return'';}}
function sanitiseSubmission(input){
  if(!input||typeof input!=='object')return null;
  const out={
    timestamp:cleanText(input.timestamp,60)||new Date().toISOString(),listingName:cleanText(input.listingName,160),listingType:cleanText(input.listingType,80),category:cleanText(input.category,100),audience:cleanText(input.audience,220)||'Not specified',description:cleanText(input.description,1800),venue:cleanText(input.venue,220),areaPostcode:cleanText(input.areaPostcode,100),daysTimes:cleanText(input.daysTimes,220)||'Varies / not specified',cost:cleanText(input.cost,120)||'Not specified',website:safeHttpUrl(input.website),instagram:safeHttpUrl(input.instagram),facebook:safeHttpUrl(input.facebook),tiktok:safeHttpUrl(input.tiktok),publicEmail:cleanText(input.publicEmail,254).toLowerCase(),publicPhone:cleanText(input.publicPhone,60),submitterName:cleanText(input.submitterName,120),submitterEmail:cleanText(input.submitterEmail,254).toLowerCase(),relationship:cleanText(input.relationship,100),featuredInterest:cleanText(input.featuredInterest,10)==='Yes'?'Yes':'No',consent:cleanText(input.consent,10)==='Yes'?'Yes':'No',middleName:cleanText(input.middleName,120),source:cleanText(input.source,120)||'askwakefield.co.uk/submit-listing'
  };
  if(!out.listingName||!out.listingType||!out.category||!out.description||!out.venue||!out.areaPostcode||!out.submitterName||!out.submitterEmail||!validEmail(out.submitterEmail)||!validEmail(out.publicEmail)||!out.relationship||out.consent!=='Yes')return null;
  return out;
}
function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function sheetSafe(value){const text=String(value??'');return /^[=+\-@]/.test(text)?`'${text}`:text;}

async function ensureListingsSheet(sheetId,token){
  const meta=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,{headers:{Authorization:`Bearer ${token}`}});
  if(!meta.ok) throw new Error(`Sheet metadata failed: ${await meta.text()}`);
  const metaData=await meta.json();
  const exists=(metaData.sheets||[]).some(s=>s.properties&&s.properties.title===SHEET_NAME);
  if(!exists){
    const create=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{addSheet:{properties:{title:SHEET_NAME}}}]})});
    if(!create.ok){const body=await create.text();if(!body.includes('already exists')) throw new Error(`Could not create Listings sheet: ${body}`);}
  }
  const headerRange=encodeURIComponent(`${SHEET_NAME}!A1:W1`);
  const current=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${headerRange}`,{headers:{Authorization:`Bearer ${token}`}});
  const currentData=current.ok?await current.json():{};
  if(!(currentData.values&&currentData.values[0]&&currentData.values[0].length)){
    const write=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${headerRange}?valueInputOption=RAW`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[HEADERS]})});
    if(!write.ok) throw new Error(`Could not write Listings headers: ${await write.text()}`);
  }
}

async function sendEmails(data){
  const key=process.env.RESEND_API_KEY;if(!key)return;
  const e=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,escapeHtml(v)]));
  const links=[['Website',data.website],['Instagram',data.instagram],['Facebook',data.facebook],['TikTok',data.tiktok]].filter(([,u])=>u);
  const linksHtml=links.map(([label,url])=>`<a href="${escapeHtml(url)}" style="color:#e61c5d;margin-right:10px;">${label}</a>`).join('');
  const confirmationHtml=`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff;border-top:3px solid #e61c5d;"><p style="font-family:Georgia,serif;font-size:24px;color:#111;margin:0 0 18px;">Listing received.</p><p style="font-size:15px;color:#555;line-height:1.7;">Thanks for submitting <strong>${e.listingName}</strong> to Ask Wakefield. We’ll review the information and verify the source before anything is published.</p><p style="font-size:15px;color:#555;line-height:1.7;">Submission does not guarantee inclusion, but we’ll use the details to keep the local directory useful and current.</p><p style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:18px;margin-top:24px;">Ask Wakefield · Independent local assistant · Built by Mediahubink Limited</p></div>`;
  const notificationHtml=`<div style="font-family:sans-serif;max-width:620px;margin:0 auto;padding:32px;background:#1c1c1e;color:#eee;border-top:3px solid #e61c5d;"><p style="font-size:18px;color:#e61c5d;font-weight:600;margin:0 0 20px;">New Directory Listing — Ask Wakefield</p><p><strong>${e.listingName}</strong><br/><span style="color:#aaa">${e.listingType} · ${e.category}</span></p><p style="line-height:1.6">${e.description}</p><p><span style="color:#888">Audience:</span> ${e.audience}<br/><span style="color:#888">Location:</span> ${e.venue} · ${e.areaPostcode}<br/><span style="color:#888">Days/times:</span> ${e.daysTimes}<br/><span style="color:#888">Cost:</span> ${e.cost}</p><p>${linksHtml}</p><p style="border-top:1px solid #333;padding-top:16px"><span style="color:#888">Submitted by:</span> ${e.submitterName} · <a href="mailto:${e.submitterEmail}" style="color:#e61c5d">${e.submitterEmail}</a><br/><span style="color:#888">Relationship:</span> ${e.relationship}<br/><span style="color:#888">Featured/Partner interest:</span> ${e.featuredInterest}</p></div>`;
  const emails=[
    {from:'Ask Wakefield <hello@mediahubink.com>',to:data.submitterEmail,subject:`Listing received: ${data.listingName}`,html:confirmationHtml},
    {from:'Ask Wakefield <hello@mediahubink.com>',to:'hello@mediahubink.com',subject:`New listing submission: ${data.listingName}${data.featuredInterest==='Yes'?' · Partner interest':''}`,html:notificationHtml}
  ];
  for(const email of emails){try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(email)});if(!r.ok)console.error('Listing email send error:',await r.text());}catch(err){console.error('Listing email send error:',err);}}
}

async function getAccessToken(serviceAccount){
  const now=Math.floor(Date.now()/1000);
  const header=btoa(JSON.stringify({alg:'RS256',typ:'JWT'})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload=btoa(JSON.stringify({iss:serviceAccount.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const unsigned=`${header}.${payload}`;
  const pemBody=serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s/g,'');
  const binaryKey=Uint8Array.from(atob(pemBody),c=>c.charCodeAt(0));
  const cryptoKey=await crypto.subtle.importKey('pkcs8',binaryKey.buffer,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signatureBuffer=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',cryptoKey,new TextEncoder().encode(unsigned));
  const signature=btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt=`${unsigned}.${signature}`;
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`});
  const tokenData=await tokenResponse.json();if(!tokenResponse.ok)throw new Error(tokenData.error_description||'Google token request failed');return tokenData.access_token;
}
