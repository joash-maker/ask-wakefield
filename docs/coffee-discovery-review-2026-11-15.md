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
