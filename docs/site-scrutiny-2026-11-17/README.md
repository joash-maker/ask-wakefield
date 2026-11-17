# Scrutiny fixes and verification, 17 November 2026

The reported code defects are repaired on `test/natural-outing-conversations`. This is not a claim of perfection, a production release or complete operational sign-off. Main remains unchanged. The 16 November report records the original failures and remains historical evidence.

## Repairs

| Finding | Change | Evidence |
| --- | --- | --- |
| False event-form success | Require 2xx and `ok:true`, handle malformed/null JSON, HTTP rejection, timeout and network failure, retain details for retry | Actual page callback executed with controlled XHR |
| Invalid event inputs and missing consent | Real civil dates, ordered dates and same-day clocks, email, allowed category, string/type/length checks, server timestamp, enforced and recorded consent | Actual API sanitiser and mocked handler tests |
| Submission saves and mail conflated | Record receipt identity and notification outcomes. Report provider acceptance separately from inbox delivery. Fail closed on failed saves | Both handlers exercised with controlled OAuth/Sheets/Resend responses, including provider 503 and retry |
| Submission retry/abuse handling | Bounded external requests, 60-second function budgets, per-process rate limits and concurrent retry guard, persisted recent-receipt lookup | Concurrent retry and existing durable receipt fixtures, 429 check |
| Combined event clocks | Parse explicit date/start/end session rows, retain them in collected records and signed chat state, render the selected date's own clock | Weekly → Friday → time follow-up replay. The real downloaded market page parsed into 20 Nov 19:00–22:00, 21/22/28/29 Nov 10:00–16:00 |
| Named Haus lost | Resolve canonical Haus record, preserve named-hours context, fail conservatively when its hours source is unavailable | Named venue, hours outage, topic change and constrained request fixtures |
| Invented library address | Route location questions to reviewed Wakefield One, Burton Street, WF1 2DD record | Canonical navigation assertion |
| Coffee/hot chocolate inference | Require separate published-menu evidence for hot chocolate, not a Places coffee flag | Conjunctive requirement and unknown-menu fixtures |
| Legacy widget | Embed maintained chat in a titled iframe inside a keyboard-accessible native dialog. Remove obsolete endpoint, duplicated chat implementation and inaccessible div pills | Controlled browser conversation, current greeting/six starter buttons, Escape and restored launcher focus. Modal/frame lifecycle test |
| Social hostname deduplication | Compare full canonical account/page paths | Different Facebook clubs remain distinct, exact account query variants deduplicate |
| False directory filters | Unknown age/day stays unknown, expand weekday ranges, separate paid lessons from free trials, fix performing-arts token | Actual inline helpers executed against reported failures |
| Directory handoff | Carry area/activity/age/day/cost in a structured request and retain those requirements in signed state | Browser Music + Under 5 + Monday + Free → chat, with no claimed exact match. Handler fixture confirms retained fields |
| Inaccessible event form | Associated labels, validity/error text, alert summary, invalid-field attributes and first-invalid focus | Browser exposed zero unlabelled data inputs and focused eventName with eight invalid fields. Static label checks |
| Stale directory claims | Explicit September snapshot notice, dated waiting-list language, provider reconfirmation | Browser rendering and source inspection. Source records themselves have not all been refreshed |
| Preview/catalogue mismatch | Confirmed catalogue flag was production-only or scoped to a different preview branch. Added `AW_EVENT_CATALOGUE_ENABLED=true` only for this test branch's previews | Vercel environment metadata read and branch-scoped update. Production configuration unchanged |

## Verification scope

- Regression results are in `regressions.json`. The suite includes every shipped starter onclick, follow-up callback errors/races, signed state, date/day continuity, event catalogue and fallback paths, requirements, source failures, outing plans, PWA behaviour and the new scrutiny fixtures.
- All 13 root HTML pages and 30 inline scripts parsed, as did inline onclick callbacks. Widget source/lifecycle and form labels were checked.
- Desktop browser used actual edited files on the supported local preview, with the real chat handler and external network calls deliberately disabled. It exercised event-form empty validation, widget opening, rainy-day → city-centre parking continuity, Escape/focus restoration, directory filters and directory-to-chat handoff.
- Browser testing found the first handoff version still fell into general answering. The dedicated structured handoff route fixed that. The final browser response retained all five filter fields and did not claim an exact session.
- Browser evidence: [fixed directory handoff](../site-scrutiny-2026-11-16/fixed-directory-handoff.jpg).
- No real submission records, email messages or moderation writes were created by these controlled tests.

## Remaining release checks

1. Run fresh protected deployed-preview API conversations after the new deployment. Its catalogue flag now matches production's path, but that alone is not runtime proof. The earlier approved 15-minute link was revoked. No new access link was created during this pass.
2. Test a real saved submission, receipt columns and actual inbox delivery using a designated test recipient and disposable data. Mocked provider acceptance is not delivery proof. Failed notifications are recorded and logged, but there is no automatic mail retry worker.
3. Test the widget from a genuinely separate HTTPS website against the deployed app. Local browser testing used a host-page fixture and the maintained iframe, not a separate production origin. No API CORS policy was broadened.
4. Refresh the remaining dated activity sources before treating September schedules, prices or waiting lists as current. The site now makes their age explicit.
5. Physical mobile/Safari, screen-reader, installation/offline runtime and measured performance checks remain unperformed. Desktop labels and keyboard behaviour are not WCAG certification.
6. Retry/rate locks are per process and receipt reads are durable, but Sheets append is not an atomic distributed claim. Simultaneous requests on separate cold instances can still race. A distributed transactional store is required before claiming exactly-once submissions or distributed rate enforcement.

New session facts participate in collected-record hashes, so changed session evidence can invalidate an older manual approval. Recollect and review as usual. Ambiguous end-before-start summary clocks are withheld, not reinterpreted as overnight sessions.


## Fresh deployed run after Joash approved access and supplied a recipient

17 November, deployment `dpl_ERqY6q9TyFJKJYLx3DmbwsL4B4Fo`, application commit `1909a569d3f47e5e3bff7725787ca3e0e9b0486f`.

- 20 conversations, 33 live API turns, including all 12 shipped starter actions. All HTTP 200. This is transport success, not 33 content passes. See `fresh-preview-results.json`.
- The preview now actually returned `weekly-catalogue-v1`, confirming the catalogue path at runtime.
- 34 route and invalid-input/auth checks. All 25 static responses with a corresponding local file matched the reviewed source. Non-POST admin requests returned 405, empty submissions 400 and unauthenticated listing-admin POST 401. A mistaken probe of a nonexistent `/api/event-review` route was excluded from the site inventory.
- Named Haus and its Tuesday hours, rainy-day/city-centre parking continuity, coffee/hot-chocolate evidence, library address, allergy uncertainty and Monday music continuity behaved conservatively.
- Four further defects were found and fixed: the broad services pill matched the library shortcut, a named event-time question lost the weekly Friday filter, an activity `Any more?` escaped hard requirements, and an existing catalogue row exposed `Dates for the diary` as an event. Dedicated regressions now cover these. The full 32-file suite passes.
- One live event submission labelled `AW QA TEST DO NOT PUBLISH 20261117T161156Z` saved successfully. The provider accepted both submitter and operator notification requests. Inbox delivery remains unconfirmed. Initial same-origin access redirects were corrected in the test client before the successful application request. No real public event was represented by this disposable record.
- The test recipient address and temporary access secret are deliberately omitted from committed evidence.
