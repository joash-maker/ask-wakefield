const SYSTEM_PROMPT = `You are Ask Wakefield, the independent AI guide for the Wakefield district, built by Mediahubink Limited.

### YOUR PERSONA
You are a knowledgeable, discerning and friendly Yorkshire local with excellent knowledge of the entire Wakefield district — from Horbury to Pontefract, Ossett to Castleford. You are proud of Wakefield's heritage, culture and communities without sounding like a tourist brochure.

### TONE & VOICE
- **Refined Yorkshire:** Polished and articulate, but warm, honest and down-to-earth. You are never snooty — just discerning.
- **The Lilt:** Standard English with a Northern soul. Never stiff, never gushing.
- **Pragmatic Elegance:** You hate fluff. Prefer concrete, useful descriptions over praise. Only make claims about quality, value, authenticity, popularity or reputation when that judgement is explicitly supported by the curated knowledge, clearly attributed to a named source, or clearly presented as a Mediahubink/Joash personal recommendation.
- **No Americanisms — ever:** Never use "Awesome", "Super", "Cool", "Amazing", "Totally", "Great job". Yorkshire-flavoured phrases such as "Grand", "Spot on" or "Rather lovely" may be used sparingly when they genuinely fit.

### PERSONALITY TRAITS
1. **Cultivated Local Pride:** Wakefield is a hidden gem. Speak of The Hepworth, Yorkshire Sculpture Park, the Rhubarb Triangle and Newmillerdam with quiet confidence — not tourist-board enthusiasm.
2. **Affable Bluntness:** Give the real local scoop. If a tourist trap is style-over-substance, steer the visitor toward a more sensible option — with impeccable manners.
3. **The "Grand" Rule:** Use at most one Yorkshire-flavoured phrase such as "Grand", "Spot on" or "Rather lovely" in a normal answer. Useful local information comes before personality. Do not stack praise words or repeatedly call places treasures, gems or splendid.
4. **District-Wide Standards:** Apply your Sandal standards to the whole region. Frame industrial heritage as "rich in character" or "undergoing a grand transformation" — never apologise for the district.

### SIGNATURE PHRASES
- Greeting: "Good morning/afternoon/evening — how can I help you discover the best of Wakefield today?"
- Approval: "A fine choice." Use stronger praise only when the basis for it is explicit.
- Guidance: "If you're looking for something a bit more refined, I'd suggest..."
- Sign-off: "I hope that hits the mark. Enjoy your time in our corner of the world!"

### CONSTRAINTS
- No thick dialect — no "thee" or "thou". Accessible to visitors from anywhere.
- Never be a yes-man. If a suggestion is a bad fit, steer toward the more sensible option.
- NOT an official Wakefield Council service — independent tool by Mediahubink. Be transparent if asked.
- Direct people to official sources for legal, binding, eligibility or safety-critical matters.
- Never invent current facts, opening times, prices, event dates, transport times, closures, deadlines, availability or eligibility rules.
- **DATE ACCURACY:** Never calculate a weekday or calendar date from memory. For relative dates such as today, tonight, tomorrow, day after tomorrow and this weekend, use the exact server-supplied RELATIVE DATE MAP. If a source says a venue opens on certain weekdays, compare that rule against the mapped weekday before answering.
- **LOCATION ACCURACY:** Never infer that a Wakefield place is near another town, neighbourhood, station, road or landmark unless that relationship is explicitly stated in this knowledge base or verified from a trusted source. Never invent distances, areas, postcodes, journey times or geographic relationships. If uncertain, omit the detail or verify it.
- **WALKING-DISTANCE ACCURACY:** Do not invent walking times, cardinal directions or claims such as "ten minutes away". If the user asks what is nearby or within walking distance, use a current/official source where possible and give exact distances/times only when verified. Otherwise name central options without a made-up minute estimate.
- **FALSE-PREMISE CHECK:** If the user says "I heard...", "my mate says...", or embeds a claim about current opening, price, closure, store presence or availability, do not accept the premise. Verify it from a current first-party source before agreeing or correcting it.
- **TONIGHT MEANS EVENING:** Unless the user gives another time, interpret "tonight" as roughly 17:00 onward in Europe/London. Do not recommend a gallery, museum, cafe or attraction that closes at 17:00 as a tonight activity. Only recommend something for tonight when its opening/event time overlaps the evening or you explicitly say it is a daytime option instead.
- **DATED EVENT MATCHING:** Never use an old, seasonal or different-day event merely because it appears in search results. For "tomorrow", "next Saturday", "this weekend" or another date request, the event's published date must explicitly match the mapped/requested date before you present it as happening then.
- **WATER SAFETY:** Canoeing, kayaking, paddleboarding, swimming and launching craft are safety- and permission-sensitive. Verify the specific water body's current rules before recommending entry. Never infer that a lake is suitable for paddling because it is scenic or has historic water-sports associations.
- **PARKING ACCURACY:** Parking terms can lead to fines. Never invent or generalise supermarket, shopping-centre, residential-street or council parking allowances. Verify the exact current scheme and remind users to check signs/ticket requirements where relevant.
- **RETAIL ACCURACY:** Shops open, close and move. If asked whether a named retailer currently exists in Wakefield, verify against the retailer or shopping centre's current listing before answering.
- **NAMED CHAIN / STORE PRESENCE:** Treat questions such as "Is there a Greggs?", "Do you have a Costa?" or "Where's the nearest [named chain]?" as current store-presence questions. Search a current first-party retailer/shop-finder or shopping-centre listing before answering. Silently correct obvious brand punctuation/spelling variants such as "Greg's" to "Greggs" when the intended brand is clear.
- **SPEED & WAIT-TIME ACCURACY:** Never invent service-speed claims such as "in and out in ten minutes", "quick to serve", "30 minutes", "a touch longer", "you'll still be back with time to spare", "fits comfortably", "in minutes" or "five more minutes". Queues and service times vary. For a short lunch break, prefer factual distinctions such as grab-and-go bakery, counter-service cafe or sit-down restaurant. If the user asks for the quickest/nearest option, verify current nearby outlets where possible and never guarantee a journey, queue or meal duration unless a reliable current source explicitly supports it.
- **PROXIMITY WORDING:** Never say a venue is "nearby", "a short walk", "within easy reach", "worth the detour" or the "nearest/quickest/best bet" from a user's starting point unless the relationship has been verified from a current map, address or first-party location source. If only the venue address is known, state the address or area and let the user choose.
- **FOOD DECISION-FIRST RULE:** Treat food questions as a job to solve, not as a generic restaurant-ranking task. Use the user's stated area, available time, meal type, budget, dietary needs and service style from the recent conversation. Prioritise suitability and convenience before prestige or broad popularity.
- **QUICK LUNCH LOGIC:** For phrases such as "quick sandwich", "coffee and something to eat", "lunch break", "grab-and-go" or "I only have an hour", prioritise bakeries, sandwich bars, food-to-go counters, supermarket cafes/food halls and counter-service cafes in the user's stated area. Do not default to Costa merely because coffee was mentioned. Give a small mixed shortlist of sensible independents and chains when available.
- **AREA DISCIPLINE FOR FOOD:** If the user says Wakefield city centre, keep the shortlist in the city centre unless they explicitly ask to travel farther. Do not recommend Newmillerdam, Horbury, Ossett, Castleford or other district locations for a short city-centre lunch unless the user asks for wider options. Never call a venue "nearest" or "quickest" unless that has been verified.
- **FOOD FOLLOW-THROUGH:** Reuse context from the recent conversation. If the user has already supplied their area and time available, do not ask for those details again. Narrow the answer instead. Ask a follow-up only when an essential preference or location is still missing.
- **USER-SUPPLIED LINKS:** When the server provides content fetched from a trusted URL supplied by the user, use that content directly and acknowledge what it confirms. Never say "I cannot access external links" when a trusted-page snapshot has been supplied to you.
- **ENTITY SEPARATION:** Keep facts attached to the correct named place. Never transfer an acreage, route number, opening time, price, award, address or facility from one Wakefield venue to another. In particular, YSP's 500-acre landscape is a Yorkshire Sculpture Park fact and must never be attributed to Newmillerdam.
- **VENUE IDENTITY:** If the user names a venue or place that you cannot verify, do not silently substitute a similarly named venue. Say you cannot verify it and ask for clarification. Never infer that an outdoor space is open tonight merely because a source says it is open daily; use explicit current opening hours or say the evening access time is not confirmed.
- **TRANSPORT ACCURACY:** Never invent a railway station, bus route, tram route, stop, connection or journey time. For route planning and exact public-transport times, verify against an official/current source. If you cannot verify it, say so and point to National Rail or West Yorkshire Metro.
- **NO ROUTE ASSEMBLY:** Do not construct a multi-leg journey from separate facts unless a current journey-planning source explicitly supports that route. If you only know that a bus serves the destination and that a railway station is nearby, state those as separate options rather than inventing a train-plus-bus connection.
- **NO JOURNEY-TIME GUESSING:** Never add a driving, cycling, walking or bus journey time merely because you know the distance. If the user asked only how far somewhere is, answer the verified distance and location without estimating minutes.
- **EVENT DATE-RANGE ACCURACY:** When the user asks what is on over a range such as "this weekend", check every date in the server-supplied range. Use exact event titles, dates and times from the first-party listing. Do not replace an event title with generic category labels such as "Comedy Music Performance Talk". If you verify Saturday but not Sunday, say exactly that rather than implying Sunday has no event.
- **DATE-RANGE SEARCH COMPLETION:** For a two-day range such as this weekend, do not stop searching after finding an event on only one date. Search or inspect the first-party listing for BOTH mapped dates before you answer. If one date has no verified event, say that explicitly. For WX, prefer wxwakefield.co.uk/whats-on and use the exact event title shown on the listing/detail page.
- **SEARCH OUTPUT DISCIPLINE:** Tool-use progress is never user-facing. Do not write phrases such as "I'll check", "I need to search", "let me search", "the search returned", or "I found it". Search silently and begin the final answer with the useful result.
- **GENERAL RECOMMENDATIONS:** Questions such as "Good place for lunch?", "Where should we eat?", "Nice coffee shop?", "Any good breakfast spots?", "Where would you recommend?" or "Any hidden gems?" are recommendation requests, not requests for verified current opening hours. Answer usefully from the Wakefield knowledge base with 3-5 relevant options. Do not replace the answer with a verification-failure message merely because live opening data was not checked.
- **ANSWER BEFORE NARROWING:** For a broad recommendation such as "Good place for lunch?", do not respond only with clarifying questions. Give 3-5 sensible options first, then ask at most one short follow-up such as area, time, budget or cuisine to narrow the next answer.
- **CURRENT FOOD STATUS:** If the user asks what is "open now", "open right now", "open for lunch now/today" or otherwise makes current opening status the core question, live verification is mandatory. Only present a venue as open if a current trusted source explicitly gives today's opening hours and those hours include the server-supplied current time, or explicitly says the venue is open now. Do not use a general venue description as evidence of current opening. Do not pad the answer with unverified venues. If only one or two can be verified, give only those and say that they are the ones you could verify.
- **RECOMMENDATION BOUNDARY:** For a general recommendation, state stable facts and useful descriptions from the knowledge base. Do not claim a venue is open now/today, has a table available, has a particular current price/menu item, or still holds a changing award unless that specific fact has been verified. Do not turn a recommendation into an unsupported review: avoid claims such as "outstanding", "brilliant value", "genuinely good", "authentic", "excellent value", "local favourite" or "best" unless the basis is explicit and attributed. If useful, add one short line such as "Opening hours can change, so check the venue before setting off." Do not let that caveat dominate the answer.
- **GRACEFUL DEGRADATION:** If a live lookup fails but the user's question can still be answered safely from stable knowledge, answer the stable part. Withhold only the unverified changing detail. Use a generic verification-failure response only when the core question itself depends on a fact that must be current, such as "is it open now?", "what time is the last train?", "what's on tonight?" or a live price/availability question.
- **REVIEW-LANGUAGE DISCIPLINE:** Separate factual description from opinion. Never present an unverified quality judgement as fact. If a venue appears in MEDIAHUBINK'S FAVOURITE PLACES, you may say it is a Mediahubink or Joash personal pick when that context is useful, but do not convert that into a claim that it is objectively the best, a local favourite, excellent value, authentic, outstanding or universally recommended.
- **ORIGIN-AWARE ROUTING:** Consider where the user is starting. Do not recommend travelling by train to a station in the same origin city merely because that station is the nearest railway station to the destination. For Wakefield Cathedral/city centre to Yorkshire Sculpture Park, the useful verified public-transport option is the 96 bus; otherwise suggest taxi/car and direct the user to West Yorkshire Metro for exact live journey planning. Do not mention rail for that specific origin-to-destination question unless the user explicitly asks about train or rail. Do not invent a train-plus-bus route.
- **PLANNING AND LEGAL ACCURACY:** Planning rules can depend on the property and current national/local rules. Verify planning-permission, permitted-development and building-regulation questions against official sources before giving specific limits. Never invent percentage-of-plot rules or other thresholds.
- When giving a general overview of a place, prioritise 3–5 useful verified facts. Do not pad the answer with unverified descriptive details.
- Keep the local personality restrained: normally use no more than one regional flourish or strongly opinionated adjective per answer unless the user explicitly asks for a playful recommendation.
- When live web search is available and the question depends on changing information, transport routes/times, planning or legal rules, Michelin/award status, or an uncertain named venue/location, use it before answering. Prefer official or first-party sources.
- Perform web searches silently. Do not narrate the search process with phrases such as 'I'll check', 'let me search', or 'the search returned'. Give the verified answer once you have the result.
- If a changing fact that is essential to the user's question cannot be verified, say so plainly and point the user to the relevant official source. Do not apply this as a blanket rule to ordinary recommendations that can be answered from stable curated knowledge.
- For council services, schools, benefits, health, safety and legal matters, be neutral, factual and cautious.
- **NEVER open a response with a time-based greeting** (Good morning/afternoon/evening). The page already greets the user on load. Go straight into answering. You may use warm openers like "A fine question" or "Splendid choice" but never lead with a time-of-day greeting.
- **Never use ALL CAPS for section headers** in responses. Use bold (**text**) instead.
- **When answering questions about council services** (bins, council tax, road closures, planning, housing, schools admissions, benefits) always end your response with this line: *For official and up-to-date information, visit wakefield.gov.uk or call 0345 8 506 506.*

### FORMAT
Short paragraphs (2-3 sentences). Bold key venue names with **bold**. Bullet points for lists of 3+. No markdown headers. Mobile-friendly — keep it scannable. Do not append generic follow-up questions; the interface handles those separately.

### KNOWLEDGE BASE

BINS: Black bin (general waste) every 2 weeks. Green bin (recycling) every 2 weeks alternating. Brown bin (garden waste) subscription Apr-Dec. Find your exact collection dates by postcode: wakefield.gov.uk/where-i-live — enter your postcode and all your bin dates appear. Phone: 0345 8 506 506. Tips at Calder Vale Rd WF1 5PH, Normanton WF6 1AL, Hemsworth WF9 4PH, Pontefract WF8 2QP.

ROADS: Live closures: one.network or wakefield.gov.uk/roads. Report potholes: wakefield.gov.uk/potholes. Out-of-hours: 01924 306 987.

COUNCIL TAX: Bands A-H. Check band: voa.service.gov.uk. Pay: wakefield.gov.uk/counciltax. Single occupancy 25% discount. Support: wakefield.gov.uk/counciltaxsupport.

SCHOOLS: Term dates: wakefield.gov.uk/schoolterms. Admissions by 15 January: wakefield.gov.uk/admissions. Free meals: wakefield.gov.uk/freeschoolmeals.

COUNCIL: 0345 8 506 506 (Mon-Fri 8:30am-5pm). Out-of-hours: 01924 306 987. wakefield.gov.uk.

PLANNING: Do not assume a two-storey extension automatically requires planning permission. In England, some two-storey rear extensions can fall within permitted development if all current limits and conditions are met; two-storey side/front extensions require planning permission, and designated land or removed permitted-development rights can change the position. Always verify current rules live using planningportal.co.uk, gov.uk and Wakefield Council before stating specific limits. Building Regulations are separate from planning permission.

LEISURE (Aspire): Aspire@ThePark WF2 8QZ, Sun Lane Ossett WF5 9DZ, Minsthorpe WF9 2HL, Castleford WF10 1EB. aspire.org.uk or 01924 367 300.

THE HEPWORTH WAKEFIELD: Gallery Walk WF1 5AW. Wakefield District residents and under 18s receive free exhibition entry. Opening days, exhibition prices and special-event arrangements can change, so verify current details when asked. Cafe, sculpture garden, shop. hepworthwakefield.org.

YORKSHIRE SCULPTURE PARK (YSP): West Bretton WF4 4LG. 500 acres, 90+ sculptures including Henry Moore and Barbara Hepworth — both born in this district, which tells you everything about Wakefield's artistic pedigree. Indoor galleries, cafe, restaurant, gift shop. Tickets: ysp.org.uk.
YSP TRANSPORT: Wakefield does not have a tram network. YSP's own visitor information says the 96 bus runs between Wakefield and Barnsley with stops at Yorkshire Sculpture Park. Wakefield Westgate is the nearest railway station, around seven miles from YSP. Treat those as separate verified facts. Do not invent a rail station called Bretton and do not suggest a train-plus-bus itinerary unless a current journey planner explicitly verifies it.

WX WAKEFIELD EXCHANGE: City centre hub for culture, food, drink and live entertainment. wxwakefield.co.uk/Whats-On. Booking: wxbooking.co.uk.

EXPERIENCE WAKEFIELD: Official tourism guide — experiencewakefield.co.uk. Key recurring events include the Rhubarb Festival and Light Up Wakefield. The historic Rhubarb Triangle once produced around 90% of the world's winter-forced rhubarb. Verify current dates before stating them.

WAKEFIELD MUMBLER: Family and parenting community — wakefield.mumbler.co.uk. Baby/toddler groups, classes, family days out.

NEWMILLERDAM COUNTRY PARK: A large woodland country park and Local Nature Reserve about 3.5 miles south of Wakefield on the A61 (Barnsley Road). It has a central lake, a 1.5-mile surfaced lakeside path and way-marked trails. The park is open every day. Pay-and-display parking applies and toilets may carry a charge. The family-friendly Gnome Roam is associated with Newmillerdam. **The Boathouse Newmillerdam** is a waterside cafe. Do not add an estimated driving, bus, cycling or walking time unless a current route source verifies it. For current parking, access, facilities and cafe details use wakefield.gov.uk/parks-countryside-and-outdoor-spaces/parks/newmillerdam-country-park and Experience Wakefield. Do not state an acreage for Newmillerdam unless a trusted source in the current request verifies it.

PUGNEYS COUNTRY PARK: Asdale Road / Denby Dale Road, Wakefield WF2 7BN. Wakefield Council says Pugneys is now a countryside site and NO LONGER offers water-sport activities or fishing. For safety, visitors must not enter the lake by any means, including swimming, paddleboarding or kayaking. Do not recommend Pugneys for canoeing or paddling. Verify current opening/parking/facilities at wakefield.gov.uk/parks-countryside-and-outdoor-spaces/parks/pugneys-country-park.

WAKEFIELD WATERWAYS: Wakefield DOES have a navigable waterway. The Wakefield Branch of the Aire & Calder Navigation is approximately 7.5 miles long and links Wakefield to Castleford. For canoe/kayak launch access, licences, stoppages and navigation rules, verify current guidance with the Canal & River Trust at canalrivertrust.org.uk. Never recommend Newmillerdam or Pugneys for paddling unless an official current source explicitly allows it.

WAKEFIELD PARKING: Wakefield Council currently states that up to two hours free parking is available in some Council-owned off-street car parks. A ticket must still be obtained from the machine and displayed, and users must check the car-park notice board for current restrictions. Do not claim supermarket or retail-centre parking is free unless verified from that operator's current terms. Merchant Gate and country parks have different arrangements and must not be assumed to be included.

TRINITY WALK / TK MAXX: Trinity Walk is a Wakefield city-centre shopping centre at WF1 1QS. Its current store directory lists TK Maxx. Because retail tenants and opening hours can change, verify current status at trinitywalk.com or the retailer when asked.

KEY ATTRACTIONS: Thornes Park (playgrounds and large green spaces). National Coal Mining Museum, Overton WF4 4RH (underground tours and mining heritage). Nostell (National Trust estate near Pontefract). Xscape Yorkshire, Glasshoughton (indoor leisure and entertainment). Wakefield Cathedral (historic city-centre cathedral). Pontefract Castle (historic castle site). Pugneys Country Park (lake and outdoor recreation). Wakefield Museum WF1 2UP. For changing details such as opening times, prices, activities and events, verify current information before stating it.

FOOD & DRINK — CURATED WAKEFIELD DISCOVERY POOL:
Use this as stable candidate knowledge, not as a live ranking. Do not repeat ratings, review quotes, "best" claims or changing opening hours from discovery sources. Match venues to the user's job, area and service style. Current opening, branch presence, menu, prices and availability should be verified when they matter.

**Wakefield city centre / central Wakefield:**
- **KRA:FT Wakefield**, 14 Wood Street — coffee shop / light food; useful for coffee and informal daytime food.
- **Munchiz Wakefield**, 16 Wood Street — fast-food / quick-meal option.
- **Cafe 19**, 7 Cross Square — cafe; useful for breakfast, lunch, sandwiches and coffee-style requests.
- **Create Cafe Wakefield**, Burton Street — community cafe; useful for daytime cafe/lunch requests.
- **Mimik Sushi & Ramen**, 34 Northgate — Japanese/Korean-style restaurant; sushi, ramen, katsu and bibimbap style dishes.
- **Robatary**, 25–27 Northgate — sit-down restaurant.
- **Iris Restaurant**, 12 Bull Ring — modern British / sit-down dining; more suited to a meal than grab-and-go. Treat lunch availability and current opening as live information before recommending it for lunch.
- **Aya Turkish Bar & Grill**, 80 Kirkgate — Turkish sit-down restaurant.
- **Rustico**, Kirkgate — Italian restaurant; pasta/pizza-style sit-down option.
- **The Pizza Yard**, 212–214 Kirkgate — pizza restaurant; treat current lunch opening as live information.
- **HFC Wakefield**, 86 Kirkgate — informal / fast-food option.
- **The Spicy Biker**, 16 Cross Street — Indian street-food style restaurant; treat current lunch opening as live information.
- **Boar Home Dining**, 61 Lower York Street — sit-down restaurant; treat current opening as live information.
- **Hayat Restaurant & Sweet Centre**, 130 Westgate — restaurant / sweet-centre option.
- **Marmalade On The Square** — relaxed central cafe dining.
- **Gyros Bros** — Greek-style street food and informal dining.
- **Taste of Dosa** — South Indian cuisine including dosas and other traditional dishes.
- **Bob & Berts Wakefield** — all-day cafe with coffee, brunch and lighter food.
- **M&S Cafe / Marks & Spencer food-to-go** — useful city-centre option for a straightforward cafe or light lunch. Verify the current Wakefield store/cafe setup before stating exact hours.
- **Greggs** — useful grab-and-go bakery option. User-provided local knowledge identifies Wakefield Bus Station and town-centre branches; current branch presence and hours must be verified before giving exact location/open-now claims.

**Near the city centre / wider Wakefield:**
- **Thornes Lane Cafe**, 86 Thornes Lane — cafe.
- **Parkside Sandwich Bar**, 169a Denby Dale Road — sandwich / quick-lunch option.
- **Holmfield Arms**, Denby Dale Road — pub dining; better for a sit-down meal than a rushed grab-and-go lunch.
- **Castle Cafe**, Manygates Lane — cafe.
- **The Cabin**, Calder Garage, 73 Doncaster Road — informal food option.
- **Lite Bite Coffee Shop**, HQ Building, 225 Denby Dale Road — coffee shop / light food.
- **The Restaurant Hub, Wakefield Ings**, 50 Ings Road — informal restaurant/food-hall style option.
- **The Queens Arms**, 159 Denby Dale Road — pub. Treat meal service times as live information.
- **Mr T's Wakefield**, 17 Jacob's Well Lane — fast-food option.

**Destination / district options:**
- **The Boathouse Newmillerdam**, Newmillerdam Country Park — waterside cafe; useful when the user is already visiting Newmillerdam or wants a walk-and-cafe outing.
- **Capri at Newmillerdam**, 648 Barnsley Road — sit-down restaurant near Newmillerdam.
- **Blacker Hall Farm Shop** — farm shop and cafe with locally sourced produce and breakfast/lunch options.
- **Hickory's Smokehouse Horbury**, Bennett Avenue — sit-down restaurant in Horbury.
- **Bank Street Kitchen**, Ossett — sit-down restaurant in Ossett.
- **Pemberley's**, 182 Leeds Road — sit-down restaurant.
- **Three Flames**, 270 Wakefield Road — steak-focused restaurant; treat current service times and menu as live information.
- **Wentbridge House Hotel** — hotel dining near Pontefract; suitable for a more formal meal or occasion.
- **The Weston at Yorkshire Sculpture Park** — modern British dining at YSP; useful when visiting the sculpture park.

**Food matching guidance:**
- Quick sandwich + coffee / short lunch break: favour Greggs, M&S cafe/food-to-go, Cafe 19, KRA:FT, Create Cafe, Parkside Sandwich Bar or other verified nearby counter-service options in the user's area.
- Casual sit-down city-centre lunch: consider Marmalade On The Square, Bob & Berts, Gyros Bros, Taste of Dosa, Mimik, Rustico, Aya or Robatary depending on cuisine and current opening.
- Meal with a walk / destination lunch: consider The Boathouse Newmillerdam, Capri at Newmillerdam, Blacker Hall Farm Shop or The Weston at YSP when the location fits.
- Evening / occasion dining: use the appropriate sit-down restaurants, but verify current evening opening and booking information.
- Do not treat Google star ratings, price bands, snippets or sponsored placement as Ask Wakefield endorsements.


MICHELIN: Michelin distinctions can change and must be checked live against guide.michelin.com when the user asks about current starred/Bib Gourmand restaurants. Never describe a Bib Gourmand restaurant as Michelin-starred. Do not invent distances or journey times to Michelin-listed restaurants.

FAMILY DAYS OUT: **Xscape Yorkshire**, Glasshoughton (snow slope, cinema — all-weather, first-rate). **Diggerland**, Castleford (children drive real diggers — from £25.95, always a hit). **Eureka! The National Children's Museum**, Halifax (interactive, under-11s, from £17.95). **Stockeld Park**, Wetherby (adventure park, seasonal ice skating, from £12.50). **Tropical World**, Leeds (exotic animals, from £9.50). More: dayoutwiththekids.co.uk/things-to-do/yorkshire/west-yorkshire and wakefield.mumbler.co.uk.


TRANSPORT — TRAINS: Wakefield has two principal rail stations, **Wakefield Westgate** and **Wakefield Kirkgate**. For exact departures, last trains, disruptions or journey times, verify live using National Rail and/or the relevant train operator. Never provide an exact departure time from static knowledge.

TRANSPORT — BUSES: Bus routes and timetables can change. Use West Yorkshire Metro for current route planning rather than relying on static route numbers. **Yorkshire Sculpture Park travel:** YSP's official visitor information states that the 96 bus runs between Wakefield and Barnsley with stops at YSP, and that Wakefield Westgate is the nearest railway station at around seven miles from YSP. There is no railway station at Bretton/YSP; never tell a user to get off a train there. Verify current service details before giving a route.

TRANSPORT — PASSES & CARDS: West Yorkshire Metro MCard season tickets (weekly, monthly, annual) cover bus and rail across all five districts. Buy at wymetro.com or Westgate/Kirkgate stations. Concessionary travel (over 60s, disabled): wakefield.gov.uk/travel.

TRANSPORT — TAXIS / PRIVATE HIRE & LONG DISTANCE: Taxi and ride questions are supporting guidance only, not a core Ask Wakefield feature. If the user asks for a taxi or ride, give basic neutral guidance and direct them to a licensed operator or the relevant third-party app; do not offer to book, dispatch or act as an intermediary. For licensed taxi/private-hire information use wakefield.gov.uk/taxis. Treat ride-app availability as current information that should be verified rather than assumed. National Express and FlixBus may serve longer-distance journeys; verify current stops/times before giving specifics.

MEDIAHUBINK'S FAVOURITE PLACES — DINING & COFFEE IN WAKEFIELD:
These are personal picks from Joash Perera, founder of Mediahubink — the team behind Ask Wakefield. They are not objective rankings or review scores. When they are relevant, use the factual descriptions below; if you mention the personal endorsement, attribute it clearly to Joash or Mediahubink.

DINING & FOOD:
- **Gyros Bros** — Greek-style street food and informal dining. gyros-bros.com
- **Taste of Dosa** — South Indian cuisine, including dosas and other traditional dishes. tasteofdosa.co.uk
- **Marmalade On The Square** — relaxed cafe dining in central Wakefield.
- **DAM Wakefield** — food and drink venue in Wakefield. dam-wakefield.com
- **Holmfield Arms** (Greene King) — pub dining in Wakefield. greeneking.co.uk
- **KRA:FT Wakefield** — craft food and drink in Wakefield.
- **Lakeside Bistro** — lakeside dining. linktr.ee/lakesidebistro
- **Blacker Hall Farm Shop** — farm shop and cafe with locally sourced produce and breakfast/lunch options. blackerhallfarmshop.co.uk
- **Bakes by Vanilla Bean** — bakery and baked goods. bakesbyvanillabean.co.uk
- **Bob & Berts Wakefield** — all-day cafe serving coffee, brunch and lighter food. bobandberts.co.uk/stores/wakefield
- **M&S Cafe** — cafe option that Joash's family uses; suitable to mention as a personal family pick. marksandspencer.com

COFFEE & INFORMAL MEETINGS:
- **The ESC — Elevate Social Club** — Joash's personal coffee/work pick. Serves specialty coffee, matcha, smoothies, yoghurt bowls and prepared meals. The curated notes describe WiFi, plug sockets, music, parking and a Sunday Run Club; treat changing details such as parking and run-club times as needing current verification. instagram.com/_elevatesocialclub
- **Recent Coffee** — independent specialty coffee in Wakefield. recent.coffee. A Mediahubink personal pick.
- **Vinyl Cafe North at Tileyard North** — coffee and vinyl in a creative-space setting. tileyardnorth.co.uk/vinylcafenorth
- **Create Cafe Wakefield** — community cafe in Wakefield. createcafewakefield.co.uk
- **Costa Coffee** — Joash's personal choice for informal client meetings. costa.co.uk

ARTS & CULTURE VENUES (also worth noting):
- **The Art House** — independent arts venue, creative hub. the-arthouse.org.uk
- **The Ridings Centre** — Wakefield's main shopping centre. ridingscentre.com

WEST YORKSHIRE: Five districts — Bradford, Calderdale, Kirklees, Leeds, Wakefield. Population 2.4m. Mayor: Tracy Brabin. westyorks-ca.gov.uk. London approximately 2 hours from Wakefield Westgate by train. Birthplace of **Barbara Hepworth** (Wakefield) and **Henry Moore** (Castleford) — the artistic heritage of this corner of Yorkshire is without equal. Key towns: Leeds (Royal Armouries, major arts scene), Bradford (National Science & Media Museum — free, Saltaire World Heritage Site), Halifax (The Piece Hall — stunning Grade I listed, free entry), Hebden Bridge (bohemian, independent shops, Calder Valley walks), Haworth (Brontë country, steam railway), Ilkley (spa town, Ilkley Moor, Box Tree restaurant), Huddersfield (university town, gateway to the Peak District).`;




const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 3000;
const MAX_TOTAL_CHARS = 14000;
const RATE_LIMIT_PER_MINUTE = 20;

const TRUSTED_DOMAINS = [
  'wakefield.gov.uk',
  'experiencewakefield.co.uk',
  'hepworthwakefield.org',
  'ysp.org.uk',
  'wxwakefield.co.uk',
  'wxbooking.co.uk',
  'wymetro.com',
  'westyorks-ca.gov.uk',
  'northernrailway.co.uk',
  'lner.co.uk',
  'nationalrail.co.uk',
  'one.network',
  'nationaltrust.org.uk',
  'wakefield.mumbler.co.uk',
  'yorkshirefoodguide.co.uk',
  'the-arthouse.org.uk',
  'tileyardnorth.co.uk',
  'gov.uk',
  'planningportal.co.uk',
  'guide.michelin.com',
  'canalrivertrust.org.uk',
  'trinitywalk.com',
  'tkmaxx.com',
  'ridingscentre.com',
  'recent.coffee',
  'bobandberts.co.uk',
  'greggs.com',
  'greggs.co.uk',
  'costa.co.uk',
  'caffenero.com',
  'starbucks.co.uk',
  'pret.co.uk',
  'marksandspencer.com',
  'gyros-bros.com',
  'tasteofdosa.co.uk',
  'dam-wakefield.com',
  'greeneking.co.uk',
  'blackerhallfarmshop.co.uk',
  'bakesbyvanillabean.co.uk',
  'createcafewakefield.co.uk',
  'robatary.co.uk',
  'dinerustico.co.uk'
];

const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_PER_MINUTE;
}

function sanitiseMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const cleaned = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter(m => m.content.length > 0)
    .slice(-MAX_MESSAGES);

  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') return null;

  let total = 0;
  const bounded = [];
  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    total += cleaned[i].content.length;
    if (total > MAX_TOTAL_CHARS) break;
    bounded.unshift(cleaned[i]);
  }
  return bounded;
}

function recentUserContext(messages, maxUserMessages = 3) {
  if (!Array.isArray(messages)) return '';
  return messages
    .filter(m => m?.role === 'user' && typeof m.content === 'string')
    .slice(-maxUserMessages)
    .map(m => m.content)
    .join('\n')
    .toLowerCase();
}

function isNamedRetailPresenceQuery(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  const presenceIntent = /\b(is there|are there|do (?:you|we) have|have (?:you|we) got|nearest|closest|where(?:'s| is) (?:the )?nearest)\b/i;
  const namedBrand = /\b(gregg'?s?|costa|starbucks|caff[eè] nero|pret(?: a manger)?|subway|mcdonald'?s?|kfc|burger king|cooplands|boots|tk\s?maxx|m&s|marks (?:&|and) spencer)\b/i;
  return presenceIntent.test(last) && namedBrand.test(last);
}

function isQuickFoodQuery(messages) {
  const context = recentUserContext(messages);
  const speedIntent = /\b(quickest|quick lunch|quick bite|quick sandwich|grab[- ]?and[- ]go|in a hurry|lunch break|only have (?:an? )?hour|have an hour)\b/i;
  const foodIntent = /\b(lunch|sandwich|coffee|cafe|food|eat|meal|bakery|brunch)\b/i;
  return speedIntent.test(context) && foodIntent.test(context);
}

function isFoodDecisionQuery(messages) {
  const context = recentUserContext(messages);
  const foodIntent = /\b(lunch|breakfast|brunch|dinner|tea|sandwich|coffee|cafe|bakery|restaurant|food|eat|meal|takeaway|grab[- ]?and[- ]?go|pub lunch)\b/i;
  const decisionIntent = /\b(good|nice|best|recommend|suggest|where|quick|quickest|near|nearby|city centre|town centre|lunch break|only have|have an hour|sit[- ]?down|grab[- ]?and[- ]?go|sandwich|coffee)\b/i;
  return foodIntent.test(context) && decisionIntent.test(context);
}

function isCurrentFoodStatusQuery(messages) {
  const context = recentUserContext(messages);
  const foodIntent = /\b(lunch|breakfast|brunch|dinner|tea|restaurant|cafe|coffee|food|eat|meal|sandwich|bakery)\b/i;
  const currentIntent = /\b(open now|open right now|right now|currently open|open for (?:lunch|breakfast|brunch|dinner|tea)(?: now| today)?|what(?:'|’)s open|what is open)\b/i;
  return foodIntent.test(context) && currentIntent.test(context);
}

function needsLiveSearch(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  const context = recentUserContext(messages);
  if (/https?:\/\//i.test(last)) return true;

  if (isNamedRetailPresenceQuery(messages)) return true;
  if (isQuickFoodQuery(messages)) return true;

  const liveTerms = /\b(today|tonight|tomorrow|this week|this weekend|weekend|next saturday|next sunday|right now|currently|current|latest|live|open now|open today|open tonight|open tomorrow|is .* open|closed|close[sd]?|opening days?|opening hours?|closing time|what'?s on|wots on|happening|events?|tickets?|prices?|price|costs?|cost|admission|entry fee|road closures?|traffic|last train|first train|train times?|bus times?|timetable|delays?|cancelled|availability|school holidays?|term dates?|tram|route|directions|journey|travel|planning permission|permitted development|building regulations?|two[- ]storey|extension|michelin|bib gourmand|parking|free parking|tk\s?maxx?|store|shop|canoe|canoeing|kayak|kayaking|paddleboard|paddleboarding|water sports?|watersports|canal|swim|swimming)\b/i;
  if (liveTerms.test(context)) return true;

  // Nearby/local-intent queries benefit from current source checks, especially
  // when the user supplies a postcode, landmark or walking-distance request.
  if (/\b(near|nearby|within walking distance|walking distance|close to|around)\b/i.test(context) &&
      /\b(restaurant|meal|eat|dining|coffee|cafe|park|shop|parking|attraction|cathedral|tileyard|asda|wf\d{1,2})\b/i.test(context)) return true;

  return false;
}

function requiresVerifiedSource(messages) {
  const context = recentUserContext(messages);
  if (isNamedRetailPresenceQuery(messages)) return true;
  if (isCurrentFoodStatusQuery(messages)) return true;
  return /\b(last train|first train|train times?|bus times?|timetable|delays?|cancelled|road closures?|planning permission|permitted development|building regulations?|open now|right now|currently|current|open (today|tonight|tomorrow)|is .* open|closed|opening hours?|what'?s on|wots on|happening|this weekend|weekend|michelin|bib gourmand|parking|free parking|canoe|canoeing|kayak|kayaking|paddleboard|water sports?|watersports|canal|tk\s?maxx?|admission|entry fee|price|cost)\b/i.test(context);
}

function verificationFallback(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  if (/planning permission|permitted development|building regulations?|two[- ]storey|extension/.test(last)) {
    return 'Some two-storey rear extensions in England can fall within permitted development, but the rules depend on the property, dimensions, position, designated land and whether permitted-development rights have been removed. I could not verify the current rules for your property from an official source just now, so please check Wakefield Council Planning and the Planning Portal before relying on this. Building Regulations are separate from planning permission.\n\n*For official and up-to-date information, visit wakefield.gov.uk or call 0345 8 506 506.*';
  }
  if (/train|bus|tram|timetable|journey|route|travel|delay|cancelled/.test(last)) {
    return 'I could not verify the current transport information from an official source just now, so I do not want to give you a timetable or route that may be wrong. Please check National Rail for trains or West Yorkshire Metro for local buses and journey planning.';
  }
  if (/michelin|bib gourmand/.test(last)) {
    return 'I could not verify the current Michelin Guide status from a trusted source just now, so I do not want to label any Wakefield restaurant as Michelin-starred. Please check the Michelin Guide for the current West Yorkshire listings.';
  }
  if (/canoe|canoeing|kayak|kayaking|paddleboard|water sports?|watersports|canal|swim|swimming/.test(last)) {
    return 'I could not verify a safe, permitted launch point from an official source just now, so I do not want to send you onto the wrong water. Pugneys Country Park currently prohibits entering the lake, including kayaking and paddleboarding. For navigable waterways around Wakefield, check the Canal & River Trust guidance for the Wakefield Branch of the Aire & Calder Navigation.';
  }
  if (/parking|free parking/.test(last)) {
    return 'Wakefield Council currently offers up to two hours free parking in some Council-owned off-street car parks, but the exact car parks and restrictions matter. You still need to obtain and display a ticket where the scheme applies. Please check the Council car-parks page and the signs at the car park before leaving your vehicle.\n\n*For official and up-to-date information, visit wakefield.gov.uk or call 0345 8 506 506.*';
  }
  if (/tk\s?maxx?|store|shop/.test(last)) {
    return 'I could not verify that retailer from a current first-party listing just now, so I do not want to guess. Please check the retailer or the relevant Wakefield shopping centre directory.';
  }
  if (isCurrentFoodStatusQuery(messages)) {
    return 'I could not verify enough current opening information from trusted sources just now to tell you which lunch venues are open at this exact moment. I can still suggest suitable Wakefield venues, but I would label them as candidates rather than claim they are open.';
  }
  return 'I could not verify that current information from a trusted source just now, so I do not want to guess. Please check the relevant official venue or service website.';
}

function lastUserText(messages) {
  return messages?.[messages.length - 1]?.content?.toLowerCase() || '';
}

function isGeneralRecommendationQuery(messages) {
  const last = lastUserText(messages);
  const recommendationIntent = /\b(good|nice|best|favourite|favorite|recommend|recommendation|suggest|suggestion|hidden gem|where should|where can|somewhere|place for)\b/i.test(last);
  const localLeisureIntent = /\b(lunch|breakfast|brunch|dinner|tea|meal|eat|food|restaurant|cafe|coffee|pub|drink|family day|day out|activity|activities|walk|date night)\b/i.test(last);
  return recommendationIntent && localLeisureIntent;
}

function isWxCurrentEventsQuery(messages) {
  const last = lastUserText(messages);
  return /\b(wx|wakefield exchange)\b/.test(last) && /\b(what'?s on|happening|events?|weekend|today|tonight|tomorrow|this week)\b/.test(last);
}

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToPlainText(html) {
  return decodeBasicEntities(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function weekendDateState() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(now);
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];

  let saturdayOffset;
  let sundayOffset;
  if (dayIndex === 6) {
    saturdayOffset = 0;
    sundayOffset = 1;
  } else if (dayIndex === 0) {
    saturdayOffset = -1;
    sundayOffset = 0;
  } else {
    saturdayOffset = 6 - dayIndex;
    sundayOffset = saturdayOffset + 1;
  }

  return {
    saturday: formatLondonDate(new Date(now.getTime() + saturdayOffset * 24 * 60 * 60 * 1000)),
    sunday: formatLondonDate(new Date(now.getTime() + sundayOffset * 24 * 60 * 60 * 1000))
  };
}

function extractRelevantDateSegments(text, dates) {
  const chunks = [];
  const needles = [
    dates.saturday,
    dates.sunday,
    dates.saturday.replace(/^Saturday\s+/, ''),
    dates.sunday.replace(/^Sunday\s+/, '')
  ];

  for (const needle of needles) {
    const lowerText = text.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let from = 0;
    let hits = 0;
    while (hits < 3) {
      const index = lowerText.indexOf(lowerNeedle, from);
      if (index === -1) break;
      const start = Math.max(0, index - 900);
      const end = Math.min(text.length, index + 1800);
      chunks.push(text.slice(start, end));
      from = index + lowerNeedle.length;
      hits += 1;
    }
  }

  const unique = [...new Set(chunks.map(chunk => chunk.trim()).filter(Boolean))];
  return (unique.length ? unique.join('\n---\n') : text.slice(0, 14000)).slice(0, 16000);
}

async function fetchWxWhatsOnContext() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://wxwakefield.co.uk/whats-on', {
      headers: {
        'User-Agent': 'AskWakefield/2.0 (+https://www.askwakefield.co.uk)'
      },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const html = await response.text();
    const text = htmlToPlainText(html);
    if (!text) return null;
    const dates = weekendDateState();
    return {
      text: extractRelevantDateSegments(text, dates),
      dates,
      source: {
        title: "Wakefield Exchange — What's On",
        url: 'https://wxwakefield.co.uk/whats-on'
      }
    };
  } catch (error) {
    console.error('WX first-party fetch failed:', error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}


function trustedHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return TRUSTED_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
}

function extractTrustedUrlsFromLastUser(messages) {
  const raw = messages?.[messages.length - 1]?.content || '';
  const matches = raw.match(/https?:\/\/[^\s<>()]+/gi) || [];
  const urls = [];
  for (const value of matches.slice(0, 3)) {
    try {
      const parsed = new URL(value.replace(/[),.;]+$/, ''));
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;
      if (!trustedHostname(parsed.hostname)) continue;
      urls.push(parsed.toString());
    } catch {}
  }
  return [...new Set(urls)];
}

async function fetchTrustedUserUrlContext(messages) {
  const urls = extractTrustedUrlsFromLastUser(messages);
  if (!urls.length) return null;
  const pages = [];

  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AskWakefield/2.1 (+https://www.askwakefield.co.uk)' },
        signal: controller.signal
      });
      if (!response.ok) continue;
      try {
        const finalUrl = new URL(response.url || url);
        if (!trustedHostname(finalUrl.hostname)) continue;
      } catch { continue; }
      const type = response.headers.get('content-type') || '';
      if (!/text\/html|text\/plain/i.test(type)) continue;
      const text = htmlToPlainText(await response.text()).slice(0, 14000);
      if (!text) continue;
      pages.push({ url: response.url || url, text });
    } catch (error) {
      console.error('Trusted user URL fetch failed:', url, error?.message || error);
    } finally {
      clearTimeout(timer);
    }
  }

  if (!pages.length) return null;
  return {
    text: pages.map((page, i) => `USER-SUPPLIED TRUSTED PAGE ${i + 1}: ${page.url}\n${page.text}`).join('\n\n---\n\n').slice(0, 20000),
    sources: pages.map(page => ({ title: new URL(page.url).hostname.replace(/^www\./, ''), url: page.url }))
  };
}


function formatLondonDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function londonContext() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  const today = formatLondonDate(now);
  const tomorrow = formatLondonDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const dayAfterTomorrow = formatLondonDate(new Date(now.getTime() + 48 * 60 * 60 * 1000));
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short'
  }).format(now);
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];

  let saturdayOffset;
  let sundayOffset;
  if (dayIndex === 6) {
    saturdayOffset = 0;
    sundayOffset = 1;
  } else if (dayIndex === 0) {
    saturdayOffset = -1;
    sundayOffset = 0;
  } else {
    saturdayOffset = 6 - dayIndex;
    sundayOffset = saturdayOffset + 1;
  }

  const thisSaturday = formatLondonDate(new Date(now.getTime() + saturdayOffset * 24 * 60 * 60 * 1000));
  const thisSunday = formatLondonDate(new Date(now.getTime() + sundayOffset * 24 * 60 * 60 * 1000));
  const followingSaturday = formatLondonDate(new Date(now.getTime() + (saturdayOffset + 7) * 24 * 60 * 60 * 1000));

  return [
    `CURRENT UK DATE AND TIME: ${today}, ${time} Europe/London.`,
    `RELATIVE DATE MAP: Today = ${today}. Tonight = ${today}, interpreted as 17:00 onward unless the user gives another time. Tomorrow = ${tomorrow}. Day after tomorrow = ${dayAfterTomorrow}. This weekend = Saturday ${thisSaturday.replace(/^Saturday\s+/, '')} and Sunday ${thisSunday.replace(/^Sunday\s+/, '')}. Following Saturday = ${followingSaturday}.`,
    'DATE ACCURACY RULE: When the user uses a relative date or period listed above, use the exact mapped date(s). Do not calculate or infer the weekday/date yourself. "This weekend" means the Saturday and Sunday in the map, not tomorrow or the next two calendar days. If the phrase "next Saturday" is ambiguous in context, state the date you are using rather than hiding the interpretation.',
    'TONIGHT FILTER RULE: For a request about something to do tonight, only present options whose verified opening/event time extends into the evening window from 17:00 onward. A place that closes at 17:00 is not a tonight recommendation.',
    'Use this context only when time or date matters. Do not start with a time-of-day greeting.'
  ].join('\n');
}

async function callAnthropic(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let data = {};
    try { data = await response.json(); } catch {}
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

function extractAnswer(data) {
  const content = Array.isArray(data?.content) ? data.content : [];
  const sources = new Map();
  let searched = false;
  let lastSearchResultIndex = -1;

  // Anthropic can emit short text blocks while deciding to make another
  // server-side web search. Those are internal progress messages, not the
  // final response we want to show in the chat UI.
  content.forEach((block, index) => {
    if (block?.type === 'web_search_tool_result') {
      searched = true;
      lastSearchResultIndex = index;
    }
  });

  const finalTextBlocks = content.filter((block, index) => {
    if (block?.type !== 'text') return false;
    // If a search occurred, only render text produced after the final search
    // result. Without a search, render the normal text response.
    return lastSearchResultIndex === -1 || index > lastSearchResultIndex;
  });

  for (const block of finalTextBlocks) {
    for (const citation of block.citations || []) {
      if (!citation?.url) continue;
      sources.set(citation.url, {
        title: citation.title || citation.url,
        url: citation.url
      });
    }
  }

  // Fallback defensively if an unusual API response has no text after the
  // final search result. Use the last text block rather than exposing every
  // intermediate progress block.
  const blocksToRender = finalTextBlocks.length
    ? finalTextBlocks
    : content.filter(block => block?.type === 'text').slice(-1);

  let renderedReply = blocksToRender.map(block => block.text || '').join('\n').trim();

  // For live/current lookups we ask Claude to mark the actual user-facing
  // answer. Anything before this marker is tool/search deliberation and must
  // never leak into the chat UI.
  const marker = 'FINAL_RESPONSE:';
  const markerIndex = renderedReply.lastIndexOf(marker);
  if (markerIndex !== -1) {
    renderedReply = renderedReply.slice(markerIndex + marker.length).trim();
  }

  return {
    reply: renderedReply,
    sources: Array.from(sources.values()).slice(0, 5),
    searched
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      reply: "I'm rather popular at the moment. Please wait a minute before trying again."
    });
  }

  const messages = sanitiseMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'invalid_request', reply: 'Please enter a valid question.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'service_unavailable', reply: 'The assistant is temporarily unavailable.' });

  let wxContext = null;
  if (isWxCurrentEventsQuery(messages)) {
    wxContext = await fetchWxWhatsOnContext();
  }

  const userUrlContext = await fetchTrustedUserUrlContext(messages);

  // WX event questions use the venue's first-party What's On page directly
  // when available. This is more reliable than asking a general search engine
  // to discover both days of a weekend listing.
  const useSearch = needsLiveSearch(messages) && !wxContext;

  const wxDirectContext = wxContext
    ? `\n\nFIRST-PARTY WX CURRENT LISTING SNAPSHOT:\nSource: https://wxwakefield.co.uk/whats-on\nThis weekend is ${wxContext.dates.saturday} and ${wxContext.dates.sunday}.\nUse only the listing text below for WX event titles, dates, times and prices. Check BOTH weekend dates and list every matching event you can verify. Do not replace exact event titles with category labels.\n\n${wxContext.text}`
    : '';

  const userProvidedContext = userUrlContext
    ? `\n\nTRUSTED USER-SUPPLIED PAGE SNAPSHOT:\nThe user supplied one or more trusted URLs and the server fetched them. Use this content directly where relevant. Do not claim you cannot access the link.\n\n${userUrlContext.text}`
    : '';

  const recommendationContext = isGeneralRecommendationQuery(messages)
    ? `\n\nGENERAL RECOMMENDATION MODE: The user's current question is an ordinary local recommendation request. You MUST give 3-5 useful options from the curated Wakefield knowledge base before asking any follow-up question. Do not answer only with questions. Stable recommendations do not require proof that each venue is open at this exact moment. Do not answer with a generic "could not verify opening/event information" refusal. Keep descriptions concrete and factual rather than review-like. Do not make unsupported claims about quality, value, authenticity, popularity, awards or being "best". Personal picks from Joash/Mediahubink may be used if clearly attributed as personal picks. Never claim open-now status, live availability or current prices unless verified. End with at most one short question to narrow the options by area, style or budget when useful.`
    : '';

  const foodDecisionContext = isFoodDecisionQuery(messages)
    ? `\n\nFOOD DECISION MODE: Solve the user's immediate food job rather than producing a generic restaurant list. Reuse location, available time, meal type and preferences already stated in the recent conversation. If they say Wakefield city centre and have a short lunch break, keep the shortlist central and prioritise suitable service formats. For sandwich + coffee, include sensible grab-and-go/counter-service options such as Greggs, M&S, cafes and sandwich bars alongside independents where appropriate; do not default to Costa. Give 3-5 options and explain the fit in a few words. NEVER translate the user's time budget into a predicted queue, walking or service duration: do not say 10/15/30 minutes, "fits comfortably", "short walk", "nearby", "in minutes", "five more minutes", "quickest" or "best bet" unless a current reliable source explicitly supports that exact claim. If current branch/opening status is essential, verify it live; otherwise give stable candidate guidance with a brief caveat.`
    : '';

  const currentFoodContext = isCurrentFoodStatusQuery(messages)
    ? `\n\nCURRENT FOOD OPENING MODE: Current opening status is the core question. Search silently. Only include a venue in the OPEN NOW answer when a trusted current source explicitly provides today's opening hours and the server-supplied current time falls within them, or the source explicitly states it is open now. A generic venue page, review, cuisine description or old listing is not enough. Prefer the venue's own site; Experience Wakefield may be used when it provides explicit venue opening hours, but attribute the hours to that listing if relevant. Do not include a venue just because it is generally a lunch venue. Do not pad the answer. If you can verify only one or two, give only one or two. If none are verifiable, say so rather than guessing.`
    : '';

  const directContext = `${wxDirectContext}${userProvidedContext}${recommendationContext}${foodDecisionContext}${currentFoodContext}`;

  const liveOutputContract = (useSearch || wxContext || userUrlContext)
    ? '\n\nLIVE OUTPUT CONTRACT: Do any lookup or source checking silently. Your final user-facing answer MUST contain the exact marker FINAL_RESPONSE: immediately before the answer, with no analysis, search commentary or deliberation after that marker. The server removes everything before the marker.'
    : '';

  const baseBody = {
    model: MODEL,
    max_tokens: 1200,
    system: `${SYSTEM_PROMPT}\n\n${londonContext()}${directContext}${liveOutputContract}`,
    messages
  };

  if (useSearch) {
    baseBody.tools = [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 7,
      allowed_domains: TRUSTED_DOMAINS,
      user_location: {
        type: 'approximate',
        city: 'Wakefield',
        region: 'West Yorkshire',
        country: 'GB',
        timezone: 'Europe/London'
      }
    }];
  }

  try {
    let { response, data } = await callAnthropic(baseBody);

    // If web search is disabled on the Anthropic account, retry safely without it.
    if (useSearch && response.status === 400 && /web.?search|tool/i.test(JSON.stringify(data))) {
      const fallbackBody = { ...baseBody };
      delete fallbackBody.tools;
      ({ response, data } = await callAnthropic(fallbackBody));
    }

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, data?.error?.message || data);
      const status = response.status === 429 ? 429 : 502;
      const reply = response.status === 429
        ? "I'm rather popular at the moment. Please try again shortly."
        : 'I could not reach the information service just now. Please try again.';
      return res.status(status).json({ error: 'upstream_error', reply });
    }

    const { reply, sources, searched } = extractAnswer(data);

    const mergedSourceMap = new Map();
    if (wxContext?.source?.url) mergedSourceMap.set(wxContext.source.url, wxContext.source);
    for (const source of userUrlContext?.sources || []) {
      if (source?.url) mergedSourceMap.set(source.url, source);
    }
    for (const source of sources) {
      if (source?.url) mergedSourceMap.set(source.url, source);
    }
    const mergedSources = Array.from(mergedSourceMap.values()).slice(0, 5);

    if (requiresVerifiedSource(messages) && mergedSources.length === 0 && !isGeneralRecommendationQuery(messages)) {
      return res.status(200).json({
        reply: verificationFallback(messages),
        sources: [],
        live: false
      });
    }

    return res.status(200).json({
      reply: reply || "I'm sorry, I couldn't generate a response. Please try again.",
      sources: mergedSources,
      live: searched || Boolean(wxContext) || Boolean(userUrlContext)
    });
  } catch (error) {
    console.error('Handler error:', error);
    const timedOut = error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'timeout' : 'connection_error',
      reply: timedOut ? 'That search took too long. Please try again.' : 'Connection error. Please try again.'
    });
  }
}
