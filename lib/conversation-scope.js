// Keep a request and its refinements together. Drop prior topics before any
// detector, retrieval or answer handler sees the conversation.
export function requestTopic(text) {
  const q = String(text || '');
  if (/\b(?:what(?:['’]s| is)\s+on|events?|gigs?|festivals?|happening)\b/i.test(q)) return 'events';
  if (/\b(?:kids?|children|family|soft play|playcentres?|bowling|balling)\b/i.test(q)) return 'family';
  if (/\b(?:books?|bookshops?|art|galler(?:y|ies)|hepworth)\b/i.test(q)) return 'itinerary';
  if (/\b(?:coffee|caf[eé]|desserts?|cakes?|food|restaurant|brunch|breakfast|bars?|pubs?|dinner|lunch)\b/i.test(q)) return 'food';
  if (/\b(?:pharmacy|chemist)\b/i.test(q)) return 'pharmacy';
  if (/\b(?:bus|train|transport|route)\b/i.test(q)) return 'transport';
  return null;
}

export function isRequestRefinement(text) {
  const q = String(text || '').trim();
  return /\b(?:ages?|aged)\b[^.!?]{0,30}\d|\b(?:kids?|children)\b[^.!?]{0,40}\d+\s+(?:and|&)\s+\d+/i.test(q)
    || /^(?:yes|no|thanks|thank you|oh[ ,]+yes|same|different|another|instead|from\b|near\b|starting\b|start\b|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\d{1,2}(?::\d{2})?\s*(?:am|pm)|about\s+\d|stay\b|books are fine\b)/i.test(q)
    || /\b(?:those|them|these|what about|how about|slot|fit in|there|too|closer|nearby|in case it rains)\b/i.test(q)
    || /^(?:what time|how much|which are free|hepworth|kraft)[?.!\s]*$/i.test(q);
}

export function scopeConversation(messages) {
  let boundary = 0;
  let active = null;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role !== 'user') continue;
    const q = messages[i].content;
    let topic = requestTopic(q);
    if (active === 'events' && topic === 'family' && /\b(?:this weekend|those|them|these|events)|^\s*(?:anything|any|something)\s+for\s+(?:kids|children|families)\s*[?.!]*$/i.test(q)
        && !/\b(?:no car|£|starting|from|playcentres?|bowling)\b/i.test(q)) topic = 'events';
    const explicit = /\b(?:i(?:['’]d| would)?\s+(?:want|like|need)|we(?:['’]d| would)?\s+(?:want|like|need)|plan (?:us|me)|recommend(?:ations?)?|suggest(?:ions?)?|looking for|where can|what(?:['’]s| is) on)\b/i.test(q);
    // A fresh explicit request wins over referring words such as "there".
    if (topic && ((!isRequestRefinement(q) && (topic !== active || explicit)) || (explicit && topic !== active))) {
      boundary = i;
      active = topic;
    } else if (!active && topic) active = topic;
  }
  return { messages: messages.slice(boundary), topic: active, newRequest: boundary === messages.length - 1 };
}
