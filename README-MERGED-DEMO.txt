AskWakefield v17 merged demo build | 29 September 2026

This is the full site package from the supplied v17 archive, with the later family and city-centre knowledge records merged in.

Changes in this merged build
- Keeps the three-hour couple itinerary: 10:00 Hepworth Café brunch, then KRA:FT at 12 Wood Street, books and The Art House. A bare Friday reply resolves to Friday 2 October 2026 when asked on Tuesday 29 September. Waterstones is a chain, Comics-616 is independent.
- Keeps the latest family play-centre choices, including Cheeky Monkeys and Stanley Ferry Wacky Warehouse, without inventing admission or transport for unverified venues.
- Weekend event follow-ups use signed state tokens passed by the main page and cross-origin widget. A tampered token with no valid cookie does not fall back to prose reconstruction.
- Event start-time replies state the start, not the full duration. When the WX detail page supplies a separate performance start, that time is included. Quadrophenia lists doors and DJs at 17:00 and performance at 17:30.
- Removed the wildcard /api CORS header from vercel.json. The chat handler now allows the two AskWakefield domains and explicit ALLOWED_ORIGINS only. Other cross-origin widget host domains must be listed in ALLOWED_ORIGINS.

Deployment settings
- Set STATE_SIGNING_SECRET to a long random value in Vercel. If omitted, the server derives a signing key from ANTHROPIC_API_KEY, which makes chats expire when that key rotates.
- For an embedded widget hosted on another domain, add its exact HTTPS origin to ALLOWED_ORIGINS (comma-separated for several). Same-origin Vercel Preview works without adding its domain. Do not set a wildcard.
- Keep your existing API keys and other environment variables. This package is not a database migration.

Checks
- Run: node tests/conversation-harness.mjs
- The harness uses a frozen 29 September 2026 clock and mocked event pages. It asserts the three-demo event subset, 11:00 Caphouse start, WX doors/performance times, family follow-up, Hepworth/KRA:FT Friday sequence, widget token and tamper rejection.
- Syntax checks pass for api/chat.js and the two local-place modules. The full mocked conversation suite passes.
- The package has not been deployed or exercised against live Preview. After deploying to Preview, retest the three continuous chats with a fresh chat for each. Check the source links and an embedded widget on its actual host domain.

Known scope
- Other intents such as pharmacy and transport still use the earlier model path. This merge focuses on the Friday three-demo flow and v17 state continuity.
- Official venue listings can change. The mock tests prove routing and formatting, not future opening hours or event admission.
