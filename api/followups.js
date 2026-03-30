export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ followups: [] });

  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ followups: [] });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Based on this Q&A about Wakefield, suggest 3 short follow-up questions (under 8 words each). Return ONLY a JSON array of 3 strings, no other text.\n\nQ: ${question}\nA: ${answer.substring(0, 300)}\n\nExample format: ["Question one?", "Question two?", "Question three?"]`
        }]
      })
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').trim();
    const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    if (Array.isArray(parsed)) return res.json({ followups: parsed.slice(0, 3) });
  } catch {}

  return res.json({ followups: [] });
}
