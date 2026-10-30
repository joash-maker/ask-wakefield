// Called after conversation scoping, so unrelated older requests cannot activate discovery.
const discovery = /\b(?:hyrox|athx|gyms?|fitness (?:centres?|centers?|classes|clubs)|walking groups?|walking clubs?|rambl(?:ers?|ing)|running clubs?|run clubs?|community groups?|social groups?|volunteer(?:ing)? groups?|clubs? (?:and|or) groups?|(?:local|community|sports?|social|book|chess|cycling) clubs?)\b/i;
export function isLocalDiscoveryQuery(messages) {
  const users = messages.filter(m => m.role === 'user');
  const last = String(users.at(-1)?.content || '').trim();
  if (discovery.test(last) || /\bwhat (?:can|could) (?:i|we) join\b/i.test(last)) return true;
  // Only a short refinement inherits the active discovery request.
  const refinement = last.split(/\s+/).length <= 14 && /^(?:what about|how about|any |which |where |when |how much|what time|is it|are they|do they|can i|can we|beginner|prices?|cost|elevate|astar|thornes|those|these|that one|the first|the second|in |near |only |free|on |monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(last);
  return refinement && users.slice(0, -1).slice(-3).some(m => discovery.test(m.content));
}
export const LOCAL_DISCOVERY_GUIDANCE = `
LOCAL CLUBS AND FITNESS DISCOVERY:
Search current sources before answering this question, including short follow-ups. Discover candidates beyond the existing curated domains. Directories and Google-derived descriptions are leads, not proof of specialised services or a current timetable. Verify each claimed activity, joining route, price, age rule and session against the organisation's own website, booking page or clearly attributable official social profile. An official social profile is acceptable when there is no website. Do not turn search snippets or directory prose into first-party verification.
Keep the requested location and activity. A park is not a walking group; a cafe is not its associated gym; a parkrun is not a running club. For HYROX, distinguish published official affiliation from gyms advertising training. HYROX is fitness racing combining running and functional workout stations, not obstacle-course racing.
Resolve alternate names only when evidence connects the same organisation and address. Check whether Elevate Fitness, Elevate Hyrox Centre and the associated Elevate Social Club refer to related services; do not transfer classes, opening hours or membership between them without evidence. Do not assume they qualify for every request.
Answer briefly, normally 80-160 words. Start with up to three relevant, supported options. Do not add a fourth option as an aside. Do not volunteer opening hours, membership prices, ratings or telephone numbers unless they answer the question. For a mixed request, cover each requested category or explain which category you could not confirm. Give the organisation, area, what it actually offers, and a direct joining, enquiry or information link. Use a direct clickable Markdown link to the exact published page, not a bare domain. Never make up a URL.
For specialised services and official affiliation, cite the organisation's own page, booking page or attributable official social profile. Directory evidence alone must be labelled a possible lead, not a verified option. When only a directory supplies the hours, prices or specialised service, omit that detail and say it is not confirmed with the organisation. Do not combine a directory's unverified hours with a social profile citation to imply first-party verification. An Instagram bio supports only what that bio actually says, not an inferred class timetable. Never repeat an old review's price as current membership pricing. A missing price should be stated simply if asked. Do not send the user away to do a search that you can perform. If an exact detail cannot be checked, say so and retain the useful supported parts. Ask at most one specific question when its answer would materially help. Do not call a negative lookup proof that no local option exists.
`;

export function localDiscoveryFallback(messages) {
  const q = String(messages.filter(m => m.role === 'user').at(-1)?.content || '');
  if (/\bbeginners?\b/i.test(q)) return "I haven't confirmed which sessions welcome beginners. Check the gyms' own class or booking pages before choosing a session.";
  if (/\b(?:price|prices|cost|costs|how much)\b/i.test(q)) return "I haven't confirmed the current prices for those options. Their own membership or booking pages are the best place to check.";
  return "I couldn't check those local options just now. Please try again shortly. That doesn't mean there aren't any.";
}

// Directory citations alone must never promote a plausible claim to a verified service.
const directoryHosts = ['yorkshire.com','wellhub.com','gymsfitness.co.uk','fresha.com','yell.com','tripadvisor.co.uk','tripadvisor.com','google.com','maps.apple.com'];
export function directoryOnlyDiscovery(sources) {
  const links = sources.flatMap(source => {
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') return [];
      return [{...source, url: url.href, host: url.hostname.toLowerCase().replace(/^www\./,'')}];
    } catch { return []; }
  });
  if (!links.length || !links.every(s => directoryHosts.some(h => s.host === h || s.host.endsWith('.' + h)))) return null;
  const items = links.slice(0,3).map(s => `- [${String(s.title || 'Directory listing').replace(/[\[\]\\\r\n]/g,' ').trim()}](${s.url})`);
  return "I found these directory listings, but haven't confirmed the current classes or joining details with the organisations themselves. Treat them as leads rather than confirmed options.\n\n" + items.join('\n');
}
