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

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Submit event error:', error);
    return res.status(500).json({ error: 'Server error' });
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
