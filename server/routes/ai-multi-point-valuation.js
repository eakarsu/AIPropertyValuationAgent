// AI Multi-point property valuation
// Run multiple AI valuation approaches in parallel with confidence ranges
const express = require('express');
const router = express.Router();
const { AiResult } = require('../models');
const authMiddleware = require('../middleware/auth');

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
// TODO: configure credentials — set process.env.OPENROUTER_API_KEY

async function callLLM(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { success: false, error: 'OPENROUTER_API_KEY not configured' };
  const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AIPropertyValuationAgent'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.4
    })
  });
  if (!response.ok) return { success: false, error: `LLM error ${response.status}` };
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) return { success: false, error: 'LLM returned an empty response' };
  return { success: true, content, tokensUsed: data.usage?.total_tokens || 0 };
}

function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  const a = text.search(/[{\[]/);
  const b = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (a !== -1 && b !== -1) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

async function persistResult(userId, endpoint, inputData, result, tokensUsed) {
  return AiResult.create({
    userId,
    endpoint,
    model: MODEL,
    prompt: JSON.stringify(inputData),
    rawResponse: JSON.stringify(result),
    parsedJson: result,
    tokensUsed,
    status: 'success'
  });
}

router.use(authMiddleware);
// POST /
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const context = payload.context || payload.data || payload;
    const systemPrompt = `You are an expert AI assistant for AIPropertyValuationAgent. Focus area: Multi-point property valuation. ${`Run multiple AI valuation approaches in parallel with confidence ranges`}. Respond ONLY with valid JSON (no markdown fences).`;
    const userPrompt = `Task: Multi-point property valuation.\n${`Run multiple AI valuation approaches in parallel with confidence ranges`}\n\nInput payload (JSON):\n${JSON.stringify(context, null, 2)}\n\nReturn JSON with the shape:\n{\n  "summary": "...",\n  "findings": ["..."],\n  "recommendations": ["..."],\n  "score": 0,\n  "confidence": 0\n}`;
    const llm = await callLLM(systemPrompt, userPrompt);
    if (!llm.success) return res.status(503).json({ error: llm.error });
    const parsed = parseJsonLoose(llm.content) || { raw: llm.content };
    await persistResult(req.user?.id, 'multi-point-valuation', context, parsed, llm.tokensUsed);
    res.json({ feature: 'multi-point-valuation', model: MODEL, result: parsed });
  } catch (err) {
    console.error('[multi-point-valuation]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /history — recent results for current user
router.get('/history', async (req, res) => {
  try {
    const items = await AiResult.findAll({
      where: { userId: req.user.id, endpoint: 'multi-point-valuation' },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return res.json({ items });
  } catch (err) {
    res.json({ items: [], error: err.message });
  }
});

module.exports = router;
