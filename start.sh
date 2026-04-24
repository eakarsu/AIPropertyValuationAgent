#!/bin/bash

echo "========================================="
echo "  AI Property Valuation Agent"
echo "  Starting Application..."
echo "========================================="

# Load environment variables
set -a
source .env 2>/dev/null
set +a

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo ""
echo "[1/6] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1
echo "  Ports cleaned."

# Check PostgreSQL
echo ""
echo "[2/6] Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "  PostgreSQL is not running. Attempting to start..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  sleep 2
  if ! pg_isready -q 2>/dev/null; then
    echo "  ERROR: Could not start PostgreSQL. Please start it manually."
    exit 1
  fi
fi
echo "  PostgreSQL is running."

# Create database if not exists
echo ""
echo "[3/6] Setting up database..."
createdb ai_property_valuation 2>/dev/null
echo "  Database ready."

# Install dependencies
echo ""
echo "[4/6] Installing dependencies..."
npm install --silent 2>/dev/null
cd client && npm install --silent 2>/dev/null
cd ..
echo "  Dependencies installed."

# Seed database
echo ""
echo "[5/6] Seeding database with sample data..."
node server/seed.js
echo "  Database seeded."

# Start application with hot reload
echo ""
echo "[6/6] Starting application with hot reload..."
echo ""
echo "========================================="
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "  Login Credentials:"
echo "  admin@propvaluation.com / password123"
echo "  appraiser@propvaluation.com / password123"
echo "  agent@propvaluation.com / password123"
echo "  investor@propvaluation.com / password123"
echo "========================================="
echo ""

# Start both servers with hot reload (nodemon for backend, react-scripts for frontend)
export PORT=$FRONTEND_PORT
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "blue,green" \
  "npx nodemon --watch server server/index.js" \
  "cd client && PORT=$FRONTEND_PORT npm start"
