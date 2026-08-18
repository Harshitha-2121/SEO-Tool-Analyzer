#!/bin/bash
# CrawlX Platform - Full Startup Script
# Run this whenever the server restarts: bash /home/ubuntu/seo-audit-platform/start_all.sh

echo "🔄 Starting CrawlX Platform..."

# Kill any old processes
pkill -f "server.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
sleep 2

cd /home/ubuntu/seo-audit-platform

# 1. Start Python backend
echo "▶ Starting backend (port 8080)..."
nohup python3 -u server.py > server.log 2>&1 &
echo "  Backend PID: $!"

# 2. Start Vite frontend
echo "▶ Starting frontend (port 5173)..."
nohup npx vite --port 5173 > vite.log 2>&1 &
echo "  Vite PID: $!"

# Wait for them to initialize
sleep 6

# 3. Start Cloudflare tunnel
echo "▶ Starting Cloudflare tunnel..."
nohup cloudflared tunnel --url http://localhost:5173 > cloudflare_tunnel.log 2>&1 &
echo "  Tunnel PID: $!"

# Wait for tunnel URL
echo "⏳ Waiting for tunnel URL (12 seconds)..."
sleep 12

TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' cloudflare_tunnel.log | tail -1)
echo ""
echo "=============================================="
echo "✅ CrawlX Platform is LIVE!"
echo ""
echo "🌐 Public URL: $TUNNEL_URL"
echo ""
echo "Copy this link and open it in any browser."
echo "The link changes every time you restart."
echo "=============================================="
