#!/bin/bash

# FitTrack Pro - E2E Test Runner
# This script starts a local server and runs Playwright E2E tests.

echo "🚀 Starting local server..."
python3 -m http.server 8000 > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server on port 8000..."
MAX_RETRIES=10
COUNT=0
until curl -s http://localhost:8000 > /dev/null || [ $COUNT -eq $MAX_RETRIES ]; do
  sleep 1
  COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Server failed to start on port 8000."
  kill $SERVER_PID
  exit 1
fi

echo "🧪 Running E2E tests..."
python3 tests/e2e/test_workout_engine.py
TEST_RESULT=$?

echo "🧹 Cleaning up..."
kill $SERVER_PID

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed."
fi

exit $TEST_RESULT
