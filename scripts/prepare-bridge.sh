#!/usr/bin/env bash
set -euo pipefail

# Clone and install node-sonos-http-api into bridge/ for bundling with Electron.
# Run this before `npm run desktop:build`.

BRIDGE_DIR="$(cd "$(dirname "$0")/.." && pwd)/bridge"
BRIDGE_REPO="https://github.com/jishi/node-sonos-http-api.git"

if [ -d "$BRIDGE_DIR/node_modules" ]; then
  echo "Bridge already prepared at $BRIDGE_DIR"
  echo "To refresh: rm -rf bridge/ && rerun this script"
  exit 0
fi

echo "Cloning node-sonos-http-api..."
rm -rf "$BRIDGE_DIR"
git clone --depth 1 "$BRIDGE_REPO" "$BRIDGE_DIR"

echo "Installing bridge dependencies (production only)..."
cd "$BRIDGE_DIR"
npm install --production --no-optional

# Remove git metadata and unnecessary files to slim down the bundle
rm -rf .git .github .gitignore test tests docs *.md LICENSE CHANGELOG

echo "Bridge ready at $BRIDGE_DIR"
