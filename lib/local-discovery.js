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
Start with up to three relevant, supported options. For a mixed request, cover each requested category or explain which category you could not confirm. Give the organisation, area, what it actually offers, and a direct joining, enquiry or information link. Never make up a URL. A missing price should be stated simply if asked. Do not send the user away to do a search that you can perform. If an exact detail cannot be checked, say so and retain the useful supported parts. Ask at most one specific question when its answer would materially help. Do not call a negative lookup proof that no local option exists.
`;
