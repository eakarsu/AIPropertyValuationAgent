const express = require('express');
const { InvestmentAnalysis, Property, AiResult } = require('../models');
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

function computeInvestmentMetrics(data) {
  const monthlyRent = parseFloat(data.monthlyRent) || 0;
  const annualExpenses = parseFloat(data.annualExpenses) || 0;
  const purchasePrice = parseFloat(data.purchasePrice) || 0;
  const downPayment = parseFloat(data.downPayment) || purchasePrice * 0.20;
  const appreciation = parseFloat(data.appreciation) || 0;
  const annualRent = monthlyRent * 12;
  const noi = annualRent - annualExpenses;
  const annualCashFlow = noi - (parseFloat(data.annualDebtService) || 0);
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
  const roi = purchasePrice > 0 ? ((noi + appreciation) / purchasePrice) * 100 : 0;
  return {
    netOperatingIncome: parseFloat(noi.toFixed(2)),
    capRate: parseFloat(capRate.toFixed(2)),
    cashOnCashReturn: parseFloat(cashOnCash.toFixed(2)),
    roi: parseFloat(roi.toFixed(2))
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const { count, rows: investments } = await InvestmentAnalysis.findAndCountAll({
      include: [Property], order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ data: investments, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.findByPk(req.params.id, { include: [Property] });
    if (!investment) return res.status(404).json({ error: 'Investment analysis not found' });
    res.json(investment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const computed = computeInvestmentMetrics(req.body);
    const investment = await InvestmentAnalysis.create({ ...req.body, ...computed });
    res.status(201).json(investment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.findByPk(req.params.id);
    if (!investment) return res.status(404).json({ error: 'Investment analysis not found' });
    const computed = computeInvestmentMetrics({ ...investment.toJSON(), ...req.body });
    await investment.update({ ...req.body, ...computed });
    res.json(investment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.findByPk(req.params.id);
    if (!investment) return res.status(404).json({ error: 'Investment analysis not found' });
    await investment.destroy();
    res.json({ message: 'Investment analysis deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Investment Recommendation
router.post('/:id/ai-recommend', auth, async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.findByPk(req.params.id, { include: [Property] });
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    const property = investment.Property;

    const prompt = `Provide a detailed investment recommendation.
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Purchase Price: $${investment.purchasePrice}
Monthly Rent: $${investment.monthlyRent}
Annual Expenses: $${investment.annualExpenses}
Cap Rate: ${investment.capRate}%
Cash-on-Cash Return: ${investment.cashOnCashReturn}%
ROI: ${investment.roi}%
NOI: $${investment.netOperatingIncome}
Risk Level: ${investment.riskScore}

Return JSON:
{
  "grade": "A|B|C|D|F",
  "recommendation": "buy|hold|sell|pass",
  "pros": ["pro1","pro2"],
  "cons": ["con1","con2"],
  "riskAdjustedReturn": number,
  "marketComparison": "text",
  "fiveYearProjection": {"year1": number,"year3": number,"year5": number},
  "analysis": "full narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate investment advisor. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.analysis || aiResponse;
    await investment.update({ aiRecommendation: analysisText });
    await persistAiResult(req.user.id, 'ai-recommend', 'investment', investment.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: analysisText, parsed, investment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
