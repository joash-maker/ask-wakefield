# Christmas market source review, 23 November 2026

Two different markets must retain separate identities and session clocks.

| Event | Location | Published sessions |
| --- | --- | --- |
| Wakefield Christmas Market | Wood Street | 11–12 December 10:00–18:00; 13 December 10:00–17:00 |
| Tileyard North Christmas Market | Tileyard North courtyard | 26–29 November, 3–6, 10–13 and 17–20 December; Thu/Fri 16:00–22:00, Sat 12:00–22:00, Sun 12:00–19:00 |

Sources checked:
- https://www.wakefield.gov.uk/wakefield-events/christmas-in-the-wakefield-district
- https://intranet.wakefield.gov.uk/your-district/christmas-market-set-to-bring-more-visitors-to-wakefield-this-december (dated 18 November 2026)
- https://experiencewakefield.co.uk/event/tileyard-north-christmas-market/
- https://wakefieldchristmasmarkets.co.uk/

The Council seasonal page omits the year. Its reviewed 2026 adapter is deliberately bounded to this edition and rejects changed dates, hours and cancellation notices. It must be reviewed again for a later edition. The Council announcement clarifies a partial Wood Street closure on 10–14 December and continued vehicle access from the former Crown Court to Cross Street. Closure dates are never event occurrences. No admission price is inferred for Wood Street. Tileyard's official sources confirm free entry. The trader's supplied social post describes attendance on 17–20 December, not the whole market run; individual stock or attendance has not been independently verified.

Added collector sources `council-christmas` and `tileyard-christmas`. The latter reads the exact detail page and its 16 published sessions, bypassing aggregate discovery limits. Catalogue installations must collect these new sources through the authenticated collector/admin flow before they appear in persistent storage. Existing catalogue review/hold decisions are not bypassed by live supplements. The live discovery fallback also reads both sources for weekly, daily and weekend requests.

Expanded signed state occurrence retention from 14 to 30 dates, matching the session-time capacity, so the final Tileyard weekend survives follow-ups. Mixed-time detail questions now list dated sessions instead of reporting an unknown clock.

Validation: all 34 regression scripts pass, including the conversation harness. Captured public source HTML fixtures test 19 sessions, separate market identities, Sunday times, Monday exclusion, closure exclusion, year expiry, cancellation, source changes, collector storage contract, weekly/weekend discovery and signed multi-turn final-Sunday answers. JavaScript syntax and diff whitespace checks pass. These are local handler/fixture tests, not a fresh live preview conversation or physical Safari test. Production remains unchanged.
