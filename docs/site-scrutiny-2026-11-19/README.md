# Source refresh and responsive scrutiny, 19 November 2026

This pass updates all 20 curated activity references and improves form readability at narrow widths. It continues on the test branch. Main is not merged or deployed by this work.

## Source review

All 20 linked provider pages returned HTTP 200 to a direct, bounded request on 19 November. Their published content was read individually, rather than advancing dates from response status alone. `source-review.json` records URLs, request timestamps, review scope and the resulting summaries. Search-index copies were used as references, but the direct provider responses determined the refreshed records. Dad Matters, for example, had newer coordinator and November session information than the search index.

The HTML cards and canonical activity references now carry matching summaries and the 19 November review date. The page explicitly distinguishes published programme details from live availability.

| Change | Reason |
| --- | --- |
| Added Harriers introductory membership conditions and published annual fees | Session fees alone did not describe the joining cost |
| Kept published Harriers and Performance Academy waiting lists | These were still present on the reviewed pages, without a confirmed waiting time |
| Made health-walk cost session-specific | The Council timetable contains entries where free-text wording and structured free flags disagree |
| Removed unconfirmed junior/women’s cricket and adult performance eligibility claims | The reviewed pages did not establish these assertions |
| Presented Code Club as the dated 19 November listing | One published occurrence does not establish a recurring Thursday session or exact age limits |
| Corrected Junior Gym age-band coverage | The published 11–15 range includes an 11-year-old, previously excluded by the lower directory band |
| Separated tutoring’s free assessment from tuition fees | A free assessment is not evidence of free lessons |
| Added padel parking-validation caution | Published parking conditions depend on the visit; no blanket parking promise was introduced |

No booking, place, individual eligibility or current attendance was confirmed with a provider. Programmes still require checking before visiting. Group-wide age/day/cost information remains unknown where the page did not establish it.

## Responsive checks and fixes

A local fixture loaded the actual edited pages in desktop Chromium iframes at CSS viewport widths of 320, 375, 390 and 768 pixels. This exercises media queries and responsive layout. It does not emulate an iPhone, Safari, touch input, a mobile keyboard, or screen-reader software.

- Homepage/chat, activity directory, event form and listing form: 16 width/page combinations inspected.
- No horizontal document overflow was measured in those combinations.
- The directory filters used 13px text, event form 15px and listing form 14px. Narrow-width text inputs, selectors and textareas now use 16px. A first CSS change did not override the directory selector specificity; that was corrected and rechecked.
- Directory mobile labels and review badges are more legible, with 44px minimum source/Ask link heights.
- Final measurements found no form text below 16px in the tested combinations. Measurements and the pre-change observations are in `responsive-results.json`.
- At 320px, empty event submission focused the first invalid field and displayed the announced summary. No submission was sent.
- At 375px, rainy-day → city-centre parking continuity worked using the real handler with external calls disabled. Music/under-5/Monday/free filtering retained every requirement in the handoff link.
- The widget dialog fitted inside the 375px viewport, completed a sourced library question, closed with Escape and restored launcher focus. This host-page fixture used the same local origin and is not a separate-origin HTTPS embed test.

[375px widget evidence](widget-375px.jpg).

## Email confirmation

On 18 November, Joash confirmed receiving both the submitter acknowledgement and operator submission email from the authorised live test. Together with the earlier independent saved-row readback, this closes the tested event submission/persistence/notification/delivery journey. The retained test record remains marked `QA test - do not publish`.

## Regression verification

All 33 regression files pass, including the new source/HTML parity checks and recorded viewport assertions. All 13 root HTML pages and 30 inline scripts parse. No new real submissions or emails were sent during this pass.

## Still open

Physical iPhone/Safari keyboard and scrolling behaviour, screen-reader operation, separate-origin deployed HTTPS embedding, installation/offline runtime and measured performance remain unverified. Distributed exactly-once submission handling and automatic failed-email retries are not implemented. These limits remain explicit; this pass does not claim full accessibility or all-device sign-off.
