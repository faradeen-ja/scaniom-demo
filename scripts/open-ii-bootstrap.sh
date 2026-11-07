#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required" >&2; exit 1; }
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major<22||(major===22&&minor<13)){console.error(`ERROR: Node >=22.13.0 is required; found ${process.versions.node}`);process.exit(1)}'

if [ ! -f .env.local ]; then
  umask 077
  SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))')"
  cat > .env.local <<ENV
OPEN_II_APP_ORIGIN=http://localhost:3000
OPEN_II_SESSION_SECRET=$SECRET
OPEN_II_SESSION_MAX_AGE_SECONDS=43200
SCANIOM_CONTROL_URL=https://control.scaniom.com
ENV
  echo "✓ created .env.local with a local-only session secret"
else
  echo "• preserving existing .env.local"
fi

npm install --no-audit --no-fund
echo "✓ Open Immune Intelligence dependencies installed"
echo "• package-lock.json is now part of this A0 candidate and should be retained for acceptance/Stage 2"
echo "• next: bash scripts/open-ii-local-acceptance.sh"
