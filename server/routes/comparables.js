const express = require('express');
const { ComparableSale, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const comps = await ComparableSale.findAll({ include: [Property], order: [['saleDate', 'DESC']] });
    res.json(comps);
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

router.post('/', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.create(req.body);
    res.status(201).json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Comparable sale not found' });
    await comp.update(req.body);
    res.json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Comparable sale not found' });
    await comp.destroy();
    res.json({ message: 'Comparable sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Comparable Analysis
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const comp = await ComparableSale.findByPk(req.params.id, { include: [Property] });
    if (!comp) return res.status(404).json({ error: 'Comparable not found' });

    const prompt = `Analyze this comparable sale for property valuation purposes:
Comparable: ${comp.address}, ${comp.city}, ${comp.state}
Sale Price: $${comp.salePrice}, Sale Date: ${comp.saleDate}
Sq Ft: ${comp.squareFeet}, Price/SqFt: $${comp.pricePerSqFt}
Bedrooms: ${comp.bedrooms}, Bathrooms: ${comp.bathrooms}
Distance: ${comp.distanceMiles} miles, Similarity: ${comp.similarityScore}%

Please provide:
1. Quality of this comparable for valuation purposes
2. Adjustments needed (location, condition, features)
3. Adjusted sale price after adjustments
4. Weight recommendation for this comparable
5. Market conditions impact on the sale`;

    const aiResponse = await callOpenRouter(prompt);
    res.json({ analysis: aiResponse, comparable: comp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
