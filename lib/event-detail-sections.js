import { load } from 'cheerio';
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const heading = 'h1,h2,h3,h4,h5,h6';
const plain = value => clean(value).replace(/\b(?:spectacular|breathtaking|magical|unforgettable|awe inspiring|joyful|cosy)\s+/gi, '');

// Read the selected event's programme and travel sections independently. In the
// Experience Wakefield layout, Travel Information is outside postContent.
export function extractEventDetailSections(html, sourceUrl, expectedTitle) {
  const $ = load(String(html || ''));
  $('nav,header,footer,script,style,[class*="related"],[id*="related"]').remove();
  const title = clean($('h1').first().text());
  const norm = s => clean(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ');
  if (!title || norm(title) !== norm(expectedTitle)) return null;
  const own = $('section.postContent').not('.postContent--sessions').first();
  const scope = own.length ? own : $('h1').first().closest('article,main,body');
  const about = scope.find(heading).filter((_, el) => /^about$/i.test(clean($(el).text()))).first();
  const block = about.length ? about.nextUntil(heading) : scope;
  const paragraphs = about.length ? block.find('p').add(block.filter('p')) : scope.find('p');
  const programme = [];
  paragraphs.each((_, el) => {
    const text = plain($(el).text()).replace(/\s+or take a look at the online version here\.?$/i, '.');
    if (!text || text.length > 700 || /\b(?:parking|car park|visit our|for more information|promises an|returns this winter)\b/i.test(text)) return;
    if (!/\b(?:trail|maps?|artworks?|projections?|installations?|switch.on|parade|activities|workshops?|performances?|concert|exhibition|talk|tour|storytelling)\b/i.test(text)) return;
    if (programme.length < 3) programme.push(text);
  });
  const highlights = [];
  scope.find('h4').each((_, el) => {
    const h = $(el), name = clean(h.text());
    const fields = h.nextUntil(heading).filter('p').map((_, p) => clean($(p).text())).get().filter(t => /^(?:Date|Time|Location)\s*:/i.test(t));
    if (fields.length && highlights.length < 3) highlights.push(name + ': ' + fields.map(t => t.replace(/^(?:Date|Time|Location)\s*:\s*/i, '')).join(' · '));
  });
  const parking = [], links = [];
  const sections = $(heading).filter((_, el) => /^(?:car parking|car parks?|parking)$/i.test(clean($(el).text())));
  sections.each((_, el) => {
    const nodes = $(el).nextUntil(heading).filter('p,ul,ol');
    nodes.each((_, node) => {
      const text = clean($(node).text()).replace(/\bThe Riding Shopping Centre\b/g, name => clean($('body').text()).includes('The Ridings Shopping Centre') ? 'The Ridings Shopping Centre' : name);
      if (/\b(?:parking|car park)\b/i.test(text) && !/\b(?:find a full list|more information|for details)\b/i.test(text) && text.length <= 400 && parking.length < 4) parking.push(text);
      $(node).find('a[href]').each((_, a) => {
        try {
          const u = new URL($(a).attr('href'), sourceUrl), host = u.hostname.replace(/^www\./, '');
          if (u.protocol === 'https:' && !u.username && !u.password && !u.port && /parking|car-park/i.test(u.pathname)
              && (host === new URL(sourceUrl).hostname.replace(/^www\./, '') || host === 'wakefield.gov.uk')) links.push({ title:'Official parking details', url:u.href });
        } catch {}
      });
    });
  });
  // Prefer named options over a generic statement that city-centre spaces exist.
  const usefulParking = parking.length > 1 ? parking.filter(t => !/^There are numerous\b/i.test(t)) : parking;
  const extras = programme.filter(text => !highlights.some(h => text.toLowerCase().includes(h.split(':')[0].toLowerCase())));
  return { programme:[...highlights,...extras].slice(0,4).map(t => t.slice(0,550)), parking:[...new Set(usefulParking)].slice(0,3), parkingLinks:[...new Map(links.map(l => [l.url,l])).values()].slice(0,2) };
}

export function eventDetailOperation(question) {
  const q = String(question || '');
  if (/\b(?:parking|car parks?|park (?:my|our|the|a) car)\b/i.test(q)) return 'parking';
  if (/\b(?:tell me|can you tell me|could you tell me|what is|what’s|what's)\b.*\b(?:more|about|involve|happens|expect)\b|\b(?:more (?:information|details)|what (?:can we expect|does .{1,80} involve))\b/i.test(q)
      && !/\b(?:more (?:events|options|choices|places)|other|alternatives?)\b/i.test(q)) return 'details';
  return null;
}
