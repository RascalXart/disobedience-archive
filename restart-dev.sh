#!/bin/bash
# Quick dev server restart script

echo "🛑 Stopping dev server..."
pkill -9 -f "next dev" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 1

echo "🧹 Clearing cache..."
rm -rf .next
sleep 1

echo "🚀 Starting dev server..."
npm run dev
