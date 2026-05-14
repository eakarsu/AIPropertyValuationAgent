const express = require('express');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Property, Valuation, ComparableSale, MarketAnalysis, RiskAssessment, InvestmentAnalysis, AiResult } = require('../models');
const { callOpenRouter, parseAIJson } = require('../services/openrouter');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const router = express.Router();

// Helper: persist AI result
async function persistAiResult(userId, endpoint, entityType, entityId, prompt, content, tokensUsed, parsedJson) {
  try {
    await AiResult.create({
      userId,
      endpoint,
      entityType,
      entityId,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      prompt,
      rawResponse: content,
      parsedJson: parsedJson || null,
      tokensUsed,
      status: 'success'
    });
  } catch (e) {
    console.error('Failed to persist AI result:', e.message);
  }
}

// Get all properties with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const { count, rows: properties } = await Property.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    res.json({ data: properties, total: count, page, limit, totalPages: Math.ceil(count / limit) });
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

// Export PDF appraisal report
router.get('/:id/export-pdf', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        { model: Valuation, limit: 1, order: [['createdAt', 'DESC']] },
        { model: ComparableSale, limit: 5, order: [['saleDate', 'DESC']] },
        { model: RiskAssessment, limit: 1, order: [['createdAt', 'DESC']] }
      ]
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Fetch investment data if available
    const investments = await InvestmentAnalysis.findAll({
      where: { propertyId: property.id },
      order: [['createdAt', 'DESC']],
      limit: 1
    });
    const investment = investments[0];

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `appraisal-report-${property.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Cover Page
    doc.rect(0, 0, 612, 140).fill('#1a73e8');
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
      .text('Property Appraisal Report', 50, 40, { align: 'center' });
    doc.fontSize(14).font('Helvetica')
      .text(property.address, 50, 80, { align: 'center' });
    doc.fontSize(11)
      .text(`${property.city}, ${property.state} ${property.zipCode}`, 50, 100, { align: 'center' });
    doc.fillColor('#000').moveDown(4);

    doc.fontSize(9).fillColor('#888')
      .text(`Generated: ${new Date().toLocaleDateString()} | Report ID: APR-${property.id}`, { align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(1);

    // Property Summary
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('1. Property Summary');
    doc.moveDown(0.3);
    doc.fillColor('#000').fontSize(10).font('Helvetica');
    const details = [
      ['Property Type', property.propertyType?.replace(/_/g, ' ') || '-'],
      ['Bedrooms / Bathrooms', `${property.bedrooms || '-'} / ${property.bathrooms || '-'}`],
      ['Square Feet', property.squareFeet ? property.squareFeet.toLocaleString() : '-'],
      ['Lot Size', property.lotSize ? `${property.lotSize} acres` : '-'],
      ['Year Built', property.yearBuilt || '-'],
      ['Status', property.status || '-'],
      ['List Price', property.listPrice ? `$${Number(property.listPrice).toLocaleString()}` : '-'],
      ['Estimated Value', property.estimatedValue ? `$${Number(property.estimatedValue).toLocaleString()}` : '-']
    ];
    details.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(value);
    });
    doc.moveDown(1);

    // AI Valuation Analysis
    const latestValuation = property.Valuations?.[0];
    if (latestValuation) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('2. AI Valuation Analysis');
      doc.fillColor('#000').moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.font('Helvetica-Bold').text('Estimated Value: ', { continued: true }).font('Helvetica')
        .text(`$${Number(latestValuation.estimatedValue).toLocaleString()}`);
      doc.text(`Confidence Score: ${latestValuation.confidenceScore || '-'}%`);
      doc.text(`Valuation Type: ${latestValuation.valuationType?.replace(/_/g, ' ')}`);
      doc.text(`Status: ${latestValuation.status}`);
      if (latestValuation.aiAnalysis) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('AI Analysis:');
        doc.font('Helvetica').text(latestValuation.aiAnalysis, { width: 495 });
      }
      doc.moveDown(1);
    }

    // Comparable Sales Grid
    const comps = property.ComparableSales || [];
    if (comps.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('3. Comparable Sales');
      doc.fillColor('#000').moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold');
      const colX = [50, 190, 270, 340, 410, 480];
      const headers = ['Address', 'Sale Price', 'SqFt', 'Price/SqFt', 'Date', 'Similarity'];
      headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 120, lineBreak: false }));
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica');
      comps.forEach(c => {
        const rowY = doc.y;
        doc.text(c.address.substring(0, 22), colX[0], rowY, { width: 135, lineBreak: false });
        doc.text(`$${Number(c.salePrice).toLocaleString()}`, colX[1], rowY, { width: 75, lineBreak: false });
        doc.text(c.squareFeet ? c.squareFeet.toLocaleString() : '-', colX[2], rowY, { width: 65, lineBreak: false });
        doc.text(c.pricePerSqFt ? `$${c.pricePerSqFt}` : '-', colX[3], rowY, { width: 65, lineBreak: false });
        doc.text(c.saleDate || '-', colX[4], rowY, { width: 65, lineBreak: false });
        doc.text(c.similarityScore != null ? `${c.similarityScore}%` : '-', colX[5], rowY, { width: 50 });
        doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // Investment Metrics
    if (investment) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('4. Investment Metrics');
      doc.fillColor('#000').moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      const metrics = [
        ['Purchase Price', `$${Number(investment.purchasePrice || 0).toLocaleString()}`],
        ['Monthly Rent', `$${Number(investment.monthlyRent || 0).toLocaleString()}`],
        ['Net Operating Income (NOI)', `$${Number(investment.netOperatingIncome || 0).toLocaleString()}`],
        ['Cap Rate', `${Number(investment.capRate || 0).toFixed(2)}%`],
        ['Cash-on-Cash Return', `${Number(investment.cashOnCashReturn || 0).toFixed(2)}%`],
        ['ROI', `${Number(investment.roi || 0).toFixed(2)}%`],
        ['Risk Level', investment.riskScore || '-']
      ];
      metrics.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
      });
      if (investment.aiRecommendation) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('AI Recommendation:');
        doc.font('Helvetica').text(investment.aiRecommendation, { width: 495 });
      }
      doc.moveDown(1);
    }

    // Risk Assessment
    const risk = property.RiskAssessments?.[0];
    if (risk) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('5. Risk Assessment');
      doc.fillColor('#000').moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Overall Risk Score: ${risk.overallRiskScore || '-'}/10`);
      doc.text(`Flood Zone: ${risk.floodZone || '-'}`);
      doc.text(`Earthquake Risk: ${risk.earthquakeRisk || '-'}`);
      doc.text(`Fire Risk: ${risk.fireRisk || '-'}`);
      doc.text(`Environmental Risk: ${risk.environmentalRisk || '-'}`);
      if (risk.aiRiskAnalysis) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('AI Risk Analysis:');
        doc.font('Helvetica').text(risk.aiRiskAnalysis, { width: 495 });
      }
      doc.moveDown(1);
    }

    // Property Description
    if (property.description) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a73e8').text('6. Property Description');
      doc.fillColor('#000').moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(property.description, { width: 495 });
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#888')
      .text('This report is generated by AI Property Valuation Agent and is for informational purposes only.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF Export Error:', err);
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

// Delete property (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
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

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt);
    await persistAiResult(req.user.id, 'ai-describe', 'property', property.id, prompt, aiResponse, tokensUsed, null);
    res.json({ analysis: aiResponse, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Instant Valuation
router.post('/:id/ai-valuation', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: ComparableSale, limit: 5, order: [['saleDate', 'DESC']] }]
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    let comparablesText = '';
    if (property.ComparableSales && property.ComparableSales.length > 0) {
      comparablesText = `\n\nRecent Comparable Sales:\n` +
        property.ComparableSales.map((c, i) => `${i + 1}. ${c.address} — $${c.salePrice} (${c.saleDate}), ${c.squareFeet} sqft, Similarity: ${c.similarityScore}%`).join('\n');
    }

    const prompt = `As an expert property appraiser, provide a detailed valuation analysis for:
Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
Type: ${property.propertyType}, Sq Ft: ${property.squareFeet}
Bedrooms: ${property.bedrooms}, Bathrooms: ${property.bathrooms}
Year Built: ${property.yearBuilt}, List Price: $${property.listPrice}
${comparablesText}

Respond with structured JSON:
{
  "estimatedValue": number,
  "valueLow": number,
  "valueHigh": number,
  "confidenceScore": number (0-100),
  "keyDrivers": ["driver1","driver2",...],
  "concerns": ["concern1",...],
  "marketComparison": "text",
  "analysis": "full narrative text"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are an expert real estate appraiser. Always respond with valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'ai-valuation', 'property', property.id, prompt, aiResponse, tokensUsed, parsed);
    res.json({ analysis: parsed?.analysis || aiResponse, parsed, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== FIND COMPARABLES =====
// Queries Property model for nearby properties (similar sqft ±20%, same zip or city, sold last 6 months)
router.post('/:id/find-comparables', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sqftMin = property.squareFeet ? Math.floor(property.squareFeet * 0.8) : 0;
    const sqftMax = property.squareFeet ? Math.ceil(property.squareFeet * 1.2) : 999999;

    // Find comparable properties from Property table (status=sold, same zip or city)
    const candidates = await Property.findAll({
      where: {
        id: { [Op.ne]: property.id },
        status: 'sold',
        [Op.or]: [
          { zipCode: property.zipCode },
          { city: property.city }
        ],
        ...(property.squareFeet ? {
          squareFeet: { [Op.between]: [sqftMin, sqftMax] }
        } : {}),
        updatedAt: { [Op.gte]: sixMonthsAgo }
      },
      limit: 20
    });

    // Also query ComparableSale table
    const compSales = await ComparableSale.findAll({
      where: {
        [Op.or]: [
          { city: property.city }
        ],
        ...(property.squareFeet ? {
          squareFeet: { [Op.between]: [sqftMin, sqftMax] }
        } : {}),
        saleDate: { [Op.gte]: sixMonthsAgo.toISOString().split('T')[0] }
      },
      limit: 20
    });

    // Score all candidates
    function scoreSimilarity(subject, comp) {
      let score = 100;
      if (subject.squareFeet && comp.squareFeet) {
        const diff = Math.abs(subject.squareFeet - comp.squareFeet) / subject.squareFeet;
        score -= Math.min(40, diff * 200);
      }
      if (subject.yearBuilt && comp.yearBuilt) {
        const diff = Math.abs(subject.yearBuilt - comp.yearBuilt);
        score -= Math.min(20, diff * 0.5);
      }
      if (subject.propertyType && comp.propertyType && subject.propertyType !== comp.propertyType) {
        score -= 25;
      }
      if (subject.zipCode === comp.zipCode) score += 5; // bonus for same zip
      return Math.max(0, Math.round(score));
    }

    const scoredProperties = candidates.map(c => ({
      id: c.id,
      source: 'property',
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      salePrice: c.estimatedValue || c.listPrice,
      squareFeet: c.squareFeet,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      propertyType: c.propertyType,
      yearBuilt: c.yearBuilt,
      similarityScore: scoreSimilarity(property, c)
    }));

    const scoredSales = compSales.map(c => ({
      id: c.id,
      source: 'comparable_sale',
      address: c.address,
      city: c.city,
      state: c.state,
      salePrice: c.salePrice,
      saleDate: c.saleDate,
      squareFeet: c.squareFeet,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      pricePerSqFt: c.pricePerSqFt,
      similarityScore: scoreSimilarity(property, c)
    }));

    const all = [...scoredProperties, ...scoredSales]
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    res.json({ comparables: all, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== INVESTMENT ANALYSIS =====
router.post('/:id/investment-analysis', auth, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: Valuation, limit: 1, order: [['createdAt', 'DESC']] }]
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const { monthlyRent, annualExpenses, downPaymentPct, loanRate, holdingYears } = req.body;
    const purchasePrice = property.estimatedValue || property.listPrice;
    const valuation = property.Valuations?.[0];

    const prompt = `You are a real estate investment analyst. Analyze this property investment and return structured JSON with all metrics.

Property: ${property.address}, ${property.city}, ${property.state}
Type: ${property.propertyType}, SqFt: ${property.squareFeet}
Purchase Price: $${purchasePrice}
AI Estimated Value: ${valuation ? '$' + valuation.estimatedValue : 'Not available'}
Monthly Rent (assumption): $${monthlyRent || Math.round(purchasePrice * 0.007)}
Annual Expenses (assumption): $${annualExpenses || Math.round(purchasePrice * 0.03)}
Down Payment: ${downPaymentPct || 20}%
Loan Rate: ${loanRate || 7}% (30yr fixed)
Holding Period: ${holdingYears || 5} years
Annual Appreciation Assumption: 3%

Return ONLY valid JSON:
{
  "capRate": number,
  "cashOnCashReturn": number,
  "grm": number,
  "noi": number,
  "annualCashFlow": number,
  "irrProjection": number,
  "monthlyMortgage": number,
  "totalInvestment": number,
  "fiveYearEquity": number,
  "breakEvenMonths": number,
  "investmentGrade": "A|B|C|D|F",
  "recommendation": "buy|hold|pass",
  "analysis": "comprehensive narrative"
}`;

    const { content: aiResponse, tokensUsed } = await callOpenRouter(prompt,
      'You are a real estate investment analyst. Return only valid JSON.');
    const parsed = parseAIJson(aiResponse);
    await persistAiResult(req.user.id, 'investment-analysis', 'property', property.id, prompt, aiResponse, tokensUsed, parsed);

    res.json({
      metrics: parsed || {},
      property,
      valuation,
      assumptions: { monthlyRent, annualExpenses, downPaymentPct, loanRate, holdingYears }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
