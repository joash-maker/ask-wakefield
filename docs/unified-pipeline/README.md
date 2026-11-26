# Unified chat pipeline, 26 November 2026

PR 13 remains a draft. This change does not merge or deploy to production.

The former 6,389-line HTTP module mixed intent recognition, multiple conversation frames, provider discovery, evidence checks and response writing. A follow-up could enter a different response branch simply because its wording changed. A source list could accompany prose without proving that the named venue, hours and link belonged together. The baseline audit reproduced eight failures across twenty acceptance cases while the existing 35 test scripts passed. The original audit remains in `docs/root-cause-audit-2026-11-26`.

## Module split

| Module | Responsibility |
| --- | --- |
| `api/chat.js` | HTTP validation, rate limiting, signed transport and one call to the pipeline. No conversational response dispatch. |
| `lib/chat/pipeline.ts` | Calls the same four stages, in order, for every turn. |
| `lib/chat/intent.ts` | Extracts a typed intent delta. An optional model can interpret outing intent but cannot supply venue facts or final prose. |
| `lib/chat/state.ts` | Owns the typed state merge and persistence of retrieved result metadata. Date, category and time requirements have one owner. |
| `lib/chat/canonicalStore.ts` | Chooses data providers, hydrates selected records and applies deterministic requirements. No final prose model. |
| `lib/chat/canonicalRecords.ts` | Canonical IDs, primary URLs, provider identities and conflict handling. |
| `lib/chat/entityIdentity.ts` | Shared alias and postcode joins, including Haus and Bob & Berts. Conflicting postcodes do not join branches. |
| `lib/chat/providers/sourceReaders.js` | Read-only provider requests and parsers extracted from the old HTTP module. No old response dispatcher or system prompt. |
| `lib/chat/verifier.ts` | Resolves exact retrieved record IDs, rejects unknown or filtered IDs, ignores draft facts and URLs, and removes unsupported time fields. |
| `lib/chat/presenter.ts` | One presentation entry point for verified payloads, Markdown links and one final follow-up question. |
| `lib/chat/transport.js` | Compatible signed state tokens, explicit reset behaviour, cookies and request boundaries. |

The pipeline is:

`extractIntentAndDelta()` → `mergeConversationState()` → `queryAndFilterCanonicalRecords()` → `verifyAndRenderResponse()`

A provider can return different kinds of records, such as events, venues, official navigation guidance or reviewed local knowledge. Those records all enter the same verification and presentation boundary. Existing reviewed local guidance templates remain available as registered knowledge. They are not a fallback to unrestricted model-written local claims. Their published details do not establish live availability.

## Behaviour and evidence

- Saturday and the original date range survive category refinements, including Live bands? and Anything musical?. Explicit changes and date clearing update the same state.
- Evening events must start at or after 17:00. Missing times do not qualify. An independent positive fixture proves a 17:00 event survives while a 13:00 event and an unknown time do not.
- No music populates exclusions and removes music records. It also clears a selected music event so that a named detail cannot bypass the exclusion.
- Venue keys use the canonical name and postcode. Event keys use the canonical title, venue and published date identity. Provider IDs remain available separately. Known venue aliases share one primary URL. Field-specific Google, menu or dated-announcement evidence remains attached and appears separately when relevant.
- Provider conflicts do not silently choose the last arrival. Conflicting times become unverified rather than a guessed start or closing claim.
- A response draft can select record IDs. Its title, URL, opening hours and prose do not replace database facts. IDs outside the retrieved and filtered set cannot render.
- Null or empty opening hours remove closing-time fields. Stale raw fields cannot resurrect a missing value. Unknown event times lose unsupported start and performance claims.
- Rolled signed conversations retain the selected outing. Incomplete legacy event records require an exact-page refresh. Failure asks for a useful next step without inventing a nearby cafe or claiming that the conversation never happened.
- Named alternatives, rejected closing times, parking, before/after food stops, station corrections, accessibility and allergy requirements retain their context. Optional planner failure never selects an unrestricted prose answer.
- The response contains one follow-up question. URL query strings do not count as questions. Banned internal wording cannot pass the audited presentation contract.

## Verification

Run `npm ci --include=dev`, `npm run typecheck`, and `npm test` with Node 24.

The full command retains all 35 legacy test files, adds `tests/unified-pipeline-checks.mjs` and `tests/chat-package-checks.mjs`, and runs the 20-case audit. A successful runner reports **39 scripts passed, 0 failed**. The twenty audit results and the two successful operator-name joins are recorded in `acceptance-results.json`. All external providers in these acceptance tests are mocked. They are not a claim that real venues were checked during this run.

The new gate tests inject an unknown record ID, a filtered-out ID, forged hours and URL on a valid ID, duplicate IDs, malformed selections, stale raw time fields and an empty hours object. Additional cases cover canonical aliases, conflicting postcodes and event times, persisted date clearing, positive evening matching and music exclusions after a selected event.

`.github/workflows/chat-contracts.yml` runs type checking and the full suite on pull requests and this draft branch. Its report artifact supports review. Whether that hosted workflow has run must be checked on the published commit.

## Intentional legacy assertion migrations

No legacy test file or factual exclusion was removed. A few assertions depended on the previous architecture or the old public contract:

| Assertion | Updated contract |
| --- | --- |
| Provider ordinal in a public ID | The same original provider ordinal in `providerIds`, alongside the canonical public ID. |
| Wakefield city vs city centre state label | One normalised city-centre value. |
| Separate outing companion response labels | The shared outing-food presentation path. Existing hours, menu, date, source and continuity checks remain. |
| Freshness boilerplate in the reply | Exact catalogue verification and checked timestamp, with banned internal wording excluded. |
| Two source chips for a venue with distinct primary and fact evidence | Primary venue URL plus actual Google/menu or dated-announcement URLs. Exact source membership remains checked. |
| Optional planner disabled but old prose fallback returns 502 | Deterministic clarification returns 200 with no invented parking claim and no model call. |
| Historical build identifier | `unified-v1-2026-11-26`, plus the deployment commit header. |
| One fixed empty-state sentence | Same date, category and source exclusions, allowing the shared natural wording. |

## Release limits

This is backend contract validation. It does not replace a deployed preview replay, current-source availability checks or physical phone/Safari testing. Earlier desktop viewport checks and submission email confirmation remain separate evidence. Physical mobile/Safari keyboard and scrolling, screen-reader testing and other open site scrutiny items have not gained a pass from this refactor.

Do not infer production readiness from the offline pass or a successful Vercel build alone. Keep PR 13 unmerged for Joash's review.


## Deployment packaging incident and fix

The first unified preview, commit `06dd356`, built successfully but crashed on invocation. Runtime logs for deployment `dpl_3z4jWv2e6mxJHigMfx4zodLS2q9M` at 15:18–15:19 on 26 November show `ERR_MODULE_NOT_FOUND` for `/var/task/lib/chat/pipeline.ts`. The source-level tests did not establish that the deployed function could load those source paths.

The HTTP entry now imports generated `lib/chat/runtime.js`. `scripts/build-chat.mjs` bundles all local chat modules as Node-compatible JavaScript, leaving runtime packages and Node built-ins external. Vercel explicitly builds and includes that file. The generated file is ignored by Git and recreated from the typed source. `npm test` builds it before running any handler tests, so the legacy HTTP suites also exercise the deployable runtime.

`tests/chat-package-checks.mjs` copies only the HTTP entry and generated runtime into an isolated directory. It starts an HTTP server with type stripping disabled and no TypeScript source present. It verifies the reported weekly-events request, a signed Saturday follow-up, HTTP method rejection and malformed payload handling. This closes the source-import-only gap. The test uses offline provider fixtures. Live verification of the replacement preview is recorded separately in the PR.

The deployment-input check also tests `.vercelignore`: the existing `scripts/` rule excluded the new build script. The exception now exposes only `scripts/build-chat.mjs`, while other scripts, docs and tests remain excluded from the deployment upload.


The live package check then caught an oversized signed-state payload with real event records. Transport now encodes an explicit fact whitelist and omits bulky source-page bodies. `tests/chat-state-size-checks.mjs` verifies that ten records with large source text retain all ten IDs, dates, times, categories and evidence in a signed token within the cookie budget. The full response records remain unchanged.
