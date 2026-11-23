# Release scrutiny, 23 November 2026

The first live run found problems, so the original preview was not suitable for sign-off. The fixes remain on draft PR 13. Production/main is unchanged.

## Findings and fixes

1. A daily event occupied seven entries in the weekly shortlist. Separately published occurrences now combine before shortlisting, retaining verified dates and hours for weekday follow-ups. The corrected live list restored distinct concerts, workshops and other events.
2. Tileyard's differing Saturday/Sunday hours were labelled unpublished in the weekend view, while another presentation path used the aggregate page's misleading combined clock. Both presentations now use explicit dated sessions. The corrected live answer gives Saturday 12:00–22:00 and Sunday 12:00–19:00.
3. A named Tileyard Christmas Market question fell back to the Hepworth Festive Market. A standalone Wood Street request could not resolve its verified listing. Exact named-market resolution now retains separate source/venue identities and signed focus. Wood Street's Sunday close remains 17:00; Tileyard's is 19:00. Hepworth event-start questions resolve to the event rather than a generic attraction answer.
4. Day-only cards with session arrays could lose their clock during formatting. Single-day answers now retain it. A named market's Sunday time question also retains that market's published Sunday, rather than starting a fresh district search.
5. Final copy correction removes a dangling 'that' from the Wood Street closure reply. Market programme extraction now includes published traders, street food and live music paragraphs.

## Evidence

- All 34 local regression scripts pass on the final code, including the conversation harness, expanded market checks and repeated-event shortlist checks. See `regressions.json`.
- Initial deployed run: 22 conversations, 40 turns, including every one of the 12 starter/discovery prompts and the historical failure journeys. All HTTP requests succeeded, but the semantic findings above were real failures. See `live-results.json`.
- Corrected deployed run: 6 conversations, 15 turns. All ten explicit semantic assertions pass, including distinct market identity, dated weekend clocks, Sunday close times, restored weekly variety and road-closure separation. See `corrected-live-results.json` and `corrected-assertions.json`.
- Final build gets an additional market-detail/time/parking smoke replay in `final-build-results.json`. This follows the last wording and programme extraction changes.
- 34 deployed route/auth/invalid-input checks pass. Static source bodies match the reviewed files. POST is used for the invalid event/listing submission checks and unauthenticated admin check; these do not create records or send email. See `routes.json`.
- 13 root HTML pages and 30 inline scripts parse; the local link/anchor scan found no broken targets after accounting for configured rewrites and platform-injected analytics routes. See `static-review.json`.
- Browser UI: rainy-day starter, city-centre parking follow-up, enabled send state after response, copy-chat content, new-chat reset, directory Music/Under 5/Monday/Free filtering and constraint-preserving handoff all passed. Empty event submission focused `eventName` and marked eight invalid controls. No valid submission was sent.
- Email delivery remains backed by the earlier saved-row check and Joash's 18 November confirmation that both acknowledgement and operator notification arrived. It was not repeated in this run.

## Release decision and limits

Core chat regression and deployed journey checks pass after the fixes. Full all-device/all-feature sign-off is not claimed. Joash confirmed that phone/Safari testing has not happened yet. Physical mobile keyboard/scrolling, screen-reader behaviour, installed/offline PWA operation and a separately hosted HTTPS widget remain unverified. Desktop browser checks and simulated service-worker tests do not substitute for these.

The initial run's median API response was about four seconds, with its slowest under ten seconds; this is observed request latency, not a load test or Lighthouse/Core Web Vitals assessment. No distributed exactly-once submission guarantee or automatic failed-email retry worker has been added.

Temporary preview access was explicitly approved for a 15-minute test window. Shorter links for corrected builds stayed within that window and were revoked after use. No access secret is included in these records. Keep PR 13 draft until Joash's final review; do not merge production as part of this test run.
