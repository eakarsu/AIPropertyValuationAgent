const express = require('express');
const { Neighborhood } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const neighborhoods = await Neighborhood.findAll({ order: [['name', 'ASC']] });
    res.json(neighborhoods);
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

    const prompt = `Provide a comprehensive neighborhood analysis:
Name: ${neighborhood.name}, ${neighborhood.city}, ${neighborhood.state}
Walk Score: ${neighborhood.walkScore}, Transit Score: ${neighborhood.transitScore}
School Rating: ${neighborhood.schoolRating}/10
Crime Rate: ${neighborhood.crimeRate}
Median Income: $${neighborhood.medianIncome}
Population Growth: ${neighborhood.populationGrowth}%
Amenities Score: ${neighborhood.amenitiesScore}/10

Please provide:
1. Overall livability assessment
2. Real estate investment potential
3. Demographics and lifestyle fit
4. Future development outlook
5. Comparison to surrounding areas
6. Best suited buyer/renter profile`;

    const aiResponse = await callOpenRouter(prompt);
    await neighborhood.update({ aiSummary: aiResponse });
    res.json({ analysis: aiResponse, neighborhood });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
