import {submissionFetch,submissionAllowed,submissionOnce,submissionKey,validCivilDate,notificationSummary} from '../lib/submission-guard.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const data=sanitiseSubmission(req.body);if(!data)return res.status(400).json({error:'Check the required fields, consent and event dates'});
 if(!submissionAllowed(req)){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please wait a minute before submitting again'});}
 if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON||!process.env.EVENTS_SHEET_ID)return res.status(503).json({error:'Submission service unavailable'});
 const key=submissionKey(data);
 try{
  const result=await submissionOnce('event:'+key,async()=>{
   const token=await getAccessToken(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON));
   const root=`https://sheets.googleapis.com/v4/spreadsheets/${process.env.EVENTS_SHEET_ID}/values/`;
   // The original 15 columns retain their order. New metadata follows them.
   const headers=await submissionFetch(root+'Sheet1!P1:S1?valueInputOption=RAW',{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[['Consent','Submission ID','Submitter notification','Operator notification']]})});if(!headers.ok)throw new Error('Could not record submission metadata');
   const prior=await submissionFetch(root+'Sheet1!A2:S',{headers:{Authorization:`Bearer ${token}`}});
   if(!prior.ok)throw new Error('Could not check submission receipts');
   const rows=(await prior.json()).values||[];
   const existing=rows.find(row=>row[16]===key && Date.now()-Date.parse(row[0])>=0 && Date.now()-Date.parse(row[0])<900000);
   if(existing)return {ok:true,duplicate:true,notification:{submitter:existing[17]||'pending',operator:existing[18]||'pending'}};
   const values=[data.timestamp,data.eventName,data.eventType,data.startDate,data.endDate,data.startTime,data.endTime,data.venue,data.description,data.ticketPrice,data.eventUrl,data.submitterName,data.submitterEmail,data.organisation,'New',data.consent,key,'pending','pending'].map(sheetSafe);
   const saved=await submissionFetch(root+'Sheet1!A:S:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[values]})});
   if(!saved.ok)throw new Error('Could not save event');
   const receipt=await saved.json();const notification=await sendEmails(data);
   const row=receipt.updates?.updatedRange?.match(/!(?:\$)?A(?:\$)?(\d+)/)?.[1];
   if(row){try{const status=await submissionFetch(root+`Sheet1!R${row}:S${row}?valueInputOption=RAW`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[[notification.submitter,notification.operator]]})});if(!status.ok)console.error('Event receipt notification status not recorded');}catch{console.error('Event receipt notification status not recorded');}}
   return {ok:true,notification};
  });
  return res.status(200).json(result);
 }catch(error){console.error('Event submission failed:',error.message);return res.status(503).json({error:'Could not confirm receipt. Please retry with the same details or contact us.'});}
}

function cleanText(value, max = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function safeHttpUrl(value) {
  const raw = cleanText(value, 500);
  if (!raw || raw === 'Not provided') return '';
  try {
    const url = new URL(raw);
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.toString() : '';
  } catch {
    return '';
  }
}

export function sanitiseSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if(['eventName','eventType','startDate','venue','description','submitterName','submitterEmail'].some(k=>typeof input[k]!=='string'))return null;
  const limits={eventName:160,eventType:80,startDate:20,endDate:20,startTime:20,endTime:20,venue:220,description:1800,ticketPrice:100,eventUrl:500,submitterName:120,submitterEmail:254,organisation:160};
  if(Object.entries(limits).some(([key,max])=>input[key]!=null&&(typeof input[key]!=='string'||input[key].length>max)))return null;
  const out = {
    timestamp: new Date().toISOString(),
    consent: input.consent === 'Yes' ? 'Yes' : 'No',
    eventName: cleanText(input.eventName, 160),
    eventType: cleanText(input.eventType, 80),
    startDate: cleanText(input.startDate, 20),
    endDate: cleanText(input.endDate, 20) || 'Single day',
    startTime: cleanText(input.startTime, 20) || 'Not specified',
    endTime: cleanText(input.endTime, 20) || 'Not specified',
    venue: cleanText(input.venue, 220),
    description: cleanText(input.description, 1800),
    ticketPrice: cleanText(input.ticketPrice, 100) || 'Not specified',
    eventUrl: safeHttpUrl(input.eventUrl) || 'Not provided',
    submitterName: cleanText(input.submitterName, 120),
    submitterEmail: cleanText(input.submitterEmail, 254).toLowerCase(),
    organisation: cleanText(input.organisation, 160) || 'Not specified'
  };

  if(input.eventUrl && input.eventUrl!=='Not provided' && !safeHttpUrl(input.eventUrl))return null;
  const clock=v=>['Not specified','TBC'].includes(v)||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if(!clock(out.startTime)||!clock(out.endTime))return null;
  if(out.endDate==='Single day'&&/^\d/.test(out.startTime)&&/^\d/.test(out.endTime)&&out.endTime<out.startTime)return null;
  if (out.consent !== 'Yes' || !validCivilDate(out.startDate) || (out.endDate !== 'Single day' && (!validCivilDate(out.endDate) || out.endDate < out.startDate))) return null;
  if (!['Arts & Culture','Music & Live Performance','Food & Drink','Family & Children','Sports & Fitness','Community & Charity','Markets & Shopping','Business & Networking','Festivals & Celebrations','Other'].includes(out.eventType)) return null;
  if (!out.eventName || !out.eventType || !out.startDate || !out.venue || !out.description || !out.submitterName || !validEmail(out.submitterEmail)) return null;
  return out;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sheetSafe(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export async function sendEmails(data) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return notificationSummary([]);

  const e = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, escapeHtml(v)]));
  const safeEventUrl = safeHttpUrl(data.eventUrl);

  const dateFormatted = data.startDate
    ? new Date(data.startDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : 'Date TBC';

  // Email 1 — Confirmation to submitter
  const confirmationHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-top:3px solid #e61c5d;">
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111;margin:0 0 20px;">Thank you for your submission.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">We've received your event listing for <strong style="color:#111;">${e.eventName}</strong> on ${dateFormatted} at ${e.venue}.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">Our team will review it within 48 hours. If it's a good fit for the Wakefield district, we'll add it to Ask Wakefield and drop you a note to let you know it's live.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 32px;">In the meantime, feel free to try Ask Wakefield at <a href="https://askwakefield.co.uk" style="color:#e61c5d;">askwakefield.co.uk</a>.</p>
      <p style="font-size:14px;color:#999;border-top:1px solid #eee;padding-top:20px;margin:0;">Ask Wakefield · Independent AI assistant for the Wakefield district<br/>Built by <a href="https://mediahubink.com" style="color:#e61c5d;">Mediahubink</a></p>
    </div>`;

  // Email 2 — Notification to Joash
  const notificationHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#1c1c1e;color:#e8e8f0;border-top:3px solid #e61c5d;">
      <p style="font-size:18px;color:#e61c5d;margin:0 0 20px;font-weight:600;">New Event Submission — Ask Wakefield</p>
      <p style="margin:0 0 8px;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Event</span><br/><strong>${e.eventName}</strong> (${e.eventType})</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Date</span><br/>${dateFormatted}${data.endDate && data.endDate !== 'Single day' ? ' — ' + data.endDate : ''}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Venue</span><br/>${e.venue}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Description</span><br/>${e.description}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Price</span><br/>${e.ticketPrice}</p>
      ${safeEventUrl ? `<p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">URL</span><br/><a href="${escapeHtml(safeEventUrl)}" style="color:#e61c5d;">${escapeHtml(safeEventUrl)}</a></p>` : ''}
      <p style="margin:16px 0 8px;border-top:1px solid #333;padding-top:16px;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Submitted by</span><br/>${e.submitterName} · <a href="mailto:${e.submitterEmail}" style="color:#e61c5d;">${e.submitterEmail}</a></p>
      ${data.organisation && data.organisation !== 'Not specified' ? `<p style="margin:4px 0;color:#aaa;">${e.organisation}</p>` : ''}
    </div>`;

  const emails = [
    {
      from: 'Ask Wakefield <hello@mediahubink.com>',
      to: data.submitterEmail,
      subject: `Event received: ${e.eventName}`,
      html: confirmationHtml
    },
    {
      from: 'Ask Wakefield <hello@mediahubink.com>',
      to: 'hello@mediahubink.com',
      subject: `New event submission: ${e.eventName}`,
      html: notificationHtml
    }
  ];

  const outcomes=[];
  for (const email of emails) {
    try {
      const response=await submissionFetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email)
      });
      outcomes.push(response.ok?'accepted':'failed');
      if(!response.ok)console.error('Event notification provider rejected request:',response.status);
    } catch (e) {
      outcomes.push('failed');console.error('Event notification request failed');
    }
  }
  return notificationSummary(outcomes);
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsigned = `${header}.${payload}`;

  // Sign with private key using Web Crypto
  const privateKey = serviceAccount.private_key;
  const pemBody = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsigned)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsigned}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await submissionFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  if(!tokenResponse.ok || !tokenData.access_token)throw new Error('Submission authentication failed');
  return tokenData.access_token;
}
