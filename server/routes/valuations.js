const express = require('express');
const { Valuation, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const valuations = await Valuation.findAll({ include: [Property], order: [['createdAt', 'DESC']] });
    res.json(valuations);
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

router.post('/', auth, async (req, res) => {
  try {
    const valuation = await Valuation.create(req.body);
    res.status(201).json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id);
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    await valuation.update(req.body);
    res.json(valuation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const valuation = await Valuation.findByPk(req.params.id);
    if (!valuation) return res.status(404).json({ error: 'Valuation not found' });
    await valuation.destroy();
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
    const prompt = `Enhance this property valuation with AI analysis:
Property: ${property.address}, ${property.city}, ${property.state}
Type: ${property.propertyType}, Sq Ft: ${property.squareFeet}
Current Valuation: $${valuation.estimatedValue}
Valuation Type: ${valuation.valuationType}
Confidence Score: ${valuation.confidenceScore}%

Please provide:
1. Detailed market analysis supporting the valuation
2. Risk factors that could affect the value
3. Recommended adjustments
4. Market trend impact
5. Updated confidence assessment`;

    const aiResponse = await callOpenRouter(prompt);
    await valuation.update({ aiAnalysis: aiResponse, valuationType: 'ai_enhanced' });
    res.json({ analysis: aiResponse, valuation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
