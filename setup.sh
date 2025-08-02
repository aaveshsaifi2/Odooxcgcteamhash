#!/bin/bash

# CivicTrack Setup Script
echo "🚀 Setting up CivicTrack..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating backend environment file..."
    cp env.example .env
    echo "✅ Backend environment file created. Please edit .env with your configuration."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data uploads

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Create frontend environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating frontend environment file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
EOF
    echo "✅ Frontend environment file created. Please add your Mapbox token to .env.local"
fi

# Go back to root
cd ..

# Setup database
echo "🗄️ Setting up database..."
cd backend
npm run migrate
npm run seed

cd ..

echo ""
echo "🎉 CivicTrack setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your configuration"
echo "2. Add your Mapbox token to frontend/.env.local"
echo "3. Start the development servers: npm run dev"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "👤 Default admin account:"
echo "   Email: admin@civictrack.com"
echo "   Password: admin123"
echo ""
echo "Happy coding! 🚀" 