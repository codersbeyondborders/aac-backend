#!/bin/bash

echo "🗣️ Smart AAC Frontend Setup"
echo "============================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please update Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "⚠️  IMPORTANT: Please update the .env file with your Firebase configuration:"
    echo "   - Get your Firebase config from: https://console.firebase.google.com"
    echo "   - Update REACT_APP_FIREBASE_* variables in frontend/.env"
    echo "   - Make sure the backend API is running on the configured URL"
else
    echo "✅ Environment file already exists"
fi

echo ""
echo "🎉 Frontend setup complete!"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env with your Firebase configuration"
echo "2. Make sure the backend API is running"
echo "3. Start the frontend development server:"
echo "   cd frontend && npm start"
echo ""
echo "The application will be available at: http://localhost:3000"
echo ""
echo "📚 For more information, see frontend/README.md"