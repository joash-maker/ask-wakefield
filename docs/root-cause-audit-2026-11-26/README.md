# Why Ask Wakefield keeps missing sign-off

Audit date: 26 November 2026. Baseline application commit: `f76ae938767fa60585c80dfc4f530b7cf844f834`.

**Release assessment: blocked by backend acceptance failures.** The 35 existing regression scripts pass, but a new 20-case contract audit fails eight cases on that same application logic. Passing individual regressions has been treated as stronger evidence of overall readiness than it is.

The new audit uses the real request handler with simulated providers and controlled model fault injection. It is not a live user failure rate, and its deliberately invented model answer must not be presented as an actual production model observation.

## 1. The failure boundary is inconsistent

A user can reach a fact-bound coffee renderer with one wording and the general model path with a near-equivalent wording. The latter can merge a source list independently from the factual claims in the response. A non-empty source list is not proof that those sources support each claim.

Reproduced with the existing/default-off legacy validator configuration:

| Question after rainy-day and city-centre parking turns | Result |
| --- | --- |
| Somewhere for coffee and hot chocolate nearby? | Checked renderer, correctly withholds an unsupported drink match |
| Can we get coffee and hot chocolate nearby? | General model path accepts the injected unlisted café claim |
| Where could we get coffee and hot chocolate nearby? | Same unsupported claim escapes |
| Coffee and a hot chocolate nearby? | Same unsupported claim escapes |
| Something for coffee and hot chocolate nearby? | Same unsupported claim escapes |

The injected text says an **Unlisted Fixture Cafe** is open until **23:00** and serves hot chocolate. The emitted source instead names **Known Fixture Coffee Shop**. These fixtures are deliberately different. There is no evidence for the injected venue, closing time or drink claim, yet the application releases it with `verification: primary`.

This directly reproduces the class of source/body mismatch Joash reported. The audit does not establish which text a real model would generate on each attempt; it establishes that the application lacks an invariant that rejects such text.

Evidence: `scripts/audit-chat-contracts.mjs`, `contract-matrix.json`, `api/chat.js` general-response source merge and validator switches, and `lib/coffee-discovery.js` phrase-dependent routing.

## 2. Intent and conversational state have multiple owners

The request is interpreted by early handlers, `scopeConversation`, `classifyRequest`, weekly/day follow-up parsers, coffee and outing detectors, and the general response builder. They do not all consume a single canonical interpretation of the user's needs, exclusions and date constraints.

Some paths return before the main classification. Some reconstruct context from recent text. Others use signed state. `buildResponseState` still creates a version-1 state with constraints containing only `time`, whereas newer handlers construct version-2 states with event, indoor, coffee or outing constraints. Changing paths can therefore lose previously supplied requirements.

The signed state codec also manually copies selected fields in multiple places. The earlier music-category loss was one example of metadata disappearing at a boundary even though the source record contained it.

New reproductions after week → Saturday:

| Follow-up | Failure |
| --- | --- |
| What about live bands? | Leaves the bounded follow-up path and loses Saturday |
| Anything musical? | Leaves that path; the injected unrelated answer can escape |
| What about music in the evening? | Keeps Saturday but returns a 13:00–15:00 event |
| No music, what else? | Applies music-only, reversing the user's exclusion |

The first two are routing/context defects. The latter two are constraint interpretation defects in a deterministic path. Additional model verification alone cannot repair both classes.

## 3. Local facts are not consistently joined to a canonical entity

The project has a curated place table, Google Places results, collected events, selected event cards, page extraction results and signed compact state. Each uses a different subset of identifiers, names and fields.

A controlled identity probe found that `Bob & Berts Wakefield` does not reach the hot-chocolate menu check, whereas the curated spelling `Bob & Berts, Trinity Walk` does. The join is exact name equality. The menu response in that probe is synthetic; this is evidence of a joining defect, not confirmation of either branch's real menu.

The real Nostell duplicate showed the same wider issue: an organiser's single occurrence and an aggregator's range/session record did not initially share an identity. The recent fix handles that known alias and verified occurrence pattern, but it does not establish one entity/occurrence system for every source.

The effect can go in either direction: unsupported substitution through the model path, or an overly cautious no-match when the correct place cannot be joined to its evidence.

## 4. Tone is generated in several different places

The baseline `api/chat.js` has 6,388 lines, 218 named function definitions and a 1,087-line request handler with 48 `return res.status(...)` branches. Its system prompt contains about 7,509 words. Size alone is not proof of a defect, but it makes the number of interacting paths concrete.

The prompt already asks for conversational British English and minimal caveats. Yet Haus, rainy-day and coffee replies are also written directly in separate JavaScript templates. Altering the system prompt cannot change strings such as 'named coffee-shop record' or 'checked listings'.

Structured paths consequently sound rigid while general model paths can sound natural but make unsupported claims. A shared presentation layer needs to receive approved facts and specific unknowns from the same answer contract.

## 5. The test process has been measuring regression survival, not release acceptance

The existing tests contain valuable checks. They prevented several known bugs from returning. However:

- 23 of the 35 files replace `fetch`; 17 contain clock-freezing code. That is appropriate for deterministic tests, but does not demonstrate current provider content, deployment settings or live model behaviour.
- Many cases use the precise wording that prompted a fix. The new paraphrase matrix demonstrates uncovered routes immediately adjacent to passing examples.
- The new menu fixture from the earlier repair uses a name that exactly matches the curated record, so it did not expose the provider-name join failure.
- A test named for a day-level music refinement did not prove weekly → Saturday → music or all nearby phrasings.
- HTTP 200 and a successful build do not establish semantic correctness. The earlier live scrutiny already recorded successful HTTP responses alongside wrong event identities.

Before this audit, `package.json` had no test commands and the checkout had no `.github/workflows` directory. The baseline commit's combined GitHub status reported a single successful Vercel deployment context. External CI configuration and branch-protection requirements were not established by this audit; the workflow-list API was unavailable through the connector.

The important direct proof is reproducible: all 35 old scripts pass while the new acceptance check fails.

## 6. Versions and environments complicate diagnosis

PR 13 was created on 14 November and remains draft. Its fixes are in preview deployments. The latest production deployment observed in the Vercel records points to `5df6a3f2ef9ddff73bec7e2e9120d197fa5acfcb`, the 14 November main-branch build.

This is consistent with the instruction not to merge before Joash's review. It is not an explanation for all the failures: the new eight-case failure set occurs on the latest preview application logic too.

Different pinned preview links represent different commits. The application previously returned the same `X-AskWakefield-Build: v18-core-2026-10-01.1` marker regardless of those commits, so that header did not identify which fix set was running.

## Changes made in this audit

1. Added `scripts/audit-chat-contracts.mjs`, a repeatable 20-case paraphrase/constraint/fault-injection audit, including the independent provider-name joining probe.
2. Added `scripts/run-tests.mjs` and a single full command: `npm test`. It runs the existing regressions and the contract audit. It currently exits **1**, correctly reporting 35 passing scripts and one failing acceptance-audit script, whose matrix contains eight failures.
3. Added separate `npm run test:regression` and `npm run test:contracts` commands. A regression-only success is explicitly labelled as incomplete acceptance evidence.
4. Added an `X-AskWakefield-Commit` header using the deployment's Git SHA when provided, or an explicit build SHA override. Local/unconfigured environments say `local`. The historical build marker remains for compatibility.
5. Saved the matrix and runner results with this report.

No routing, recommendation or evidence-enforcement fix is claimed by these diagnostic changes. No production merge, environment-secret change, temporary sharing link, new email or real submission was made. The new npm command is not automatically a required GitHub/Vercel release gate; CI/required-check integration remains work to do.

## The repair that follows from the evidence

Work in a bounded migration, beginning with the three high-traffic journeys already under test: event discovery/refinement, place/drink discovery and named-venue follow-ups.

1. **One interpreted request and one state reducer.** Represent topic, selected entity, date/day, time-of-day, area, party, positive requirements and explicit exclusions once. Apply each turn to that state. A detector must not independently discard Saturday or reverse 'no music'. Unclear changes should produce one clarification.
2. **One evidence-bound answer plan.** Resolve canonical places and dated event occurrences through provider adapters. Carry source, checked time and the specific supported fields. Generate names, hours, prices and menu claims from that plan. Unsupported fields remain unknown in every route.
3. **One final acceptance boundary.** Every answer, including general-model fallbacks and early handlers, must satisfy the same membership, source and constraint rules. If a free-text writer adds an unapproved fact, use the fact-bound reply or withhold that claim. A list of links and an optional second model are not substitutes for this boundary.
4. **One conversational presentation layer.** Keep the approved names, dates and links stable while expressing them naturally. Specific uncertainty is short and local to the decision. Suggestions respect all retained requirements.
5. **One frozen release candidate and required acceptance check.** Run the full command, provider-shaped/captured-source tests, semantic paraphrases, state round trips, negation, time constraints and fault injection. Then run representative live conversations on that exact SHA, compare rendered facts to their evidence, and complete the device checks. A ready Vercel deployment is build evidence only.

This addresses the causes demonstrated here. More individual phrase exceptions would leave the same failure boundary in place.

## Reproduce

```sh
npm test
npm run test:contracts
```

Expected current result: failure, with the known eight failing cases described in `contract-matrix.json`.

```sh
npm run test:regression
```

Expected current result: 35 passing regression scripts, explicitly not full sign-off.
