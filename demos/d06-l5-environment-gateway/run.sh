#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_RUNTIME_TOKEN:?L5-scoped SCANIOM_RUNTIME_TOKEN required}"
E="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"; W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"; P="${SCANIOM_L5_PORT:-8791}"
info "Terminal 2: SCANIOM_RUNTIME_TOKEN=<same> HOME=$DEMO_HOME $BIN attach test l5 --workload $W --gateway-url http://127.0.0.1:$P --model ${SCANIOM_MODEL:-gpt-5-mini} -- \"Say hello\""
scaniom attach l5 --environment "$E" --port "$P" --run
