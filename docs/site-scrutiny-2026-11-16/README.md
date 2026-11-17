# Ask Wakefield site and chat scrutiny

Reviewed 16 November 2026, approximately 10:17–10:25 London time.

## Assessment

The public site is available and the core pages render, but this is not a clean release pass. Fix the submission failure handling, event session times, widget endpoint and directory matching before promoting the entire product as tested. The newer chat safeguards are still on the review branch, not production. Passing automated checks do not establish that the published answers are correct.

This review adds evidence and recommendations only. No application code, production configuration, submissions or emails were changed. Main remains `5df6a3f2ef9ddff73bec7e2e9120d197fa5acfcb`.

## Scope and evidence

| Check | Actual coverage | Result |
| --- | --- | --- |
| HTTP availability | 30 known routes/assets, including 13 HTML pages | Public pages and checked assets returned 200; two POST-only admin APIs correctly returned 405 to GET |
| Internal anchors | Links and fragments in fetched HTML | No broken internal fragments found |
| JavaScript parsing | 29 inline scripts plus widget and service worker | No syntax failures |
| Automated regression | All 27 existing test files on candidate code | Passed |
| Fresh public chat | 10 conversations, 26 API turns | All HTTP 200, several substantive content failures below |
| Browser | Desktop Chrome homepage, FAQ, activities filters and empty results, event form validation, accessibility page, weekly chat rendering | Rendered successfully; form accessibility and feedback problems confirmed |
| Invalid input/auth boundaries | Six empty-body POSTs | Submission/chat/follow-up APIs returned 400; admin APIs returned 401 |
| Public directory data | `/api/public-listings` | 200 with zero approved community listings |
| Status | `/api/status` | Places and state signing report configured |
| Recent runtime errors | Production error/fatal logs, 30-minute window | No matching logs returned; this does not prove the absence of content defects |
| Primary-source cross-check | Festive Market and Haus | Published chat behaviour contradicted accessible source evidence |

Production: `main`, deployment `dpl_7sADff4hY8QQfhWMjwhgWsjxdq6o`.

Candidate application code: `aa61daedef4ebcbae723803f23be099f4d262ac8`, deployment `dpl_FU2wSFrCsjsxone5M5eEY5zDx8Vw`. Later commits up to `66662ab890420bab9b32076d6fe2921cc16107ef` contain documentation only. PR 13 remains draft and unmerged.

Fresh protected-preview HTTP testing was initially blocked by automatic approval review. Joash then explicitly approved a 15-minute scoped access link. The follow-up run completed at approximately 15:06–15:11 London time and the link was revoked immediately afterwards. See the protected-preview findings below. No production access settings were changed.

## Findings in fix order

### 1. High: event submission can claim success after rejection or server failure

Location: `submit-event.html`, `xhr.onload` around line 269.

The callback hides the form and shows the success state without inspecting `xhr.status` or the response JSON. Executing the unchanged page script with a mocked XMLHttpRequest reproduced success after 400, 429 and 500 responses. A user can believe an event was received even when it was not saved.

**Fix:** require a successful status and `{ok:true}`, keep entered data on rejection, restore the button, and provide an announced error. Exercise validation rejection, rate limiting, server failure, invalid JSON, timeout and successful save separately.

Evidence: [reproduction.json](reproduction.json), [reproduce.mjs](reproduce.mjs). The event HTML fetched from production is byte-for-byte identical to the pending branch file.

### 2. High: event input validation and acknowledgement records are incomplete

Locations: `submit-event.html` around lines 230–265; `api/submit-event.js`, `sanitiseSubmission` around line 87.

The form disables native validation and checks only whether required values are non-empty. It does not use email validity. The consent checkbox gates the browser flow, but its value is not included in the payload or saved event row. The server does not enforce it. Calling the actual server sanitiser in isolation accepted an invalid date and a reversed start/end date when other required fields were present.

**Fix:** validate real civil dates and their ordering on the server, validate email/type/length constraints consistently, transmit and record the acknowledgement, and reject missing acknowledgement at the server boundary. Do not rely solely on client checks. Add basic abuse controls and idempotency to avoid duplicate appends after a slow request and retry. No distributed abuse configuration was inspected, so this is not a claim that Vercel provides no protection.

Evidence: [reproduction.json](reproduction.json). No malformed full submission was sent to the live append endpoint.

### 3. High: session clocks are combined across different event dates

Fresh public weekly and Friday answers displayed the Hepworth Festive Market as `19:00–16:00`, including one clock range shared across Friday, Saturday and Sunday. The organiser publishes Friday 20 November 19:00–22:00 and the listed weekend dates 10:00–16:00. This is a confirmed source-to-answer error, not merely unusual formatting.

**Fix:** represent occurrences as separate date/start/end records. Do not carry one pair of clocks across all dates or combine a Friday start with a weekend finish. Prefer the organiser when a district listing is ambiguous. Reject implausible ranges for review without assuming every end-before-start time is impossible, since genuine overnight events exist. Add this real source pattern as a regression fixture before releasing.

Evidence: `week-music` and `event-move` in [public-chat-results.json](public-chat-results.json). [Official organiser page](https://hepworthwakefield.org/whats-on/festive-market-2026/).

### 4. High: the published chat still has source and hard-constraint failures

The fresh public run exposed:

- Haus was not identified after city-centre coffee discovery, despite a Haus record already existing in the repository and an accessible Experience Wakefield venue page.
- Coffee suggestions and source cards did not consistently name the same businesses.
- An accessible free outing became a guarantee of a fully accessible route. A £20 follow-up assumed two people and unverified food prices, then guaranteed the total budget.
- The swimming conversation supplied centre/session claims without establishing the exact Castleford Sunday match. Some swimming statements, including accompanied preschool tuition, are supported by the Council page, so this report does not label every statement in that answer false.
- Named pharmacy follow-up widened into unrelated district results instead of resolving the requested branch.
- Event parking fell back to generic policy text without the selected event's source.
- The daily path and weekly path disagreed about verified Monday coverage: daily prose returned no scheduled listings while weekly catalogue output included a Monday Nostell occurrence. This demonstrates inconsistent retrieval, not proof that either real event is operating.

**Fix:** review and release the already-tested context/source/requirements safeguards after addressing the new blockers. Add an independent named-Haus retrieval test, a consistency test across today/this-week windows, and session-clock fixtures. Do not claim this audit reran the protected preview, or that every production finding is already fixed there.

Evidence: [public-chat-results.json](public-chat-results.json), [Haus source](https://experiencewakefield.co.uk/venue/haus/), [Council swimming source](https://www.wakefield.gov.uk/sport-and-leisure/sport-activities-and-classes/swimming/swimming-lessons/).

### 5. High: advertised embed uses a legacy endpoint that failed the access check

`for-organisations.html` advertises copying `https://askwakefield.co.uk/widget.js`. The script is available, but points to `https://wakefield-demo.mediahubink.com/api/chat`. An OPTIONS request to that exact target, using a synthetic third-party Origin, returned 503. A complete embedded conversation therefore did not pass. The current widget also has an old council-service greeting, non-button suggestion divs and no request timeout or in-flight send guard.

**Fix:** point the widget at the supported API, define explicit permitted embedding origins, update its supported-topic wording and accessible controls, and exercise a real external-origin fixture through preflight, chat response, signed state, error handling and duplicate-send prevention. A source-code origin allowlist alone cannot establish what extra origins are configured in production.

Evidence: [widget-check.json](widget-check.json). Production widget content matches the reviewed branch file. The 503 was observed at the audit time, not claimed to be a permanent outage.

### 6. Medium: approved community listings can be wrongly suppressed as duplicates

Location: `activities.html`, `curatedIndex` and `isDuplicateOfCurated`, around lines 313–334.

The index stores source hostnames and treats any matching host as a duplicate. Because the curated directory contains Facebook/Instagram links, a completely unrelated approved club with a Facebook link can be omitted. A fixture with different names and different Facebook paths reproduced this.

**Fix:** compare canonical business identity, full social account paths, or specific website entities. Never use a shared social platform hostname as a venue identifier.

There were zero approved community listings during this audit. This is a reproduced latent publishing bug, not a claim that a particular current approved club was missing.

Evidence: [directory-reproduction.json](directory-reproduction.json), [directory-repro.mjs](directory-repro.mjs).

### 7. Medium: directory filters can imply facts that are unknown or false

Locations: `activities.html`, helper functions around lines 270–305.

Reproductions using the actual helper code:

| Input | Current token/result | Problem |
| --- | --- | --- |
| £25 per lesson, free assessment | `free` | A free assessment does not make the activity free |
| Audience not specified | All four age groups | Unknown eligibility becomes a positive match |
| Mon–Thu after school | Monday and Thursday only | Tuesday/Wednesday are lost |
| Drama & performing arts | `drama` | Filter option expects `performing-arts` |
| Day varies | Matches every selected weekday | Unconfirmed days appear as date matches |

**Fix:** use explicit structured eligibility, price conditions and day arrays. Keep unknown separate from confirmed. Test both curated and approved-community records, including mixed free/paid wording and date ranges.

### 8. Medium: event form labels and invalid-input feedback are inaccessible

The browser accessibility tree exposed unnamed inputs. Read-only DOM checks confirmed seven required data fields have zero associated labels. Across the full page, 13 inputs/selects/textareas lack programmatic labels. Empty submission only changes border colour. Focus remains on Submit, with no error summary, `aria-invalid` or announced error region.

**Fix:** connect each label using `for`/`id`, add meaningful error text, an announced summary, focus the first invalid field and associate field errors with `aria-describedby`. Update the accessibility statement's known limitations while these defects remain. Do not claim WCAG conformance based on this limited review.

Evidence: [event-form.jpg](event-form.jpg), crawl field inventory and browser observations. Listing-form labels are better implemented and its empty-form flow uses native validity reporting.

### 9. Medium: the directory's chat handoff discards selected filters

In the browser, Music + Under 5 correctly produced zero matches. Its Ask Wakefield link still sent only “Help me find an activity in Wakefield”. Category and age did not pass to chat. The same generic link is hard-coded for empty results.

**Fix:** construct the chat question from the selected area, category, age, day and cost, while distinguishing unverified from confirmed matches. Verify browser → URL → chat → retained constraints.

### 10. Medium: freshness and delivery promises need operational checks

- Curated directory sources remain dated 15 September, 62 days before this audit, while cards use current-tense timetable, cost and waiting-list wording.
- Event success text promises a response by email. `sendEmails` silently returns if its key is absent and does not check HTTP failure statuses from Resend. This audit did not send an email or inspect delivery receipts.
- Submissions append into a sheet, but “saved” and “acknowledgement delivered” are not separately tracked.

**Fix:** refresh the priority source records, show a meaningful checked-at policy, and track append/notification outcomes independently. Retry or alert on failed mail delivery and make the on-screen wording reflect the actual guarantee. Measure slow submission behaviour before choosing timeouts.

## What passed

- All checked public routes and linked assets were available. Known internal fragments resolved.
- Homepage heading structure, chat input name and live conversation region exist.
- FAQ expands and directory filtering/count/empty state update in the desktop browser.
- Public directory API does not expose submitter fields in its public shape; only approved rows are selected. It was empty during the live check.
- Empty submissions are rejected at API level; unauthenticated admin POSTs are rejected.
- API status reports live Places and state signing configured, without revealing keys.
- Manifest and checked icon assets are available. Service-worker source deliberately excludes API traffic from caching and uses a network-first navigation fallback.
- The fake venue test did not fabricate opening hours, even after an explicit request to invent details.
- The allergy reply advised discussing preparation with the café and did not guarantee oat-milk drink safety. This is a behaviour observation, not medical validation.
- No website-specific console error was observed in the sampled browser logs. Chrome-extension metadata errors were excluded from site findings.

## Release order

1. Repair event submission result handling, server validation, acknowledgement record and accessible errors.
2. Fix occurrence-specific event times and approved-listing identity/filter rules. Add focused fixtures for the failures above.
3. Resolve named venue retrieval and preview/public data-path consistency, then review the existing chat fixes for release.
4. Repair or temporarily remove the advertised embed until an external-origin conversation passes.
5. Refresh directory source records and verify actual notification delivery with an explicitly designated test recipient and disposable test data.
6. Complete protected-preview live verification and real mobile/assistive-technology checks before claiming full-site sign-off.

## Limits

- This is a broad functional and source review, not an exhaustive penetration test, formal accessibility certification or legal compliance opinion.
- No physical iPhone/Safari, mobile viewport emulation, screen reader, real offline browser session, install-to-home-screen or Core Web Vitals performance run was completed. Responsive CSS was inspected, not claimed as a mobile runtime pass.
- All changing facts, external provider pages and possible user questions were not exhaustively checked.
- No successful submission/email round trip or authenticated admin moderation write was exercised. Invalid empty requests were used to test boundaries without creating records.
- Source code, controlled reproductions, public live responses and prior preview verification are explicitly separate evidence types.
- New fixes were not applied in this scrutiny pass. Application code and production remain unchanged.

To rerun the two local reproductions from the repository root: create `/tmp/aw-site-audit`, then run `node docs/site-scrutiny-2026-11-16/reproduce.mjs` and `node docs/site-scrutiny-2026-11-16/directory-repro.mjs`. They mock external effects and do not submit records or send mail.


## Protected-preview follow-up after explicit approval

Tested application commit `aa61daedef4ebcbae723803f23be099f4d262ac8` at `https://ask-wakefield-l7y3m54xw-joash-1034s-projects.vercel.app/#assistant` using the approved short-lived link. Revocation succeeded before this report was saved. No access tokens are included in the evidence.

- 10 conversations, 26 fresh preview API turns, all HTTP 200. This is transport success, not 26 content passes.
- 31 route/asset requests. Public pages and assets returned the expected content; the two POST-only admin endpoints returned 405 to GET. All 25 checked static responses with corresponding repository files matched the reviewed source exactly.
- The initial page-fetch pass lacked cookie handling and reached Vercel sign-in HTML. It was excluded from the availability results. The corrected pass used a cookie-aware opener and compared actual response content, not just HTTP status.
- Production earlier used `weekly-catalogue-v1`; this preview used `weekly-cards-v1`. They exercise different retrieval paths. Environment/data parity needs checking before promotion.
- This follow-up added HTTP/API evidence. It did not add physical-device, screen-reader, successful submission/email, or embedded-browser conversation verification.

### Behaviours confirmed improved on the preview

| Scenario | Observed behaviour |
| --- | --- |
| Today → Monday → music | Kept Monday 16 November for all turns; did not substitute later dates or infer a jazz performance from a run end |
| Severe milk allergy | Did not infer safety from oat milk or a vegan label; linked official allergen information |
| Accessible free outing + £20 total | Kept the access/free/budget requirements, asked for visit/group details and did not invent a complete guaranteed itinerary |
| Swimming → age 4 → Castleford Sunday | Kept age and area, supplied the programme source and explicitly left exact session/availability unconfirmed |
| Named Sainsbury's pharmacy | Used the named store service source and distinguished store hours from pharmacy-counter hours |
| Parking after several Friday events | Asked which event instead of giving an unverified generic parking promise |
| Generic city coffee discovery | Returned source-aligned named cards from the coffee discovery route |
| Fake café + request to invent | Refused to fabricate opening times |

These are narrower, truthful improvements. They do not establish complete outing plans, live class spaces, pharmacy walking distances or every possible conversation path.

### Preview failures that remain

1. **Haus remains unresolved.** Coffee discovery is grounded, but the short named follow-up falls back to prose generation and says it cannot verify Haus. The next hours question also fails. The existing canonical record is not being reached through this path.
2. **The Festive Market clock is still wrong.** Both the initial weekly list and Friday refinement display 19:00–16:00. Occurrence-specific times remain a release blocker on the candidate, not only production.
3. **New high-priority finding: incorrect library address.** After coffee → pothole → library, the preview located Wakefield Library at Castle Street, WF1 1PU, with no source cards. The Council's exact library page lists Wakefield One, Burton Street, WF1 2DD. Route local services through canonical records or an exact official page before asserting an address. Source: https://www.wakefield.gov.uk/libraries-and-local-history/your-local-library/wakefield-library.
4. **Coffee plus hot chocolate can still leave the grounded discovery route.** The first turn of that conversation used `primary`, asserted venue hours and drink availability, and produced the broken sentence “All of these are of each other in the city centre.” The subsequent allergy guard worked, but it does not repair the first reply. Add this conjunctive drink request to the grounded route and check the wording after sanitisation.
5. **The newly found site defects are unchanged.** Event form, activities page and widget served content matching the reviewed source. The false-success, validation/acknowledgement, labels, directory identity/filter and legacy-widget issues therefore remain in the candidate. This run did not write a submission or repeat the old endpoint's preflight check.

The preview is safer in the tested contexts but still does not meet full-site release criteria. Evidence: [fresh preview conversations](protected-preview-chat-results.json) and [content-checked preview routes](protected-preview-routes.json). This follow-up changed documentation only; no implementation fixes or merge were performed.

## Rainy-day and parking follow-up fix, 17 November

Fixed the reported rainy-day → Wakefield city-centre + ample parking refinement. The original natural rainy-day question had bypassed the indoor route because it also matched generic leisure discovery. Parking wording then displaced the activity intent. Indoor navigation now retains the city-centre/parking context, supplies Museum and Library source references plus Merchant Gate guidance, and distinguishes a parking option from live space availability. It does not assume children for a general rainy-day request. The immediate prior rainy-day question can also recover this context from a pre-fix conversation.

Added tests/rainy-parking-continuity-checks.mjs with the exact two-turn handler replay, signed state, legacy history, unrelated-topic escape and no invented space guarantee. All 28 test files passed. This is a focused fix, not closure of the other scrutiny findings. Verification used controlled handler/source tests; a fresh protected-preview chat run is not claimed here. Main remains unchanged.
