#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; require_open_immune_authority
W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
OUT="$(scaniom attach status --workload "$W")"; printf '%s\n' "$OUT"
for L in L1 L2 L3 L4 L5 MCP L6; do grep -q "$L" <<<"$OUT" || die "missing $L"; done
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
scaniom authority --category all --limit 30
pass "FLAGSHIP FULL FABRIC VISIBILITY PASS"
