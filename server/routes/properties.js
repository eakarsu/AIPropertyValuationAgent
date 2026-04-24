const express = require('express');
const { Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all properties
router.get('/', auth, async (req, res) => {
  try {
    const properties = await Property.findAll({ order: [['createdAt', 'DESC']] });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get property by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create property
router.post('/', auth, async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update property
router.put('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    await property.update(req.body);
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete property
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    await property.destroy();
    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Property Description Generator
router.post('/:id/ai-describe', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const prompt = `Generate a professional real estate listing description for this property:
Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
Type: ${property.propertyType}
Bedrooms: ${property.bedrooms}, Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet}, Lot Size: ${property.lotSize} acres
Year Built: ${property.yearBuilt}
List Price: $${property.listPrice}

Please provide a compelling, professional description highlighting key features and appeal.`;

    const aiResponse = await callOpenRouter(prompt);
    res.json({ analysis: aiResponse, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Instant Valuation
router.post('/:id/ai-valuation', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const prompt = `As an expert property appraiser, provide a detailed valuation analysis for:
Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
Type: ${property.propertyType}
Bedrooms: ${property.bedrooms}, Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet}, Year Built: ${property.yearBuilt}
Current List Price: $${property.listPrice}

Please provide:
1. Estimated market value range
2. Key value drivers
3. Potential concerns affecting value
4. Comparison to market averages
5. Confidence level in the estimate`;

    const aiResponse = await callOpenRouter(prompt);
    res.json({ analysis: aiResponse, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
