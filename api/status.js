export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    build: 'v18-core-2026-10-01.1',
    livePlacesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY)
      && process.env.GOOGLE_PLACES_ENABLED !== 'false',
    stateSigningConfigured: Boolean(process.env.STATE_SIGNING_SECRET)
  });
}
