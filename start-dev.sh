#!/bin/bash

# Start both the API server and React development server

echo "🚀 Starting Croissant Application with Database Integration"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your database configuration."
    exit 1
fi

echo "📊 Starting API Server (Port 3001)..."
npm run server &
API_PID=$!

# Wait a moment for the API server to start
sleep 3

echo "⚛️  Starting React App (Port 3000)..."
npm start &
REACT_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo ""
echo "🌐 React App: http://localhost:3000"
echo "🔗 API Server: http://localhost:3001"
echo ""
echo "📝 To stop both servers, press Ctrl+C or run:"
echo "   kill $API_PID $REACT_PID"
echo ""

# Wait for user to stop the servers
wait
