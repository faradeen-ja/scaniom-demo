#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_L3_TARGET_URL:?SCANIOM_L3_TARGET_URL required}"
scaniom attach l3 --workload "${SCANIOM_WORKLOAD:-scaniom-demo-agent}" --kind "${SCANIOM_L3_KIND:-openai_compatible}" --endpoint "$SCANIOM_L3_TARGET_URL" --model "${SCANIOM_MODEL:-}" --port "${SCANIOM_L3_PORT:-8792}" --run
