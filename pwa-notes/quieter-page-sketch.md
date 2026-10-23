# Quieter page sketch — Ask Wakefield

## Goal
Make the chat the object. The rest of the page becomes a quiet frame.

## Web version (people arriving via browser)
- Off-white ground (#faf9f7)
- Modest title: Ask *Wakefield* (Cormorant, italic red on second word)
- One short line: Independent local assistant
- Six quiet starting points (What's on, Families, Food & coffee, Sports & fitness, Clubs & community, Local services)
- The existing dark chat panel directly below
- Short footer with: Submit an event · List a business · Privacy · For organisations

Remove or hide for now:
- Full-height hero photograph and stats
- Scrolling marquee
- Large destination cards section
- Long FAQ and explanatory blocks (move key facts to footer or a secondary page)

## Installed / standalone version
When launched from the home screen:
- Dark chat surface fills the screen
- Name at the top
- Six starting points
- Input at the bottom
- No surrounding marketing frame

## Materials to keep
- Type: Cormorant Garamond + Syne + DM Mono
- Colour: off-white ground, dark panel, single red #e61c5d
- Grain texture
- Existing chat styling and behaviour

## Implementation note
The current index.html is large. The smallest useful first change is to add a display-mode check so that when the site is opened in standalone mode it hides the hero and cards and centres the chat. The full visual quieting of the web page can follow once the PWA is confirmed working.
