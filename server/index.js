require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

// Validate required env vars at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// AI rate limiter: 20 requests per hour per user/IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'AI rate limit exceeded. Max 20 requests per hour.' }
});

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

// Apply AI rate limiter to all AI enhancement endpoints
const auth = require('./middleware/auth');
const aiPaths = [
  '/api/valuations/:id/ai-enhance',
  '/api/properties/:id/ai-valuation',
  '/api/properties/:id/ai-describe',
  '/api/properties/:id/find-comparables',
  '/api/properties/:id/investment-analysis',
  '/api/comparables/:id/ai-analyze',
  '/api/investments/:id/ai-recommend',
  '/api/market-analysis/:id/ai-insights',
  '/api/market-analysis/ai/market-trends',
  '/api/market-analysis/ai/neighborhood-compare',
  '/api/market-analysis/ai/market-forecast',
  '/api/neighborhoods/:id/ai-analyze',
  '/api/renovations/:id/ai-advise',
  '/api/tax-assessments/:id/ai-appeal',
  '/api/risk-assessments/:id/ai-analyze'
];
aiPaths.forEach(path => app.use(path, auth, aiRateLimiter));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
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
    // Use alter: false to avoid destructive schema changes in production
    await sequelize.sync({ alter: false });
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

// AI feature mount: multi-point-valuation
app.use('/api/ai/multi-point-valuation', require('./routes/ai-multi-point-valuation'));
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-valuationestimate-ai-using-comps-and-prop', require('./routes/gap-no-valuationestimate-ai-using-comps-and-prop'));
app.use('/api/gap-no-marketforecast-for-neighborhood-trends', require('./routes/gap-no-marketforecast-for-neighborhood-trends'));
app.use('/api/gap-no-investmentanalysis-for-roi-cash-flow-proj', require('./routes/gap-no-investmentanalysis-for-roi-cash-flow-proj'));
app.use('/api/gap-no-ai-riskassessment-disaster-downturn-title', require('./routes/gap-no-ai-riskassessment-disaster-downturn-title'));
app.use('/api/gap-no-neighborhoodcomparison-schools-walkabilit', require('./routes/gap-no-neighborhoodcomparison-schools-walkabilit'));
app.use('/api/gap-no-renovationroi-cost-vs-appreciation-impact', require('./routes/gap-no-renovationroi-cost-vs-appreciation-impact'));
app.use('/api/gap-no-tax1031-exchange-guidance-workflow', require('./routes/gap-no-tax1031-exchange-guidance-workflow'));
app.use('/api/gap-no-mlszillowredfin-or-lendermortgage-api-int', require('./routes/gap-no-mlszillowredfin-or-lendermortgage-api-int'));
app.use('/api/gap-no-document-management-for-contracts-deeds-t', require('./routes/gap-no-document-management-for-contracts-deeds-t'));
app.use('/api/gap-no-watchlist-alerts-for-market-changes-in-sa', require('./routes/gap-no-watchlist-alerts-for-market-changes-in-sa'));
app.use('/api/gap-no-reportingpdf-export', require('./routes/gap-no-reportingpdf-export'));
app.use('/api/gap-no-notifications-or-audit-logs', require('./routes/gap-no-notifications-or-audit-logs'));
// === End Batch 07 ===
