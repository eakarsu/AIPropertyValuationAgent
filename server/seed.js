require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Property, Valuation, ComparableSale, MarketAnalysis, InvestmentAnalysis, Neighborhood, RenovationEstimate, TaxAssessment, RiskAssessment } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync({ force: true });
    console.log('Tables created');

    // Seed Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.bulkCreate([
      { email: 'admin@propvaluation.com', password: hashedPassword, name: 'Sarah Johnson', role: 'admin' },
      { email: 'appraiser@propvaluation.com', password: hashedPassword, name: 'Michael Chen', role: 'appraiser' },
      { email: 'agent@propvaluation.com', password: hashedPassword, name: 'Emily Davis', role: 'agent' },
      { email: 'investor@propvaluation.com', password: hashedPassword, name: 'Robert Wilson', role: 'investor' }
    ]);
    console.log('Users seeded');

    // Seed Properties (15+)
    const properties = await Property.bulkCreate([
      { address: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', zipCode: '62704', propertyType: 'single_family', bedrooms: 4, bathrooms: 2.5, squareFeet: 2200, lotSize: 0.25, yearBuilt: 1985, listPrice: 385000, estimatedValue: 392000, status: 'active', description: 'Charming family home with updated kitchen and spacious backyard.' },
      { address: '1600 Pennsylvania Ave', city: 'Washington', state: 'DC', zipCode: '20500', propertyType: 'single_family', bedrooms: 6, bathrooms: 5.0, squareFeet: 5500, lotSize: 18.0, yearBuilt: 1800, listPrice: 4500000, estimatedValue: 4200000, status: 'active', description: 'Historic property with exceptional craftsmanship and grand architecture.' },
      { address: '350 Fifth Avenue', city: 'New York', state: 'NY', zipCode: '10118', propertyType: 'commercial', bedrooms: 0, bathrooms: 0, squareFeet: 85000, lotSize: 2.0, yearBuilt: 1931, listPrice: 25000000, estimatedValue: 24500000, status: 'active', description: 'Iconic commercial property in prime Manhattan location.' },
      { address: '221B Baker Street', city: 'San Francisco', state: 'CA', zipCode: '94102', propertyType: 'condo', bedrooms: 2, bathrooms: 1.5, squareFeet: 1200, lotSize: 0, yearBuilt: 2005, listPrice: 850000, estimatedValue: 875000, status: 'active', description: 'Modern condo with city views and luxury finishes.' },
      { address: '456 Oak Ridge Dr', city: 'Austin', state: 'TX', zipCode: '78701', propertyType: 'single_family', bedrooms: 3, bathrooms: 2.0, squareFeet: 1800, lotSize: 0.3, yearBuilt: 2015, listPrice: 520000, estimatedValue: 535000, status: 'active', description: 'Contemporary home in desirable Austin neighborhood.' },
      { address: '789 Sunset Blvd', city: 'Los Angeles', state: 'CA', zipCode: '90028', propertyType: 'multi_family', bedrooms: 8, bathrooms: 6.0, squareFeet: 4200, lotSize: 0.5, yearBuilt: 1972, listPrice: 2100000, estimatedValue: 2050000, status: 'active', description: 'Well-maintained multi-family property with consistent rental income.' },
      { address: '1234 Lake Shore Dr', city: 'Chicago', state: 'IL', zipCode: '60611', propertyType: 'condo', bedrooms: 3, bathrooms: 2.0, squareFeet: 1650, lotSize: 0, yearBuilt: 2018, listPrice: 725000, estimatedValue: 740000, status: 'pending', description: 'Luxury lakefront condo with panoramic views.' },
      { address: '567 Peachtree St', city: 'Atlanta', state: 'GA', zipCode: '30308', propertyType: 'townhouse', bedrooms: 3, bathrooms: 2.5, squareFeet: 1900, lotSize: 0.1, yearBuilt: 2020, listPrice: 445000, estimatedValue: 460000, status: 'active', description: 'New construction townhouse in trendy Midtown neighborhood.' },
      { address: '890 Collins Ave', city: 'Miami', state: 'FL', zipCode: '33139', propertyType: 'condo', bedrooms: 2, bathrooms: 2.0, squareFeet: 1400, lotSize: 0, yearBuilt: 2019, listPrice: 680000, estimatedValue: 695000, status: 'active', description: 'Beachfront condo with ocean views and resort-style amenities.' },
      { address: '234 Pioneer Way', city: 'Seattle', state: 'WA', zipCode: '98101', propertyType: 'single_family', bedrooms: 4, bathrooms: 3.0, squareFeet: 2600, lotSize: 0.35, yearBuilt: 1998, listPrice: 890000, estimatedValue: 910000, status: 'active', description: 'Pacific Northwest charm with modern upgrades.' },
      { address: '678 Ranch Road', city: 'Denver', state: 'CO', zipCode: '80202', propertyType: 'single_family', bedrooms: 5, bathrooms: 3.5, squareFeet: 3200, lotSize: 0.5, yearBuilt: 2010, listPrice: 780000, estimatedValue: 795000, status: 'sold', description: 'Mountain-view family home with finished basement.' },
      { address: '901 Industrial Pkwy', city: 'Phoenix', state: 'AZ', zipCode: '85004', propertyType: 'industrial', bedrooms: 0, bathrooms: 2.0, squareFeet: 15000, lotSize: 2.5, yearBuilt: 2000, listPrice: 1800000, estimatedValue: 1750000, status: 'active', description: 'Modern industrial facility with office space and loading docks.' },
      { address: '345 Harbor View', city: 'Boston', state: 'MA', zipCode: '02110', propertyType: 'condo', bedrooms: 1, bathrooms: 1.0, squareFeet: 850, lotSize: 0, yearBuilt: 2022, listPrice: 625000, estimatedValue: 640000, status: 'active', description: 'New luxury waterfront condo in Seaport District.' },
      { address: '112 Magnolia Lane', city: 'Nashville', state: 'TN', zipCode: '37203', propertyType: 'single_family', bedrooms: 3, bathrooms: 2.0, squareFeet: 1700, lotSize: 0.2, yearBuilt: 1960, listPrice: 425000, estimatedValue: 440000, status: 'active', description: 'Renovated craftsman home near downtown Nashville.' },
      { address: '555 Desert Palm Dr', city: 'Scottsdale', state: 'AZ', zipCode: '85251', propertyType: 'single_family', bedrooms: 4, bathrooms: 3.0, squareFeet: 2800, lotSize: 0.4, yearBuilt: 2008, listPrice: 695000, estimatedValue: 710000, status: 'active', description: 'Southwestern-style home with pool and mountain views.' },
      { address: '777 Vineyard Ct', city: 'Napa', state: 'CA', zipCode: '94558', propertyType: 'land', bedrooms: 0, bathrooms: 0, squareFeet: 0, lotSize: 15.0, yearBuilt: 0, listPrice: 2500000, estimatedValue: 2450000, status: 'active', description: 'Prime vineyard land with development potential.' }
    ]);
    console.log('Properties seeded');

    // Seed Valuations (15+)
    await Valuation.bulkCreate([
      { propertyId: 1, valuationType: 'automated', estimatedValue: 392000, confidenceScore: 87.5, status: 'completed', factors: { location: 8, condition: 7, market: 8 }, notes: 'Based on recent sales data' },
      { propertyId: 2, valuationType: 'comparative', estimatedValue: 4200000, confidenceScore: 72.0, status: 'reviewed', factors: { location: 10, condition: 9, market: 7 }, notes: 'Historical property premium applied' },
      { propertyId: 3, valuationType: 'income', estimatedValue: 24500000, confidenceScore: 90.0, status: 'approved', factors: { location: 10, condition: 8, market: 9 }, notes: 'Income approach based on rental data' },
      { propertyId: 4, valuationType: 'automated', estimatedValue: 875000, confidenceScore: 85.0, status: 'completed', factors: { location: 9, condition: 8, market: 8 }, notes: 'SF condo market adjustments' },
      { propertyId: 5, valuationType: 'comparative', estimatedValue: 535000, confidenceScore: 88.0, status: 'completed', factors: { location: 8, condition: 9, market: 9 }, notes: 'Strong Austin market growth' },
      { propertyId: 6, valuationType: 'income', estimatedValue: 2050000, confidenceScore: 82.0, status: 'reviewed', factors: { location: 8, condition: 7, market: 7 }, notes: 'Multi-family income approach' },
      { propertyId: 7, valuationType: 'automated', estimatedValue: 740000, confidenceScore: 91.0, status: 'approved', factors: { location: 9, condition: 9, market: 8 }, notes: 'Premium lakefront location' },
      { propertyId: 8, valuationType: 'comparative', estimatedValue: 460000, confidenceScore: 86.0, status: 'completed', factors: { location: 8, condition: 10, market: 8 }, notes: 'New construction premium' },
      { propertyId: 9, valuationType: 'automated', estimatedValue: 695000, confidenceScore: 84.0, status: 'completed', factors: { location: 9, condition: 8, market: 7 }, notes: 'Miami Beach premium applied' },
      { propertyId: 10, valuationType: 'comparative', estimatedValue: 910000, confidenceScore: 83.0, status: 'reviewed', factors: { location: 8, condition: 8, market: 8 }, notes: 'Seattle market steady growth' },
      { propertyId: 11, valuationType: 'automated', estimatedValue: 795000, confidenceScore: 89.0, status: 'approved', factors: { location: 7, condition: 8, market: 8 }, notes: 'Denver market adjustment' },
      { propertyId: 12, valuationType: 'cost', estimatedValue: 1750000, confidenceScore: 80.0, status: 'completed', factors: { location: 7, condition: 8, market: 7 }, notes: 'Industrial cost approach' },
      { propertyId: 13, valuationType: 'automated', estimatedValue: 640000, confidenceScore: 92.0, status: 'completed', factors: { location: 9, condition: 10, market: 8 }, notes: 'New construction in prime area' },
      { propertyId: 14, valuationType: 'comparative', estimatedValue: 440000, confidenceScore: 85.0, status: 'completed', factors: { location: 8, condition: 7, market: 9 }, notes: 'Nashville market hot' },
      { propertyId: 15, valuationType: 'automated', estimatedValue: 710000, confidenceScore: 86.0, status: 'completed', factors: { location: 8, condition: 8, market: 7 }, notes: 'Scottsdale stable market' },
      { propertyId: 16, valuationType: 'comparative', estimatedValue: 2450000, confidenceScore: 75.0, status: 'draft', factors: { location: 9, condition: 5, market: 8 }, notes: 'Vineyard land valuation' }
    ]);
    console.log('Valuations seeded');

    // Seed Comparable Sales (15+)
    await ComparableSale.bulkCreate([
      { propertyId: 1, address: '750 Elm Street', city: 'Springfield', state: 'IL', salePrice: 375000, saleDate: '2025-11-15', squareFeet: 2100, bedrooms: 4, bathrooms: 2.0, pricePerSqFt: 178.57, distanceMiles: 0.3, similarityScore: 92 },
      { propertyId: 1, address: '818 Maple Ave', city: 'Springfield', state: 'IL', salePrice: 398000, saleDate: '2025-10-20', squareFeet: 2300, bedrooms: 4, bathrooms: 2.5, pricePerSqFt: 173.04, distanceMiles: 0.5, similarityScore: 88 },
      { propertyId: 4, address: '225 Baker Court', city: 'San Francisco', state: 'CA', salePrice: 890000, saleDate: '2025-12-01', squareFeet: 1250, bedrooms: 2, bathrooms: 2.0, pricePerSqFt: 712.00, distanceMiles: 0.2, similarityScore: 95 },
      { propertyId: 5, address: '462 Cedar Hill', city: 'Austin', state: 'TX', salePrice: 510000, saleDate: '2025-09-30', squareFeet: 1750, bedrooms: 3, bathrooms: 2.0, pricePerSqFt: 291.43, distanceMiles: 0.8, similarityScore: 90 },
      { propertyId: 5, address: '500 Birch Lane', city: 'Austin', state: 'TX', salePrice: 545000, saleDate: '2025-11-05', squareFeet: 1900, bedrooms: 3, bathrooms: 2.5, pricePerSqFt: 286.84, distanceMiles: 1.2, similarityScore: 85 },
      { propertyId: 7, address: '1250 Lake Shore Dr', city: 'Chicago', state: 'IL', salePrice: 710000, saleDate: '2025-08-20', squareFeet: 1600, bedrooms: 3, bathrooms: 2.0, pricePerSqFt: 443.75, distanceMiles: 0.1, similarityScore: 94 },
      { propertyId: 8, address: '575 Peachtree Walk', city: 'Atlanta', state: 'GA', salePrice: 430000, saleDate: '2025-10-15', squareFeet: 1850, bedrooms: 3, bathrooms: 2.5, pricePerSqFt: 232.43, distanceMiles: 0.4, similarityScore: 91 },
      { propertyId: 9, address: '900 Ocean Drive', city: 'Miami', state: 'FL', salePrice: 720000, saleDate: '2025-07-10', squareFeet: 1500, bedrooms: 2, bathrooms: 2.0, pricePerSqFt: 480.00, distanceMiles: 0.3, similarityScore: 89 },
      { propertyId: 10, address: '240 Pine Street', city: 'Seattle', state: 'WA', salePrice: 875000, saleDate: '2025-09-15', squareFeet: 2500, bedrooms: 4, bathrooms: 2.5, pricePerSqFt: 350.00, distanceMiles: 0.6, similarityScore: 87 },
      { propertyId: 11, address: '690 Mountain Ave', city: 'Denver', state: 'CO', salePrice: 765000, saleDate: '2025-08-01', squareFeet: 3000, bedrooms: 4, bathrooms: 3.0, pricePerSqFt: 255.00, distanceMiles: 0.9, similarityScore: 86 },
      { propertyId: 13, address: '350 Wharf St', city: 'Boston', state: 'MA', salePrice: 615000, saleDate: '2025-11-20', squareFeet: 800, bedrooms: 1, bathrooms: 1.0, pricePerSqFt: 768.75, distanceMiles: 0.2, similarityScore: 93 },
      { propertyId: 14, address: '120 Music Row', city: 'Nashville', state: 'TN', salePrice: 415000, saleDate: '2025-10-01', squareFeet: 1650, bedrooms: 3, bathrooms: 2.0, pricePerSqFt: 251.52, distanceMiles: 0.7, similarityScore: 88 },
      { propertyId: 15, address: '560 Cactus Way', city: 'Scottsdale', state: 'AZ', salePrice: 680000, saleDate: '2025-09-01', squareFeet: 2700, bedrooms: 4, bathrooms: 3.0, pricePerSqFt: 251.85, distanceMiles: 0.5, similarityScore: 90 },
      { propertyId: 6, address: '800 Sunset Place', city: 'Los Angeles', state: 'CA', salePrice: 2200000, saleDate: '2025-06-15', squareFeet: 4000, bedrooms: 6, bathrooms: 5.0, pricePerSqFt: 550.00, distanceMiles: 0.4, similarityScore: 82 },
      { propertyId: 12, address: '910 Commerce Blvd', city: 'Phoenix', state: 'AZ', salePrice: 1650000, saleDate: '2025-07-20', squareFeet: 14000, bedrooms: 0, bathrooms: 2.0, pricePerSqFt: 117.86, distanceMiles: 1.5, similarityScore: 80 }
    ]);
    console.log('Comparable sales seeded');

    // Seed Market Analyses (15+)
    await MarketAnalysis.bulkCreate([
      { area: 'Springfield', state: 'IL', medianPrice: 375000, averagePricePerSqFt: 175, daysOnMarket: 42, inventoryCount: 580, yearOverYearChange: 4.2, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'San Francisco', state: 'CA', medianPrice: 1250000, averagePricePerSqFt: 850, daysOnMarket: 28, inventoryCount: 1200, yearOverYearChange: 2.8, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Austin', state: 'TX', medianPrice: 485000, averagePricePerSqFt: 275, daysOnMarket: 35, inventoryCount: 3500, yearOverYearChange: 6.5, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Chicago', state: 'IL', medianPrice: 350000, averagePricePerSqFt: 225, daysOnMarket: 45, inventoryCount: 8500, yearOverYearChange: 3.1, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'Los Angeles', state: 'CA', medianPrice: 950000, averagePricePerSqFt: 650, daysOnMarket: 38, inventoryCount: 5200, yearOverYearChange: 3.8, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'Atlanta', state: 'GA', medianPrice: 395000, averagePricePerSqFt: 210, daysOnMarket: 30, inventoryCount: 4800, yearOverYearChange: 7.2, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Miami', state: 'FL', medianPrice: 550000, averagePricePerSqFt: 420, daysOnMarket: 48, inventoryCount: 6200, yearOverYearChange: 5.5, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'Seattle', state: 'WA', medianPrice: 780000, averagePricePerSqFt: 450, daysOnMarket: 25, inventoryCount: 2800, yearOverYearChange: 4.0, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'Denver', state: 'CO', medianPrice: 580000, averagePricePerSqFt: 310, daysOnMarket: 32, inventoryCount: 3200, yearOverYearChange: 5.0, marketTrend: 'warm', analysisDate: '2026-01-15' },
      { area: 'Phoenix', state: 'AZ', medianPrice: 425000, averagePricePerSqFt: 245, daysOnMarket: 40, inventoryCount: 7500, yearOverYearChange: 6.0, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Boston', state: 'MA', medianPrice: 720000, averagePricePerSqFt: 580, daysOnMarket: 22, inventoryCount: 1800, yearOverYearChange: 3.5, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Nashville', state: 'TN', medianPrice: 420000, averagePricePerSqFt: 250, daysOnMarket: 28, inventoryCount: 3900, yearOverYearChange: 8.0, marketTrend: 'hot', analysisDate: '2026-01-15' },
      { area: 'Scottsdale', state: 'AZ', medianPrice: 650000, averagePricePerSqFt: 310, daysOnMarket: 45, inventoryCount: 1500, yearOverYearChange: 3.0, marketTrend: 'neutral', analysisDate: '2026-01-15' },
      { area: 'Napa Valley', state: 'CA', medianPrice: 1100000, averagePricePerSqFt: 520, daysOnMarket: 60, inventoryCount: 450, yearOverYearChange: 2.0, marketTrend: 'neutral', analysisDate: '2026-01-15' },
      { area: 'Manhattan', state: 'NY', medianPrice: 1850000, averagePricePerSqFt: 1200, daysOnMarket: 55, inventoryCount: 4500, yearOverYearChange: 1.5, marketTrend: 'cool', analysisDate: '2026-01-15' },
      { area: 'Washington DC', state: 'DC', medianPrice: 680000, averagePricePerSqFt: 450, daysOnMarket: 30, inventoryCount: 2200, yearOverYearChange: 3.2, marketTrend: 'warm', analysisDate: '2026-01-15' }
    ]);
    console.log('Market analyses seeded');

    // Seed Investment Analyses (15+)
    await InvestmentAnalysis.bulkCreate([
      { propertyId: 1, purchasePrice: 385000, monthlyRent: 2200, annualExpenses: 8500, capRate: 5.2, cashOnCashReturn: 7.8, roi: 12.5, netOperatingIncome: 17900, riskScore: 'low' },
      { propertyId: 4, purchasePrice: 850000, monthlyRent: 4500, annualExpenses: 15000, capRate: 4.6, cashOnCashReturn: 6.2, roi: 9.8, netOperatingIncome: 39000, riskScore: 'medium' },
      { propertyId: 5, purchasePrice: 520000, monthlyRent: 2800, annualExpenses: 10000, capRate: 5.5, cashOnCashReturn: 8.1, roi: 13.2, netOperatingIncome: 23600, riskScore: 'low' },
      { propertyId: 6, purchasePrice: 2100000, monthlyRent: 14000, annualExpenses: 45000, capRate: 5.8, cashOnCashReturn: 7.5, roi: 11.0, netOperatingIncome: 123000, riskScore: 'medium' },
      { propertyId: 7, purchasePrice: 725000, monthlyRent: 3800, annualExpenses: 12000, capRate: 4.8, cashOnCashReturn: 6.5, roi: 10.2, netOperatingIncome: 33600, riskScore: 'low' },
      { propertyId: 8, purchasePrice: 445000, monthlyRent: 2500, annualExpenses: 8000, capRate: 5.4, cashOnCashReturn: 7.9, roi: 12.8, netOperatingIncome: 22000, riskScore: 'low' },
      { propertyId: 9, purchasePrice: 680000, monthlyRent: 3600, annualExpenses: 14000, capRate: 4.5, cashOnCashReturn: 5.8, roi: 8.5, netOperatingIncome: 29200, riskScore: 'medium' },
      { propertyId: 10, purchasePrice: 890000, monthlyRent: 4200, annualExpenses: 16000, capRate: 4.0, cashOnCashReturn: 5.5, roi: 8.0, netOperatingIncome: 34400, riskScore: 'medium' },
      { propertyId: 11, purchasePrice: 780000, monthlyRent: 3500, annualExpenses: 12500, capRate: 4.2, cashOnCashReturn: 5.9, roi: 9.0, netOperatingIncome: 29500, riskScore: 'low' },
      { propertyId: 12, purchasePrice: 1800000, monthlyRent: 12000, annualExpenses: 35000, capRate: 5.9, cashOnCashReturn: 7.0, roi: 10.5, netOperatingIncome: 109000, riskScore: 'medium' },
      { propertyId: 13, purchasePrice: 625000, monthlyRent: 3200, annualExpenses: 11000, capRate: 4.3, cashOnCashReturn: 5.6, roi: 8.2, netOperatingIncome: 27400, riskScore: 'low' },
      { propertyId: 14, purchasePrice: 425000, monthlyRent: 2400, annualExpenses: 7500, capRate: 5.6, cashOnCashReturn: 8.2, roi: 13.5, netOperatingIncome: 21300, riskScore: 'low' },
      { propertyId: 15, purchasePrice: 695000, monthlyRent: 3300, annualExpenses: 11500, capRate: 4.5, cashOnCashReturn: 6.0, roi: 9.2, netOperatingIncome: 28100, riskScore: 'medium' },
      { propertyId: 3, purchasePrice: 25000000, monthlyRent: 185000, annualExpenses: 650000, capRate: 6.4, cashOnCashReturn: 8.5, roi: 15.0, netOperatingIncome: 1570000, riskScore: 'high' },
      { propertyId: 2, purchasePrice: 4500000, monthlyRent: 25000, annualExpenses: 85000, capRate: 4.8, cashOnCashReturn: 5.2, roi: 7.5, netOperatingIncome: 215000, riskScore: 'high' }
    ]);
    console.log('Investment analyses seeded');

    // Seed Neighborhoods (15+)
    await Neighborhood.bulkCreate([
      { name: 'Downtown Springfield', city: 'Springfield', state: 'IL', walkScore: 72, transitScore: 55, schoolRating: 7.2, crimeRate: 'moderate', medianIncome: 55000, populationGrowth: 1.2, amenitiesScore: 7.5 },
      { name: 'Pacific Heights', city: 'San Francisco', state: 'CA', walkScore: 92, transitScore: 85, schoolRating: 8.5, crimeRate: 'low', medianIncome: 145000, populationGrowth: 0.8, amenitiesScore: 9.2 },
      { name: 'South Congress', city: 'Austin', state: 'TX', walkScore: 85, transitScore: 45, schoolRating: 7.8, crimeRate: 'low', medianIncome: 78000, populationGrowth: 4.5, amenitiesScore: 8.8 },
      { name: 'Lincoln Park', city: 'Chicago', state: 'IL', walkScore: 95, transitScore: 90, schoolRating: 8.0, crimeRate: 'low', medianIncome: 95000, populationGrowth: 1.5, amenitiesScore: 9.0 },
      { name: 'Silver Lake', city: 'Los Angeles', state: 'CA', walkScore: 80, transitScore: 60, schoolRating: 7.0, crimeRate: 'moderate', medianIncome: 85000, populationGrowth: 2.0, amenitiesScore: 8.5 },
      { name: 'Midtown', city: 'Atlanta', state: 'GA', walkScore: 88, transitScore: 70, schoolRating: 7.5, crimeRate: 'moderate', medianIncome: 72000, populationGrowth: 5.0, amenitiesScore: 8.7 },
      { name: 'South Beach', city: 'Miami', state: 'FL', walkScore: 93, transitScore: 75, schoolRating: 6.8, crimeRate: 'moderate', medianIncome: 65000, populationGrowth: 3.2, amenitiesScore: 9.5 },
      { name: 'Capitol Hill', city: 'Seattle', state: 'WA', walkScore: 96, transitScore: 82, schoolRating: 7.8, crimeRate: 'low', medianIncome: 92000, populationGrowth: 2.5, amenitiesScore: 9.1 },
      { name: 'LoDo', city: 'Denver', state: 'CO', walkScore: 91, transitScore: 68, schoolRating: 7.2, crimeRate: 'moderate', medianIncome: 82000, populationGrowth: 3.8, amenitiesScore: 8.9 },
      { name: 'Old Town', city: 'Scottsdale', state: 'AZ', walkScore: 75, transitScore: 30, schoolRating: 8.2, crimeRate: 'very_low', medianIncome: 105000, populationGrowth: 2.2, amenitiesScore: 8.0 },
      { name: 'Seaport District', city: 'Boston', state: 'MA', walkScore: 90, transitScore: 88, schoolRating: 8.5, crimeRate: 'low', medianIncome: 110000, populationGrowth: 4.0, amenitiesScore: 9.3 },
      { name: 'The Gulch', city: 'Nashville', state: 'TN', walkScore: 87, transitScore: 50, schoolRating: 7.0, crimeRate: 'low', medianIncome: 68000, populationGrowth: 6.0, amenitiesScore: 8.6 },
      { name: 'Georgetown', city: 'Washington', state: 'DC', walkScore: 94, transitScore: 78, schoolRating: 8.8, crimeRate: 'low', medianIncome: 130000, populationGrowth: 1.0, amenitiesScore: 9.4 },
      { name: 'Upper East Side', city: 'New York', state: 'NY', walkScore: 98, transitScore: 95, schoolRating: 9.0, crimeRate: 'very_low', medianIncome: 155000, populationGrowth: 0.5, amenitiesScore: 9.8 },
      { name: 'Arcadia', city: 'Phoenix', state: 'AZ', walkScore: 55, transitScore: 25, schoolRating: 8.0, crimeRate: 'very_low', medianIncome: 95000, populationGrowth: 3.0, amenitiesScore: 7.8 },
      { name: 'St. Helena', city: 'Napa', state: 'CA', walkScore: 65, transitScore: 15, schoolRating: 8.5, crimeRate: 'very_low', medianIncome: 88000, populationGrowth: 0.8, amenitiesScore: 7.0 }
    ]);
    console.log('Neighborhoods seeded');

    // Seed Renovation Estimates (15+)
    await RenovationEstimate.bulkCreate([
      { propertyId: 1, renovationType: 'Kitchen Remodel', estimatedCost: 35000, estimatedValueAdd: 52000, roiPercentage: 48.6, priority: 'high', timelineWeeks: 8, status: 'proposed' },
      { propertyId: 1, renovationType: 'Bathroom Update', estimatedCost: 15000, estimatedValueAdd: 22000, roiPercentage: 46.7, priority: 'medium', timelineWeeks: 4, status: 'proposed' },
      { propertyId: 4, renovationType: 'Hardwood Flooring', estimatedCost: 12000, estimatedValueAdd: 18000, roiPercentage: 50.0, priority: 'medium', timelineWeeks: 2, status: 'approved' },
      { propertyId: 5, renovationType: 'Deck Addition', estimatedCost: 18000, estimatedValueAdd: 25000, roiPercentage: 38.9, priority: 'low', timelineWeeks: 3, status: 'proposed' },
      { propertyId: 6, renovationType: 'Roof Replacement', estimatedCost: 25000, estimatedValueAdd: 30000, roiPercentage: 20.0, priority: 'critical', timelineWeeks: 2, status: 'in_progress' },
      { propertyId: 7, renovationType: 'Smart Home Upgrade', estimatedCost: 8000, estimatedValueAdd: 15000, roiPercentage: 87.5, priority: 'medium', timelineWeeks: 1, status: 'completed' },
      { propertyId: 8, renovationType: 'Landscaping', estimatedCost: 10000, estimatedValueAdd: 16000, roiPercentage: 60.0, priority: 'low', timelineWeeks: 3, status: 'proposed' },
      { propertyId: 9, renovationType: 'Window Replacement', estimatedCost: 20000, estimatedValueAdd: 28000, roiPercentage: 40.0, priority: 'high', timelineWeeks: 2, status: 'approved' },
      { propertyId: 10, renovationType: 'Basement Finishing', estimatedCost: 45000, estimatedValueAdd: 65000, roiPercentage: 44.4, priority: 'medium', timelineWeeks: 10, status: 'proposed' },
      { propertyId: 11, renovationType: 'Solar Panel Install', estimatedCost: 22000, estimatedValueAdd: 35000, roiPercentage: 59.1, priority: 'medium', timelineWeeks: 2, status: 'completed' },
      { propertyId: 13, renovationType: 'Custom Closets', estimatedCost: 5000, estimatedValueAdd: 8000, roiPercentage: 60.0, priority: 'low', timelineWeeks: 1, status: 'proposed' },
      { propertyId: 14, renovationType: 'HVAC Upgrade', estimatedCost: 12000, estimatedValueAdd: 15000, roiPercentage: 25.0, priority: 'high', timelineWeeks: 1, status: 'approved' },
      { propertyId: 14, renovationType: 'Master Suite Addition', estimatedCost: 55000, estimatedValueAdd: 75000, roiPercentage: 36.4, priority: 'medium', timelineWeeks: 12, status: 'proposed' },
      { propertyId: 15, renovationType: 'Pool Installation', estimatedCost: 45000, estimatedValueAdd: 55000, roiPercentage: 22.2, priority: 'low', timelineWeeks: 8, status: 'proposed' },
      { propertyId: 12, renovationType: 'Office Build-Out', estimatedCost: 85000, estimatedValueAdd: 120000, roiPercentage: 41.2, priority: 'high', timelineWeeks: 6, status: 'in_progress' }
    ]);
    console.log('Renovation estimates seeded');

    // Seed Tax Assessments (15+)
    await TaxAssessment.bulkCreate([
      { propertyId: 1, assessedValue: 310000, taxRate: 2.1600, annualTax: 6696, assessmentYear: 2025, landValue: 85000, improvementValue: 225000, exemptions: 'Homestead' },
      { propertyId: 2, assessedValue: 3800000, taxRate: 0.8500, annualTax: 32300, assessmentYear: 2025, landValue: 2500000, improvementValue: 1300000, exemptions: 'Historic' },
      { propertyId: 3, assessedValue: 22000000, taxRate: 1.2500, annualTax: 275000, assessmentYear: 2025, landValue: 15000000, improvementValue: 7000000, exemptions: 'None' },
      { propertyId: 4, assessedValue: 750000, taxRate: 1.1800, annualTax: 8850, assessmentYear: 2025, landValue: 350000, improvementValue: 400000, exemptions: 'None' },
      { propertyId: 5, assessedValue: 420000, taxRate: 1.8200, annualTax: 7644, assessmentYear: 2025, landValue: 150000, improvementValue: 270000, exemptions: 'Homestead' },
      { propertyId: 6, assessedValue: 1800000, taxRate: 1.1800, annualTax: 21240, assessmentYear: 2025, landValue: 800000, improvementValue: 1000000, exemptions: 'None' },
      { propertyId: 7, assessedValue: 620000, taxRate: 2.1600, annualTax: 13392, assessmentYear: 2025, landValue: 200000, improvementValue: 420000, exemptions: 'None' },
      { propertyId: 8, assessedValue: 380000, taxRate: 1.0200, annualTax: 3876, assessmentYear: 2025, landValue: 120000, improvementValue: 260000, exemptions: 'None' },
      { propertyId: 9, assessedValue: 580000, taxRate: 0.9800, annualTax: 5684, assessmentYear: 2025, landValue: 300000, improvementValue: 280000, exemptions: 'None' },
      { propertyId: 10, assessedValue: 760000, taxRate: 1.0300, annualTax: 7828, assessmentYear: 2025, landValue: 350000, improvementValue: 410000, exemptions: 'None' },
      { propertyId: 11, assessedValue: 650000, taxRate: 0.7700, annualTax: 5005, assessmentYear: 2025, landValue: 250000, improvementValue: 400000, exemptions: 'None' },
      { propertyId: 12, assessedValue: 1500000, taxRate: 0.6800, annualTax: 10200, assessmentYear: 2025, landValue: 700000, improvementValue: 800000, exemptions: 'None' },
      { propertyId: 13, assessedValue: 550000, taxRate: 1.2000, annualTax: 6600, assessmentYear: 2025, landValue: 280000, improvementValue: 270000, exemptions: 'None' },
      { propertyId: 14, assessedValue: 350000, taxRate: 0.7100, annualTax: 2485, assessmentYear: 2025, landValue: 130000, improvementValue: 220000, exemptions: 'Homestead' },
      { propertyId: 15, assessedValue: 590000, taxRate: 0.6800, annualTax: 4012, assessmentYear: 2025, landValue: 200000, improvementValue: 390000, exemptions: 'None' }
    ]);
    console.log('Tax assessments seeded');

    // Seed Risk Assessments (15+)
    await RiskAssessment.bulkCreate([
      { propertyId: 1, floodZone: 'X (Minimal)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'low', overallRiskScore: 2.5, insuranceEstimate: 1800 },
      { propertyId: 2, floodZone: 'X (Minimal)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'low', overallRiskScore: 2.0, insuranceEstimate: 8500 },
      { propertyId: 3, floodZone: 'AE (High)', earthquakeRisk: 'low', fireRisk: 'moderate', environmentalRisk: 'moderate', overallRiskScore: 5.5, insuranceEstimate: 65000 },
      { propertyId: 4, floodZone: 'X (Minimal)', earthquakeRisk: 'high', fireRisk: 'moderate', environmentalRisk: 'low', overallRiskScore: 5.0, insuranceEstimate: 3200 },
      { propertyId: 5, floodZone: 'X (Moderate)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'low', overallRiskScore: 2.0, insuranceEstimate: 2100 },
      { propertyId: 6, floodZone: 'X (Minimal)', earthquakeRisk: 'moderate', fireRisk: 'high', environmentalRisk: 'moderate', overallRiskScore: 5.5, insuranceEstimate: 8500 },
      { propertyId: 7, floodZone: 'AE (High)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'moderate', overallRiskScore: 4.5, insuranceEstimate: 4200 },
      { propertyId: 8, floodZone: 'X (Minimal)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'low', overallRiskScore: 1.5, insuranceEstimate: 1600 },
      { propertyId: 9, floodZone: 'VE (Coastal)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'high', overallRiskScore: 6.5, insuranceEstimate: 5800 },
      { propertyId: 10, floodZone: 'X (Minimal)', earthquakeRisk: 'moderate', fireRisk: 'moderate', environmentalRisk: 'low', overallRiskScore: 3.5, insuranceEstimate: 3500 },
      { propertyId: 11, floodZone: 'X (Moderate)', earthquakeRisk: 'low', fireRisk: 'moderate', environmentalRisk: 'low', overallRiskScore: 3.0, insuranceEstimate: 2800 },
      { propertyId: 12, floodZone: 'X (Minimal)', earthquakeRisk: 'low', fireRisk: 'moderate', environmentalRisk: 'moderate', overallRiskScore: 4.0, insuranceEstimate: 6500 },
      { propertyId: 13, floodZone: 'AE (High)', earthquakeRisk: 'low', fireRisk: 'low', environmentalRisk: 'moderate', overallRiskScore: 4.5, insuranceEstimate: 3800 },
      { propertyId: 14, floodZone: 'X (Moderate)', earthquakeRisk: 'very_low', fireRisk: 'low', environmentalRisk: 'low', overallRiskScore: 2.0, insuranceEstimate: 1500 },
      { propertyId: 15, floodZone: 'X (Minimal)', earthquakeRisk: 'low', fireRisk: 'high', environmentalRisk: 'low', overallRiskScore: 3.5, insuranceEstimate: 2900 }
    ]);
    console.log('Risk assessments seeded');

    console.log('\n✅ All seed data inserted successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
