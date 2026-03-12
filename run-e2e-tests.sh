#!/bin/bash
# Simple script to run Playwright E2E tests with server

echo "🎮 Starting Small Hours Games server..."
npm start > /tmp/small-hours-test.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to be ready..."
MAX_WAIT=30
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -s -k https://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo "✓ Server is ready"
    break
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

# Verify server is running
if ! ps -p $SERVER_PID > /dev/null; then
  echo "❌ Server failed to start"
  cat /tmp/small-hours-test.log
  exit 1
fi

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "⚠️ Server took ${ELAPSED}s to become ready (may indicate issues)"
fi

echo "🧪 Running Playwright tests..."
npm run test:e2e
TEST_EXIT=$?

echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

exit $TEST_EXIT
