#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
NODE="${SCANIOM_NODE_NAME:-scaniom-demo-node}"
NODE_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
D03_HOME="$ROOT/.demo/d03"
TS_HOME="$D03_HOME/typescript"
PY_HOME="$D03_HOME/python"
CONSEQUENCE_HOME="$D03_HOME/consequences"

require_cmd node
require_cmd npm
require_cmd python3

"$ROOT/scripts/ensure-scope.sh"

if ! scaniom node list | grep -Fq "$NODE"; then
  info "D03 requires a real Scaniom Node; enrolling $NODE in $ENV_NAME"
  scaniom node enroll "$NODE" --env "$ENV_NAME" --background
fi
scaniom node health

info "L2 integration surfaces"
scaniom attach l2 --workload "$WORKLOAD" --lang typescript
scaniom attach l2 --workload "$WORKLOAD" --lang python

rm -rf "$TS_HOME" "$PY_HOME"
mkdir -p "$TS_HOME" "$PY_HOME" "$CONSEQUENCE_HOME"
chmod 700 "$D03_HOME" "$TS_HOME" "$PY_HOME" "$CONSEQUENCE_HOME"

cat > "$TS_HOME/package.json" <<'JSON'
{"name":"open-immune-d03-ts-execution","private":true,"type":"module"}
JSON
cp "$ROOT/demos/d03-l2-agent-sdk/agent.mjs" "$TS_HOME/agent.mjs"
(
  cd "$TS_HOME"
  npm install --ignore-scripts --no-audit --no-fund --package-lock=false "@scaniom/sdk@${SCANIOM_VERSION}"
  node --input-type=module -e "import {SCANIOM_SDK_VERSION} from '@scaniom/sdk'; if(SCANIOM_SDK_VERSION!=='${SCANIOM_VERSION}') process.exit(2)"
)
pass "D03 TypeScript public SDK ${SCANIOM_VERSION} verified"

bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l1,l2,l4 --json)"
bootstrap_token="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));if(!x.bootstrapToken||!x.subject?.workloadId)process.exit(2);process.stdout.write(x.bootstrapToken)' <<<"$bootstrap_json")"
workload_id="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(x.subject.workloadId))' <<<"$bootstrap_json")"
workload_name="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(x.subject.workloadName||x.subject.workloadId))' <<<"$bootstrap_json")"
unset bootstrap_json

(
  cd "$TS_HOME"
  SCANIOM_NODE_URL="$NODE_URL" \
  SCANIOM_WORKLOAD_ID="$workload_id" \
  SCANIOM_RUNTIME_BOOTSTRAP_TOKEN="$bootstrap_token" \
  SCANIOM_D03_CONSEQUENCE="$CONSEQUENCE_HOME/typescript-heartbeat.txt" \
  node agent.mjs
)
unset bootstrap_token
pass "D03 TypeScript guard → consequence → observe PASS"

python3 -m venv "$PY_HOME/venv"
"$PY_HOME/venv/bin/pip" install --disable-pip-version-check --no-cache-dir "scaniom==${SCANIOM_VERSION}"
"$PY_HOME/venv/bin/python" -c "import scaniom; assert scaniom.__version__ == '${SCANIOM_VERSION}'"
cp "$ROOT/demos/d03-l2-agent-sdk/agent.py" "$PY_HOME/agent.py"
pass "D03 Python public SDK ${SCANIOM_VERSION} verified"

bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l1,l2,l4 --json)"
bootstrap_token="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));if(!x.bootstrapToken||!x.subject?.workloadId)process.exit(2);process.stdout.write(x.bootstrapToken)' <<<"$bootstrap_json")"
workload_id="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(x.subject.workloadId))' <<<"$bootstrap_json")"
workload_name="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(String(x.subject.workloadName||x.subject.workloadId))' <<<"$bootstrap_json")"
unset bootstrap_json

SCANIOM_NODE_URL="$NODE_URL" \
SCANIOM_WORKLOAD_ID="$workload_id" \
SCANIOM_RUNTIME_BOOTSTRAP_TOKEN="$bootstrap_token" \
SCANIOM_D03_CONSEQUENCE="$CONSEQUENCE_HOME/python-heartbeat.txt" \
"$PY_HOME/venv/bin/python" "$PY_HOME/agent.py"
unset bootstrap_token
pass "D03 Python guard → consequence → observe PASS"

identity_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
node -e '
const fs=require("fs");const x=JSON.parse(fs.readFileSync(0,"utf8"));const i=x.identity;
if(!i||String(i.status).toLowerCase()!=="active")throw new Error("runtime identity is not active");
if(!(i.attachments||[]).map(v=>String(v).toLowerCase()).includes("l2"))throw new Error("runtime identity does not include l2");
if(!i.lease||String(i.lease.status).toLowerCase()!=="active")throw new Error("runtime identity has no active lease after SDK execution");
console.log(`✓ runtime identity ${i.identityId} generation ${i.generation} · ${(i.attachments||[]).map(v=>String(v).toUpperCase()).join("+")}`);
' <<<"$identity_json"

scaniom attach status --workload "$WORKLOAD"
scaniom live --workload "$WORKLOAD" --limit 30
scaniom trajectory list --limit 100

proof_json=""
proof_found=0
for attempt in $(seq 1 15); do
  proof_json="$(scaniom proof --env "$ENV_NAME" --window 24h --limit 100 --json)"
  if node -e '
const fs=require("fs");const workload=process.argv[1].toLowerCase();const x=JSON.parse(fs.readFileSync(0,"utf8"));
const match=(x.evidence||[]).some(item=>String(item.workload_name||"").toLowerCase()===workload && String(item.attachment_source||"").toLowerCase()==="sdk" && item.verification!=="invalid");
process.exit(match?0:1);
' "$workload_name" <<<"$proof_json"; then
    proof_found=1
    break
  fi
  info "Waiting for signed L2 evidence to reach Scaniom Control ($attempt/15)"
  sleep 2
done
if [ "$proof_found" -ne 1 ]; then
  die "D03 produced L2 actions but no valid signed L2/sdk proof reached Control within the verification window"
fi
node -e '
const fs=require("fs");const workload=process.argv[1].toLowerCase();const x=JSON.parse(fs.readFileSync(0,"utf8"));
const match=(x.evidence||[]).find(item=>String(item.workload_name||"").toLowerCase()===workload && String(item.attachment_source||"").toLowerCase()==="sdk" && item.verification!=="invalid");
console.log(`✓ signed L2 proof ${match.id} · ${match.verification}`);
' "$workload_name" <<<"$proof_json"

scaniom proof correlated list --limit 50
pass "D03 L2 AGENT SDK REAL EXECUTION PASS · TypeScript + Python + shared B1 runtime identity + L2 evidence + signed proof"
