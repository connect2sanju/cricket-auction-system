#!/bin/bash

# Start Both Backend and Frontend
echo "🏏 Starting SHV Cricket Auction Application"
echo "==========================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "📡 Starting Backend Server..."
cd backend

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    source ../venv/bin/activate
fi

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
fi

python3 app.py &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo "⚛️  Starting React Frontend..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm start &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "✅ Both servers are running!"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait

