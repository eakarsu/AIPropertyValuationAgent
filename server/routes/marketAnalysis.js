const express = require('express');
const { MarketAnalysis, Property, Valuation, AiResult } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
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
    const { count, rows: analyses } = await MarketAnalysis.findAndCountAll({
      order: [['analysisDate', 'DESC']], limit, offset
    });
    res.json({ data: analyses, total: count, page, limit, totalPages: Math.ceil(count / limit) });
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

    const prompt = `Provide deep market insights for this real estate market.
Area: ${analysis.area}, ${analysis.state}
Median Price: $${analysis.medianPrice}
Avg Price/SqFt: $${analysis.averagePricePerSqFt}
Days on Market: ${analysis.daysOnMarket}
Inventory: ${analysis.inventoryCount} homes
YoY Change: ${analysis.yearOverYearChange}%
Market Trend: ${analysis.marketTrend}

Return JSON:
{
  "outlook": "text (6-12 month forecast)",
  "investmentOpportunity": "high|medium|low",
  "supplyDemand": "text",
  "priceTrajectory": "text",
  "risks": ["risk1","risk2"],
  "opportunities": ["opp1","opp2"],
  "buyerAdvice": "text",
  "sellerAdvice": "text",
  "analysis": "full narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate market analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const analysisText = parsed?.analysis || aiResponse;
    await analysis.update({ aiInsights: analysisText });
    await persistAiResult(req.user.id, 'ai-insights', 'market_analysis', analysis.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: analysisText, parsed, marketAnalysis: analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== MARKET TRENDS (aggregate all property valuations by zip/type over time) =====
router.get('/ai/market-trends', auth, async (req, res) => {
  try {
    // Aggregate property data by zip code and property type
    const properties = await Property.findAll({
      attributes: ['zipCode', 'propertyType', 'estimatedValue', 'listPrice', 'squareFeet', 'createdAt'],
      where: { estimatedValue: { [Op.gt]: 0 } },
      order: [['createdAt', 'ASC']]
    });

    // Group by zip
    const byZip = {};
    properties.forEach(p => {
      const zip = p.zipCode;
      if (!byZip[zip]) byZip[zip] = [];
      byZip[zip].push({
        type: p.propertyType,
        value: parseFloat(p.estimatedValue || p.listPrice || 0),
        sqft: p.squareFeet,
        date: p.createdAt
      });
    });

    // Get market analysis records for trend data
    const marketData = await MarketAnalysis.findAll({
      order: [['analysisDate', 'DESC']], limit: 50
    });

    const marketSummary = marketData.map(m => ({
      area: m.area,
      state: m.state,
      medianPrice: m.medianPrice,
      pricePerSqFt: m.averagePricePerSqFt,
      yoyChange: m.yearOverYearChange,
      trend: m.marketTrend,
      date: m.analysisDate
    }));

    const prompt = `You are a real estate market data analyst. Analyze this property data and identify appreciation trends.

Property Count by Zip Code: ${JSON.stringify(Object.entries(byZip).map(([zip, items]) => ({
      zip,
      count: items.length,
      avgValue: Math.round(items.reduce((s, i) => s + i.value, 0) / items.length),
      types: [...new Set(items.map(i => i.type))]
    })))}

Market Analysis Records: ${JSON.stringify(marketSummary.slice(0, 10))}

Return JSON:
{
  "overallTrend": "appreciating|stable|depreciating",
  "appreciationRate": number (annual %),
  "hotMarkets": [{"zipCode":"zip","trend":"text","appreciation":number}],
  "coldMarkets": [{"zipCode":"zip","trend":"text"}],
  "propertyTypeInsights": [{"type":"text","trend":"text","avgValue":number}],
  "insights": ["insight1","insight2","insight3"],
  "forecast": "6-12 month market forecast",
  "chartData": [{"label":"text","value":number,"category":"text"}]
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate market analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'market-trends', 'market', null, prompt, aiResponse, tokensUsed, parsed);

    res.json({
      trends: parsed || {},
      rawData: { propertyCount: properties.length, zipCodes: Object.keys(byZip).length, marketRecords: marketData.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== NEIGHBORHOOD COMPARATOR =====
router.post('/ai/neighborhood-compare', auth, async (req, res) => {
  try {
    const { zip1, zip2 } = req.body;
    if (!zip1 || !zip2) return res.status(400).json({ error: 'zip1 and zip2 are required' });

    const [props1, props2] = await Promise.all([
      Property.findAll({ where: { zipCode: zip1 }, limit: 50 }),
      Property.findAll({ where: { zipCode: zip2 }, limit: 50 })
    ]);

    function summarize(props, zip) {
      const values = props.map(p => parseFloat(p.estimatedValue || p.listPrice || 0)).filter(v => v > 0);
      const sqfts = props.map(p => p.squareFeet).filter(s => s > 0);
      const avgValue = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      const avgSqft = sqfts.length ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length) : 0;
      const pricePerSqft = avgSqft > 0 ? Math.round(avgValue / avgSqft) : 0;
      return { zip, count: props.length, avgValue, avgSqft, pricePerSqft };
    }

    const summary1 = summarize(props1, zip1);
    const summary2 = summarize(props2, zip2);

    const prompt = `Compare these two neighborhoods and provide a detailed analysis.

Neighborhood 1 (ZIP ${zip1}): ${JSON.stringify(summary1)}
Neighborhood 2 (ZIP ${zip2}): ${JSON.stringify(summary2)}

Return JSON:
{
  "winner": "${zip1}|${zip2}|tie",
  "winnerReason": "text",
  "zip1Analysis": {"strengths":["s1"],"weaknesses":["w1"],"investmentScore":number},
  "zip2Analysis": {"strengths":["s1"],"weaknesses":["w1"],"investmentScore":number},
  "valueDifference": number (% difference),
  "priceTrend": "text",
  "bestFor": {"zip1":"investor type","zip2":"investor type"},
  "comparison": "detailed narrative comparison",
  "recommendation": "text"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate market analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'neighborhood-compare', 'market', null, prompt, aiResponse, tokensUsed, parsed);

    res.json({
      comparison: parsed || {},
      zip1: { ...summary1, properties: props1.length },
      zip2: { ...summary2, properties: props2.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== MARKET FORECAST =====
router.post('/ai/market-forecast', auth, async (req, res) => {
  try {
    const { zip_code, horizon_years, scenario } = req.body;
    if (!zip_code) return res.status(400).json({ error: 'zip_code is required' });
    const horizon = Math.min(Math.max(parseInt(horizon_years || 5, 10), 1), 10);

    const props = await Property.findAll({ where: { zipCode: zip_code }, limit: 100 });
    const values = props.map(p => parseFloat(p.estimatedValue || p.listPrice || 0)).filter(v => v > 0);
    const avgValue = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    const prompt = `Forecast property values for ZIP ${zip_code} over the next ${horizon} years.

Sample size: ${props.length} properties
Current avg estimated value: $${avgValue}
Scenario: ${scenario || 'baseline'}

Return JSON only:
{
  "zip_code": "${zip_code}",
  "horizon_years": ${horizon},
  "annual_forecast": [{"year": 1, "predicted_value_usd": 0, "yoy_change_pct": 0, "confidence": "low|medium|high"}],
  "key_drivers": ["string"],
  "risk_factors": ["string"],
  "scenarios": {"bear": "string", "base": "string", "bull": "string"},
  "summary": "string"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate forecaster. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'market-forecast', 'market', null, prompt, aiResponse, tokensUsed, parsed);

    res.json({ zip_code, horizon_years: horizon, properties_analyzed: props.length, current_avg_value: avgValue, forecast: parsed || aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
