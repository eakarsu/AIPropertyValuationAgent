const express = require('express');
const { RiskAssessment, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const risks = await RiskAssessment.findAll({ include: [Property], order: [['createdAt', 'DESC']] });
    res.json(risks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id, { include: [Property] });
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.create(req.body);
    res.status(201).json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id);
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    await risk.update(req.body);
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id);
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
    await risk.destroy();
    res.json({ message: 'Risk assessment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Risk Analysis
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const risk = await RiskAssessment.findByPk(req.params.id, { include: [Property] });
    if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });

    const property = risk.Property;
    const prompt = `Provide a comprehensive risk analysis for this property:
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Flood Zone: ${risk.floodZone}
Earthquake Risk: ${risk.earthquakeRisk}
Fire Risk: ${risk.fireRisk}
Environmental Risk: ${risk.environmentalRisk}
Overall Risk Score: ${risk.overallRiskScore}/10
Insurance Estimate: $${risk.insuranceEstimate}/year

Please provide:
1. Comprehensive risk profile summary
2. Most critical risks and why
3. Insurance adequacy assessment
4. Risk mitigation strategies
5. Impact on property value
6. Long-term risk outlook (climate change, development)
7. Recommended insurance coverage types`;

    const aiResponse = await callOpenRouter(prompt);
    await risk.update({ aiRiskAnalysis: aiResponse });
    res.json({ analysis: aiResponse, riskAssessment: risk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
