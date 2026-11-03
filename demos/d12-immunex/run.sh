#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_CONNECTION_ID:?real provider connection ID required}"
W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
scaniom immunex library
scaniom immunex preflight --workload "$W" --connection "$SCANIOM_CONNECTION_ID" --model "${SCANIOM_MODEL:-}"
scaniom immunex run --workload "$W" --connection "$SCANIOM_CONNECTION_ID" --model "${SCANIOM_MODEL:-}" --attachments l1,l2,l4 --scenario-set core
