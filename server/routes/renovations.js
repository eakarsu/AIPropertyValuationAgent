const express = require('express');
const { RenovationEstimate, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const renovations = await RenovationEstimate.findAll({ include: [Property], order: [['createdAt', 'DESC']] });
    res.json(renovations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id, { include: [Property] });
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    res.json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.create(req.body);
    res.status(201).json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id);
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    await renovation.update(req.body);
    res.json(renovation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id);
    if (!renovation) return res.status(404).json({ error: 'Renovation estimate not found' });
    await renovation.destroy();
    res.json({ message: 'Renovation estimate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Renovation Advice
router.post('/:id/ai-advise', auth, async (req, res) => {
  try {
    const renovation = await RenovationEstimate.findByPk(req.params.id, { include: [Property] });
    if (!renovation) return res.status(404).json({ error: 'Renovation not found' });

    const property = renovation.Property;
    const prompt = `Provide renovation advice for this property improvement:
Property: ${property ? property.address + ', ' + property.city : 'N/A'}
Renovation Type: ${renovation.renovationType}
Estimated Cost: $${renovation.estimatedCost}
Estimated Value Add: $${renovation.estimatedValueAdd}
ROI: ${renovation.roiPercentage}%
Priority: ${renovation.priority}
Timeline: ${renovation.timelineWeeks} weeks

Please provide:
1. Is this renovation worth the investment?
2. Cost optimization suggestions
3. Potential to increase ROI
4. Timeline feasibility
5. Contractor selection tips
6. Permit and compliance considerations`;

    const aiResponse = await callOpenRouter(prompt);
    await renovation.update({ aiSuggestion: aiResponse });
    res.json({ analysis: aiResponse, renovation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
