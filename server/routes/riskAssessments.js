const express = require('express');
const { RiskAssessment, Property, AiResult } = require('../models');
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
    const { count, rows: risks } = await RiskAssessment.findAndCountAll({
      include: [Property], order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ data: risks, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id, { include: [Property] });
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.create(req.body);
    res.status(201).json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id);
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    await risk.update(req.body);
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id);
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    await risk.destroy();
    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Risk Analysis
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id, { include: [Property] });
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    const property = risk.Property;

    const prompt = `Provide a comprehensive risk analysis for this property.
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Flood Zone: ${risk.floodZone}
Earthquake Risk: ${risk.earthquakeRisk}
Fire Risk: ${risk.fireRisk}
Environmental Risk: ${risk.environmentalRisk}
Overall Risk Score: ${risk.overallRiskScore}/10
Insurance Estimate: $${risk.insuranceEstimate}/year

Return JSON:
{
  "overallRiskLevel": "low|moderate|high|very_high",
  "criticalRisks": ["risk1","risk2"],
  "insuranceAdequacy": "adequate|insufficient|excessive",
  "mitigationStrategies": ["strategy1","strategy2"],
  "valueImpact": number (% impact on property value),
  "longTermOutlook": "text",
  "recommendedCoverage": ["coverage1","coverage2"],
  "analysis": "full narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate risk analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.analysis || aiResponse;
    await risk.update({ aiRiskAnalysis: analysisText });
    await persistAiResult(req.user.id, 'ai-analyze', 'risk_assessment', risk.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: analysisText, parsed, riskAssessment: risk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
