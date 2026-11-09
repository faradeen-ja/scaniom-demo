#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
NODE="${SCANIOM_NODE_NAME:-scaniom-demo-node}"
MODEL="${SCANIOM_MODEL:-gpt-5-mini}"
"$ROOT/scripts/ensure-scope.sh"
scaniom node list | grep -Fq "$NODE" || scaniom node enroll "$NODE" --env "$ENV_NAME" --background
scaniom node health
scaniom attach l1 --workload "$WORKLOAD" --node "$NODE" --preset openai --model "$MODEL"
if ! scaniom node health | grep -q OPENAI; then
  info "Configure Node-local provider credential, then rerun:"
  info "scaniom secret configure OPENAI_API_KEY --node $NODE"
  info "scaniom node restart"
  exit 3
fi
scaniom attach test l1 --workload "$WORKLOAD" --model "$MODEL" -- "Say hello in one sentence"
scaniom attach status --workload "$WORKLOAD"
scaniom live --workload "$WORKLOAD" --limit 20
scaniom trajectory list --limit 100
PROOF_JSON="$(scaniom proof --env "$ENV_NAME" --window 24h --limit 100 --json)"
node - "$PROOF_JSON" "$WORKLOAD" <<'NODE'
const [raw, workload] = process.argv.slice(2);
const body = JSON.parse(raw);
const evidence = Array.isArray(body.evidence) ? body.evidence : [];
const accepted = evidence.filter((item) =>
  String(item.workload_name || "") === workload
  && String(item.verification || "") !== "invalid"
);
if (!accepted.length) {
  throw new Error(`No signed proof evidence found for workload ${workload} in the selected 24h environment scope.`);
}
console.log(`✓ signed proof evidence PASS · ${accepted.length} object(s) · ${workload}`);
NODE
scaniom proof correlated list --limit 50
pass "D02 L1 FULL CYCLE PASS · traffic + Gate/trajectory + signed proof"
