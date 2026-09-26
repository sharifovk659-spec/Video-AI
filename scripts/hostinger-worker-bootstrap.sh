#!/usr/bin/env bash
# Hostinger production worker bootstrap (no secrets in this file).
# Usage on SSH: bash scripts/hostinger-worker-bootstrap.sh
set -euo pipefail

APP_DIR="${HOME}/apps/vidoo-ai"
NODE_ENABLE="/opt/alt/alt-nodejs22/enable"

if [[ -f "$NODE_ENABLE" ]]; then
  # shellcheck disable=SC1090
  source "$NODE_ENABLE"
fi

command -v node >/dev/null
command -v npm >/dev/null
command -v git >/dev/null

mkdir -p "$APP_DIR/logs" "$APP_DIR/storage/objects"
cd "$APP_DIR"

if [[ ! -d .git ]]; then
  git clone https://github.com/sharifovk659-spec/Video-AI.git .
else
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
fi

npm ci
npx prisma generate

if [[ ! -f .env ]]; then
  echo "MISSING $APP_DIR/.env — copy production secrets here (chmod 600), then re-run."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

npx prisma migrate deploy

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -n 5 || true

echo "Worker bootstrap done. Check: pm2 status && pm2 logs vidoo-worker --lines 50"
