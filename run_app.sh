#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ -n "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null; fi
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "=========================================="
echo "Starting Mala Inventory App (Local)"
echo "=========================================="

echo "Installing dependencies (Frontend)..."
npm install

echo "Installing dependencies (Backend)..."
cd server
npm install
cd ..

echo "Starting Backend Server..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "App is running. Press Ctrl+C to stop."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
