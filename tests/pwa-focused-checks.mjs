// Focused checks for the PWA fixes.
// These exercise the decision logic; they do not run in a browser or on a device.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

// 1. Offline check is before state changes
const sendStart = index.indexOf('function sendMessage(override)');
const offlineCheck = index.indexOf('if (!navigator.onLine)', sendStart);
const isSendingSet = index.indexOf('isSending = true', sendStart);
const historyPush = index.indexOf("chatHistory.push({ role: 'user'", sendStart);
const thinking = index.indexOf('Thinking...', sendStart);
assert.ok(offlineCheck > sendStart, 'offline check present in sendMessage');
assert.ok(offlineCheck < isSendingSet, 'offline check before isSending = true');
assert.ok(offlineCheck < historyPush, 'offline check before chatHistory push');
assert.ok(offlineCheck < thinking, 'offline check before Thinking bubble');

// 2. Cache cleanup only touches our prefix
assert.match(sw, /key\.startsWith\('ask-wakefield-shell-'\)/);
assert.doesNotMatch(sw, /keys\.filter\(\(key\) => key !== CACHE_NAME\)/);

// 3. API and non-GET still bypassed
assert.match(sw, /if \(req\.method !== 'GET'\) return;/);
assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)\) return;/);

// 4. Notice positioning is adjustable
assert.match(index, /--pwa-notice-bottom/);

// 5. Delayed install guidance rechecks online and standalone
const iosBlock = index.slice(index.indexOf('var isIos ='));
assert.match(iosBlock, /if \(!navigator\.onLine\) return;/);
assert.match(iosBlock, /if \(isStandaloneMode\(\)\) return;/);

// 6. Simulated offline send decision (extracted logic)
function decideSend({ text, isSending, onLine }) {
  if (!text || isSending) return 'ignore';
  if (!onLine) return 'offline-notice-only';
  return 'send';
}
assert.equal(decideSend({ text: 'bins', isSending: false, onLine: false }), 'offline-notice-only');
assert.equal(decideSend({ text: 'bins', isSending: false, onLine: true }), 'send');
assert.equal(decideSend({ text: '', isSending: false, onLine: false }), 'ignore');

// 7. Simulated cache filter
function cachesToDelete(keys, current) {
  return keys.filter((key) => key.startsWith('ask-wakefield-shell-') && key !== current);
}
const current = 'ask-wakefield-shell-v1';
const keys = ['ask-wakefield-shell-v0', 'other-app-cache', 'ask-wakefield-shell-v1', 'analytics'];
assert.deepEqual(cachesToDelete(keys, current), ['ask-wakefield-shell-v0']);

console.log('pwa-focused-checks: all passed');
