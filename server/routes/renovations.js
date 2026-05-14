const express = require('express');
const { RenovationEstimate, Property, AiResult } = require('../models');
const { callOpenRouter, parseAIJson } = require('../services/openrouter');
const auth = require('../middleware/auth');
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
    const { count, rows: renovations } = await RenovationEstimate.findAndCountAll({
      include: [Property], order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ data: renovations, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id, { include: [Property] });
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    res.json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.create(req.body);
    res.status(201).json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id);
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    await renovation.update(req.body);
    res.json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id);
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    await renovation.destroy();
    res.json({ message: 'Renovation estimate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Renovation Advice
router.post('/:id/ai-advise', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id, { include: [Property] });
    if (!renovation) return res.status(404).json({ error: 'Renovation not found' });
    const property = renovation.Property;

    const prompt = `Provide renovation advice for this property improvement.
Property: ${property ? property.address + ', ' + property.city : 'N/A'}
Renovation Type: ${renovation.renovationType}
Estimated Cost: $${renovation.estimatedCost}
Estimated Value Add: $${renovation.estimatedValueAdd}
ROI: ${renovation.roiPercentage}%
Priority: ${renovation.priority}
Timeline: ${renovation.timelineWeeks} weeks

Return JSON:
{
  "worthIt": true|false,
  "worthItReason": "text",
  "costOptimizations": ["tip1","tip2"],
  "roiImprovements": ["imp1","imp2"],
  "timelineFeasible": true|false,
  "contractorTips": ["tip1","tip2"],
  "permitNeeded": true|false,
  "complianceNotes": "text",
  "recommendation": "proceed|modify|skip",
  "analysis": "full narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate renovation advisor. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.analysis || aiResponse;
    await renovation.update({ aiSuggestion: analysisText });
    await persistAiResult(req.user.id, 'ai-advise', 'renovation', renovation.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: analysisText, parsed, renovation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
