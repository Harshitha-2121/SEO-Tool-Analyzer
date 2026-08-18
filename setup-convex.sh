#!/bin/bash
# crawlX Convex Setup Script
# Run this from the seo-audit-platform directory

set -e

echo "=== crawlX Convex Backend Setup ==="
echo ""

# 1. Remove auth.config.ts (only needed for @convex-dev/auth which we're not using)
if [ -f convex/auth.config.ts ]; then
  echo "Removing convex/auth.config.ts (not needed)..."
  rm convex/auth.config.ts
fi

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Initialize Convex and push code
echo ""
echo "Provisioning Convex backend and pushing code..."
CONVEX_AGENT_MODE=anonymous npx convex dev --once

# 4. Check results
echo ""
if [ -f .env.local ]; then
  echo "✅ .env.local created with Convex URL"
  echo "   CONVEX_URL: $(grep CONVEX_URL .env.local | head -1)"
else
  echo "❌ .env.local not found - something went wrong"
  exit 1
fi

if [ -d convex/_generated ]; then
  echo "✅ convex/_generated/ created (types generated)"
else
  echo "❌ convex/_generated/ not found - something went wrong"
  exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the dev server:"
echo "  npm run dev"
echo ""
echo "This starts:"
echo "  - Convex watcher (port 3210)"
echo "  - Vite dev server (port 5173)"
echo ""
echo "Then open http://localhost:5173/login.html"
