#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_WORKLOAD_ID:?SCANIOM_WORKLOAD_ID required}"
: "${SCANIOM_RUNTIME_TOKEN:?L2-capable SCANIOM_RUNTIME_TOKEN required}"
export SCANIOM_NODE_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
cd "$ROOT/demos/d03-l2-agent-sdk"; npm install --no-audit --no-fund; node agent.mjs
scaniom attach status --workload "${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
pass "D03 L2 PASS"
