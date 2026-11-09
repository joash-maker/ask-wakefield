import assert from 'node:assert/strict';
import { scopeConversation, mentionsPreviousAnswer } from '../lib/conversation-scope.js';
import { stripInternalProcessLeakage } from '../api/chat.js';

const weekendAnswer = `This weekend is a cracking time to visit Wakefield, with Light Up Wakefield in the city centre.

Light Up Wakefield (Wakefield City Centre, Friday 13 to Saturday 14 November, 5pm to 9pm)
My Eco Baby CIC Christmas Festival (WX Wakefield Exchange, Sunday 15 November)
Wakefield Museum runs free craft activities every Saturday. The Hepworth Wakefield is free for district residents.`;

const convo = (...turns) => turns.map((content, i) => ({ role: i % 2 ? 'assistant' : 'user', content }));

// 1. The reported bug: naming an event from the last answer keeps the conversation.
{
  const msgs = convo('What free things can we do in Wakefield this weekend?', weekendAnswer, 'Is Light Up Wakefield family-friendly?');
  const scoped = scopeConversation(msgs);
  assert.equal(scoped.messages.length, 3, 'follow-up about a listed event must keep the earlier answer');
  assert.equal(scoped.newRequest, false);
}
// Lower-case phone typing works too.
{
  const msgs = convo('What free things can we do in Wakefield this weekend?', weekendAnswer, 'is light up wakefield ok for kids');
  assert.equal(scopeConversation(msgs).messages.length, 3);
}
{
  const msgs = convo('What free things can we do in Wakefield this weekend?', weekendAnswer, 'Is the eco baby festival suitable for a toddler?');
  assert.equal(scopeConversation(msgs).messages.length, 3);
}

// 2. A genuinely new family request still starts a fresh scope.
{
  const msgs = convo('Where can I get good coffee in the city centre?', 'Try Bakes & Coffee on Northgate or Mocca Moocha on Westgate.', 'Any soft play for kids this weekend?');
  const scoped = scopeConversation(msgs);
  assert.equal(scoped.messages.length, 1, 'unrelated new topic should drop the old one');
  assert.equal(scoped.newRequest, true);
}
// Generic overlap ("family friendly", "this weekend", "Wakefield") is not enough to count as a follow-up.
assert.equal(mentionsPreviousAnswer('Any family friendly places in Wakefield this weekend?', 'Lots of family friendly things on in Wakefield this weekend.'), false);
assert.equal(mentionsPreviousAnswer('Is Light Up Wakefield family-friendly?', weekendAnswer), true);

// 3. Citation markup and em dashes never reach the user.
{
  const leaked = 'Pick up a map. (cite index="7-7">Pick up a free trail map from the Event Hub at WX</cite> to find the installations.';
  const out = stripInternalProcessLeakage(leaked);
  assert.ok(!/cite/i.test(out), out);
  assert.ok(out.includes('Pick up a free trail map from the Event Hub at WX'));
  const tagged = stripInternalProcessLeakage('<cite index="2-1,2-3">The parade starts at 5:30pm.</cite>');
  assert.equal(tagged, 'The parade starts at 5:30pm.');
  const dashed = stripInternalProcessLeakage('This weekend is a cracking time to visit Wakefield — we\'re in the middle of Light Up Wakefield.\n— not a list item');
  assert.ok(!dashed.includes('—'), dashed);
  assert.ok(dashed.startsWith("This weekend is a cracking time to visit Wakefield, we're"));
  assert.equal(stripInternalProcessLeakage('Friday 13 – Saturday 14 November, 5pm–9pm'), 'Friday 13 – Saturday 14 November, 5pm–9pm', 'date ranges untouched');
}

console.log('conversation-scope-checks: passed (event follow-up keeps context, new topics still reset, citation tags and em dashes stripped)');
