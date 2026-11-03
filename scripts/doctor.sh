#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
for cmd in bash curl git node npm python3 tar shasum gh; do require_cmd "$cmd"; done
test "$(node -p 'Number(process.versions.node.split(".")[0])')" -ge 20 || die "Node 20+ required"
if git -C "$ROOT" remote get-url origin 2>/dev/null | grep -q 'faradeen-ja/scaniom.git'; then
  die "This is the product repo, not scaniom-demo."
fi
if grep -R --exclude-dir=.git --exclude='*.md' -nE '(\.\./scaniom|/scaniom/scripts/scaniom-cli\.mjs)' "$ROOT" >/dev/null 2>&1; then
  die "private-source dependency detected"
fi
pass "demo repository doctor PASS"
pass "target Scaniom $SCANIOM_RELEASE / $SCANIOM_VERSION"
