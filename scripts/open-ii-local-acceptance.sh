#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CANDIDATE="${OPEN_II_CANDIDATE:-open-ii}"
echo "==> Open Immune Intelligence ${CANDIDATE} local acceptance"
./scripts/doctor.sh
node scripts/open-ii-source-audit.mjs

test -f package-lock.json || { echo "ERROR: package-lock.json missing. Run: bash scripts/open-ii-bootstrap.sh" >&2; exit 1; }
npm run typecheck
npm run test
npm run lint
npm run build

while IFS= read -r -d '' file; do bash -n "$file"; done < <(find scripts demos -type f -name '*.sh' -print0)

echo
echo "=============================================================="
echo "OPEN IMMUNE INTELLIGENCE LOCAL ACCEPTANCE PASS"
echo "=============================================================="
echo "✓ public demo boundary preserved"
echo "✓ cloud profile defaults to https://control.scaniom.com"
echo "✓ self-hosted/private-enterprise/staging/local profile contract"
echo "✓ real Scaniom device auth, identity, organization and workspace context"
echo "✓ Web + CLI profile parity"
echo "✓ typecheck / tests / ESLint / production build"
echo
echo "A1 LOCAL_ACCEPTED"
echo "No GitHub push/PR/merge/deploy has been authorized by this command."
