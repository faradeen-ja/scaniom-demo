#!/usr/bin/env bash
# INTERNAL ENGINEERING / CI ACCEPTANCE HARNESS. Normal Open Immune users use the Workbench + released scaniom commands.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/ensure-scope.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-model-runtime}"
KIND="${SCANIOM_L3_KIND:-openai_compatible}"
TARGET_URL="${SCANIOM_L3_TARGET_URL:?SCANIOM_L3_TARGET_URL is required and must point at the real inference runtime}"
MODEL="${SCANIOM_MODEL:-}"
PORT="${SCANIOM_L3_PORT:-8792}"

case "$KIND" in
  vllm|nvidia_nim|triton|openai_compatible) ;;
  *) die "SCANIOM_L3_KIND must be vllm, nvidia_nim, triton, or openai_compatible" ;;
esac

args=(attach l3 --workload "$WORKLOAD" --kind "$KIND" --endpoint "$TARGET_URL" --port "$PORT")
if [ -n "$MODEL" ]; then args+=(--model "$MODEL"); fi

info "Register the real L3 runtime target in Scaniom Control"
scaniom "${args[@]}"

info "Create explicit least-privilege L3 runtime identity"
scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l3 >/dev/null
scaniom runtime identity status --workload "$WORKLOAD"

info "Terminal 1: start the L3 adapter with runtime identity material from your deployment"
printf '  scaniom attach l3 --workload %q --kind %q --endpoint %q --port %q --run\n' "$WORKLOAD" "$KIND" "$TARGET_URL" "$PORT"
info "Terminal 2: send real harmless inference through the released L3 test path"
printf '  scaniom attach test l3 --workload %q%s -- "Say hello in one sentence"\n' "$WORKLOAD" "${MODEL:+ --model $MODEL}"

scaniom attach status --workload "$WORKLOAD"
scaniom live --env "$ENV_NAME" --limit 20
scaniom trajectory list --limit 100
scaniom proof --env "$ENV_NAME" --window 24h --limit 20
scaniom proof correlated list --limit 50

pass "D05 L3 MODEL RUNTIME HARNESS READY · real target + explicit L3 identity + runtime_hook proof path"
