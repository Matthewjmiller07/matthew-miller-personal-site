const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v1';

export const prerender = false;

function getEnvValue(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

const PROVIDER_SOURCES = [
  {
    provider: 'OpenAI',
    scope: 'API (GPT-4.1, o3, GPT-4o, embeddings, images)',
    urls: ['https://openai.com/api/pricing/'],
  },
  {
    provider: 'Google Gemini (Vertex AI)',
    scope: 'Gemini API on Vertex AI',
    urls: ['https://cloud.google.com/vertex-ai/generative-ai/pricing'],
  },
  {
    provider: 'Google Gemini (Workspace & Consumer)',
    scope: 'Gemini for Workspace and Google One AI plans',
    urls: [
      'https://workspace.google.com/products/gemini/',
      'https://www.eesel.ai/blog/gemini-pricing',
    ],
  },
  {
    provider: 'Anthropic Claude',
    scope: 'Claude API and commercial plans',
    urls: [
      'https://www.anthropic.com/api',
      'https://www.anthropic.com/pricing',
      'https://intuitionlabs.ai/articles/claude-pricing-plans-api-costs',
    ],
  },
  {
    provider: 'Perplexity',
    scope: 'Consumer + enterprise plans',
    urls: [
      'https://www.perplexity.ai/pricing',
      'https://familypro.io/en/blog/how-much-does-perplexity-cost',
      'https://www.glbgpt.com/hub/perplexity-enterprise-pro-and-max-price-plans-costs-and-value-2026-guide/',
    ],
  },
  {
    provider: 'DeepSeek',
    scope: 'DeepSeek API pricing',
    urls: [
      'https://api-docs.deepseek.com/quick_start/pricing',
      'https://artificialanalysis.ai/models/deepseek-r1',
    ],
  },
  {
    provider: 'Mistral AI',
    scope: 'Mistral API pricing tiers',
    urls: [
      'https://docs.mistral.ai/getting-started/pricing/',
      'https://obot.ai/resources/learning-center/mistral-ai/',
    ],
  },
];

const CACHE_TTL_MS = 1000 * 60 * 15;
let cachedPayload = null;

function normalizeExtractPayload(extracted) {
  if (!extracted) return null;
  if (typeof extracted === 'string') {
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
  return extracted;
}

function normalizeProvider(providerConfig, raw) {
  return {
    provider: raw?.provider || providerConfig.provider,
    scope: providerConfig.scope || 'Pricing scope not specified',
    summary: raw?.summary || 'No summary returned.',
    priceSignals: Array.isArray(raw?.price_signals) ? raw.price_signals.slice(0, 5) : [],
    lastVerifiedHint: raw?.last_verified_hint || 'Not specified',
    sourceUrls: Array.isArray(raw?.source_urls) && raw.source_urls.length ? raw.source_urls : providerConfig.urls,
  };
}

async function fetchLivePricingFromFirecrawl(apiKey) {
  const normalized = [];

  for (const providerConfig of PROVIDER_SOURCES) {
    const prompt = [
      `Extract latest pricing details for ${providerConfig.provider}.`,
      `Scope: ${providerConfig.scope}`,
      'Return strict JSON with this shape:',
      '{',
      '  "provider": "string",',
      '  "summary": "one sentence summary",',
      '  "price_signals": ["string"],',
      '  "last_verified_hint": "string",',
      '  "source_urls": ["string"]',
      '}',
      'Focus on concrete prices or pricing structure; if exact prices are absent, say so clearly.',
    ].join('\n');

    try {
      const response = await fetch(`${FIRECRAWL_API_BASE}/extract`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: providerConfig.urls,
          prompt,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Firecrawl extract failed (${response.status}): ${details}`);
      }

      const payload = await response.json();
      const extracted = payload?.data || payload?.result || payload;
      const parsed = normalizeExtractPayload(extracted);

      normalized.push(normalizeProvider(providerConfig, parsed));
    } catch (error) {
      normalized.push(
        normalizeProvider(providerConfig, {
          summary: `Could not refresh now: ${error.message}`,
          price_signals: [],
          last_verified_hint: 'Fetch failed',
          source_urls: providerConfig.urls,
        })
      );
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    providers: normalized,
  };
}

export async function GET() {
  const apiKey = getEnvValue('FIRECRAWL_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing FIRECRAWL_API_KEY in environment.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const now = Date.now();
  if (cachedPayload && now - cachedPayload.cachedAt < CACHE_TTL_MS) {
    return new Response(
      JSON.stringify({
        success: true,
        cached: true,
        updatedAt: cachedPayload.updatedAt,
        providers: cachedPayload.providers,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const live = await fetchLivePricingFromFirecrawl(apiKey);

    cachedPayload = {
      ...live,
      cachedAt: now,
    };

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        updatedAt: live.updatedAt,
        providers: live.providers,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch live pricing.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
