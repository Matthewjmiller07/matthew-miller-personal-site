const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';

export const prerender = false;

function getEnvValue(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

function extractJsonObject(rawText) {
  const text = String(rawText || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST({ request }) {
  const apiKey = getEnvValue('OPENAI_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing OPENAI_API_KEY in environment.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let body = {};
    let transcript = '';
    let accountName = '';
    let pricingContext = [];

    if (contentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      transcript = String(body?.transcript || '').trim();
      accountName = String(body?.accountName || '').trim();
      pricingContext = Array.isArray(body?.pricingContext) ? body.pricingContext : [];
    } else {
      let rawText = '';
      try {
        rawText = await request.text();
      } catch {
        rawText = '';
      }

      transcript = String(rawText || '').trim();
    }

    const pricingLines = pricingContext
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Missing transcript text.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_CHAT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a real-time GTM copilot. Return JSON only with concise tactical guidance. Keep each suggestion under 20 words.',
          },
          {
            role: 'user',
            content: [
              `Account: ${accountName || 'Unknown'}`,
              'Recent transcript chunk:',
              transcript,
              '',
              pricingLines.length
                ? `Live pricing context:\n${pricingLines.map((line) => `- ${line}`).join('\n')}`
                : 'Live pricing context: unavailable.',
              '',
              'Return JSON shape:',
              '{',
              '  "live_suggestions": ["string"],',
              '  "risk_flags": ["string"],',
              '  "ask_next": ["string"]',
              '}',
            ].join('\n'),
          },
        ],
        response_format: {
          type: 'json_object',
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Suggestion generation failed (${response.status}): ${details}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    let parsed = null;

    try {
      parsed = content ? JSON.parse(content) : null;
    } catch {
      parsed = extractJsonObject(content);
    }

    if (!parsed) {
      throw new Error('Model response was not valid JSON.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        liveSuggestions: Array.isArray(parsed.live_suggestions) ? parsed.live_suggestions : [],
        riskFlags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
        askNext: Array.isArray(parsed.ask_next) ? parsed.ask_next : [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected suggestion error.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
