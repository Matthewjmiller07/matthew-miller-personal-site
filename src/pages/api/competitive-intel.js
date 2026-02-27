import fs from 'fs';
import path from 'path';

export const prerender = false;

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
const DEFAULT_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

function getEnvValue(key) {
  return process.env[key] || import.meta.env?.[key] || '';
}

function loadCompetitiveIntelData() {
  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'competitive-intel-2026.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load competitive intel data:', error);
    return null;
  }
}

function summarizeGroundingData(data) {
  if (!data) {
    return 'No local competitive intelligence dataset available.';
  }

  const openAiPricing = (data.openai?.pricing || [])
    .slice(0, 6)
    .map((p) => `${p.model}: $${p.input}/1M input, $${p.output}/1M output`)
    .join('; ');

  const competitors = (data.competitors || [])
    .slice(0, 10)
    .map((c) => {
      return [
        `${c.name} [threat=${c.threat}]`,
        `flagship=${c.flagship_model} ($${c.flagship_input}/$${c.flagship_output})`,
        `headline=${c.headline}`,
      ].join(' | ');
    })
    .join('\n');

  return [
    `Dataset updated: ${data.updated || 'unknown date'}`,
    `OpenAI headline: ${data.openai?.headline || 'n/a'}`,
    `OpenAI pricing: ${openAiPricing}`,
    'Competitor snapshots:',
    competitors,
  ].join('\n');
}

function extractJsonObject(rawText) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = rawText.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function transcribeAudio({ file, apiKey }) {
  if (!file) return '';

  const formData = new FormData();
  formData.append('model', DEFAULT_TRANSCRIBE_MODEL);
  formData.append('file', file, file.name || 'audio.wav');

  const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  return payload.text || '';
}

async function generateBattlecard({ apiKey, prompt }) {
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
            'You are a sales engineering copilot that helps GTM teams position OpenAI products with factual, concise, and ethical guidance. Never fabricate numbers. If data is uncertain, mark it uncertain. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_object',
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Generation failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const rawContent = payload?.choices?.[0]?.message?.content || '';

  let parsed = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    parsed = extractJsonObject(rawContent);
  }

  if (!parsed) {
    throw new Error('Model response was not valid JSON.');
  }

  return parsed;
}

export async function POST({ request }) {
  const apiKey = getEnvValue('OPENAI_API_KEY');

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server is missing OPENAI_API_KEY. Add it to your environment before using this endpoint.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    const isFormPayload =
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded');

    let rawBodyText = '';
    try {
      rawBodyText = await request.clone().text();
    } catch {
      rawBodyText = '';
    }

    let inputText = '';
    let accountName = '';
    let persona = '';
    let salesStage = '';
    let audioFile = null;

    if (isFormPayload) {
      try {
        const formData = await request.clone().formData();
        inputText = String(formData.get('inputText') || '').trim();
        accountName = String(formData.get('accountName') || '').trim();
        persona = String(formData.get('persona') || '').trim();
        salesStage = String(formData.get('salesStage') || '').trim();
        audioFile = formData.get('audio');
      } catch {
        // Fall through to raw body parsing below.
      }
    } else {
      let body = {};
      try {
        body = await request.clone().json();
      } catch {
        body = {};
      }

      inputText = String(body?.inputText || body?.text || '').trim();
      accountName = String(body?.accountName || '').trim();
      persona = String(body?.persona || '').trim();
      salesStage = String(body?.salesStage || '').trim();
      audioFile = null;
    }

    if (!inputText && rawBodyText) {
      try {
        const parsed = JSON.parse(rawBodyText);
        inputText = String(parsed?.inputText || parsed?.text || '').trim();
        accountName = accountName || String(parsed?.accountName || '').trim();
        persona = persona || String(parsed?.persona || '').trim();
        salesStage = salesStage || String(parsed?.salesStage || '').trim();
      } catch {
        inputText = rawBodyText.trim();
      }
    }

    if (!inputText && !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Provide either text input or an audio recording.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (audioFile instanceof File && audioFile.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Audio file is too large. Please upload 25MB or smaller.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const transcript = audioFile instanceof File ? await transcribeAudio({ file: audioFile, apiKey }) : '';

    const mergedContext = [inputText, transcript]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const competitiveData = loadCompetitiveIntelData();
    const groundingSummary = summarizeGroundingData(competitiveData);

    const prompt = [
      'Build a real-time competitive intelligence response for an OpenAI GTM seller.',
      '',
      'Return JSON with this exact shape:',
      '{',
      '  "executive_summary": "string",',
      '  "talking_points": ["string"],',
      '  "competitive_counters": [{"competitor":"string","claim":"string","counter":"string","proof":"string"}],',
      '  "objection_handling": [{"objection":"string","response":"string"}],',
      '  "next_best_actions": ["string"],',
      '  "cited_figures": ["string"],',
      '  "confidence_notes": ["string"]',
      '}',
      '',
      'Rules:',
      '- Keep it concise and sales-ready.',
      '- Include 2-5 concrete figures from grounding data when relevant.',
      '- Explicitly call out if a figure is uncertain or stale.',
      '- Avoid attacks or misleading claims; keep positioning factual.',
      '',
      `Account name: ${accountName || 'Unknown'}`,
      `Buyer persona: ${persona || 'Unknown'}`,
      `Sales stage: ${salesStage || 'Unknown'}`,
      '',
      'Seller notes / call transcript:',
      mergedContext,
      '',
      'Grounding data:',
      groundingSummary,
    ].join('\n');

    const analysis = await generateBattlecard({ apiKey, prompt });

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        analysis,
        groundingUpdated: competitiveData?.updated || null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Competitive intel API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error generating competitive intel.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
