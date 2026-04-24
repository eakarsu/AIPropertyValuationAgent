const express = require('express');
const { TaxAssessment, Property } = require('../models');
const { callOpenRouter } = require('../services/openrouter');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const assessments = await TaxAssessment.findAll({ include: [Property], order: [['assessmentYear', 'DESC']] });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id, { include: [Property] });
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.create(req.body);
    res.status(201).json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    await assessment.update(req.body);
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });
    await assessment.destroy();
    res.json({ message: 'Tax assessment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Tax Appeal Analysis
router.post('/:id/ai-appeal', auth, async (req, res) => {
  try {
    const assessment = await TaxAssessment.findByPk(req.params.id, { include: [Property] });
    if (!assessment) return res.status(404).json({ error: 'Tax assessment not found' });

    const property = assessment.Property;
    const prompt = `Analyze this property tax assessment for appeal potential:
Property: ${property ? property.address + ', ' + property.city + ', ' + property.state : 'N/A'}
Assessed Value: $${assessment.assessedValue}
Tax Rate: ${assessment.taxRate}%
Annual Tax: $${assessment.annualTax}
Assessment Year: ${assessment.assessmentYear}
Land Value: $${assessment.landValue}
Improvement Value: $${assessment.improvementValue}
Exemptions: ${assessment.exemptions || 'None'}
${property ? `Market Value Estimate: $${property.estimatedValue}` : ''}

Please provide:
1. Is the assessment fair or over-assessed?
2. Potential savings from an appeal
3. Strength of appeal case (1-10)
4. Key arguments for the appeal
5. Required documentation
6. Appeal process recommendations`;

    const aiResponse = await callOpenRouter(prompt);
    await assessment.update({ aiAppealAnalysis: aiResponse });
    res.json({ analysis: aiResponse, assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
