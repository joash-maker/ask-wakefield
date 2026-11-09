import { isLeisureDiscovery } from './event-request-policy.js';
// Keep a request and its refinements together. Drop prior topics before any
// detector, retrieval or answer handler sees the conversation.
export function requestTopic(text) {
  const q = String(text || '');
  if (isLeisureDiscovery(q)) return 'events';
  if (/\b(?:what(?:['’]s| is)\s+on|events?|gigs?|festivals?|happening)\b/i.test(q)) return 'events';
  if (/\b(?:kids?|children|family|soft play|playcentres?|bowling|balling)\b/i.test(q)) return 'family';
  if (/\b(?:books?|bookshops?|art|galler(?:y|ies)|hepworth)\b/i.test(q)) return 'itinerary';
  if (/\b(?:coffee|caf[eé]|desserts?|cakes?|food|restaurants?|brunch|breakfast|bars?|pubs?|dinner|lunch|thalis?|takeaway|delivery|vegetarian|vegan|menu)\b/i.test(q)) return 'food';
  if (/\b(?:pharmacy|chemist)\b/i.test(q)) return 'pharmacy';
  if (/\b(?:bus|train|transport|route)\b/i.test(q)) return 'transport';
  return null;
}

export function isRequestRefinement(text) {
  const q = String(text || '').trim();
  return /^(?:is|are|does|do|can|will|has)\s+(?:the|that|this)\s+(?:event|festival|parade|restaurant|venue|shop|museum|gallery)\b/i.test(q)
    || /\b(?:ages?|aged)\b[^.!?]{0,30}\d|\b(?:kids?|children)\b[^.!?]{0,40}\d+\s+(?:and|&)\s+\d+/i.test(q)
    || /^(?:yes|no|thanks|thank you|oh[ ,]+yes|same|different|another|instead|from\b|near\b|starting\b|start\b|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\d{1,2}(?::\d{2})?\s*(?:am|pm)|about\s+\d|stay\b|books are fine\b)/i.test(q)
    || /\b(?:those|them|these|what about|how about|slot|fit in|there|too|closer|nearby|in case it rains)\b/i.test(q)
    || /^(?:any others|any more|anything else|more options|what are (?:the )?(?:typical )?opening hours|what time|how much|which are free|hepworth|kraft)[?.!\s]*$/i.test(q);
}

// Words that don't identify anything on their own, so sharing them with the
// previous answer isn't evidence that the user is asking about it.
const GENERIC_WORDS = new Set(('a an the and or but of to in on at for from with by is are was be it its this that these those '
  + 'what whats when where which who how why can could would should do does did any some there here near nearby '
  + 'wakefield district city centre town today tonight tomorrow weekend week this next saturday sunday friday monday '
  + 'tuesday wednesday thursday morning afternoon evening things thing stuff place places free good best nice open '
  + 'family friendly kids kid children child families suitable ok okay fine also too me us we you i my our').split(' '));

function words(text) {
  return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

// True when the question names something the previous answer just mentioned,
// e.g. "Is Light Up Wakefield family-friendly?" straight after a weekend list
// that included Light Up Wakefield. That's a follow-up, not a new request.
export function mentionsPreviousAnswer(question, previousAnswer) {
  const q = words(question);
  const answer = ' ' + words(previousAnswer).join(' ') + ' ';
  if (q.length < 2 || answer.trim().length === 0) return false;
  for (let n = Math.min(4, q.length); n >= 2; n--) {
    for (let i = 0; i + n <= q.length; i++) {
      const gram = q.slice(i, i + n);
      if (!gram.some(w => w.length >= 4 && !GENERIC_WORDS.has(w))) continue;
      if (answer.includes(' ' + gram.join(' ') + ' ')) return true;
    }
  }
  return false;
}

export function scopeConversation(messages) {
  let boundary = 0;
  let active = null;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role !== 'user') continue;
    const q = messages[i].content;
    let topic = requestTopic(q);
    const previous = i > 0 && messages[i - 1]?.role === 'assistant' ? messages[i - 1].content : '';
    const followsPreviousAnswer = Boolean(previous) && mentionsPreviousAnswer(q, previous);
    if (active === 'events' && topic === 'family' && /\b(?:this weekend|those|them|these|events)|^\s*(?:anything|any|something)\s+for\s+(?:kids|children|families)\s*[?.!]*$/i.test(q)
        && !/\b(?:no car|£|starting|from|playcentres?|bowling)\b/i.test(q)) topic = 'events';
    const explicit = /\b(?:i(?:['’]d| would)?\s+(?:want|like|need)|we(?:['’]d| would)?\s+(?:want|like|need)|plan (?:us|me)|recommend(?:ations?)?|suggest(?:ions?)?|looking for|where can|what(?:['’]s| is) on)\b/i.test(q);
    // A fresh explicit request wins over referring words such as "there".
    const refinement = isRequestRefinement(q) || followsPreviousAnswer;
    if (topic && ((!refinement && (topic !== active || explicit)) || (explicit && topic !== active && !followsPreviousAnswer))) {
      boundary = i;
      active = topic;
    } else if (!active && topic) active = topic;
  }
  return { messages: messages.slice(boundary), topic: active, newRequest: boundary === messages.length - 1 };
}
