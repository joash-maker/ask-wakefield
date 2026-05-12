export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;
  if (!data || !data.eventName) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const sheetId = process.env.EVENTS_SHEET_ID;

    // Get access token using JWT
    const token = await getAccessToken(serviceAccount);

    const row = [
      data.timestamp || new Date().toISOString(),
      data.eventName,
      data.eventType,
      data.startDate,
      data.endDate,
      data.startTime,
      data.endTime,
      data.venue,
      data.description,
      data.ticketPrice,
      data.eventUrl,
      data.submitterName,
      data.submitterEmail,
      data.organisation,
      'New'
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:O:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [row] })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Sheets error:', err);
      return res.status(500).json({ error: 'Failed to write to sheet' });
    }

    // Send emails via Resend
    await sendEmails(data);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Submit event error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function sendEmails(data) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const dateFormatted = data.startDate
    ? new Date(data.startDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : 'Date TBC';

  // Email 1 — Confirmation to submitter
  const confirmationHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-top:3px solid #e61c5d;">
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#111;margin:0 0 20px;">Thank you for your submission.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">We've received your event listing for <strong style="color:#111;">${data.eventName}</strong> on ${dateFormatted} at ${data.venue}.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">Our team will review it within 48 hours. If it's a good fit for the Wakefield district, we'll add it to Ask Wakefield and drop you a note to let you know it's live.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 32px;">In the meantime, feel free to try Ask Wakefield at <a href="https://askwakefield.co.uk" style="color:#e61c5d;">askwakefield.co.uk</a>.</p>
      <p style="font-size:14px;color:#999;border-top:1px solid #eee;padding-top:20px;margin:0;">Ask Wakefield · Independent AI assistant for the Wakefield district<br/>Built by <a href="https://mediahubink.com" style="color:#e61c5d;">Mediahubink</a></p>
    </div>`;

  // Email 2 — Notification to Joash
  const notificationHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#1c1c1e;color:#e8e8f0;border-top:3px solid #e61c5d;">
      <p style="font-size:18px;color:#e61c5d;margin:0 0 20px;font-weight:600;">New Event Submission — Ask Wakefield</p>
      <p style="margin:0 0 8px;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Event</span><br/><strong>${data.eventName}</strong> (${data.eventType})</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Date</span><br/>${dateFormatted}${data.endDate && data.endDate !== 'Single day' ? ' — ' + data.endDate : ''}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Venue</span><br/>${data.venue}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Description</span><br/>${data.description}</p>
      <p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Price</span><br/>${data.ticketPrice}</p>
      ${data.eventUrl && data.eventUrl !== 'Not provided' ? `<p style="margin:8px 0;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">URL</span><br/><a href="${data.eventUrl}" style="color:#e61c5d;">${data.eventUrl}</a></p>` : ''}
      <p style="margin:16px 0 8px;border-top:1px solid #333;padding-top:16px;"><span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Submitted by</span><br/>${data.submitterName} · <a href="mailto:${data.submitterEmail}" style="color:#e61c5d;">${data.submitterEmail}</a></p>
      ${data.organisation && data.organisation !== 'Not specified' ? `<p style="margin:4px 0;color:#aaa;">${data.organisation}</p>` : ''}
    </div>`;

  const emails = [
    {
      from: 'Ask Wakefield <hello@mediahubink.com>',
      to: data.submitterEmail,
      subject: `Event received: ${data.eventName}`,
      html: confirmationHtml
    },
    {
      from: 'Ask Wakefield <hello@mediahubink.com>',
      to: 'hello@mediahubink.com',
      subject: `New event submission: ${data.eventName}`,
      html: notificationHtml
    }
  ];

  for (const email of emails) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(email)
      });
    } catch (e) {
      console.error('Email send error:', e);
    }
  }
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
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
