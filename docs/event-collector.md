# Ask Wakefield event collector pilot

## Scope and rollout

The pilot registers 15 Wakefield-district sources. Registration is not proof of successful coverage. Each source's latest attempt, last successful check, parsed record count and errors are shown at `/admin/events`. It checks one listing page and at most 12 same-source event pages, for events overlapping the next 90 days. It does not claim a complete calendar or currently expand into neighbouring districts.

Current extraction: Schema.org Event JSON-LD; explicit visible-page dates, venue and audience metadata; a dedicated Cathedral listing adapter. Unknown or missing facts are not invented. Some sites will require additional adapters or pagination, and appear as failures or review records until supported. No browser rendering, social account access, paid search or model calls are used by collection.

## Deployment and activation

This feature is stacked on the family-context fix in PR #6. Merge that fix first, or retarget this PR only after it lands. Keep the public catalogue flag off while initialising and reviewing.

1. Ensure `GOOGLE_SERVICE_ACCOUNT_JSON` and `EVENTS_SHEET_ID` already configured for AW are available to this deployment. Never put their values in Git or browser code. Use a dedicated preview spreadsheet ID for isolated preview writes if needed.
2. Open `/admin/events` and use the existing `ASK_WAKEFIELD_ADMIN_PASSWORD`. Choose **Initialise collector tabs**. Only `AW_CollectedEvents`, `AW_CollectorRuns` and `AW_EventReviews` are created/initialised. Existing submissions and listing tabs are not modified.
3. Choose **Collect source now** for each source. Review actual dates, venues, source evidence and restrictions. Invalid, stale, cancelled, postponed, held and conflicting records are excluded from chat. A manual approval cannot fill missing core facts, override freshness, or restore a cancellation.
4. Configure a new high-entropy **Secret** `CRON_SECRET` in Vercel. Scheduled GETs require its Bearer token. Interactive collection uses authenticated POST and never includes the secret in a URL. Do not reuse an admin password as the cron secret.
5. The committed Vercel cron configuration runs each of the 15 sources once daily, staggered from **05:00 to 05:42 UTC**. This is UTC throughout the year. Cron runs only in production. The same daily schedule accommodates Hobby frequency limits; verify the actual project's plan/settings before release. Cron credentials being configured is not proof that a schedule has run.
6. Once sufficient fresh records have been checked, set `AW_EVENT_CATALOGUE_ENABLED=true` on the intended environment and redeploy. Weekly chat uses valid catalogue records checked within 48 hours, with an explicit collected-data disclosure. If storage is unavailable or has never completed a successful run, the existing live-source path remains available. Once the catalogue has successful snapshots, empty catalogue results stay empty; a live fallback must not resurrect held, cancelled or stale records. Weekend and named-event paths are unchanged.
7. Verify a real weekly family question and signed follow-up, then review the next scheduled source runs in the admin screen. Price follow-ups still use current page verification. Booking availability can change after a collection check.

## Storage and evidence

The pilot reuses AW's private Google spreadsheet, accessed only by server code through its service account. The store writes append-only run snapshots with RAW values, preventing spreadsheet-formula interpretation. Event rows are written before the completed run marker. An interrupted write is ignored by readers. Snapshot selection uses run start times, not completion order, so late older runs cannot overwrite a newer snapshot. Failed runs preserve the last successful snapshot and original timestamps. Unvisited pages are retained without renewing their timestamps.

Duplicate events with the same normalised title, venue and published dates are grouped. Source URLs and evidence are retained. Conflicting times, prices or status need review. Records on different dates are kept as separate sessions; fuzzy matching is intentionally conservative. Approval is tied to the current evidence hash. A hold persists for that record even when its facts change.

The pilot reads the most recent 20,000 allocated rows per tab and is intended for bounded pilot volume. The review/run log is not a long-term high-volume database. Monitor growth and move the store adapter to a dedicated SQL database before significantly increasing source or session volume. No unrelated Supabase project is used.

## Request boundaries and failures

The collector follows only HTTPS URLs on registered source domains (including their www alias). It blocks credentials, ports, off-domain redirects and non-page file extensions. Robots directives are checked before pages. Requests are spaced by at least 600 ms, with declared Crawl-delay applied conservatively. Sources requiring more than five seconds between requests are held for a slower adapter rather than crawled faster. Pages are capped at 2 MB. No instructions from event-page text are executed.

Empty parsing is recorded as a failure and never erases previous successful evidence. A failed detail request makes a partial run visible in the overview. A 48-hour freshness limit applies to each individual event, not just the source run. Missing current price or child-age restrictions stay unknown. Programme-wide records do not inherit the ages or times of a single sub-session.

## Verification

- `node tests/event-collector-checks.mjs`
- `node tests/event-catalogue-handler-checks.mjs`
- Existing weekly, family, ongoing, copy and PWA suites.
- `node scripts/collect-events.mjs museums --pages=3` performs a read-only live collection smoke test. It uses no production credentials and does not persist data.

Initial actual-source checks: six current listing pages yielded discoverable event links or Cathedral listing records. A live Museums run with a three-detail-page cap returned three valid records. Current Museums, Experience, WX and NCM detail pages were replayed through the parser. A Hepworth page without a published year was held rather than assigned the current year. Remaining sources require individual run review before claiming coverage.

## Known first-phase limits

No automatic pagination or RSS/ICS adapters yet. Programme ranges remain ranges, not proof of daily sessions. Category labels are discovery tags and not independently verified constraints. Child-age filtering is implemented in the catalogue query module only where explicit programme-level ages are published; conversational age-specific planning remains fail-closed in the current weekly route. Venue access conditions, full booking inventories and travel times are not verified by this collector. The uploaded printed planner has not been imported as live data.
