const express = require('express');
const { ComparableSale, Property, AiResult } = require('../models');
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

function computeSimilarity(subject, comparable) {
  let score = 100;
  if (subject.squareFeet && comparable.squareFeet) {
    const sqftDiff = Math.abs(subject.squareFeet - comparable.squareFeet) / subject.squareFeet;
    score -= Math.min(40, sqftDiff * 200);
  }
  if (subject.yearBuilt && comparable.yearBuilt) {
    const yearDiff = Math.abs(subject.yearBuilt - comparable.yearBuilt);
    score -= Math.min(20, yearDiff * 0.5);
  }
  if (subject.propertyType && comparable.propertyType && subject.propertyType !== comparable.propertyType) {
    score -= 25;
  }
  if (comparable.distanceMiles != null) {
    score -= Math.min(15, comparable.distanceMiles * 3);
  }
  return Math.max(0, Math.round(score));
}

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const { count, rows: comps } = await ComparableSale.findAndCountAll({
      include: [Property], order: [['saleDate', 'DESC']], limit, offset
    });
    res.json({ data: comps, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id, { include: [Property] });
    if (!comp) return res.status(404).json({ error: 'Comparable sale not found' });
    res.json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const comp = await ComparableSale.create(req.body);
    if (comp.propertyId) {
      const property = await Property.findByPk(comp.propertyId);
      if (property) {
        const score = computeSimilarity(property, comp);
        await comp.update({ similarityScore: score });
      }
    }
    res.status(201).json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Comparable sale not found' });
    await comp.update(req.body);
    if (comp.propertyId) {
      const property = await Property.findByPk(comp.propertyId);
      if (property) {
        const score = computeSimilarity(property, comp);
        await comp.update({ similarityScore: score });
      }
    }
    res.json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Comparable sale not found' });
    await comp.destroy();
    res.json({ message: 'Comparable sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recompute-similarity/:propertyId', auth, authorize('appraiser', 'admin'), async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.propertyId);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    const comps = await ComparableSale.findAll({ where: { propertyId: property.id } });
    const updated = [];
    for (const comp of comps) {
      const score = computeSimilarity(property, comp);
      await comp.update({ similarityScore: score });
      updated.push({ id: comp.id, similarityScore: score });
    }
    res.json({ updated, count: updated.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Comparable Analysis
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id, { include: [Property] });
    if (!comp) return res.status(404).json({ error: 'Comparable not found' });

    const prompt = `Analyze this comparable sale for property valuation purposes.
Comparable: ${comp.address}, ${comp.city}, ${comp.state}
Sale Price: $${comp.salePrice}, Sale Date: ${comp.saleDate}
Sq Ft: ${comp.squareFeet}, Price/SqFt: $${comp.pricePerSqFt}
Bedrooms: ${comp.bedrooms}, Bathrooms: ${comp.bathrooms}
Distance: ${comp.distanceMiles} miles, Similarity: ${comp.similarityScore}%

Return JSON:
{
  "quality": "excellent|good|fair|poor",
  "qualityScore": number (0-100),
  "adjustments": [{"item": "text", "adjustment": number}],
  "adjustedPrice": number,
  "weight": number (0-100, recommended weighting in CMA),
  "marketConditions": "text",
  "summary": "full analysis"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are an expert real estate appraiser. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'ai-analyze', 'comparable', comp.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: parsed?.summary || aiResponse, parsed, comparable: comp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
