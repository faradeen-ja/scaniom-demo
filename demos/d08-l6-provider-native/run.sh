#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_L6_PROVIDER:?required}"; : "${SCANIOM_L6_ADAPTER:?required}"; : "${SCANIOM_RUNTIME_TOKEN:?L6-scoped token required}"
scaniom attach l6 --workload "${SCANIOM_WORKLOAD:-scaniom-demo-agent}" --provider "$SCANIOM_L6_PROVIDER" --adapter "$SCANIOM_L6_ADAPTER" --hook custom --port "${SCANIOM_L6_PORT:-8794}" --run
