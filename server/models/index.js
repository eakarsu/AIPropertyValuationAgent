const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'appraiser', 'agent', 'investor'), defaultValue: 'agent' }
}, { tableName: 'users', timestamps: true });

// Property Model
const Property = sequelize.define('Property', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  address: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  zipCode: { type: DataTypes.STRING, allowNull: false },
  propertyType: { type: DataTypes.ENUM('single_family', 'condo', 'townhouse', 'multi_family', 'commercial', 'land', 'industrial'), allowNull: false },
  bedrooms: { type: DataTypes.INTEGER },
  bathrooms: { type: DataTypes.DECIMAL(3, 1) },
  squareFeet: { type: DataTypes.INTEGER },
  lotSize: { type: DataTypes.DECIMAL(10, 2) },
  yearBuilt: { type: DataTypes.INTEGER },
  listPrice: { type: DataTypes.DECIMAL(12, 2) },
  estimatedValue: { type: DataTypes.DECIMAL(12, 2) },
  status: { type: DataTypes.ENUM('active', 'pending', 'sold', 'off_market'), defaultValue: 'active' },
  description: { type: DataTypes.TEXT },
  imageUrl: { type: DataTypes.STRING }
}, { tableName: 'properties', timestamps: true });

// Valuation Model
const Valuation = sequelize.define('Valuation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER, allowNull: false },
  valuationType: { type: DataTypes.ENUM('automated', 'comparative', 'income', 'cost', 'ai_enhanced'), allowNull: false },
  estimatedValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  confidenceScore: { type: DataTypes.DECIMAL(5, 2) },
  aiAnalysis: { type: DataTypes.TEXT },
  factors: { type: DataTypes.JSONB },
  status: { type: DataTypes.ENUM('draft', 'completed', 'reviewed', 'approved'), defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'valuations', timestamps: true });

// Comparable Sale Model
const ComparableSale = sequelize.define('ComparableSale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER },
  address: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  salePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  saleDate: { type: DataTypes.DATEONLY, allowNull: false },
  squareFeet: { type: DataTypes.INTEGER },
  bedrooms: { type: DataTypes.INTEGER },
  bathrooms: { type: DataTypes.DECIMAL(3, 1) },
  pricePerSqFt: { type: DataTypes.DECIMAL(8, 2) },
  distanceMiles: { type: DataTypes.DECIMAL(5, 2) },
  similarityScore: { type: DataTypes.DECIMAL(5, 2) }
}, { tableName: 'comparable_sales', timestamps: true });

// Market Analysis Model
const MarketAnalysis = sequelize.define('MarketAnalysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  area: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  medianPrice: { type: DataTypes.DECIMAL(12, 2) },
  averagePricePerSqFt: { type: DataTypes.DECIMAL(8, 2) },
  daysOnMarket: { type: DataTypes.INTEGER },
  inventoryCount: { type: DataTypes.INTEGER },
  yearOverYearChange: { type: DataTypes.DECIMAL(5, 2) },
  marketTrend: { type: DataTypes.ENUM('hot', 'warm', 'neutral', 'cool', 'cold'), defaultValue: 'neutral' },
  aiInsights: { type: DataTypes.TEXT },
  analysisDate: { type: DataTypes.DATEONLY }
}, { tableName: 'market_analyses', timestamps: true });

// Investment Analysis Model
const InvestmentAnalysis = sequelize.define('InvestmentAnalysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER },
  purchasePrice: { type: DataTypes.DECIMAL(12, 2) },
  monthlyRent: { type: DataTypes.DECIMAL(10, 2) },
  annualExpenses: { type: DataTypes.DECIMAL(10, 2) },
  capRate: { type: DataTypes.DECIMAL(5, 2) },
  cashOnCashReturn: { type: DataTypes.DECIMAL(5, 2) },
  roi: { type: DataTypes.DECIMAL(5, 2) },
  netOperatingIncome: { type: DataTypes.DECIMAL(12, 2) },
  aiRecommendation: { type: DataTypes.TEXT },
  riskScore: { type: DataTypes.ENUM('low', 'medium', 'high', 'very_high'), defaultValue: 'medium' }
}, { tableName: 'investment_analyses', timestamps: true });

// Neighborhood Data Model
const Neighborhood = sequelize.define('Neighborhood', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  walkScore: { type: DataTypes.INTEGER },
  transitScore: { type: DataTypes.INTEGER },
  schoolRating: { type: DataTypes.DECIMAL(3, 1) },
  crimeRate: { type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high') },
  medianIncome: { type: DataTypes.DECIMAL(10, 2) },
  populationGrowth: { type: DataTypes.DECIMAL(5, 2) },
  amenitiesScore: { type: DataTypes.DECIMAL(3, 1) },
  aiSummary: { type: DataTypes.TEXT }
}, { tableName: 'neighborhoods', timestamps: true });

// Renovation Estimate Model
const RenovationEstimate = sequelize.define('RenovationEstimate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER },
  renovationType: { type: DataTypes.STRING, allowNull: false },
  estimatedCost: { type: DataTypes.DECIMAL(10, 2) },
  estimatedValueAdd: { type: DataTypes.DECIMAL(10, 2) },
  roiPercentage: { type: DataTypes.DECIMAL(5, 2) },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  timelineWeeks: { type: DataTypes.INTEGER },
  aiSuggestion: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('proposed', 'approved', 'in_progress', 'completed'), defaultValue: 'proposed' }
}, { tableName: 'renovation_estimates', timestamps: true });

// Tax Assessment Model
const TaxAssessment = sequelize.define('TaxAssessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER },
  assessedValue: { type: DataTypes.DECIMAL(12, 2) },
  taxRate: { type: DataTypes.DECIMAL(6, 4) },
  annualTax: { type: DataTypes.DECIMAL(10, 2) },
  assessmentYear: { type: DataTypes.INTEGER },
  landValue: { type: DataTypes.DECIMAL(12, 2) },
  improvementValue: { type: DataTypes.DECIMAL(12, 2) },
  exemptions: { type: DataTypes.STRING },
  aiAppealAnalysis: { type: DataTypes.TEXT }
}, { tableName: 'tax_assessments', timestamps: true });

// Risk Assessment Model
const RiskAssessment = sequelize.define('RiskAssessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyId: { type: DataTypes.INTEGER },
  floodZone: { type: DataTypes.STRING },
  earthquakeRisk: { type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high') },
  fireRisk: { type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high') },
  environmentalRisk: { type: DataTypes.ENUM('very_low', 'low', 'moderate', 'high', 'very_high') },
  overallRiskScore: { type: DataTypes.DECIMAL(3, 1) },
  insuranceEstimate: { type: DataTypes.DECIMAL(10, 2) },
  aiRiskAnalysis: { type: DataTypes.TEXT },
  mitigationSuggestions: { type: DataTypes.TEXT }
}, { tableName: 'risk_assessments', timestamps: true });

// AiResult Model — persists every AI response
const AiResult = sequelize.define('AiResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  endpoint: { type: DataTypes.STRING(100) },
  entityType: { type: DataTypes.STRING(50) },
  entityId: { type: DataTypes.INTEGER },
  model: { type: DataTypes.STRING(100) },
  prompt: { type: DataTypes.TEXT },
  rawResponse: { type: DataTypes.TEXT },
  parsedJson: { type: DataTypes.JSONB },
  tokensUsed: { type: DataTypes.INTEGER },
  status: { type: DataTypes.ENUM('success', 'error'), defaultValue: 'success' }
}, { tableName: 'ai_results', timestamps: true, updatedAt: false });

// AuditLog Model
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  action: { type: DataTypes.STRING(100) },
  entityType: { type: DataTypes.STRING(50) },
  entityId: { type: DataTypes.INTEGER },
  oldValue: { type: DataTypes.JSONB },
  newValue: { type: DataTypes.JSONB }
}, { tableName: 'audit_logs', timestamps: true, updatedAt: false });

// Associations
Property.hasMany(Valuation, { foreignKey: 'propertyId' });
Valuation.belongsTo(Property, { foreignKey: 'propertyId' });

Property.hasMany(ComparableSale, { foreignKey: 'propertyId' });
ComparableSale.belongsTo(Property, { foreignKey: 'propertyId' });

Property.hasMany(InvestmentAnalysis, { foreignKey: 'propertyId' });
InvestmentAnalysis.belongsTo(Property, { foreignKey: 'propertyId' });

Property.hasMany(RenovationEstimate, { foreignKey: 'propertyId' });
RenovationEstimate.belongsTo(Property, { foreignKey: 'propertyId' });

Property.hasMany(TaxAssessment, { foreignKey: 'propertyId' });
TaxAssessment.belongsTo(Property, { foreignKey: 'propertyId' });

Property.hasMany(RiskAssessment, { foreignKey: 'propertyId' });
RiskAssessment.belongsTo(Property, { foreignKey: 'propertyId' });

module.exports = {
  sequelize,
  User,
  Property,
  Valuation,
  ComparableSale,
  MarketAnalysis,
  InvestmentAnalysis,
  Neighborhood,
  RenovationEstimate,
  TaxAssessment,
  RiskAssessment,
  AuditLog,
  AiResult
};
