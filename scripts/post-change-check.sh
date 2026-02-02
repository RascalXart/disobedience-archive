#!/bin/bash
# Run after making code changes to ensure dev server stays healthy
# Automatically restarts dev server if needed

set -e

echo "🔍 Checking dev server health after changes..."

# First, verify build works
echo "📦 Verifying build..."
if ! npm run build > /tmp/build-check.log 2>&1; then
  echo "❌ Build failed! Check /tmp/build-check.log"
  cat /tmp/build-check.log | tail -20
  exit 1
fi

echo "✅ Build successful"

# Always restart dev server after successful build to ensure fresh state
echo "🔄 Restarting dev server to apply changes..."
cd "$(dirname "$0")/.."

# Kill existing processes
pkill -9 -f "next" 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Clear cache
rm -rf .next 2>/dev/null || true

# Start dev server in background
echo "🚀 Starting dev server..."
npm run dev > /tmp/dev-server.log 2>&1 &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for dev server to start..."
for i in {1..30}; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null | grep -q "200"; then
    echo "✅ Dev server is running and healthy"
    exit 0
  fi
done

echo "⚠️  Dev server may still be starting. Check /tmp/dev-server.log"
exit 0
