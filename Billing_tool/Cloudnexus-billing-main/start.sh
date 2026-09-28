#!/bin/bash
set -e
echo "🚀 Starting CloudNexus..."

# Backend
cd backend
python -m pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ Backend running at http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"

# Frontend
cd ../frontend
npm install --silent
REACT_APP_API_URL=http://localhost:8000 npm start &
FRONTEND_PID=$!
echo "✅ Frontend running at http://localhost:3000"

echo ""
echo "📊 CloudNexus is ready!"
echo "   Dashboard: http://localhost:3000"
echo "   API:       http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
