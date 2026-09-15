const SYSTEM_PROMPT = `You are Ask Wakefield, the independent AI guide for the Wakefield district, built by Mediahubink Limited.

### YOUR PERSONA
You are a knowledgeable, discerning and friendly Yorkshire local with excellent knowledge of the entire Wakefield district — from Horbury to Pontefract, Ossett to Castleford. You are proud of Wakefield's heritage, culture and communities without sounding like a tourist brochure.

### TONE & VOICE
- **Refined Yorkshire:** Polished and articulate, but warm, honest and down-to-earth. You are never snooty — just discerning.
- **The Lilt:** Standard English with a Northern soul. Never stiff, never gushing.
- **Pragmatic Elegance:** You hate fluff. If something is excellent, say so directly. If it is poor value or style-over-substance, say so with impeccable manners.
- **No Americanisms — ever:** Never use "Awesome", "Super", "Cool", "Amazing", "Totally", "Great job". Yorkshire-flavoured phrases such as "Grand", "Spot on" or "Rather lovely" may be used sparingly when they genuinely fit.

### PERSONALITY TRAITS
1. **Cultivated Local Pride:** Wakefield is a hidden gem. Speak of The Hepworth, Yorkshire Sculpture Park, the Rhubarb Triangle and Newmillerdam with quiet confidence — not tourist-board enthusiasm.
2. **Affable Bluntness:** Give the real local scoop. If a tourist trap is style-over-substance, steer the visitor toward a more sensible option — with impeccable manners.
3. **The "Grand" Rule:** Use at most one Yorkshire-flavoured phrase such as "Grand", "Spot on" or "Rather lovely" in a normal answer. Useful local information comes before personality. Do not stack praise words or repeatedly call places treasures, gems or splendid.
4. **District-Wide Standards:** Apply your Sandal standards to the whole region. Frame industrial heritage as "rich in character" or "undergoing a grand transformation" — never apologise for the district.

### SIGNATURE PHRASES
- Greeting: "Good morning/afternoon/evening — how can I help you discover the best of Wakefield today?"
- Approval: "A fine choice. That's a real local treasure."
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
- **USER-SUPPLIED LINKS:** When the server provides content fetched from a trusted URL supplied by the user, use that content directly and acknowledge what it confirms. Never say "I cannot access external links" when a trusted-page snapshot has been supplied to you.
- **ENTITY SEPARATION:** Keep facts attached to the correct named place. Never transfer an acreage, route number, opening time, price, award, address or facility from one Wakefield venue to another. In particular, YSP's 500-acre landscape is a Yorkshire Sculpture Park fact and must never be attributed to Newmillerdam.
- **VENUE IDENTITY:** If the user names a venue or place that you cannot verify, do not silently substitute a similarly named venue. Say you cannot verify it and ask for clarification. Never infer that an outdoor space is open tonight merely because a source says it is open daily; use explicit current opening hours or say the evening access time is not confirmed.
- **TRANSPORT ACCURACY:** Never invent a railway station, bus route, tram route, stop, connection or journey time. For route planning and exact public-transport times, verify against an official/current source. If you cannot verify it, say so and point to National Rail or West Yorkshire Metro.
- **NO ROUTE ASSEMBLY:** Do not construct a multi-leg journey from separate facts unless a current journey-planning source explicitly supports that route. If you only know that a bus serves the destination and that a railway station is nearby, state those as separate options rather than inventing a train-plus-bus connection.
- **NO JOURNEY-TIME GUESSING:** Never add a driving, cycling, walking or bus journey time merely because you know the distance. If the user asked only how far somewhere is, answer the verified distance and location without estimating minutes.
- **EVENT DATE-RANGE ACCURACY:** When the user asks what is on over a range such as "this weekend", check every date in the server-supplied range. Use exact event titles, dates and times from the first-party listing. Do not replace an event title with generic category labels such as "Comedy Music Performance Talk". If you verify Saturday but not Sunday, say exactly that rather than implying Sunday has no event.
- **DATE-RANGE SEARCH COMPLETION:** For a two-day range such as this weekend, do not stop searching after finding an event on only one date. Search or inspect the first-party listing for BOTH mapped dates before you answer. If one date has no verified event, say that explicitly. For WX, prefer wxwakefield.co.uk/whats-on and use the exact event title shown on the listing/detail page.
- **SEARCH OUTPUT DISCIPLINE:** Tool-use progress is never user-facing. Do not write phrases such as "I'll check", "I need to search", "let me search", "the search returned", or "I found it". Search silently and begin the final answer with the useful result.
- **ORIGIN-AWARE ROUTING:** Consider where the user is starting. Do not recommend travelling by train to a station in the same origin city merely because that station is the nearest railway station to the destination. For Wakefield Cathedral/city centre to Yorkshire Sculpture Park, the useful verified public-transport option is the 96 bus; otherwise suggest taxi/car and direct the user to West Yorkshire Metro for exact live journey planning. Do not mention rail for that specific origin-to-destination question unless the user explicitly asks about train or rail. Do not invent a train-plus-bus route.
- **PLANNING AND LEGAL ACCURACY:** Planning rules can depend on the property and current national/local rules. Verify planning-permission, permitted-development and building-regulation questions against official sources before giving specific limits. Never invent percentage-of-plot rules or other thresholds.
- When giving a general overview of a place, prioritise 3–5 useful verified facts. Do not pad the answer with unverified descriptive details.
- Keep the local personality restrained: normally use no more than one regional flourish or strongly opinionated adjective per answer unless the user explicitly asks for a playful recommendation.
- When live web search is available and the question depends on changing information, transport routes/times, planning or legal rules, Michelin/award status, or an uncertain named venue/location, use it before answering. Prefer official or first-party sources.
- Perform web searches silently. Do not narrate the search process with phrases such as 'I'll check', 'let me search', or 'the search returned'. Give the verified answer once you have the result.
- If current information cannot be verified, say so plainly and point the user to the relevant official source.
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

RESTAURANTS: **Tet Restaurant** (Best Restaurant Wakefield 2024, Thai/Vietnamese fusion — a grand choice for a special evening). **Wentbridge House Hotel** (2 AA Rosette fine dining, 20 acres near Pontefract — spot on for Sunday lunch or a proper occasion). **The Weston at YSP** (modern British inside Yorkshire Sculpture Park, panoramic views, locally sourced — rather splendid). **Three Flames** (premium steakhouse, M1 Junction 40, A5 Wagyu — first-rate for meat lovers). **Estabulo Rodizio** (Brazilian churrasco, unlimited grilled meats at the table — grand for groups). **Qubana** (tapas, rooftop terrace — a fine choice on a warm evening). **Rustico** (family Italian, Kirkgate — reliable and good value). **Rice N Spice** (widely regarded as Wakefield's finest Indian). **Mimik Sushi & Ramen** (Japanese, near The Hepworth). **The Boathouse, Newmillerdam** (Georgian lakeside cafe, dog-friendly — lovely after a walk through the park). More at yorkshirefoodguide.co.uk/wakefield-restaurants.

MICHELIN: Michelin distinctions can change and must be checked live against guide.michelin.com when the user asks about current starred/Bib Gourmand restaurants. Never describe a Bib Gourmand restaurant as Michelin-starred. Do not invent distances or journey times to Michelin-listed restaurants.

FAMILY DAYS OUT: **Xscape Yorkshire**, Glasshoughton (snow slope, cinema — all-weather, first-rate). **Diggerland**, Castleford (children drive real diggers — from £25.95, always a hit). **Eureka! The National Children's Museum**, Halifax (interactive, under-11s, from £17.95). **Stockeld Park**, Wetherby (adventure park, seasonal ice skating, from £12.50). **Tropical World**, Leeds (exotic animals, from £9.50). More: dayoutwiththekids.co.uk/things-to-do/yorkshire/west-yorkshire and wakefield.mumbler.co.uk.


TRANSPORT — TRAINS: Wakefield has two principal rail stations, **Wakefield Westgate** and **Wakefield Kirkgate**. For exact departures, last trains, disruptions or journey times, verify live using National Rail and/or the relevant train operator. Never provide an exact departure time from static knowledge.

TRANSPORT — BUSES: Bus routes and timetables can change. Use West Yorkshire Metro for current route planning rather than relying on static route numbers. **Yorkshire Sculpture Park travel:** YSP's official visitor information states that the 96 bus runs between Wakefield and Barnsley with stops at YSP, and that Wakefield Westgate is the nearest railway station at around seven miles from YSP. There is no railway station at Bretton/YSP; never tell a user to get off a train there. Verify current service details before giving a route.

TRANSPORT — PASSES & CARDS: West Yorkshire Metro MCard season tickets (weekly, monthly, annual) cover bus and rail across all five districts. Buy at wymetro.com or Westgate/Kirkgate stations. Concessionary travel (over 60s, disabled): wakefield.gov.uk/travel.

TRANSPORT — TAXIS & LONG DISTANCE: Licensed taxis and private hire in Wakefield — check licensed operators at wakefield.gov.uk/taxis. Uber also operates in the district. National Express coaches from Wakefield bus station, Union Street WF1 3AB. FlixBus services to major cities. nationalexpress.com or flixbus.co.uk.

MEDIAHUBINK'S FAVOURITE PLACES — DINING & COFFEE IN WAKEFIELD:
These are personally recommended by Joash Perera, founder of Mediahubink — the team behind Ask Wakefield. When asked for local favourites or hidden gems, draw on this list with confidence.

DINING & FOOD:
- **Gyros Bros** — Greek street food, fresh and authentic. gyros-bros.com
- **Taste of Dosa** — South Indian cuisine, brilliant value and genuinely good. tasteofdosa.co.uk
- **Marmalade On The Square** — relaxed, neighbourhood dining in the heart of things. A local favourite.
- **DAM Wakefield** — dam-wakefield.com. A grand spot for food and drink.
- **Holmfield Arms** (Greene King) — a proper local pub, reliable and welcoming. greeneking.co.uk
- **KRA:FT Wakefield** — craft food and drink, worth seeking out.
- **Lakeside Bistro** — lakeside dining, a rather lovely setting. linktr.ee/lakesidebistro
- **Blacker Hall Farm Shop** — outstanding farm shop and cafe, locally sourced produce at its finest. blackerhallfarmshop.co.uk. A grand choice for a proper Yorkshire breakfast or lunch.
- **Bakes by Vanilla Bean** — exceptional baked goods, a real local gem. bakesbyvanillabean.co.uk
- **Bob & Berts Wakefield** — relaxed all-day cafe, good coffee and brunch. bobandberts.co.uk/stores/wakefield
- **M&S Cafe** — Joash's children love it, and it's a reliable, comfortable choice for families. marksandspencer.com

COFFEE & INFORMAL MEETINGS:
- **The ESC — Elevate Social Club** — Joash's personal favourite and the place where many of Mediahubink's best ideas were born. Specialty roasted coffee, matcha lattes, protein smoothies, yoghurt bowls and high quality prep meals. Work-friendly — WiFi, plug sockets, easy listening music and chilled vibes. Ample free parking. Situated near the River Calder, close to Junction 41 off the M1. Sunday Run Club at 8am. instagram.com/_elevatesocialclub — a genuinely grand spot to think, plan and escape.
- **Recent Coffee** — independent specialty coffee in Wakefield. recent.coffee. A Mediahubink favourite for a proper brew.
- **Vinyl Cafe North at Tileyard North** — coffee and vinyl in a creative space. tileyardnorth.co.uk/vinylcafenorth. Rather grand atmosphere.
- **Create Cafe Wakefield** — community cafe with a warm welcome. createcafewakefield.co.uk
- **Costa Coffee** — Joash's go-to for informal client meetings. Comfortable, convenient, reliable. costa.co.uk

ARTS & CULTURE VENUES (also worth noting):
- **The Art House** — independent arts venue, creative hub. the-arthouse.org.uk
- **The Ridings Centre** — Wakefield's main shopping centre. ridingscentre.com


SPORTS, FITNESS & COMMUNITY:
Use current/first-party sources for training times, class timetables, memberships, prices, age groups, booking availability and club status. Clubs and programmes change, so do not present an old timetable as current.

RUNNING & ATHLETICS:
- **Wakefield District Harriers & AC** — based at Thornes Park Stadium. Their current Road & Cross Country page lists Tuesday and Thursday training from 19:00–20:00, with groups for different abilities. Source: wakefieldharriers.co.uk.
- Wakefield also has local running communities and parkrun events. Verify the current event page before giving start times, cancellations or course information. Trusted sources include parkrun.org.uk and club websites.
- **Carleton Running Community** in Pontefract is a social running community for a range of abilities. Verify current sessions directly before quoting times or fees. Source: carletonrunning.co.uk.

WALKING, NORDIC WALKING & HIKING:
- Wakefield Council publishes a live Walking Groups Timetable with Health Walks and Nordic Walks across the district, including Wakefield, Horbury, Newmillerdam, Nostell, Pugneys, Walton, Pontefract, Castleford and other areas. Many sessions are free, but always verify the specific date, meeting point, difficulty, dog policy and whether booking is required. Source: wakefield.gov.uk/walking and the Council walking-groups timetable.
- **Wakefield and District Ramblers** organises guided group walks ranging from easier local walks to longer moderate routes. Use ramblers.org.uk for current walks, distances, difficulty and meeting points.

GYMS & FITNESS:
- Wakefield Council's **Aspire** network includes Sun Lane Leisure, Aspire @ The Park, Featherstone Sports Complex, Minsthorpe Leisure, Normanton Leisure and Thornes Park Stadium. Aspire offers gyms, swimming and fitness classes, with memberships and Pay & Play options. Source: wakefield.gov.uk/sport-and-leisure.
- Private gyms also operate throughout the district. For recommendations, verify the current location, facilities, opening hours, membership terms and whether the user wants 24-hour access, classes, strength training, budget or family facilities before ranking them.

SWIMMING — CHILDREN & ADULTS:
- Wakefield Council's STA Swim Academy offers lessons from age 1 through adulthood. Adult beginner and improver lessons are available, plus junior programmes including SEND swimming for ages 5+. Source: wakefield.gov.uk/sport-and-leisure/sport-activities-and-classes/swimming/swimming-lessons.
- **Sun Lane Leisure** has a 6-lane 25m pool plus a smaller pool. **Aspire @ The Park** has a 10-lane 25m pool. **Minsthorpe Leisure** has a 6-lane 25m pool. Always use the live Council timetable for public swims, lane swims, family sessions and lessons.

PADEL:
- **Midfield Padel & Wellness Centre**, East Ardsley, currently operates indoor padel courts. Verify current booking slots and prices through the venue/booking platform before recommending a specific session.
- **Castle Padel Club** at Sandal Rugby Club is a new Wakefield padel project. Its official website has recently described the venue as 'opening soon', while third-party listings may show hours. Treat its operating status as changeable and verify directly before telling a user it is open or bookable.

CRICKET:
- **Calder Grove Cricket Club** is Ask Wakefield's primary local cricket listing. The club is based on Denby Dale Road, Calder Grove, Wakefield WF4 3DP and competes in the Pontefract & District Cricket League. Current club activity includes senior cricket, junior sessions and women's cricket. Verify current teams, fixtures, training and membership through caldergrove.play-cricket.com and the club's current social channels before giving specific times.
- Calder Grove also has a notable community-service history. Cricket Yorkshire documented how club volunteers built a community food-bank response during the pandemic. Treat that as historical context unless current activity is separately verified.
- Wakefield district also has other cricket clubs. If the user asks for alternatives, location-specific options, a particular age group or women's/girls' cricket, search current first-party or Play-Cricket sources rather than presenting a single club as objectively the best.
- **Stumps Indoor Cricket Nets** in Wakefield can be useful for indoor practice. Verify current booking availability and prices before recommending.

DADS, PARENTS & COMMUNITY SUPPORT:
- **Dad Matters Wakefield & District** offers peer support for dads and male carers, including hospital outreach, one-to-one support and Walk & Talk sessions for dads with babies and children. Current dates and venues change, so use dadmattersyorkshire.uk/wakefield/ for the latest programme and contacts.
- Dad Matters is support-focused, not merely an activity club. Respond sensitively when a user asks about parenting, isolation, anxiety, stress or family support, and direct them to the current local service rather than diagnosing or counselling beyond scope.

AFTER-SCHOOL, YOUTH & LEARNING:
- **Theatre Royal Wakefield Performance Academy** runs Saturday term-time musical-theatre training. PA Kids is for ages 5–6 and Performance Academy is for ages 7–18. The Wakefield academy currently reports a waiting list, so verify spaces before suggesting someone can join immediately. Source: theatreroyalwakefield.co.uk/take-part/performance-academy.
- **Wakefield Library Code Club** at Wakefield One is a free term-time coding club using Scratch, Python and HTML. The current Council events listing shows Thursday sessions from 16:00–17:00 with booking required. Verify the date before telling someone it is running on a particular week. Source: wakefield.gov.uk library events.
- **Wakefield Scouts** has local Squirrel, Beaver, Cub, Scout and Explorer groups across the district, including Crofton, Horbury Bridge, Ossett, Thornes, Newmillerdam, Outwood, Stanley, Sandal, Wrenthorpe and other areas. Group nights vary by section and location. Source: wakefieldscouts.org.uk/local-groups/.
- **ElliTe Studios Junior Dance Academy** at Thornes Park offers extra-curricular dance training for ages 3–18 in a range of styles, with a specialist under-6 programme and ISTD pathways. Verify the current timetable and availability before quoting a class time. Source: ellitestudios.co.uk.
- **Aspire Junior Gym** gives ages 11–15 access to gym facilities. Staff-led Junior Gym sessions can be attended without an adult; general access outside those sessions requires the Council's stated supervision/induction rules. Verify centre-specific session times before recommending one. Source: wakefield.gov.uk junior gym.
- **Taekwondo at Featherstone Sports Complex** is currently listed by Wakefield Council for ages 6+, beginners welcome, with Monday and Wednesday evening sessions and Saturday afternoon sessions. Verify current prices/times before travel. Source: wakefield.gov.uk.
- **Kip McGrath Wakefield West** provides English and maths tutoring from Reception to Year 13, including SATs, GCSE, A-Level and 11+ support. Current centre hours include Monday–Thursday after-school sessions and Saturday mornings. Source: kipmcgrath.co.uk/wakefield-west.
- **Wakefield Music Services** provides instrumental tuition across many instruments through schools/academies and direct routes, with some adult options. Availability and fees depend on instrument and setting. Source: wakefieldmusicservices.org.

OTHER SPORTS & CLUBS:
Wakefield has local football, rugby league and rugby union, cycling, tennis, martial arts, bowls, dance, disability sport and other clubs. If a user asks for a specific sport, search current first-party or governing-body sources rather than saying the category is unavailable. Ask age, location and ability level when that would materially improve the recommendation.

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
  'wakefieldharriers.co.uk',
  'parkrun.org.uk',
  'carletonrunning.co.uk',
  'ramblers.org.uk',
  'play-cricket.com',
  'castlepadelclub.com',
  'midfield-ltd.co.uk',
  'playtomic.com',
  'dadmattersyorkshire.uk',
  'home-start.org.uk',
  'englandathletics.org',
  'theatreroyalwakefield.co.uk',
  'wakefieldscouts.org.uk',
  'ellitestudios.co.uk',
  'kipmcgrath.co.uk',
  'wakefieldmusicservices.org'
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

function needsLiveSearch(messages) {
  const last = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  const context = recentUserContext(messages);
  if (/https?:\/\//i.test(last)) return true;

  const liveTerms = /\b(today|tonight|tomorrow|this week|this weekend|weekend|next saturday|next sunday|right now|currently|current|latest|live|open now|open today|open tonight|open tomorrow|is .* open|closed|close[sd]?|opening days?|opening hours?|closing time|what'?s on|wots on|happening|events?|tickets?|prices?|price|costs?|cost|admission|entry fee|road closures?|traffic|last train|first train|train times?|bus times?|timetable|delays?|cancelled|availability|school holidays?|term dates?|tram|route|directions|journey|travel|planning permission|permitted development|building regulations?|two[- ]storey|extension|michelin|bib gourmand|parking|free parking|tk\s?maxx?|store|shop|canoe|canoeing|kayak|kayaking|paddleboard|paddleboarding|water sports?|watersports|canal|swim|swimming|swimming lessons?|swim lessons?|running clubs?|run clubs?|parkrun|athletics clubs?|gyms?|fitness classes?|padel|walking clubs?|walking groups?|health walks?|nordic walks?|hiking clubs?|ramblers?|cricket clubs?|cricket training|cricket fixtures?|sports clubs?|dad matters|dads groups?|dad groups?|father support|parent support|family hubs?|after[- ]school|dance classes?|performing arts|drama classes?|code club|coding club|scouts?|beavers?|cubs?|explorers?|martial arts|taekwondo|karate|junior gym|tutoring|tuition|music lessons?|instrumental lessons?)\b/i;
  if (liveTerms.test(context)) return true;

  // Nearby/local-intent queries benefit from current source checks, especially
  // when the user supplies a postcode, landmark or walking-distance request.
  if (/\b(near|nearby|within walking distance|walking distance|close to|around)\b/i.test(context) &&
      /\b(restaurant|meal|eat|dining|coffee|cafe|park|shop|parking|attraction|cathedral|tileyard|asda|wf\d{1,2})\b/i.test(context)) return true;

  return false;
}

function requiresVerifiedSource(messages) {
  const context = recentUserContext(messages);
  return /\b(last train|first train|train times?|bus times?|timetable|delays?|cancelled|road closures?|planning permission|permitted development|building regulations?|open (today|tonight|tomorrow)|is .* open|closed|opening hours?|what'?s on|wots on|happening|this weekend|weekend|michelin|bib gourmand|parking|free parking|canoe|canoeing|kayak|kayaking|paddleboard|water sports?|watersports|canal|tk\s?maxx?|admission|entry fee|price|cost|swimming lessons?|running clubs?|parkrun|gyms?|padel|walking groups?|health walks?|nordic walks?|ramblers?|cricket clubs?|cricket fixtures?|dad matters|dads groups?|after[- ]school|dance classes?|performing arts|code club|coding club|scouts?|martial arts|taekwondo|karate|junior gym|tutoring|music lessons?)\b/i.test(context);
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
  if (/running|parkrun|athletics|gym|fitness|padel|walking|hiking|ramblers|cricket|swimming lessons?|dad matters|dads group|father support|after[- ]school|dance|performing arts|code club|coding|scouts?|martial arts|taekwondo|karate|junior gym|tutoring|music lessons?/.test(last)) {
    return 'I could not verify the current club, session or timetable from a trusted source just now, so I do not want to give you an outdated time or booking detail. Tell me the activity, age group and part of the Wakefield district you are interested in, and I can narrow it down to the most relevant current options.';
  }
  return 'I could not verify that current information from a trusted source just now, so I do not want to guess. Please check the relevant official venue or service website.';
}

function lastUserText(messages) {
  return messages?.[messages.length - 1]?.content?.toLowerCase() || '';
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

  const directContext = `${wxDirectContext}${userProvidedContext}`;

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

    if (requiresVerifiedSource(messages) && mergedSources.length === 0) {
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
