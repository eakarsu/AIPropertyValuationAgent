const express = require('express');
const { MarketAnalysis } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const analyses = await MarketAnalysis.findAll({ order: [['analysisDate', 'DESC']] });
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await MarketAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Market analysis not found' });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const analysis = await MarketAnalysis.create(req.body);
    res.status(201).json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const analysis = await MarketAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Market analysis not found' });
    await analysis.update(req.body);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const analysis = await MarketAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Market analysis not found' });
    await analysis.destroy();
    res.json({ message: 'Market analysis deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Market Insights
router.post('/:id/ai-insights', auth, async (req, res) => {
  try {
    const analysis = await MarketAnalysis.findByPk(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Market analysis not found' });

    const prompt = `Provide deep market insights for this real estate market:
Area: ${analysis.area}, ${analysis.state}
Median Price: $${analysis.medianPrice}
Avg Price/SqFt: $${analysis.averagePricePerSqFt}
Days on Market: ${analysis.daysOnMarket}
Inventory: ${analysis.inventoryCount} homes
YoY Change: ${analysis.yearOverYearChange}%
Market Trend: ${analysis.marketTrend}

Please provide:
1. Detailed market outlook (6-12 months)
2. Investment opportunity assessment
3. Supply and demand dynamics
4. Price trajectory prediction
5. Key risks and opportunities
6. Recommendations for buyers and sellers`;

    const aiResponse = await callOpenRouter(prompt);
    await analysis.update({ aiInsights: aiResponse });
    res.json({ analysis: aiResponse, marketAnalysis: analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
