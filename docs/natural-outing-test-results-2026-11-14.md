# Ask Wakefield: natural outing test branch review

14 November 2026. Draft PR #13. Production/main remains at 5df6a3f.

## Decision

The conversation changes are ready for Joash to try in a preview. This is not a claim that AW has mastered every natural conversation. Keep the PR in draft and do not merge without his review.

Independent live recovery of the HAUS post remains unproven. The HAUS hours shown in the tested conversations still come from Joash's supplied announcement. That distinction must remain visible.

## Implemented

- Interpret British clock phrases from the actual message, including half eight, quarter past seven and half six. Time-only corrections retain the purpose of the stop and the latest places.
- Preserve the outing through thanks/cheers, factual asides and additive menu questions. Keep children and seating requirements through a change of station.
- Resolve same-event source records when one source changes to an ongoing listing after the first day. Preserve the dated run supported by the other matching source, keep child sessions separate and omit past programme highlights.
- Prioritise checked event-opening announcements over ordinary branch listings. Shorter branch replies avoid morning-to-night field dumps when a closing time answers the question.
- Use a dedicated station coffee flow for Wakefield Westgate and Kirkgate, with a hard 500-metre coordinate limit. Require a dine-in flag for sit-down requests. Do not invent walking minutes, seating availability or family atmosphere.
- Run a bounded announcement search alongside branch discovery. Keep local businesses with ordinary daytime hours as research leads, not evening recommendations. Validate actual page identity, locality, dates, drink service and hours. Social posts require ownership evidence.
- Recover search prose through bounded structured extraction and actual-page reads. When the search index yields no candidates, inspect event-matching links on verified local businesses' own sites. The website crawl is capped at eight homepages and four linked pages.
- Replace the browser's 25-second abort with a 120-second request window and a progress message after 12 seconds. Clear progress on success, errors and timeout; preserve retry behaviour.

## Automated validation

All 23 repository test files pass on the final source. Added checks cover natural clocks, long refinements, actual-page quotes, source identity, expired/wrong-date evidence, social ownership, search-prose recovery, unindexed own-site announcements, ordinary-closed research leads, source failures, station ambiguity/correction, seating proof, menu continuation, acknowledgements and date-rollover duplicates. Browser VM tests cover timeout/progress cleanup and malformed responses. No physical iPhone/Safari replay is claimed.

Positive announcement cases use a deliberately fictional Willow Coffee / Lantern Weekend fixture. They prove the pipeline and safeguards, not live discovery coverage.

## Live testing and failures found

The first three live conversations contained 17 turns. They exposed a genuine date-rollover duplicate that prevented event selection, generic station answers with unsupported distance/seating claims, and later time/menu drift. Those failed runs were used to make the subsequent fixes, not counted as passing evidence.

Subsequent 17-turn and 10-turn rounds tested the revised event, station and food flows. The later round still exposed drink-purpose drift on a time-only correction. The final seven-turn event replay below verifies that correction. Final code fad3ae4 also passed the six-turn aside replay below. Its announcement scout completed with zero candidates and zero independently verified announcements in the runtime log. Positive fixture results must not be presented as live post recovery.

| Flow | Evidence | Result |
|---|---|---|
| Event, children, named venue, thanks, half eight, quarter past seven, hot chocolate | Seven live turns on 72cf623 | Passed context, time, membership and honest menu uncertainty |
| Westgate coffee with kids, correction to Kirkgate, half six | Three live turns on d57540a | Passed station change, children, dine-in evidence and 18:30 interpretation |
| Food before Light Up, hungry afterwards, half nine | Five live turns on b5661f5 | Passed phase change and 21:30 interpretation; kitchen service limits stated |
| Factual aside, bare clock phrase, return to event parking | Six live turns on final code fad3ae4 | Passed; BSL answer retained the signed outing, Half eight? resolved to HAUS at 20:30, parking stayed on Light Up |
| Independent HAUS/public-post discovery | Live search/read attempts, including final code | Not established; reviewed screenshot remains the source |

The seven-turn event replay took 11.0–24.1 seconds per request, median 12.6 seconds, as observed by the test client. This is useful evidence of current latency, not a speed guarantee. Additional research can take longer.

## Remaining limits

- Login-blocked social pages and image-only posters are not OCRed by this implementation. Do not describe it as unrestricted Instagram/Facebook scraping.
- A branch being open does not prove its counter/kitchen serves until closing. A dine-in flag does not establish that a table is free. An unverified hot-chocolate menu remains explicitly unconfirmed.
- The dedicated standalone station flow currently covers Westgate and Kirkgate. This is not a rewrite of every local-service or travel request.
- Conversational wording still uses checked templates in places. User review is needed against the intended helpful-local-friend standard.

## Final event replay

### 1. What's on this week in Wakefield?

This week runs from Monday 9 November 2026 to Sunday 15 November 2026. Here’s what’s coming up from Saturday 14 November 2026.

If you fancy an evening out, I’d start with Light Up Wakefield. Here’s what else is coming up.

Have a Dabble Masterclass: Jewellery Making
Pontefract Castle · Saturday 14 November 2026 · 10:00–15:00
[Event details](https://experiencewakefield.co.uk/event/have-a-dabble-masterclass-jewellery-making/)

Light Up Wakefield
Wakefield City Centre · Saturday 14 November 2026 · 17:00–21:00
[Event details](https://experiencewakefield.co.uk/event/light-up-wakefield/)

My Eco Baby CIC Christmas Festival
WX Wakefield Exchange · Sunday 15 November 2026 · 10:00–15:00
[Event details](https://wxwakefield.co.uk/Whats-On/Details?event=eco-baby-christmas-festival)

Longer-running listings

Pontefract Ghost Walk
The Counting House Pontefract · Ongoing until Thursday 17 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/pontefract-ghost-walk/)

Pontefract Castle Dungeon Tour
Pontefract Castle · Ongoing until Sunday 20 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/pontefract-castle-dungeon-tour/)

Makers Wonderland
The Art House · Ongoing until Wednesday 23 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/makers-wonderland/)

Villagers: Sculpting the Community
National Coal Mining Museum · Ongoing until Sunday 24 January 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/villagers-sculpting-the-community/)

Olivia Bax: Double Take
Yorkshire Sculpture Park · Ongoing until Sunday 14 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/olivia-bax-double-take/)

Modern Art and Modern Life: Highlights from Wakefield’s 20th Century Collection
The Hepworth Wakefield · Ongoing until Wednesday 31 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/modern-art-and-modern-life-highlights-from-wakefields-20th-century-collection/)

Rhythm, Dance and Everything: The Body and Performance from Hepworth to Now
The Hepworth Wakefield · Ongoing until Wednesday 31 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/rhythm-dance-and-everything/)

These are the listings I could verify, so there may be others.

### 2. Tell me about Light Up Wakefield. We are going with our children aged 7 and 4.

Light Up Wakefield runs on Saturday 14 November 2026, 17:00–21:00, at Wakefield City Centre. It’s free to attend.

You can explore the Light Trail across the city centre, from interactive artworks and striking projections to illuminated experiences. Pick up a free trail map from the Event Hub at WX Wakefield Exchange.

On Saturday 14 November, the parade starts at 5:30pm (about 30 minutes), at County Hall, Wood Street, Brook Street.

[Event details](https://experiencewakefield.co.uk/event/light-up-wakefield/)

If you fancy a break with the kids, [HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm for these event dates.

### 3. Haus?

Yes. [HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm. That’s from the dated business announcement shared with us.

### 4. Cheers!

You’re welcome.

### 5. What about half eight?

HAUS closes at 8pm, so it would be too late at 8:30pm.

### 6. Actually, quarter past seven?

At 7:15pm, you could stop for a drink with the kids.

[HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm.

### 7. And hot chocolate for the little ones?

At 7:15pm, you could stop for a drink with the kids.

[HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm.

I’ve confirmed drink options, but not hot chocolate on their current menus.

## Station correction replay

### 1. Can we sit down for a coffee near Wakefield Westgate station with the kids?

Near Wakefield Westgate station, you have a few options for a drink with the kids.

[Costa Coffee](https://maps.google.com/?cid=9740676465474189665&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (Railway Station, Unit 1 Westgate) has coffee. It’s listed open until 6pm.

[Greggs](https://maps.google.com/?cid=2525224662398947271&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (U2, Westgate Railway Station) has coffee. It’s listed open until 6pm.

[Cobblers Sandwiches & Coffee Shop](https://maps.google.com/?cid=12103951463449789079&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (103 Westgate, Wakefield WF1 1EL) has coffee. It’s listed open until 2:30pm.

These branches list dine-in service. I haven’t checked whether a table is free.

Those are branch opening hours. Drink-counter service until closing isn’t confirmed.

### 2. Actually, I meant Kirkgate station.

Near Wakefield Kirkgate station, you have a few options for a drink with the kids.

[DavidEvo Cafe](https://maps.google.com/?cid=2203390173182673779&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (Monk St, Wakefield WF1 4EL) has coffee. It’s listed open until 4pm.

[Dungeons & Donuts](https://maps.google.com/?cid=12695259933008283532&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (172 Kirkgate, Wakefield WF1 1UD) has coffee. It’s listed open until 10pm.

These branches list dine-in service. I haven’t checked whether a table is free.

Those are branch opening hours. Drink-counter service until closing isn’t confirmed.

### 3. What about at half six?

At 6:30pm, you could stop for a drink with the kids.

[Dungeons & Donuts](https://maps.google.com/?cid=12695259933008283532&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA) (172 Kirkgate, Wakefield WF1 1UD) has coffee. It’s listed open until 10pm.

These branches list dine-in service. I haven’t checked whether a table is free.

Those are branch opening hours. Drink-counter service until closing isn’t confirmed.

DavidEvo Cafe closes at 4pm, so that would be too late for that one.


## Final-code aside replay

Code: fad3ae454ef4bd939bf79733174747da7252837f. Preview: https://ask-wakefield-hpt32sepx-joash-1034s-projects.vercel.app/#assistant

### 1. What's on this week in Wakefield?

This week runs from Monday 9 November 2026 to Sunday 15 November 2026. Here’s what’s coming up from Saturday 14 November 2026.

If you fancy an evening out, I’d start with Light Up Wakefield. Here’s what else is coming up.

Have a Dabble Masterclass: Jewellery Making
Pontefract Castle · Saturday 14 November 2026 · 10:00–15:00
[Event details](https://experiencewakefield.co.uk/event/have-a-dabble-masterclass-jewellery-making/)

Light Up Wakefield
Wakefield City Centre · Saturday 14 November 2026 · 17:00–21:00
[Event details](https://experiencewakefield.co.uk/event/light-up-wakefield/)

My Eco Baby CIC Christmas Festival
WX Wakefield Exchange · Sunday 15 November 2026 · 10:00–15:00
[Event details](https://wxwakefield.co.uk/Whats-On/Details?event=eco-baby-christmas-festival)

Longer-running listings

Pontefract Ghost Walk
The Counting House Pontefract · Ongoing until Thursday 17 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/pontefract-ghost-walk/)

Pontefract Castle Dungeon Tour
Pontefract Castle · Ongoing until Sunday 20 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/pontefract-castle-dungeon-tour/)

Makers Wonderland
The Art House · Ongoing until Wednesday 23 December 2026. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/makers-wonderland/)

Villagers: Sculpting the Community
National Coal Mining Museum · Ongoing until Sunday 24 January 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/villagers-sculpting-the-community/)

Olivia Bax: Double Take
Yorkshire Sculpture Park · Ongoing until Sunday 14 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/olivia-bax-double-take/)

Modern Art and Modern Life: Highlights from Wakefield’s 20th Century Collection
The Hepworth Wakefield · Ongoing until Wednesday 31 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/modern-art-and-modern-life-highlights-from-wakefields-20th-century-collection/)

Rhythm, Dance and Everything: The Body and Performance from Hepworth to Now
The Hepworth Wakefield · Ongoing until Wednesday 31 March 2027. Check the event page for individual session dates and times.
[Event details](https://experiencewakefield.co.uk/event/rhythm-dance-and-everything/)

These are the listings I could verify, so there may be others.

### 2. Tell me about Light Up Wakefield. We are going with our children aged 7 and 4.

Light Up Wakefield runs on Saturday 14 November 2026, 17:00–21:00, at Wakefield City Centre. It’s free to attend.

You can explore the Light Trail across the city centre, from interactive artworks and striking projections to illuminated experiences. Pick up a free trail map from the Event Hub at WX Wakefield Exchange.

On Saturday 14 November, the parade starts at 5:30pm (about 30 minutes), at County Hall, Wood Street, Brook Street.

[Event details](https://experiencewakefield.co.uk/event/light-up-wakefield/)

If you fancy a break with the kids, [HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm for these event dates.

### 3. Haus?

Yes. [HAUS](https://www.instagram.com/hauswakefield/) has announced late opening until 8pm. That’s from the dated business announcement shared with us.

### 4. What does BSL stand for?

BSL stands for British Sign Language.

Is there something specific about Light Up Wakefield or another Wakefield venue you'd like to know, such as accessibility or family facilities?

### 5. Half eight?

HAUS closes at 8pm, so it would be too late at 8:30pm.

### 6. And parking for the event?

Yes. For Light Up Wakefield, the organiser lists Trinity Walk and The Ridings Shopping Centre as parking options.

WX Wakefield Exchange does not have a car park.

I haven’t checked live spaces or evening closing times.
[Official parking details](https://www.wakefield.gov.uk/roads-and-travel/parking/car-parks-across-the-district/car-parks-in-wakefield/)

[Event details](https://experiencewakefield.co.uk/event/light-up-wakefield/)

## Review status and remaining work

All 23 test files pass on final source. The immutable final-code preview is READY. Main remains 5df6a3f2ef9ddff73bec7e2e9120d197fa5acfcb. PR #13 remains draft; nothing in this test pass has been merged into production.

The conversation candidate is reviewable. The independent-announcement feature has positive fixture coverage and real search/read attempts, but no qualifying independent announcement was recovered in the final live probe. The supplied HAUS hours are still correctly labelled as reviewed evidence. Public-post availability, index coverage and image-only material remain limits; do not claim the social-discovery requirement is fully proven.
