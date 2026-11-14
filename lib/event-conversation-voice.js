// Compose conversational replies from checked fields only. The voice layer
// cannot add recommendations about quality, live availability or suitability.
const sentence = text => String(text || '').trim().replace(/[.!]+$/, '') + '.';
export function programmeConversation(items, window = {}) {
  if(window.from)items=items.filter(item=>{
    const published=item.match(/^[^:]+:\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+[A-Za-z]+)(?:\s+(\d{4}))?\s+·/i);
    if(!published)return true;
    const parsed=new Date(published[1]+' '+(published[2]||window.year||window.from.slice(0,4))+' 12:00:00 GMT');
    return Number.isNaN(+parsed)||parsed.toISOString().slice(0,10)>=window.from;
  });
  const ordered = [...items.filter(item => !/^[^:]+: .+ · /.test(item)), ...items.filter(item => /^[^:]+: .+ · /.test(item))];
  return ordered.map(item => {
    const match = item.match(/^([^:]+): (.+)$/);
    if (!match || !match[2].includes(' · ')) return item.replace(/^Visitors can /, 'You can ');
    const [date, time, location] = match[2].split(' · ');
    const name = /^parade$/i.test(match[1]) ? 'The parade' : /^light switch-on$/i.test(match[1]) ? 'The light switch-on' : match[1];
    return sentence(`On ${date}, ${name[0].toLowerCase() + name.slice(1)} starts${time ? ' at ' + time.replace(/\(last approx ([^)]+)\)/i, '(about $1)') : ''}${location ? ', at ' + location.replace(/\s*>\s*/g, ', ') : ''}`);
  }).join('\n\n');
}
export function parkingConversation(title, items) {
  const descriptions = items.map(text => {
    const match = text.match(/^(?:There is (?:also )?parking available|Parking is available) at (.+?)\.?$/i);
    if (match) return `For ${title}, the organiser lists ${match[1].replace(/\.$/, '')} as parking options.`;
    return text.replace(/^Please note\s+/i, '');
  });
  const affirmative = items.some(text => /\bparking (?:is )?available at\b/i.test(text));
  return (affirmative ? 'Yes. ' : '') + descriptions.join('\n\n') + '\n\nI haven’t checked live spaces or evening closing times.';
}
