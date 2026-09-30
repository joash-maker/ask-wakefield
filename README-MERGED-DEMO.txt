ASK WAKEFIELD — CORE UPDATE, 30 SEPTEMBER 2026
Build marker: v18-core-2026-09-30.10

Install on the test branch first. No production deployment has been performed.
This archive contains the full site; copy these changed/new files at their exact paths:

api/chat.js                         replace
api/status.js                       add
lib/conversation-scope.js           add
lib/askwakefield-places.js           replace
lib/askwakefield-places-data.js      replace
tests/conversation-harness.mjs       replace
tests/core-request-tests.mjs         add
README-MERGED-DEMO.txt               replace

What changed
- Shared topic boundaries run before routing, retrieval and response handling.
- New requests drop prior event lists and itinerary state. Referring follow-ups retain their request.
- Friday/other weekday opening checks use the requested weekday rather than the server's current day.
- Time refinements such as 7 pm replace an earlier time.
- Evening/after-work requests use an approximate after-17:00 search window and disclose that assumption.
- Live Google Places discovery checks operational status and coffee/dessert service fields.
- Closed and wrong-day candidates are excluded; overnight opening is supported.
- If live discovery fails, researched published food options remain available with a clear snapshot label.
- Six evening food/bar records added. Unknown coffee/dessert services remain unknown.
- Repeated provider authentication/rate-limit/server failures back off for 30 seconds.
- api/status shows the build and configuration flags, never secrets.

Live data configuration
GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) must contain a working key for Places API (New).
The associated Google project needs the API enabled and billing configured.
GOOGLE_PLACES_ENABLED defaults to true; remove a false value or set true to enable discovery.
Retain STATE_SIGNING_SECRET and existing deployment settings.
The status flag reports configuration presence, not that Google has accepted the key.
Venue records and published hours are a useful fallback, not guaranteed availability or booking slots.

Checks performed
node tests/conversation-harness.mjs
node tests/core-request-tests.mjs
JavaScript syntax checks on chat, status and new conversation module.
These are offline tests with mocked external providers, not a deployed end-to-end verification.

After deployment
1. Open /api/status on the same Preview URL used for chat.
2. Confirm build is v18-core-2026-09-30.10 and livePlacesConfigured is true.
3. In one chat, run family, city itinerary, then weekend/free/start-time questions.
4. Switch to: Friday night, coffee and dessert with friends in Wakefield. Any recommendations?
5. Follow with: Around 7 pm. Check the time and topic stay attached to the dessert request.

Suggested commit
Fix shared conversation routing and live weekday recommendations

Children/event follow-up update, 30 September: published family-suitability checks use exact stored event titles and About descriptions. Filters remain attached across start-time questions. Conflicting personal-endorsement instructions removed. Indoor activity requests provide grounded museum, bowling and soft-play options. Latest changes: api/chat.js, api/status.js, lib/conversation-scope.js, lib/askwakefield-places.js, tests/conversation-harness.mjs, tests/core-request-tests.mjs, README. Build marker v18-core-2026-09-30.10.

Latest regression fix: accepts ages 7 and 4 without kids prefix, preserves Anything for kids? on the events list, and handles finish by 1 pm with travel allowance and fewer stops.

Dessert update: replace lib/askwakefield-places-data.js too. Added operator-backed Legends and Sip & Dip records, named Vanilla Bean response, station clarification and desert typo handling.

Horbury family origin now prioritises Secret Garden for indoor play, preserving origin on follow-ups. Regression covered.

Nightlife update:
Added 15 venue records, including a held Journey Lounge record with conflicting operating status. Good Fortunes already existed.
Verified venue descriptions support cocktail, beer, games, gin, music and party categories. Wood Street and Tileyard stay distinct. Named Lost Cause replies correctly locate it in Castleford.
No claims of 2026 opening dates, tonight's music, promotions, admission or live availability without current evidence.
After Dark, Icon and The Rooftop remain research candidates. A licence is not proof of current opening or a programme.
Replace the same eight files including lib/askwakefield-places-data.js.

Dining update:
Nine sourced records: Panda Mami, No Manches / San Leo's, Chopstix, Tet, Qubana, Robatary, Estabulo, Vera and Vinyl Cafe North.
Name aliases support direct questions. Chopstix conflicting operator/centre hours are disclosed. Qubana kitchen and bar hours are not conflated. Vera's late closing is not given an invented clock time. Vinyl regular weekends are closed.
Existing coffee records retained. Ratings, superlatives, live open labels, dietary guarantees, kids-eat-free promotions and 2026 launch claims were not imported.
Pemberley's and Kredens remain research candidates pending current operating/menu evidence.
Replace the same eight files, including lib/askwakefield-places-data.js. Build v18-core-2026-09-30.10.

Budget follow-up update: remembers Tenpin as selected activity, explains booking + travel + food budget, marks allocation as a spending limit rather than a quoted price. Does not assume a Trinity Walk starting point. Build v18-core-2026-09-30.10.

Weather-neutral family recommendations: indoor play is an activity choice, not an assumption of heavy rain. Explicit wet-weather backup requests remain supported. Build v18-core-2026-09-30.10.

After-4pm food fix: after-clock parsing precedes exact-clock parsing. Published fallback requires explicit coffee and dessert evidence and requested-day hours. Zero matches no longer fall into generic unsupported recommendations. Exact user wording covered in request regression. Build v18-core-2026-09-30.10.

Dessert follow-up fix: “Any others?” preserves coffee, dessert and requested hours and excludes previously shown venues. “Typical opening hours?” returns published hours for that filtered request. Covered by signed-state request regressions. Build v18-core-2026-09-30.10.
