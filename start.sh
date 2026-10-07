#!/usr/bin/env bash
set -e

echo "==================================================================="
echo "    SMARTCLEAN - Intelligent Storage, Organization & Safe Cleanup"
echo "        \"The computer cleaner that thinks before it cleans.\""
echo "==================================================================="

# Verify Node / npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] Node / npm is not installed or not in PATH."
    exit 1
fi

echo "[OK] Node.js and npm detected."

# Optional Python check
if command -v python3 &> /dev/null; then
    echo "[OK] Python 3 detected."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "[INFO] Running npm install..."
    npm install
fi

echo "[STARTING] Launching SmartClean..."
npm run dev
