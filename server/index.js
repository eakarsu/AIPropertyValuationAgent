require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/valuations', require('./routes/valuations'));
app.use('/api/comparables', require('./routes/comparables'));
app.use('/api/market-analysis', require('./routes/marketAnalysis'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/neighborhoods', require('./routes/neighborhoods'));
app.use('/api/renovations', require('./routes/renovations'));
app.use('/api/tax-assessments', require('./routes/taxAssessments'));
app.use('/api/risk-assessments', require('./routes/riskAssessments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
const auth = require('./middleware/auth');
const { Property, Valuation, MarketAnalysis, InvestmentAnalysis, Neighborhood, ComparableSale, RenovationEstimate, TaxAssessment, RiskAssessment } = require('./models');

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const [properties, valuations, marketAnalyses, investments, neighborhoods, comparables, renovations, taxAssessments, riskAssessments] = await Promise.all([
      Property.count(),
      Valuation.count(),
      MarketAnalysis.count(),
      InvestmentAnalysis.count(),
      Neighborhood.count(),
      ComparableSale.count(),
      RenovationEstimate.count(),
      TaxAssessment.count(),
      RiskAssessment.count()
    ]);

    const totalValue = await Property.sum('estimatedValue');

    res.json({
      properties, valuations, marketAnalyses, investments,
      neighborhoods, comparables, renovations, taxAssessments,
      riskAssessments, totalValue: totalValue || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
