#!/bin/bash

# Start Backend Server
echo "🚀 Starting Backend Server..."
echo "================================"

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    echo "Activating virtual environment..."
    source ../venv/bin/activate
fi

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Start Flask server
echo "Starting Flask API on http://localhost:5000"
python3 app.py

