#!/bin/bash

# Test Terminal API Endpoints
echo "================================"
echo "Testing Terminal API Endpoints"
echo "================================"
echo ""

# Test 1: Get available commands
echo "1. Testing GET /api/terminal/commands"
curl -s http://localhost:5003/api/terminal/commands \
  -H "Cookie: token=YOUR_TOKEN_HERE" | jq -r '.commands[0:3] | .[] | "\(.value) - \(.description)"' 2>/dev/null || echo "⚠️  Requires authentication"
echo ""

# Test 2: Get projects for autocomplete
echo "2. Testing GET /api/terminal/projects"
curl -s http://localhost:5003/api/terminal/projects \
  -H "Cookie: token=YOUR_TOKEN_HERE" | jq -r '.projects[0:3] | .[] | "\(.value) - \(.description)"' 2>/dev/null || echo "⚠️  Requires authentication"
echo ""

# Test 3: Validate command
echo "3. Testing POST /api/terminal/validate"
curl -s -X POST http://localhost:5003/api/terminal/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -d '{"command": "/help"}' | jq '.' 2>/dev/null || echo "⚠️  Requires authentication"
echo ""

# Test 4: Execute help command
echo "4. Testing POST /api/terminal/execute (help)"
curl -s -X POST http://localhost:5003/api/terminal/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN_HERE" \
  -d '{"command": "/help"}' | jq '.' 2>/dev/null || echo "⚠️  Requires authentication"
echo ""

# Test 5: Get command suggestions
echo "5. Testing GET /api/terminal/suggestions?partial=/ad"
curl -s "http://localhost:5003/api/terminal/suggestions?partial=/ad" \
  -H "Cookie: token=YOUR_TOKEN_HERE" | jq -r '.suggestions[]' 2>/dev/null || echo "⚠️  Requires authentication"
echo ""

echo "================================"
echo "All endpoint tests completed!"
echo "================================"
echo ""
echo "Note: Most endpoints require authentication."
echo "To test with authentication:"
echo "1. Login to your app"
echo "2. Get the auth token from browser cookies"
echo "3. Replace YOUR_TOKEN_HERE in this script"
echo ""
