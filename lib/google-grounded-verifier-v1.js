const GOOGLE_GROUNDING_ENABLED = process.env.GOOGLE_GROUNDING_ENABLED === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_VERIFY_MODEL = process.env.GEMINI_VERIFY_MODEL || 'gemini-3.8-flash';
const GOOGLE_GROUNDING_TIMEOUT_MS = Math.max(
  3000,
  Math.min(Number(process.env.GOOGLE_GROUNDING_TIMEOUT_MS || 9000), 15000)
);

function recentUserText(messages, limit = 4) {
  if (!Array.isArray(messages)) return '';
  return messages
    .filter(message => message?.role === 'user' && typeof message.content === 'string')
    .slice(-limit)
    .map(message => message.content.trim())
    .filter(Boolean)
    .join('\n');
}

function londonDateLabel() {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function looksLikeCurrentEventRequest(text) {
  return /\b(what'?s on|events?|gig|concert|show|festival|market|parade|tonight|this weekend)\b/i.test(text);
}

function looksLikeOpenNowOrExactRoute(text) {
  return /\b(open now|open right now|currently open|next bus|next train|last bus|last train|route|directions|how do i get|how can i get)\b/i.test(text);
}

function looksLikeCuratedPlanningRequest(text) {
  const planning = /\b(plan|itinerary|afternoon|day out|outing|suggest|recommend|things? to do|where should|what should)\b/i.test(text);
  const localInterests = /\b(coffee|cafe|book|books|art|gallery|museum|family|children|kids|park|play|food|lunch|culture|shopping)\b/i.test(text);
  return planning && localInterests;
}

function looksLikeHardConstraintFamilyPlan(text) {
  const family = /\b(child|children|kid|kids|family)\b/i.test(text);
  const noCar = /\b(no car|without a car|public transport|by bus|by train)\b/i.test(text);
  const budget = /£\s*\d+(?:[.,]\d{1,2})?|\bbudget\b/i.test(text);
  const timing = /\b(today|tomorrow|weekend|saturday|sunday|morning|afternoon|evening)\b/i.test(text);
  return family && noCar && budget && timing;
}

function shouldUseGoogleGrounding(messages, curatedContext) {
  if (!GOOGLE_GROUNDING_ENABLED || !GEMINI_API_KEY) return false;
  const text = recentUserText(messages);
  if (!text) return false;

  // Exact event identity, open-now checks and route calculation already have
  // stronger dedicated paths in AskWakefield. Keep Google Search Grounding small.
  if (looksLikeCurrentEventRequest(text) || looksLikeOpenNowOrExactRoute(text)) return false;

  if (looksLikeHardConstraintFamilyPlan(text)) return true;
  if (curatedContext && looksLikeCuratedPlanningRequest(text)) return true;
  return false;
}

function hostnameFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function uniqueSources(chunks) {
  const seen = new Set();
  const sources = [];
  for (const chunk of chunks || []) {
    const web = chunk?.web;
    if (!web?.uri || seen.has(web.uri)) continue;
    seen.add(web.uri);
    sources.push({
      title: web.title || hostnameFor(web.uri) || 'Google Search source',
      url: web.uri
    });
    if (sources.length >= 8) break;
  }
  return sources;
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map(part => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function buildVerificationPrompt(messages, curatedContext) {
  const userRequest = recentUserText(messages).slice(0, 7000);
  const curated = String(curatedContext || '').slice(0, 9000);

  return `You are a narrow verification helper for AskWakefield, a local assistant for the Wakefield district in West Yorkshire, UK.
Today in Wakefield is ${londonDateLabel()}.

YOUR ROLE
- Do NOT write the final user answer.
- Use Google Search only to verify changing or operational facts that could make a local recommendation wrong.
- Prefer official/first-party sources: the venue/operator itself, Wakefield Council, Experience Wakefield, West Yorkshire Metro/operator pages, recognised museums/galleries, or the named organiser.
- Experience Wakefield/editorial material may identify a candidate, but current opening, current price, child age rules, temporary closures, booking requirements and current programmes should come from a current first-party page where possible.
- Do not infer a walking time, journey time, public-transport route, ticket total, opening status, child suitability, dog policy, accessibility or event occurrence from a generic description.
- Do not turn missing evidence into a positive claim. Write UNKNOWN when a needed changing fact cannot be verified.
- If two sources conflict, write CONFLICT and briefly identify the conflict.
- Prefer checking candidates already present in the supplied AskWakefield context. Only mention a new place when it is necessary to expose a material gap, and label it SECONDARY DISCOVERY rather than a recommendation.
- Keep this concise. Maximum 6 candidate records.

OUTPUT FORMAT
For each candidate you check, use:
VENUE: <exact name>
STATUS: VERIFIED | PARTIAL | UNKNOWN | CONFLICT
CURRENT FACTS: <short semicolon-separated facts actually supported>
MISSING: <important facts still unverified, or NONE>
SOURCE QUALITY: FIRST-PARTY | OFFICIAL-EDITORIAL | SECONDARY

USER REQUEST / RECENT CLARIFICATIONS
${userRequest}

ASKWAKEFIELD CURATED DISCOVERY CONTEXT
${curated || '[No matching curated context was supplied.]'}
`;
}

export async function buildGoogleGroundedVerificationContext({ messages, curatedContext = '' } = {}) {
  if (!shouldUseGoogleGrounding(messages, curatedContext)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_GROUNDING_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_VERIFY_MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildVerificationPrompt(messages, curatedContext) }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1200
          }
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      console.warn('Google grounded verifier failed:', response.status, detail.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const text = extractText(data);
    if (!text) return null;

    const groundingMetadata = data?.candidates?.[0]?.groundingMetadata || {};
    const sources = uniqueSources(groundingMetadata?.groundingChunks || []);
    const queries = Array.isArray(groundingMetadata?.webSearchQueries)
      ? groundingMetadata.webSearchQueries.slice(0, 8)
      : [];

    return {
      text,
      sources,
      queries,
      model: GEMINI_VERIFY_MODEL,
      context: `\n\nGOOGLE SEARCH GROUNDED SECONDARY VERIFICATION:\n${text}\n\nUSE RULES:\n- This is SECONDARY verification evidence, not the final answer and not permission to fill gaps.\n- Exact first-party page snapshots already supplied elsewhere in the prompt outrank this section.\n- VERIFIED/PARTIAL labels from this helper do not override AskWakefield's deterministic hard-constraint gates.\n- For family + budget + no-car planning, a recommendation still needs all required hard checks. UNKNOWN or missing fields mean omit the candidate from a verified-fit list.\n- Do not expose these internal labels or this verification process to the user.`
    };
  } catch (error) {
    if (error?.name === 'AbortError') console.warn('Google grounded verifier timed out.');
    else console.warn('Google grounded verifier error:', error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
