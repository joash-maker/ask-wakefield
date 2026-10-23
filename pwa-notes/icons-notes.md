# Icon notes for Ask Wakefield PWA

The existing favicon is a simple SVG:
- White background
- Serif “A” in black (#111111)
- Italic “W” in the site red (#e61c5d)

## Required PNG files (place in /icons/)

| File | Size | Purpose |
|------|------|---------|
| icon-192.png | 192×192 | Standard icon |
| icon-512.png | 512×512 | Standard icon + splash |
| icon-512-maskable.png | 512×512 | Maskable (safe zone for Android cropping) |
| apple-touch-icon.png | 180×180 | iOS home-screen icon |

## Suggested generation

1. Export or recreate the current “A W” mark at high resolution.
2. For the maskable version, keep important content inside the central 80% safe zone and fill the rest with the background colour (#faf9f7 or white).
3. Place the four PNGs in a new `/icons/` folder in the repo root.

Once the PNGs exist they can be referenced correctly in the manifest and head tags.
