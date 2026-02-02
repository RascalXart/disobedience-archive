#!/bin/bash
# Automatically restart dev server after code changes
# This script is called automatically after builds

# Skip in CI environments
if [ -n "$CI" ] || [ -n "$CF_PAGES" ]; then
  exit 0
fi

# Check if lsof is available (not available in all environments)
if ! command -v lsof >/dev/null 2>&1; then
  exit 0
fi

set -e

cd "$(dirname "$0")/.."

echo "🔄 Auto-restarting dev server..."

# Kill existing processes
pkill -9 -f "next" 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Clear cache
rm -rf .next 2>/dev/null || true

# Start dev server in background
npm run dev > /tmp/dev-server.log 2>&1 &

# Wait a bit for server to start
sleep 5

# Verify it's running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null | grep -q "200"; then
  echo "✅ Dev server restarted successfully"
else
  echo "⚠️  Dev server may still be starting. Check /tmp/dev-server.log"
fi
