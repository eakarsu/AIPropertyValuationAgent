require('dotenv').config();

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const SITE_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Strip markdown code fences (```json ... ```) that AI models sometimes wrap responses in.
 */
function stripMarkdownFences(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

/**
 * Repair truncated JSON by closing unclosed brackets/braces.
 */
function repairJSON(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;
  let repaired = jsonStr.replace(/,\s*([}\]])/g, '$1');
  let openBraces = 0, openBrackets = 0;
  let inString = false, escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }
  if (inString) repaired += '"';
  while (openBraces > 0) { repaired += '}'; openBraces--; }
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  return repaired;
}

/**
 * 3-strategy JSON parser:
 * 1. Direct parse after fence strip
 * 2. Extract first JSON object/array with regex
 * 3. Repair and parse
 */
function parseAIJson(text) {
  if (!text) return null;

  // Strategy 1: direct parse after stripping fences
  try {
    const stripped = stripMarkdownFences(text);
    return JSON.parse(stripped);
  } catch (_) {}

  // Strategy 2: extract JSON object or array with regex
  try {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
  } catch (_) {}
  try {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
  } catch (_) {}

  // Strategy 3: repair and parse
  try {
    const stripped = stripMarkdownFences(text);
    const repaired = repairJSON(stripped);
    return JSON.parse(repaired);
  } catch (_) {}

  return null;
}

async function callOpenRouter(prompt, systemPrompt = 'You are an expert real estate appraiser and property valuation AI assistant.') {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': 'AI Property Valuation Agent'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    if (data.choices?.[0]?.finish_reason === 'length') {
      console.warn('OpenRouter response truncated (finish_reason: length).');
    }

    const rawContent = data.choices?.[0]?.message?.content || 'No response generated';
    const content = stripMarkdownFences(rawContent);
    const tokensUsed = data.usage?.total_tokens || 0;

    return { content, tokensUsed };
  } catch (error) {
    console.error('OpenRouter API error:', error.message);
    throw error;
  }
}

module.exports = { callOpenRouter, parseAIJson, stripMarkdownFences, repairJSON };
