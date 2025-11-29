# 🚀 Quick Start Guide

## Prerequisites
- ✅ Python 3.9+ (you have it)
- ✅ Node.js 16+ (you have v25.2.1)
- ✅ npm (you have v11.6.2)

## Option 1: Start Everything at Once (Recommended)

```bash
./start_all.sh
```

This will start both backend and frontend servers automatically.

## Option 2: Start Servers Separately

### Terminal 1 - Backend:
```bash
./start_backend.sh
# or manually:
cd backend
source ../venv/bin/activate
python3 app.py
```

### Terminal 2 - Frontend:
```bash
./start_frontend.sh
# or manually:
cd frontend
npm start
```

## Access the Application

- **Frontend (React App):** http://localhost:3000
- **Backend API:** http://localhost:5000

The React app will automatically open in your browser.

## First Time Setup

If you haven't installed dependencies yet:

### Backend:
```bash
source venv/bin/activate
cd backend
pip install -r requirements.txt
```

### Frontend:
```bash
cd frontend
npm install
```

## Troubleshooting

### Backend not starting?
- Make sure virtual environment is activated
- Check if port 5000 is available
- Verify Flask is installed: `pip list | grep flask`

### Frontend not starting?
- Make sure Node.js is installed: `node --version`
- Check if port 3000 is available
- Try deleting `node_modules` and reinstalling: `rm -rf node_modules && npm install`

### CORS errors?
- Make sure backend is running on port 5000
- Check that `flask-cors` is installed

## Stopping the Servers

Press `Ctrl+C` in the terminal(s) where the servers are running.

If using `start_all.sh`, pressing `Ctrl+C` will stop both servers.

