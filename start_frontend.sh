#!/bin/bash

# Start Frontend Server
echo "🚀 Starting React Frontend..."
echo "================================"

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start React app
echo "Starting React app on http://localhost:3000"
npm start

