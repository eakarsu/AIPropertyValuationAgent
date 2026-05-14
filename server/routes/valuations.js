const express = require('express');
const { Valuation, Property, ComparableSale, AuditLog, AiResult } = require('../models');
const { callOpenRouter, parseAIJson } = require('../services/openrouter');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const router = express.Router();

async function persistAiResult(userId, endpoint, entityType, entityId, prompt, content, tokensUsed, parsedJson) {
  try {
    await AiResult.create({
      userId, endpoint, entityType, entityId,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      prompt, rawResponse: content, parsedJson: parsedJson || null, tokensUsed, status: 'success'
    });
  } catch (e) { console.error('Failed to persist AI result:', e.message); }
}

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const { count, rows: valuations } = await Valuation.findAndCountAll({
      include: [Property],
      order: [['createdAt', 'DESC']],
      limit, offset
    });
    res.json({ data: valuations, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id, { include: [Property] });
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    res.json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/audit', auth, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { entityType: 'valuation', entityId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const valuation = await Valuation.create(req.body);
    await AuditLog.create({
      userId: req.user.id, action: 'CREATE', entityType: 'valuation',
      entityId: valuation.id, oldValue: null, newValue: valuation.toJSON()
    });
    res.status(201).json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id);
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    const oldValue = valuation.toJSON();
    await valuation.update(req.body);
    await AuditLog.create({
      userId: req.user.id, action: 'UPDATE', entityType: 'valuation',
      entityId: valuation.id, oldValue, newValue: valuation.toJSON()
    });
    res.json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id);
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    const oldValue = valuation.toJSON();
    await valuation.destroy();
    await AuditLog.create({
      userId: req.user.id, action: 'DELETE', entityType: 'valuation',
      entityId: parseInt(req.params.id), oldValue, newValue: null
    });
    res.json({ message: 'Valuation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Enhanced Valuation
router.post('/:id/ai-enhance', auth, async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id, { include: [Property] });
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    const property = valuation.Property;

    let comparablesText = '';
    if (property) {
      const comps = await ComparableSale.findAll({
        where: { propertyId: property.id },
        order: [['saleDate', 'DESC']], limit: 5
      });
      if (comps.length > 0) {
        comparablesText = `\n\nRecent Comparable Sales:\n` +
          comps.map((c, i) => `${i + 1}. ${c.address} — $${c.salePrice} (${c.saleDate}), $${c.pricePerSqFt}/sqft, Similarity: ${c.similarityScore}%`).join('\n');
      }
    }

    const prompt = `Enhance this property valuation with structured AI analysis.
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Type: ${property?.propertyType}, SqFt: ${property?.squareFeet}
Current Valuation: $${valuation.estimatedValue}
Confidence: ${valuation.confidenceScore}%
${comparablesText}

Return JSON:
{
  "adjustedValue": number,
  "confidenceScore": number,
  "marketAnalysis": "text",
  "riskFactors": ["risk1","risk2"],
  "adjustments": ["adj1","adj2"],
  "trendImpact": "text",
  "summary": "full analysis narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are an expert real estate appraiser. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.summary || aiResponse;

    const oldValue = valuation.toJSON();
    await valuation.update({ aiAnalysis: analysisText, valuationType: 'ai_enhanced' });

    await AuditLog.create({
      userId: req.user.id, action: 'AI_ENHANCE', entityType: 'valuation',
      entityId: valuation.id, oldValue, newValue: valuation.toJSON()
    });
    await persistAiResult(req.user.id, 'ai-enhance', 'valuation', valuation.id, prompt, aiResponse, tokensUsed, parsed);

    res.json({ analysis: analysisText, parsed, valuation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
