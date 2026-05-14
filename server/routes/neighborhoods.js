const express = require('express');
const { Neighborhood, AiResult } = require('../models');
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
    const { count, rows: neighborhoods } = await Neighborhood.findAndCountAll({
      order: [['name', 'ASC']], limit, offset
    });
    res.json({ data: neighborhoods, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByPk(req.params.id);
    if (!neighborhood) return res.status(404).json({ error: 'Neighborhood not found' });
    res.json(neighborhood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const neighborhood = await Neighborhood.create(req.body);
    res.status(201).json(neighborhood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByPk(req.params.id);
    if (!neighborhood) return res.status(404).json({ error: 'Neighborhood not found' });
    await neighborhood.update(req.body);
    res.json(neighborhood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByPk(req.params.id);
    if (!neighborhood) return res.status(404).json({ error: 'Neighborhood not found' });
    await neighborhood.destroy();
    res.json({ message: 'Neighborhood deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Neighborhood Analysis
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findByPk(req.params.id);
    if (!neighborhood) return res.status(404).json({ error: 'Neighborhood not found' });

    const prompt = `Provide a comprehensive neighborhood analysis.
Name: ${neighborhood.name}, ${neighborhood.city}, ${neighborhood.state}
Walk Score: ${neighborhood.walkScore}, Transit Score: ${neighborhood.transitScore}
School Rating: ${neighborhood.schoolRating}/10, Crime Rate: ${neighborhood.crimeRate}
Median Income: $${neighborhood.medianIncome}, Population Growth: ${neighborhood.populationGrowth}%
Amenities Score: ${neighborhood.amenitiesScore}/10

Return JSON:
{
  "livabilityScore": number (0-100),
  "investmentPotential": "high|medium|low",
  "lifestyle": "text",
  "demographicsFit": ["profile1","profile2"],
  "futureOutlook": "text",
  "comparativeStrengths": ["s1","s2"],
  "comparativeWeaknesses": ["w1","w2"],
  "bestSuited": "text (buyer/renter profile)",
  "summary": "full analysis"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate neighborhood analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    const summaryText = parsed?.summary || aiResponse;
    await neighborhood.update({ aiSummary: summaryText });
    await persistAiResult(req.user.id, 'ai-analyze', 'neighborhood', neighborhood.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: summaryText, parsed, neighborhood });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
