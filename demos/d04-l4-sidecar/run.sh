#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"; P="${SCANIOM_L4_PORT:-8790}"
info "Terminal 2: HOME=$DEMO_HOME $BIN attach test l4 --workload $W --gateway-url http://127.0.0.1:$P --model ${SCANIOM_MODEL:-gpt-5-mini} -- \"Say hello\""
scaniom attach l4 --workload "$W" --port "$P"
