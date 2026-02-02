#!/bin/bash
# Verify dev server is healthy and restart if needed

set -e

PORT=3001
MAX_RETRIES=3
RETRY_DELAY=2

check_server() {
  local status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/ 2>/dev/null || echo "000")
  echo "$status"
}

restart_server() {
  echo "🔄 Restarting dev server..."
  cd "$(dirname "$0")/.."
  ./restart-dev.sh > /dev/null 2>&1 &
  sleep 15
}

# Check if server is running
if ! lsof -ti:${PORT} >/dev/null 2>&1; then
  echo "⚠️  Dev server not running on port ${PORT}"
  restart_server
  exit 0
fi

# Check server health
status=$(check_server)

if [ "$status" != "200" ]; then
  echo "⚠️  Dev server returned ${status}, restarting..."
  restart_server
  
  # Verify it's working after restart
  for i in $(seq 1 $MAX_RETRIES); do
    sleep $RETRY_DELAY
    new_status=$(check_server)
    if [ "$new_status" = "200" ]; then
      echo "✅ Dev server is now healthy"
      exit 0
    fi
  done
  
  echo "❌ Dev server still not healthy after restart"
  exit 1
else
  echo "✅ Dev server is healthy (${status})"
  exit 0
fi
