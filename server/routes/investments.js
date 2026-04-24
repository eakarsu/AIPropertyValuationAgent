const express = require('express');
const { InvestmentAnalysis, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const investments = await InvestmentAnalysis.findAll({ include: [Property], order: [['createdAt', 'DESC']] });
    res.json(investments);
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

router.post('/', auth, async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.create(req.body);
    res.status(201).json(investment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const investment = await InvestmentAnalysis.findByPk(req.params.id);
    if (!investment) return res.status(404).json({ error: 'Investment analysis not found' });
    await investment.update(req.body);
    res.json(investment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
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
    const prompt = `Provide an investment recommendation for this property:
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Purchase Price: $${investment.purchasePrice}
Monthly Rent: $${investment.monthlyRent}
Annual Expenses: $${investment.annualExpenses}
Cap Rate: ${investment.capRate}%
Cash-on-Cash Return: ${investment.cashOnCashReturn}%
ROI: ${investment.roi}%
NOI: $${investment.netOperatingIncome}
Risk Level: ${investment.riskScore}

Please provide:
1. Investment grade (A through F)
2. Detailed pros and cons
3. Risk-adjusted return analysis
4. Comparison to typical market returns
5. 5-year projection
6. Buy/Hold/Sell recommendation with reasoning`;

    const aiResponse = await callOpenRouter(prompt);
    await investment.update({ aiRecommendation: aiResponse });
    res.json({ analysis: aiResponse, investment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
