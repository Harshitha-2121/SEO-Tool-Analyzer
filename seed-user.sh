#!/bin/bash
# Seed the initial user account
# Run this AFTER setup-convex.sh and while 'npm run dev' is running
# Usage: bash seed-user.sh

set -e

CONVEX_URL="${VITE_CONVEX_URL:-http://localhost:3210}"

echo "Seeding initial user account..."
echo "Convex URL: $CONVEX_URL"
echo ""

# Register the user via the Convex HTTP API
curl -s -X POST "$CONVEX_URL/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "auth:register",
    "args": {
      "email": "shihanshereef2@gmail.com",
      "password": "Shi@2004",
      "name": "Shihan Shereef"
    }
  }' | python3 -m json.tool 2>/dev/null || echo ""

echo ""
echo "If you see a userId and token above, the user was created successfully."
echo "You can now log in at http://localhost:5173/login.html"
echo ""
echo "If you see an error about 'already exists', the user was already created."
