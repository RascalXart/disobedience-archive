#!/bin/bash
# Robust dev server restart script - ensures clean restart every time

set -e  # Exit on error

echo "🛑 Stopping all Next.js processes..."
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node.*3001" 2>/dev/null || true

# Kill anything on port 3001
PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ ! -z "$PORT_PID" ]; then
  echo "   Killing process on port 3001 (PID: $PORT_PID)..."
  kill -9 $PORT_PID 2>/dev/null || true
fi

# Wait for processes to fully terminate
sleep 2

echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

echo "✅ Verifying port 3001 is free..."
if lsof -ti:3001 >/dev/null 2>&1; then
  echo "   ⚠️  Port 3001 still in use, forcing cleanup..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "🚀 Starting dev server..."
npm run dev
