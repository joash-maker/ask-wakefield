# General coffee discovery review, 15 November 2026

Joash’s replay showed a different reliability gap from the selected-event flow: the general food/coffee answer named venues and descriptive claims absent from its sources. The follow-up invented exact addresses and Sunday closing times, labelled the result open now without being asked, and repeated unrelated source chips.

## Change

Broad coffee discovery now renders a short list directly from checked Places records. Names, addresses, service flags and source links come from the same selected records. It requests explicit coffee and food-service flags rather than inferring them from a category. An unknown service is not a match. The reply does not invent quality, atmosphere, menus, seating, branch addresses or opening times.

Wakefield on its own remains district-wide and is labelled as such. Wakefield city now resolves to Wakefield city centre. City-centre results must have coordinates within 1,300 metres of the checked city-centre anchor and must not carry an outlying-town address. Missing anchor/coordinates produce no verified city match. This is a geographic inclusion check, not a walking-distance claim.

A signed discovery context retains the area and the IDs already shown. More/others requests exclude those IDs from the fresh batch. With no new verified results, the answer says so without claiming the list is exhaustive. Hours are displayed only when requested, using the matching weekday field. Open-now requests require a positive current open flag. General coffee discovery does not silently turn into an open-now question.

Specialised constraints and existing event, station and brunch-planning flows retain their existing routes. This change does not establish independent discovery of HAUS announcements, hot chocolate service, kitchen closing, table availability or quality rankings.

## Local checks

All 24 test files pass, including the new coffee-discovery handler suite. The suite covers Joash’s two prompts, exact reply/source membership, removal of tracking parameters, city geography, missing coordinates, unknown service flags, permanently closed branches, more pagination, signed area retention, explicitly requested open-now status, Sunday hours and provider failure. No broad prose model is called in these tests.

The first regression run caught an overly broad trigger intercepting an existing named brunch/coffee-plan refinement. The trigger was narrowed and the full suite then passed. These are fixture checks. Live preview results are recorded below separately after verification.

An initial five-turn live preview replay on `f83ab8d` confirmed reply/source membership, no unsolicited hours on the original prompts, city scope and non-repeating more results. Reviewing the final hours reply exposed a continuity defect: it rediscovered a new shortlist rather than keeping the branches referred to by their. The branch-reference filter was added with a handler assertion. Final live verification is recorded below after the correction.

## Final live preview verification

Code commit: `fed54132e644cdd00a1e5bbbc854bb5f3bc44955`. Preview: https://ask-wakefield-8abxiptto-joash-1034s-projects.vercel.app/#assistant

Five live API turns passed. Every displayed branch had an exactly matching source/name/address. The first two prompts had no unsolicited opening-time claims. Both more requests returned new IDs, the city area persisted, and the final their-hours reply kept exactly the branches from the open-now answer. Request durations: 11.8s, 9.7s, 9.5s, 13.1s, 9.7s. These checks verify the response and source membership, not independent physical inspection of the businesses.

**You:** Where can I get good food or coffee in Wakefield?

**Ask Wakefield:**

Here are some checked listings in the Wakefield district:

[KRA:FT Wakefield](https://maps.google.com/?cid=16028907495929564211) (14 Wood St, Wakefield WF1 2ED) lists coffee and food.

[Wired Whippet Coffee](https://maps.google.com/?cid=13134901753707743454) (53a The Grn, Ossett WF5 0AL) lists coffee.

[Caffe Capri - Horbury](https://maps.google.com/?cid=15133674457134902985) (8 Cluntergate, Horbury, Wakefield WF4 5AG) lists coffee and food.

[Lush bakery and co cafe](https://maps.google.com/?cid=17932692079788129530) (198 Castleford Rd, Normanton WF6 1PY) lists coffee and food.

[Starbucks Coffee](https://maps.google.com/?cid=17278803304797261811) (Colorado Way, Castleford WF10 4SB) lists coffee and food.

These cover the district. I can narrow this to Wakefield city centre or another town.

**You:** I'm sure there's more coffee shops around Wakefield city

**Ask Wakefield:**

Here are some more checked listings in Wakefield city centre:

[Muffin Break](https://maps.google.com/?cid=11031049509611050436) (5 Teall Way, Wakefield WF1 1QL) lists coffee and food.

[Caffé Nero](https://maps.google.com/?cid=1791576903444015398) (Trinity Walk, Wakefield WF1 1QS) lists coffee and food.

[Breakfast Wakefield](https://maps.google.com/?cid=9305433822055472508) (9 Westmorland St, Wakefield WF1 1PJ) lists coffee and food.

[FTCOT Diner](https://maps.google.com/?cid=1151485251956132804) (5-7 Westmorland St, Wakefield WF1 1PN) lists coffee and food.

[Bob & Berts Wakefield](https://maps.google.com/?cid=6315806315118672009) (Unit 29, Trinity Walk Shopping Centre, Wakefield WF1 1QU) lists coffee and food.

**You:** Any more?

**Ask Wakefield:**

Here are some more checked listings in Wakefield city centre:

[The Tea Tree Cafe](https://maps.google.com/?cid=2455422706967758963) (Northgate, Wakefield WF1 1HG) lists coffee.

[Grind Coffee Lounge & Kitchen](https://maps.google.com/?cid=16246282161212525632) (18 Northgate, Wakefield WF1 1HE) lists coffee and food.

[Starbucks](https://maps.google.com/?cid=10317375240288585044) (Trinity Walk, Wakefield WF1 1QW) lists coffee and food.

[Little Lotus Wakefield](https://maps.google.com/?cid=7096299394968890583) (U37, Trinity Walk Shopping Centre, Market Walk, Wakefield WF1 1QS) lists coffee and food.

[Costa Coffee](https://maps.google.com/?cid=7812808874385425797) (15 Northgate, Wakefield WF1 1HD) lists coffee and food.

**You:** Which coffee shops are open now in Wakefield city centre?

**Ask Wakefield:**

Here are some checked listings in Wakefield city centre, listed open now:

[Muffin Break](https://maps.google.com/?cid=11031049509611050436) (5 Teall Way, Wakefield WF1 1QL) lists coffee and food. Sunday: 9:00 AM – 4:00 PM.

[Caffé Nero](https://maps.google.com/?cid=1791576903444015398) (Trinity Walk, Wakefield WF1 1QS) lists coffee and food. Sunday: 8:00 AM – 5:30 PM.

[FTCOT Diner](https://maps.google.com/?cid=1151485251956132804) (5-7 Westmorland St, Wakefield WF1 1PN) lists coffee and food. Sunday: 8:30 AM – 3:00 PM.

[Bob & Berts Wakefield](https://maps.google.com/?cid=6315806315118672009) (Unit 29, Trinity Walk Shopping Centre, Wakefield WF1 1QU) lists coffee and food. Sunday: 9:00 AM – 6:00 PM.

[Grind Coffee Lounge & Kitchen](https://maps.google.com/?cid=16246282161212525632) (18 Northgate, Wakefield WF1 1HE) lists coffee and food. Sunday: 9:00 AM – 4:00 PM.

Those are branch hours. Counter and kitchen service times aren’t confirmed.

**You:** What are their Sunday opening hours?

**Ask Wakefield:**

Here are some checked listings in Wakefield city centre:

[Muffin Break](https://maps.google.com/?cid=11031049509611050436) (5 Teall Way, Wakefield WF1 1QL) lists coffee and food. Sunday: 9:00 AM – 4:00 PM.

[Caffé Nero](https://maps.google.com/?cid=1791576903444015398) (Trinity Walk, Wakefield WF1 1QS) lists coffee and food. Sunday: 8:00 AM – 5:30 PM.

[FTCOT Diner](https://maps.google.com/?cid=1151485251956132804) (5-7 Westmorland St, Wakefield WF1 1PN) lists coffee and food. Sunday: 8:30 AM – 3:00 PM.

[Bob & Berts Wakefield](https://maps.google.com/?cid=6315806315118672009) (Unit 29, Trinity Walk Shopping Centre, Wakefield WF1 1QU) lists coffee and food. Sunday: 9:00 AM – 6:00 PM.

[Grind Coffee Lounge & Kitchen](https://maps.google.com/?cid=16246282161212525632) (18 Northgate, Wakefield WF1 1HE) lists coffee and food. Sunday: 9:00 AM – 4:00 PM.

Those are branch hours. Counter and kitchen service times aren’t confirmed.
