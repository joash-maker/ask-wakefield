import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// Wiring checks
assert.match(index, /function messagePlainText/);
assert.match(index, /function appendCopyLink/);
assert.match(index, /copyPlainText\(messagePlainText\(bWrap\)/);
assert.match(index, /Could not copy\. Check browser permissions/);
assert.doesNotMatch(index, /navigator\.clipboard\.writeText\(reply\)/);
assert.doesNotMatch(index, /body\.innerText\.trim\(\)/);

// Pure copy of the link rule used by the page
function appendCopyLink(label, url, seen, parts) {
  const cleanLabel = String(label || '').replace(/\s+/g, ' ').trim();
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    if (cleanLabel) parts.push(cleanLabel);
    return;
  }
  if (seen.has(cleanUrl)) {
    if (cleanLabel && cleanLabel !== cleanUrl) parts.push(cleanLabel);
    return;
  }
  seen.add(cleanUrl);
  parts.push(cleanLabel && cleanLabel !== cleanUrl ? cleanLabel + ': ' + cleanUrl : cleanUrl);
}

const seen = new Set();
const parts = [];
appendCopyLink('Event details', 'https://wxwakefield.co.uk/event/beer', seen, parts);
appendCopyLink('Event details', 'https://wxwakefield.co.uk/event/beer', seen, parts);
appendCopyLink('Beer Festival — official event page', 'https://wxwakefield.co.uk/event/beer', seen, parts);
appendCopyLink('Another event', 'https://experiencewakefield.co.uk/event/2', seen, parts);
assert.equal(parts[0], 'Event details: https://wxwakefield.co.uk/event/beer');
assert.equal(parts.filter(p => p.includes('https://wxwakefield.co.uk/event/beer')).length, 1);
assert.equal(parts.at(-1), 'Another event: https://experiencewakefield.co.uk/event/2');

console.log('copy-links-checks: passed');
