import assert from 'node:assert/strict';
import { withUsageTelemetry, recordAnthropicUsage, recordGooglePlacesCall } from '../lib/usage-telemetry.js';

process.env.ASKWAKEFIELD_TELEMETRY_DEBUG = 'true';
let returned;
const res = { json(body) { returned = body; return body; } };

await withUsageTelemetry({ requestType: 'test', res }, async () => {
  recordAnthropicUsage({
    model: 'claude-haiku-4-5-20251001',
    responseOk: true,
    usage: {
      input_tokens: 10_000,
      output_tokens: 1_000,
      server_tool_use: { web_search_requests: 2 }
    }
  });
  recordGooglePlacesCall({ sku: 'enterprise', responseOk: true });
  recordGooglePlacesCall({ sku: 'enterprise_atmosphere', responseOk: true });
  res.json({ ok: true });
});

assert.equal(returned._telemetry.anthropic.inputTokens, 10_000);
assert.equal(returned._telemetry.anthropic.outputTokens, 1_000);
assert.equal(returned._telemetry.anthropic.webSearchRequests, 2);
assert.equal(returned._telemetry.googlePlaces.enterpriseCalls, 1);
assert.equal(returned._telemetry.googlePlaces.enterpriseAtmosphereCalls, 1);
// Anthropic: .01 + .005 + .02 = .035; Places: .035 + .040 = .075; total .110
assert.equal(returned._telemetry.estimatedKnownListPriceUsd, 0.11);
console.log('Usage telemetry tests passed.');
