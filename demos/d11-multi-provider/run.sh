#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
: "${SCANIOM_MULTI_PROVIDERS:?e.g. openai,anthropic,gemini}"
N="${SCANIOM_NODE_NAME:-scaniom-demo-node}"; W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
IFS=',' read -r -a A <<<"$SCANIOM_MULTI_PROVIDERS"
for p in "${A[@]}"; do p="$(printf '%s' "$p"|xargs)"; scaniom attach l1 --workload "$W" --node "$N" --preset "$p"; done
scaniom attach status --workload "$W"
scaniom trajectory list --limit 100
