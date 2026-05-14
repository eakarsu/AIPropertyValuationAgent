const express = require('express');
const { TaxAssessment, Property, AiResult } = require('../models');
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
    const { count, rows: assessments } = await TaxAssessment.findAndCountAll({
      include: [Property], order: [['assessmentYear', 'DESC']], limit, offset
    });
    res.json({ data: assessments, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id, { include: [Property] });
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.create(req.body);
    res.status(201).json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    await assessment.update(req.body);
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    await assessment.destroy();
    res.json({ message: 'Tax assessment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Tax Appeal Analysis
router.post('/:id/ai-appeal', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id, { include: [Property] });
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    const property = assessment.Property;

    const prompt = `Analyze this property tax assessment for appeal potential.
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Assessed Value: $${assessment.assessedValue}
Tax Rate: ${assessment.taxRate}%
Annual Tax: $${assessment.annualTax}
Assessment Year: ${assessment.assessmentYear}
Land Value: $${assessment.landValue}
Improvement Value: $${assessment.improvementValue}
Exemptions: ${assessment.exemptions || 'None'}
${property ? `Market Value Estimate: $${property.estimatedValue}` : ''}

Return JSON:
{
  "overAssessed": true|false,
  "potentialSavings": number (annual $),
  "appealStrength": number (1-10),
  "keyArguments": ["arg1","arg2","arg3"],
  "requiredDocuments": ["doc1","doc2"],
  "appealProcess": "text",
  "successProbability": number (0-100),
  "analysis": "full narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a property tax appeal specialist. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.analysis || aiResponse;
    await assessment.update({ aiAppealAnalysis: analysisText });
    await persistAiResult(req.user.id, 'ai-appeal', 'tax_assessment', assessment.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: analysisText, parsed, assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
