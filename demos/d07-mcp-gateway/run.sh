#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_MCP_SERVER_ID:?required}"; : "${SCANIOM_MCP_ENDPOINT:?required}"; : "${SCANIOM_RUNTIME_TOKEN:?MCP-scoped token required}"
scaniom attach mcp --workload "${SCANIOM_WORKLOAD:-scaniom-demo-agent}" --server-id "$SCANIOM_MCP_SERVER_ID" --endpoint "$SCANIOM_MCP_ENDPOINT" --port "${SCANIOM_MCP_PORT:-8793}" --run
