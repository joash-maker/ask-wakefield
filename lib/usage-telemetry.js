import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const telemetryStore = new AsyncLocalStorage();

// List-price estimates, USD, checked against provider documentation on 2026-10-04.
// Google Maps free usage caps and volume discounts are NOT applied here. The
// purpose is to expose the marginal/list-price shape of each request so the
// real invoice can later be reconciled against provider billing exports.
const ANTHROPIC_DEFAULT_RATES = {
  'claude-haiku-4-5': {
    inputPerM: 1,
    outputPerM: 5,
    cacheWrite5mPerM: 1.25,
    cacheWrite1hPerM: 2,
    cacheReadPerM: 0.10,
    webSearchEach: 0.01
  }
};

const GOOGLE_PLACES_TEXT_SEARCH_USD = {
  pro: 0.032,
  enterprise: 0.035,
  enterprise_atmosphere: 0.040
};

function round(value, places = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function current() {
  return telemetryStore.getStore() || null;
}

function ensureProvider(ctx, name) {
  if (!ctx.providers[name]) ctx.providers[name] = { calls: 0, successfulCalls: 0 };
  return ctx.providers[name];
}

function anthropicRates(model = '') {
  const envInput = Number(process.env.ANTHROPIC_INPUT_USD_PER_MTOK);
  const envOutput = Number(process.env.ANTHROPIC_OUTPUT_USD_PER_MTOK);
  const envSearch = Number(process.env.ANTHROPIC_WEB_SEARCH_USD_PER_1000);
  if (Number.isFinite(envInput) && Number.isFinite(envOutput)) {
    return {
      inputPerM: envInput,
      outputPerM: envOutput,
      cacheWrite5mPerM: Number(process.env.ANTHROPIC_CACHE_WRITE_5M_USD_PER_MTOK || envInput * 1.25),
      cacheWrite1hPerM: Number(process.env.ANTHROPIC_CACHE_WRITE_1H_USD_PER_MTOK || envInput * 2),
      cacheReadPerM: Number(process.env.ANTHROPIC_CACHE_READ_USD_PER_MTOK || envInput * 0.1),
      webSearchEach: Number.isFinite(envSearch) ? envSearch / 1000 : 0.01
    };
  }
  const key = Object.keys(ANTHROPIC_DEFAULT_RATES).find(prefix => String(model).includes(prefix));
  return key ? ANTHROPIC_DEFAULT_RATES[key] : null;
}

function anthropicCost(model, usage = {}) {
  const rates = anthropicRates(model);
  if (!rates) return null;
  const input = Number(usage.input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  const cacheRead = Number(usage.cache_read_input_tokens || 0);
  const cacheCreate = Number(usage.cache_creation_input_tokens || 0);
  const fiveMinute = Number(usage.cache_creation?.ephemeral_5m_input_tokens || 0);
  const oneHour = Number(usage.cache_creation?.ephemeral_1h_input_tokens || 0);
  const unclassifiedCacheCreate = Math.max(0, cacheCreate - fiveMinute - oneHour);
  const searches = Number(usage.server_tool_use?.web_search_requests || 0);
  return (
    input * rates.inputPerM / 1_000_000 +
    output * rates.outputPerM / 1_000_000 +
    cacheRead * rates.cacheReadPerM / 1_000_000 +
    fiveMinute * rates.cacheWrite5mPerM / 1_000_000 +
    oneHour * rates.cacheWrite1hPerM / 1_000_000 +
    unclassifiedCacheCreate * rates.cacheWrite5mPerM / 1_000_000 +
    searches * rates.webSearchEach
  );
}

function buildSummary(ctx) {
  const elapsedMs = Date.now() - ctx.startedAt;
  const anthropic = ctx.providers.anthropic || {};
  const places = ctx.providers.googlePlaces || {};
  const openai = ctx.providers.openai || {};
  const knownCost = Number(ctx.estimatedListPriceUsd || 0);
  const unknownCostProviders = [];
  if ((openai.successfulCalls || 0) > 0 && !Number.isFinite(openai.estimatedListPriceUsd)) unknownCostProviders.push('openai');

  return {
    schema: 1,
    requestId: ctx.requestId,
    requestType: ctx.requestType,
    route: ctx.route || null,
    startedAt: new Date(ctx.startedAt).toISOString(),
    elapsedMs,
    anthropic: {
      calls: anthropic.calls || 0,
      successfulCalls: anthropic.successfulCalls || 0,
      model: anthropic.model || null,
      inputTokens: anthropic.inputTokens || 0,
      outputTokens: anthropic.outputTokens || 0,
      cacheReadTokens: anthropic.cacheReadTokens || 0,
      cacheCreationTokens: anthropic.cacheCreationTokens || 0,
      webSearchRequests: anthropic.webSearchRequests || 0,
      estimatedListPriceUsd: round(anthropic.estimatedListPriceUsd || 0)
    },
    googlePlaces: {
      attempts: places.calls || 0,
      successfulCalls: places.successfulCalls || 0,
      proCalls: places.proCalls || 0,
      enterpriseCalls: places.enterpriseCalls || 0,
      enterpriseAtmosphereCalls: places.enterpriseAtmosphereCalls || 0,
      estimatedMarginalListPriceUsd: round(places.estimatedListPriceUsd || 0),
      note: 'Google monthly free usage caps and volume discounts are not applied to this estimate.'
    },
    openai: {
      calls: openai.calls || 0,
      successfulCalls: openai.successfulCalls || 0,
      model: openai.model || null,
      inputTokens: openai.inputTokens || 0,
      outputTokens: openai.outputTokens || 0,
      webSearchCalls: openai.webSearchCalls || 0,
      estimatedListPriceUsd: Number.isFinite(openai.estimatedListPriceUsd) ? round(openai.estimatedListPriceUsd) : null
    },
    estimatedKnownListPriceUsd: round(knownCost),
    unknownCostProviders
  };
}

export async function withUsageTelemetry({ requestType = 'chat', res } = {}, fn) {
  const ctx = {
    requestId: randomUUID(),
    requestType,
    startedAt: Date.now(),
    route: null,
    providers: {},
    estimatedListPriceUsd: 0
  };

  return telemetryStore.run(ctx, async () => {
    let originalJson = null;
    if (res?.json && typeof res.json === 'function') {
      originalJson = res.json.bind(res);
      res.json = body => {
        const summary = buildSummary(ctx);
        if (process.env.ASKWAKEFIELD_TELEMETRY_DEBUG === 'true' && body && typeof body === 'object') {
          return originalJson({ ...body, _telemetry: summary });
        }
        return originalJson(body);
      };
    }

    try {
      return await fn();
    } finally {
      const summary = buildSummary(ctx);
      console.info(`[usage-telemetry] ${JSON.stringify(summary)}`);
    }
  });
}

export function setTelemetryRoute(route) {
  const ctx = current();
  if (!ctx) return;
  if (typeof route === 'string') ctx.route = route;
  else if (route && typeof route === 'object') {
    ctx.route = [route.intent, route.operation].filter(Boolean).join(':') || null;
  }
}

export function recordAnthropicUsage({ model, responseOk, usage } = {}) {
  const ctx = current();
  if (!ctx) return;
  const p = ensureProvider(ctx, 'anthropic');
  p.calls += 1;
  if (responseOk) p.successfulCalls += 1;
  p.model = model || p.model || null;
  if (!usage || typeof usage !== 'object') return;
  p.inputTokens = (p.inputTokens || 0) + Number(usage.input_tokens || 0);
  p.outputTokens = (p.outputTokens || 0) + Number(usage.output_tokens || 0);
  p.cacheReadTokens = (p.cacheReadTokens || 0) + Number(usage.cache_read_input_tokens || 0);
  p.cacheCreationTokens = (p.cacheCreationTokens || 0) + Number(usage.cache_creation_input_tokens || 0);
  p.webSearchRequests = (p.webSearchRequests || 0) + Number(usage.server_tool_use?.web_search_requests || 0);
  const cost = anthropicCost(model, usage);
  if (Number.isFinite(cost)) {
    p.estimatedListPriceUsd = (p.estimatedListPriceUsd || 0) + cost;
    ctx.estimatedListPriceUsd += cost;
  }
}

export function recordGooglePlacesCall({ sku = 'enterprise', responseOk = false } = {}) {
  const ctx = current();
  if (!ctx) return;
  const p = ensureProvider(ctx, 'googlePlaces');
  p.calls += 1;
  if (!responseOk) return;
  p.successfulCalls += 1;
  if (sku === 'enterprise_atmosphere') p.enterpriseAtmosphereCalls = (p.enterpriseAtmosphereCalls || 0) + 1;
  else if (sku === 'pro') p.proCalls = (p.proCalls || 0) + 1;
  else p.enterpriseCalls = (p.enterpriseCalls || 0) + 1;
  const rate = GOOGLE_PLACES_TEXT_SEARCH_USD[sku];
  if (Number.isFinite(rate)) {
    p.estimatedListPriceUsd = (p.estimatedListPriceUsd || 0) + rate;
    ctx.estimatedListPriceUsd += rate;
  }
}

export function recordOpenAIUsage({ model, responseOk, usage, webSearchCalls = 0 } = {}) {
  const ctx = current();
  if (!ctx) return;
  const p = ensureProvider(ctx, 'openai');
  p.calls += 1;
  if (responseOk) p.successfulCalls += 1;
  p.model = model || p.model || null;
  p.inputTokens = (p.inputTokens || 0) + Number(usage?.input_tokens || usage?.prompt_tokens || 0);
  p.outputTokens = (p.outputTokens || 0) + Number(usage?.output_tokens || usage?.completion_tokens || 0);
  p.webSearchCalls = (p.webSearchCalls || 0) + Number(webSearchCalls || 0);

  const inputRate = Number(process.env.OPENAI_VERIFY_INPUT_USD_PER_MTOK);
  const outputRate = Number(process.env.OPENAI_VERIFY_OUTPUT_USD_PER_MTOK);
  const searchRatePer1000 = Number(process.env.OPENAI_WEB_SEARCH_USD_PER_1000);
  if (Number.isFinite(inputRate) && Number.isFinite(outputRate)) {
    const cost = p.inputTokens * inputRate / 1_000_000 + p.outputTokens * outputRate / 1_000_000
      + (Number.isFinite(searchRatePer1000) ? p.webSearchCalls * searchRatePer1000 / 1000 : 0);
    const previous = Number.isFinite(p.estimatedListPriceUsd) ? p.estimatedListPriceUsd : 0;
    const incremental = Math.max(0, cost - previous);
    p.estimatedListPriceUsd = cost;
    ctx.estimatedListPriceUsd += incremental;
  } else {
    p.estimatedListPriceUsd = null;
  }
}
