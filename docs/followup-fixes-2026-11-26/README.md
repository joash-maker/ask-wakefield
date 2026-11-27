# Follow-up failures reported on 26 November 2026

These reports reopen sign-off. The earlier 23 November passing samples did not cover all the wording and state transitions in these conversations.

## Changes

- Route `Somewhere for coffee and hot chocolate nearby?` and short equivalents through checked coffee discovery instead of general prose. Both drink requirements remain mandatory. Only displayed venues contribute source chips. Published menus must support hot chocolate; negated, unavailable and sold-out wording does not count. No unsupported opening hours, comfort claims or walking promises are generated. A rainy-day city-centre follow-up retains the Wakefield One/Merchant Gate context, with walking distances explicitly unverified.
- Recognise music as a weekly-list refinement. Retain Saturday, the original calendar week and other filters, including with a signed token and no earlier text history. Persist bounded category evidence in signed event cards. A verified music category can identify a performer whose event title does not contain 'music'. If no saved Saturday event matches, say so without widening to Friday or another week. A subsequent Sunday refinement keeps the music filter.
- Reconcile the known Nostell venue aliases across National Trust and Experience Wakefield when exact event titles and verified occurrence clocks agree within the requested window. Prefer the organiser's record and link. Do not combine conflicting dates, times, prices, unfamiliar venues or unproven sessions. Persistent catalogue records and review IDs remain unchanged.

## Evidence

`tests/november-followup-regressions.mjs` replays the supplied rainy-day → city-centre parking → coffee/hot-chocolate sequence and week → Saturday → music sequence through the real handler with signed state. It checks both menu-supported and missing/unavailable-menu outcomes, response/source membership, preserved dates/categories, an empty Saturday music result and later Sunday refinement. Model-generated prose is forbidden in these replays.

The duplicate test also uses the two actual Ghost Walks records from the collector's 26 November morning runs, read from `AW_CollectedEvents` without changing the spreadsheet. The National Trust record is one Saturday occurrence. The Experience Wakefield record stores a broader 21–28 November run without session clocks. A captured current public detail page supplies its explicit 28 November 17:30–19:30 session. The full handler then emits one event, using the National Trust link. Separate counterexamples preserve conflicting/unconfirmed sessions.

Café menu and music-category records in the test are controlled fixtures, not fresh recommendations or claims that those events occur on those dates. The public Nostell records/detail fixture are separately identified in `tests/fixtures/nostell-collected-2026-11-26.json` and `tests/fixtures/nostell-detail-2026-11-26.html`.

All 35 regression scripts pass, including the conversation harness and the new replay. See `regressions.json`. Syntax and whitespace checks pass. This pass does not claim a new authenticated live-preview run, physical Safari verification or full site sign-off. No new temporary preview-access link was created. PR 13 stays draft and production/main is not merged.
