// Navigation/calendar headings are not named event occurrences.
export function genericEventTitle(title){
 const text=String(title||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 return /^(?:dates? for (?:the |your )?diary|whats on|whats happening|(?:our |upcoming |all )?events?|events? calendar|calendar|book (?:now|tickets)|more events?)$/.test(text);
}
