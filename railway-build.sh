#!/usr/bin/env bash
set -e

BACKEND_DIR="Monitoring tool/CLOUDNEXUS-MONITORING-main/backend"
PUBLIC_DIR="$BACKEND_DIR/public"

echo "=== Installing main frontend deps ==="
npm install

echo "=== Building main frontend ==="
npx vite build --base=/

echo "=== Copying main frontend build to backend/public ==="
mkdir -p "$PUBLIC_DIR"
cp -r dist/* "$PUBLIC_DIR/"
cp dist/index.html "$PUBLIC_DIR/404.html"

echo "=== Building monitoring frontend ==="
cd "Monitoring tool/CLOUDNEXUS-MONITORING-main/frontend"
npm install
npx vite build --base=/monitor/
mkdir -p "../../backend/public/monitor"
cp -r dist/* "../../backend/public/monitor/"
cd ../../..

echo "=== Building billing frontend ==="
cd "Billing tool/Cloudnexus-billing-main/frontend"
npm install
npx vite build --base=/billing/
mkdir -p "../../backend/public/billing"   2>/dev/null || true
# billing is one level deeper
mkdir -p "../../../Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/public/billing"
cp -r dist/* "../../../Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/public/billing/"
cd ../../..

echo "=== Installing backend Node deps ==="
cd "$BACKEND_DIR"
npm install
cd ../../..

echo "=== Build complete ==="
