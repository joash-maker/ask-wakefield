# Extensive chat review, 15 November 2026

Scope: all 12 homepage chat entry points, all 21 activity-page Ask links, the follow-up pills they return, and varied multi-turn questions covering dates, areas, price, family ages, station corrections, civic services, transport, allergy/access requirements, invented venues and reset behaviour. Tests cannot establish every possible question or every changing venue fact.

## Initial live evidence

33 initial live conversations (12 homepage starters and 21 activity-page links) completed at HTTP 200. HTTP success was not counted as content correctness. The replays exposed:

- Families bypassed the structured calendar and called 15–21 November this week, then described expired Light Up events.
- The Discover events prompt combined this week and this weekend, causing it to miss the structured weekly route and include the following week's events.
- Both Local services prompts were misread as property-specific bin questions.
- Parking navigation returned policy text with no actual source link.
- The broad rainy-day reply invented operational details without sources.
- The activities directory was disconnected from chat. Named programmes, padel and clubs were wrongly denied or replaced with unverified facility locations and Scout ages. Some initial clarifying questions were valid, but most substantive activity answers lacked sources.
- Generic follow-up questions were generated without checking that the chat could answer them. The preview callback also referred to an undefined progressTimer.
- New chat could accept an old in-flight reply and recover old state from its server cookie.

## Fixes under test

- All starter handlers are exercised from the actual HTML. The rainy-day button explicitly asks about children.
- Deterministic follow-up suggestions use a finite set of supported questions. Coffee supplies signed-context refinement pills directly.
- Follow-up callbacks no longer reference an unrelated timer. New chat invalidates old response callbacks. An explicit null stateToken prevents server-cookie recovery into a fresh chat.
- Free/low-cost family wording uses the structured calendar and verifies family suitability and free price. Explicit this-week wording takes priority over an incidental weekend mention.
- Local-services navigation asks which service and supplies relevant official links. No generic free-parking guarantee is made.
- Indoor starters provide source-linked visit ideas without asserting current sessions or hours. Existing detailed family itineraries retain their route.
- Activity Ask links now use the same programme source references as the directory. Source paragraphs are not promoted into programme-wide rules. A live replay exposed an out-of-scope swimming paragraph, so the excerpt feature was removed. Programme availability, age eligibility, prices and exact session matches remain unconfirmed unless the source text establishes them. Unknown current information is not evidence that a programme does not exist.
- Food and coffee conjunctive searches require both services. Acknowledgements preserve coffee context; ambiguous station choice retains children and seating.

Reproducible cases: tests/fixtures/chat-qa-entrypoints.json and tests/fixtures/chat-qa-conversations.json. The preview harness scripts/qa-chat-preview.py accepts its temporary URL/access configuration through stdin and does not persist credentials in results.

Final live results and remaining limits are appended after verification.


## Further failures found by the 84-turn conversation replay

- A rainy-day follow-up could absorb a new free-weekend query rather than switching to events.
- Next Saturday escaped the structured date path and produced garbled, partially stripped prices. It now has a one-day civil-date window and retains family/free filters.
- A paragraph from a swimming page was presented without its SEND-section context. Programme excerpt quotation was removed rather than generalising that rule to every child.
- A Cathedral-to-YSP reply invented a five-minute walk, stand number and service frequency. That route now uses the checked destination travel fact with an explicit boundary around unverified operational details.
- An access/budget itinerary invented Sunday museum opening, a fully accessible route and an expired Light Up event. It now retains the hard requirements and asks for the missing visit details before claiming a complete verified plan.
- A dietary answer inferred gluten-free suitability from cuisine; a severe-allergy follow-up listed unverified plant-milk venues. Explicit dietary evidence is required, and an allergy suitability match is not inferred from vegan or plant-based labels.
- A pharmacy question near Trinity Walk widened to other towns. The area now has a geographic anchor; named supermarket pharmacy questions use the exact branch source instead of unrelated discovery cards.

These were content failures despite HTTP 200 responses. Retests follow on the corrected build. The programme source references remain a starter directory, not proof of current spaces or complete timetable coverage.
