#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
CONTROL_TARGET="${SCANIOM_D10_CONTROL_TARGET:-https://control.scaniom.com}"
NODE_NAME="${SCANIOM_D10_NODE_NAME:-open-immune-d10-continuity-node}"
NODE_PORT="${SCANIOM_D10_NODE_PORT:-8789}"
NODE_URL="http://127.0.0.1:${NODE_PORT}"
NODE_STATE="${SCANIOM_D10_NODE_STATE_DIR:-$HOME/.scaniom/nodes/open-immune-d10-continuity-node}"
RELAY_PORT="${SCANIOM_D10_RELAY_PORT:-18789}"
RELAY_URL="http://127.0.0.1:${RELAY_PORT}"
RELAY_PROFILE="${SCANIOM_D10_RELAY_PROFILE:-open-immune-d10-relay}"
CONSEQUENCE_PORT="${SCANIOM_D10_CONSEQUENCE_PORT:-18880}"
CONSEQUENCE_URL="http://127.0.0.1:${CONSEQUENCE_PORT}"
L4_PORT="${SCANIOM_D10_L4_PORT:-18881}"; L4_URL="http://127.0.0.1:${L4_PORT}"
L3_PORT="${SCANIOM_D10_L3_PORT:-18882}"; L3_URL="http://127.0.0.1:${L3_PORT}"
L5_PORT="${SCANIOM_D10_L5_PORT:-18883}"; L5_URL="http://127.0.0.1:${L5_PORT}"
MCP_PORT="${SCANIOM_D10_MCP_PORT:-18884}"; MCP_URL="http://127.0.0.1:${MCP_PORT}"
L6_PORT="${SCANIOM_D10_L6_PORT:-18885}"; L6_URL="http://127.0.0.1:${L6_PORT}"
ROUTE_NAME="${SCANIOM_D10_ROUTE_NAME:-open-immune-d10-loopback}"
ROUTE_PROVIDER="open-immune-d10"
MODEL="${SCANIOM_D10_MODEL:-open-immune-d10-model}"
BOUNDARIES=(l1 l2 l3 l4 l5 mcp l6)
upper(){ printf '%s' "$1" | tr '[:lower:]' '[:upper:]'; }

STATE_DIR="$ROOT/.demo/d10"
TMP_DIR="$STATE_DIR/tmp"
SDK_DIR="$STATE_DIR/typescript"
LOG_DIR="$STATE_DIR/logs"
LEDGER="$STATE_DIR/continuity-ledger.jsonl"
RELAY_PID_FILE="$STATE_DIR/control-relay.pid"
RELAY_LOG="$LOG_DIR/control-relay.log"
RECEIPT_DIR="$ROOT/.demo/receipts"
RECEIPT="$RECEIPT_DIR/d10-offline-continuity.json"
OPERATOR_FILE="$TMP_DIR/operator-continuity.json"
RUN_ID="$(date +%s)-$$"

mkdir -p "$TMP_DIR" "$SDK_DIR" "$LOG_DIR" "$RECEIPT_DIR"
chmod 700 "$STATE_DIR" "$TMP_DIR" "$SDK_DIR" "$LOG_DIR" "$RECEIPT_DIR" 2>/dev/null || true
: >"$LEDGER"; chmod 600 "$LEDGER" 2>/dev/null || true

relay_started=0; node_running=0
consequence_pid=""; l3_pid=""; l4_pid=""; l5_pid=""; mcp_pid=""; l6_pid=""

relay_health(){ RELAY_URL="$RELAY_URL" TARGET="$CONTROL_TARGET" node <<'NODE'
(async()=>{try{const r=await fetch(`${process.env.RELAY_URL}/__open_immune_d10_relay`,{signal:AbortSignal.timeout(1000),cache:"no-store"});const x=await r.json().catch(()=>({}));if(!r.ok||x.service!=="open-immune-d10-control-relay"||x.targetOrigin!==new URL(process.env.TARGET).origin)process.exit(2)}catch{process.exit(1)}})()
NODE
}
start_relay(){
  if relay_health >/dev/null 2>&1; then relay_started=1; return; fi
  if [ -f "$RELAY_PID_FILE" ]; then old="$(cat "$RELAY_PID_FILE" 2>/dev/null||true)"; if [ -n "$old" ]&&kill -0 "$old" 2>/dev/null; then kill "$old" 2>/dev/null||true; wait "$old" 2>/dev/null||true; fi; rm -f "$RELAY_PID_FILE"; fi
  : >"$RELAY_LOG"; node "$ROOT/demos/d10-offline-continuity/control-relay.mjs" --listen 127.0.0.1 --port "$RELAY_PORT" --target "$CONTROL_TARGET" >>"$RELAY_LOG" 2>&1 &
  local pid=$!; printf '%s\n' "$pid" >"$RELAY_PID_FILE"; chmod 600 "$RELAY_PID_FILE" 2>/dev/null||true
  for _ in $(seq 1 40); do if relay_health >/dev/null 2>&1; then relay_started=1; return; fi; kill -0 "$pid" 2>/dev/null||{ cat "$RELAY_LOG" >&2||true; die "D10 Control relay exited during startup"; }; sleep 0.1; done
  cat "$RELAY_LOG" >&2||true; die "D10 Control relay did not become healthy"
}
stop_relay(){ set +e; if [ -f "$RELAY_PID_FILE" ]; then local pid; pid="$(cat "$RELAY_PID_FILE" 2>/dev/null||true)"; if [ -n "$pid" ]&&kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null; for _ in $(seq 1 30); do kill -0 "$pid" 2>/dev/null||break; sleep 0.1; done; kill -9 "$pid" 2>/dev/null||true; wait "$pid" 2>/dev/null||true; fi; rm -f "$RELAY_PID_FILE"; fi; relay_started=0; set -e; }

node_health_json(){ NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{try{const r=await fetch(`${process.env.NODE_URL}/health`,{signal:AbortSignal.timeout(1500),cache:"no-store"});const x=await r.json().catch(()=>({}));if(!r.ok||x.service!=="scaniom-node")process.exit(2);process.stdout.write(JSON.stringify(x))}catch{process.exit(1)}})()
NODE
}
node_sync_health_json(){ NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{try{const r=await fetch(`${process.env.NODE_URL}/health?sync=1`,{signal:AbortSignal.timeout(7000),cache:"no-store"});const x=await r.json().catch(()=>({}));if(!r.ok||x.service!=="scaniom-node")process.exit(2);process.stdout.write(JSON.stringify(x))}catch{process.exit(1)}})()
NODE
}
stop_d10_node(){ set +e; if node_health_json >/dev/null 2>&1; then scaniom node stop --profile "$RELAY_PROFILE" --state-dir "$NODE_STATE" --port "$NODE_PORT" >/dev/null 2>&1; fi; local stopped=0; for _ in $(seq 1 40); do if ! node_health_json >/dev/null 2>&1; then stopped=1; break; fi; sleep 0.1; done; node_running=0; set -e; [ "$stopped" -eq 1 ]; }

stop_pid(){ local pid="${1:-}"; [ -n "$pid" ]||return 0; set +e; if kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null||true; for _ in $(seq 1 30); do kill -0 "$pid" 2>/dev/null||break; sleep 0.1; done; kill -9 "$pid" 2>/dev/null||true; wait "$pid" 2>/dev/null||true; fi; set -e; }
stop_services(){ stop_pid "$l6_pid"; stop_pid "$mcp_pid"; stop_pid "$l5_pid"; stop_pid "$l4_pid"; stop_pid "$l3_pid"; l3_pid="";l4_pid="";l5_pid="";mcp_pid="";l6_pid=""; }
cleanup(){
  set +e
  if [ "$node_running" -eq 1 ]&&[ "$relay_started" -eq 0 ]; then start_relay >/dev/null 2>&1||true; fi
  if [ "$node_running" -eq 1 ]&&relay_health >/dev/null 2>&1; then for _ in $(seq 1 18); do h="$(node_health_json 2>/dev/null||true)"; if [ -n "$h" ]&&HEALTH="$h" node -e 'const x=JSON.parse(process.env.HEALTH);process.exit(x.controlConnected&&Number(x.continuity?.spoolBytes||0)===0?0:1)' >/dev/null 2>&1; then break; fi; sleep 1; done; fi
  stop_services; stop_pid "$consequence_pid"; consequence_pid=""
  if [ "$node_running" -eq 1 ]; then stop_d10_node >/dev/null 2>&1||true; fi
  stop_relay >/dev/null 2>&1||true; scaniom profile remove "$RELAY_PROFILE" >/dev/null 2>&1||true
  set -e
}
trap cleanup EXIT INT TERM

require_open_immune_authority
scaniom env list | grep -Fq "$ENV_NAME" || scaniom env create "$ENV_NAME" --type production
scaniom workload list | grep -Fq "$WORKLOAD" || scaniom workload create "$WORKLOAD" --env "$ENV_NAME" --kind agent
scaniom workload use "$WORKLOAD"
scaniom address list | grep -F "$WORKLOAD" | grep -q ACTIVE || scaniom address issue --workload "$WORKLOAD"
scaniom policy set --env "$ENV_NAME" --mode enforce --profile general
pass "protected scope ready"

profile_json="$(scaniom profile show cloud 2>/dev/null||true)"; [ -n "$profile_json" ]||die "D10 requires the authenticated cloud Control profile"
info "Read selected environment/workload authority from real Scaniom Control"
fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
read -r environment_id workload_id <<<"$(FABRIC="$fabric_json" WORKLOAD="$WORKLOAD" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),ref=process.env.WORKLOAD.toLowerCase();const w=(x.workloads||[]).find(v=>[v.id,v.slug,v.name].some(k=>String(k||"").toLowerCase()===ref));if(!x.selectedEnvironmentId||!w)throw new Error("D10 selected scope missing");process.stdout.write(`${x.selectedEnvironmentId} ${w.id}`)
NODE
)"

info "Start a loopback-only transparent relay to the real Control; it is transport, never authority"
start_relay; scaniom profile add "$RELAY_PROFILE" --control "$RELAY_URL" --type local >/dev/null
pass "D10 transparent Control relay ready · $RELAY_URL → $CONTROL_TARGET"

control_node_id="$(FABRIC="$fabric_json" NODE_NAME="$NODE_NAME" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),rows=(x.nodes||[]).filter(n=>n.name===process.env.NODE_NAME||n.slug===process.env.NODE_NAME);if(rows.length>1)throw new Error("ambiguous D10 Node");process.stdout.write(rows[0]?.id||"")
NODE
)"
if [ -f "$NODE_STATE/state.json" ]; then
  read -r local_node_id local_control_url <<<"$(node - "$NODE_STATE/state.json" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));process.stdout.write(`${String(x.nodeId||"")} ${String(x.controlUrl||"")}`)
NODE
)"
  [ "$local_control_url" = "$RELAY_URL" ]||die "existing D10 Node state belongs to $local_control_url"
  [ -n "$control_node_id" ]||die "local D10 Node exists but Control Node is missing"
  [ "$local_node_id" = "$control_node_id" ]||die "D10 local Node identity does not match Control"
  if ! node_health_json >/dev/null 2>&1; then info "Start existing durable D10 continuity Node"; scaniom node start --profile "$RELAY_PROFILE" --background --state-dir "$NODE_STATE" --port "$NODE_PORT" >/dev/null; else info "Reuse existing D10 continuity Node"; fi
else
  [ -z "$control_node_id" ]||die "D10 Node exists in Control but local durable state is missing: $NODE_STATE"
  info "Create exactly one D10-owned Node enrollment from real Control"
  enroll_output="$(scaniom node enroll "$NODE_NAME" --env "$ENV_NAME" --state-dir "$NODE_STATE" --port "$NODE_PORT")"
  enrollment_token="$(printf '%s\n' "$enroll_output"|sed -n 's/^export SCANIOM_ENROLLMENT_TOKEN="\([^"]*\)"$/\1/p'|head -1)"; [ -n "$enrollment_token" ]||die "could not recover copy-once enrollment token"
  info "Start D10 Node through the transparent Control relay"
  SCANIOM_ENROLLMENT_TOKEN="$enrollment_token" SCANIOM_NODE_NAME="$NODE_NAME" scaniom node start --profile "$RELAY_PROFILE" --background --state-dir "$NODE_STATE" --port "$NODE_PORT" >/dev/null
  unset enrollment_token enroll_output
fi
node_running=1

online_health=""
for attempt in $(seq 1 40); do set +e; online_health="$(node_sync_health_json 2>/dev/null)"; rc=$?; set -e; if [ "$rc" -eq 0 ]&&HEALTH="$online_health" ENVIRONMENT_ID="$environment_id" node -e 'const x=JSON.parse(process.env.HEALTH),c=x.continuity||{};process.exit(x.environmentId===process.env.ENVIRONMENT_ID&&x.controlConnected===true&&c.state==="online"&&Number(c.maxOfflineSeconds)===14400&&Number(c.maxCredentialStaleSeconds)===1800&&Number(c.spoolLimitBytes)===268435456&&Date.parse(c.leaseExpiresAt)>Date.now()?0:1)' >/dev/null 2>&1; then break; fi; info "Waiting for signed B2 continuity authority ($attempt/40)"; sleep 0.5; done
HEALTH="$online_health" node -e 'const x=JSON.parse(process.env.HEALTH||"{}"),c=x.continuity||{};process.exit(x.controlConnected===true&&c.state==="online"?0:1)'||die "D10 Node did not receive signed B2 continuity"
node_id="$(HEALTH="$online_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(x.nodeId||""))')"; continuity_until="$(HEALTH="$online_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(x.continuity?.leaseExpiresAt||""))')"
pass "signed B2 authority PASS · 4h last-known-good · 30m credential grace · 256 MiB spool"

info "Start D10-owned deterministic loopback consequence service"
SCANIOM_D10_CONSEQUENCE_PORT="$CONSEQUENCE_PORT" SCANIOM_D10_LEDGER="$LEDGER" node "$ROOT/demos/d10-offline-continuity/consequence-service.mjs" >"$LOG_DIR/consequence.log" 2>&1 & consequence_pid=$!
for _ in $(seq 1 40); do curl -fsS "$CONSEQUENCE_URL/health" >/dev/null 2>&1&&break; kill -0 "$consequence_pid" 2>/dev/null||{ cat "$LOG_DIR/consequence.log" >&2; die "D10 consequence service exited"; }; sleep 0.1; done
curl -fsS "$CONSEQUENCE_URL/health" >/dev/null||die "D10 consequence service unavailable"
pass "D10 loopback consequence service ready · transport/consequence only · no Scaniom authority"

info "Create or reuse one D10-owned provider route for real L1/L4 model consequences"
fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
route_id="$(FABRIC="$fabric_json" WORKLOAD_ID="$workload_id" NODE_ID="$node_id" ROUTE_NAME="$ROUTE_NAME" ENDPOINT="$CONSEQUENCE_URL/v1/responses" PROVIDER="$ROUTE_PROVIDER" MODEL="$MODEL" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),w=(x.workloads||[]).find(v=>v.id===process.env.WORKLOAD_ID);if(!w)throw new Error("D10 workload missing");const rows=(w.routes||[]).filter(r=>r.nodeId===process.env.NODE_ID&&r.name===process.env.ROUTE_NAME&&r.status==="active");if(rows.length>1)throw new Error("multiple active D10 routes");if(!rows.length)process.exit(0);const r=rows[0];if(r.endpoint!==process.env.ENDPOINT||r.provider!==process.env.PROVIDER||r.protocol!=="openai_responses"||String(r.modelHint||"")!==process.env.MODEL||r.secretRef!=="none")throw new Error("existing D10 route contract mismatch");process.stdout.write(r.id)
NODE
)"
if [ -z "$route_id" ]; then
  scaniom connect provider --provider "$ROUTE_PROVIDER" --protocol openai_responses --auth none --endpoint "$CONSEQUENCE_URL/v1/responses" --node "$NODE_NAME" --workload "$WORKLOAD" --secret-ref none --model "$MODEL" --name "$ROUTE_NAME" >/dev/null
  fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
  route_id="$(FABRIC="$fabric_json" WORKLOAD_ID="$workload_id" NODE_ID="$node_id" ROUTE_NAME="$ROUTE_NAME" node -e 'const x=JSON.parse(process.env.FABRIC),w=(x.workloads||[]).find(v=>v.id===process.env.WORKLOAD_ID),r=(w?.routes||[]).find(r=>r.nodeId===process.env.NODE_ID&&r.name===process.env.ROUTE_NAME&&r.status==="active");if(!r)process.exit(2);process.stdout.write(r.id)')"
fi
[ -n "$route_id" ]||die "D10 provider route unavailable"
pass "D10 L1/L4 route ready · $route_id"

info "Issue one explicit all-seven runtime identity before isolation"
decode_runtime_token(){ TOKEN="$1" node <<'NODE'
const t=String(process.env.TOKEN||"");if(!t.startsWith("scn_ri_v1."))process.exit(2);try{process.stdout.write(JSON.stringify(JSON.parse(Buffer.from(t.split(".")[1],"base64url").toString("utf8"))))}catch{process.exit(2)}
NODE
}
runtime_token=""
if [ -n "${SCANIOM_RUNTIME_TOKEN:-}" ]; then set +e; claims_json="$(decode_runtime_token "$SCANIOM_RUNTIME_TOKEN" 2>/dev/null)"; trc=$?; set -e; if [ "$trc" -eq 0 ]&&CLAIMS="$claims_json" WORKLOAD_ID="$workload_id" node -e 'const c=JSON.parse(process.env.CLAIMS),a=(c.attachments||[]).map(String);process.exit(c.workloadId===process.env.WORKLOAD_ID&&["l1","l2","l3","l4","l5","mcp","l6"].every(v=>a.includes(v))&&Date.parse(c.expiresAt)>Date.now()+60000?0:1)' >/dev/null 2>&1; then runtime_token="$SCANIOM_RUNTIME_TOKEN"; fi; fi
if [ -z "$runtime_token" ]; then
  bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l1,l2,l3,l4,l5,mcp,l6 --json)"
  bootstrap_token="$(BOOTSTRAP="$bootstrap_json" node -e 'const x=JSON.parse(process.env.BOOTSTRAP),t=String(x.bootstrapToken||"");if(!t.startsWith("scn_rib_"))process.exit(2);process.stdout.write(t)')"
  exchange_json="$(BOOTSTRAP_TOKEN="$bootstrap_token" NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{const r=await fetch(`${process.env.NODE_URL}/v1/runtime/identity/exchange`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bootstrapToken:process.env.BOOTSTRAP_TOKEN}),signal:AbortSignal.timeout(20000)});const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x?.error?.message||`identity exchange HTTP ${r.status}`);process.stdout.write(JSON.stringify(x))})().catch(e=>{console.error(e.message);process.exit(1)})
NODE
)"
  runtime_token="$(EXCHANGE="$exchange_json" node -e 'const x=JSON.parse(process.env.EXCHANGE),t=String(x.credential?.token||"");if(!t.startsWith("scn_ri_v1."))process.exit(2);process.stdout.write(t)')"
  unset bootstrap_json bootstrap_token exchange_json
fi
claims_json="$(decode_runtime_token "$runtime_token")"
CLAIMS="$claims_json" WORKLOAD_ID="$workload_id" node -e 'const c=JSON.parse(process.env.CLAIMS),a=(c.attachments||[]).map(String);if(c.workloadId!==process.env.WORKLOAD_ID||!["l1","l2","l3","l4","l5","mcp","l6"].every(v=>a.includes(v)))process.exit(2)'||die "all-seven runtime identity scope mismatch"
identity_id="$(CLAIMS="$claims_json" node -e 'const c=JSON.parse(process.env.CLAIMS);process.stdout.write(String(c.identityId||""))')"; identity_generation="$(CLAIMS="$claims_json" node -e 'const c=JSON.parse(process.env.CLAIMS);process.stdout.write(String(c.generation||""))')"
pass "all-seven runtime identity ready · L1 + L2 + L3 + L4 + L5 + MCP + L6"

info "Refresh signed B2 snapshot after route + all-seven identity convergence"
identity_synced=0
for attempt in $(seq 1 30); do h="$(node_sync_health_json 2>/dev/null||true)"; if [ -n "$h" ]&&HEALTH="$h" node -e 'const x=JSON.parse(process.env.HEALTH),c=x.continuity||{};process.exit(x.controlConnected&&c.state==="online"&&Number(x.providerRoutes||0)>=1&&Date.parse(c.leaseExpiresAt)>Date.now()?0:1)' >/dev/null 2>&1; then identity_synced=1; online_health="$h"; break; fi; info "Waiting for route + identity to enter signed B2 snapshot ($attempt/30)"; sleep 0.5; done
[ "$identity_synced" -eq 1 ]||die "D10 route/identity did not converge into signed B2 authority"
continuity_until="$(HEALTH="$online_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(x.continuity?.leaseExpiresAt||""))')"

info "Verify public operator continuity contract from Control"
scaniom runtime continuity --env "$ENV_NAME" --json >"$OPERATOR_FILE"
node - "$OPERATOR_FILE" "$node_id" <<'NODE'
const fs=require("node:fs"),[f,id]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(f,"utf8")),c=x.contract||{};if(c.mode!=="last-known-good"||Number(c.maxOfflineSeconds)!==14400||Number(c.maxCredentialStaleSeconds)!==1800||Number(c.maxSpoolBytes)!==268435456||c.unknownAuthority!=="deny"||c.bootstrapWhileOffline!==false||c.evidenceReplayRequired!==true)throw new Error("B2 contract mismatch");if(!(x.items||[]).some(v=>v.nodeId===id))throw new Error("D10 Node missing")
NODE

info "Verify all Scaniom runtime programs from the accepted standalone 0.4.2 manifest"
cli_path="$(scaniom_cli_path)"; BUNDLE_ROOT="$(cd "$(dirname "$cli_path")/.."&&pwd -P)"; BUNDLE_NODE="$BUNDLE_ROOT/libexec/node"
BUNDLE_ROOT="$BUNDLE_ROOT" node <<'NODE'
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),root=process.env.BUNDLE_ROOT,m=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));for(const rel of ["libexec/scaniom-runtime-adapter.mjs","libexec/scaniom-gateway.mjs","libexec/scaniom-environment-gateway.mjs","libexec/scaniom-mcp-gateway.mjs","libexec/scaniom-provider-native-bridge.mjs"]){const row=(m.files||[]).find(x=>x.path===rel);if(!row)throw new Error(`standalone manifest missing ${rel}`);const actual=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,rel))).digest("hex");if(actual!==row.sha256)throw new Error(`standalone digest mismatch ${rel}`)}
NODE
[ -x "$BUNDLE_NODE" ]||die "accepted standalone bundled Node missing"
pass "standalone runtime programs verified · no Scaniom source checkout used"

info "Start released L3/L4/L5/MCP/L6 runtime boundaries before Control isolation"
SCANIOM_L3_PORT="$L3_PORT" SCANIOM_WORKLOAD_ID="$workload_id" SCANIOM_MODEL_RUNTIME_KIND=openai_compatible SCANIOM_MODEL_RUNTIME_NAME=open-immune-d10 SCANIOM_MODEL_RUNTIME_TARGET_URL="$CONSEQUENCE_URL" SCANIOM_MODEL_RUNTIME_MODEL="$MODEL" SCANIOM_NODE_URL="$NODE_URL" SCANIOM_RUNTIME_TOKEN="$runtime_token" SCANIOM_L3_STATE_DIR="$STATE_DIR/l3" "$BUNDLE_NODE" "$BUNDLE_ROOT/libexec/scaniom-runtime-adapter.mjs" >"$LOG_DIR/l3.log" 2>&1 & l3_pid=$!
SCANIOM_GATEWAY_MODE=sidecar SCANIOM_GATEWAY_PORT="$L4_PORT" SCANIOM_GATEWAY_WORKLOAD_ID="$workload_id" SCANIOM_NODE_URL="$NODE_URL" SCANIOM_RUNTIME_TOKEN="$runtime_token" "$BUNDLE_NODE" "$BUNDLE_ROOT/libexec/scaniom-gateway.mjs" >"$LOG_DIR/l4.log" 2>&1 & l4_pid=$!
SCANIOM_L5_PORT="$L5_PORT" SCANIOM_NODE_URL="$NODE_URL" "$BUNDLE_NODE" "$BUNDLE_ROOT/libexec/scaniom-environment-gateway.mjs" >"$LOG_DIR/l5.log" 2>&1 & l5_pid=$!
SCANIOM_MCP_PORT="$MCP_PORT" SCANIOM_MCP_UPSTREAM_URL="$CONSEQUENCE_URL/mcp" SCANIOM_MCP_SERVER_ID=open-immune-d10-mcp SCANIOM_NODE_URL="$NODE_URL" "$BUNDLE_NODE" "$BUNDLE_ROOT/libexec/scaniom-mcp-gateway.mjs" >"$LOG_DIR/mcp.log" 2>&1 & mcp_pid=$!
SCANIOM_L6_PORT="$L6_PORT" SCANIOM_NODE_URL="$NODE_URL" "$BUNDLE_NODE" "$BUNDLE_ROOT/libexec/scaniom-provider-native-bridge.mjs" >"$LOG_DIR/l6.log" 2>&1 & l6_pid=$!
for spec in "$L3_URL/health|scaniom-runtime-adapter|$LOG_DIR/l3.log" "$L4_URL/health|scaniom-gateway|$LOG_DIR/l4.log" "$L5_URL/health|scaniom-environment-gateway|$LOG_DIR/l5.log" "$MCP_URL/health|scaniom-mcp-gateway|$LOG_DIR/mcp.log" "$L6_URL/health|scaniom-provider-native-bridge|$LOG_DIR/l6.log"; do url="${spec%%|*}"; rest="${spec#*|}"; expected="${rest%%|*}"; log="${rest#*|}"; ok=0; for _ in $(seq 1 60); do body="$(curl -fsS "$url" 2>/dev/null||true)"; if [ -n "$body" ]&&BODY="$body" EXPECTED="$expected" node -e 'const x=JSON.parse(process.env.BODY);process.exit(x.service===process.env.EXPECTED?0:1)' >/dev/null 2>&1; then ok=1; break; fi; sleep 0.1; done; [ "$ok" -eq 1 ]||{ cat "$log" >&2||true; die "runtime boundary $expected failed to become healthy"; }; done
pass "released runtime boundary processes ready · L3/L4/L5/MCP/L6"

info "Install/verify released TypeScript SDK for L2 matrix execution"
cat >"$SDK_DIR/package.json" <<'JSON'
{"name":"open-immune-d10-seven-boundary-client","private":true,"type":"module"}
JSON
cp "$ROOT/demos/d10-offline-continuity/matrix-client.mjs" "$SDK_DIR/matrix-client.mjs"
(cd "$SDK_DIR"&&npm install --ignore-scripts --no-audit --no-fund --package-lock=false "@scaniom/sdk@${SCANIOM_VERSION}" >/dev/null&&node --input-type=module -e "import {SCANIOM_SDK_VERSION} from '@scaniom/sdk';if(SCANIOM_SDK_VERSION!=='${SCANIOM_VERSION}')process.exit(2)")
pass "public @scaniom/sdk@${SCANIOM_VERSION} verified"

run_boundary(){
  local boundary="$1"
  local phase="$2"
  local out="$TMP_DIR/${phase}-${boundary}.json"
  (cd "$SDK_DIR"&&SCANIOM_D10_RUN_ID="$RUN_ID" SCANIOM_D10_PHASE="$phase" SCANIOM_WORKLOAD_ID="$workload_id" SCANIOM_RUNTIME_TOKEN="$runtime_token" SCANIOM_D10_NODE_URL="$NODE_URL" SCANIOM_D10_LEDGER="$LEDGER" SCANIOM_D10_CONNECTION_ID="$route_id" SCANIOM_D10_MODEL="$MODEL" SCANIOM_D10_L3_URL="$L3_URL" SCANIOM_D10_L4_URL="$L4_URL" SCANIOM_D10_L5_URL="$L5_URL" SCANIOM_D10_MCP_URL="$MCP_URL" SCANIOM_D10_L6_URL="$L6_URL" node matrix-client.mjs --boundary "$boundary" >"$out")
}
session_for(){ printf 'open-ii-d10-%s-%s' "$RUN_ID" "$1"; }

info "Execute online baseline independently through all seven frozen attachment boundaries"
for b in "${BOUNDARIES[@]}"; do run_boundary "$b" online-baseline; pass "online baseline · $(upper "$b")"; done
[ "$(wc -l <"$LEDGER"|tr -d ' ')" -eq 7 ]||die "D10 online consequence ledger must contain exactly seven actions"

correlation_for(){
  local boundary="$1"
  local record="$TMP_DIR/online-baseline-${boundary}.json"
  [ -s "$record" ]||die "missing online baseline record for ${boundary}"
  node -e 'const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const v=String(x.correlationId||"");if(!/^scn_corr_[a-f0-9]{64}$/.test(v))process.exit(2);process.stdout.write(v)' "$record"
}
verify_all_trajectories(){
  local stage="$1"
  local attempt all b ref file rc summary
  for attempt in $(seq 1 40); do
    all=1
    for b in "${BOUNDARIES[@]}"; do
      ref="$(correlation_for "$b")"
      file="$TMP_DIR/trajectory-${b}.json"
      set +e
      scaniom trajectory show "$ref" --limit 500 --json >"$file" 2>/dev/null
      rc=$?
      set -e
      if [ "$rc" -ne 0 ]; then
        all=0
        [ "$attempt" -eq 1 ]||[ "$attempt" -eq 40 ]&&info "$(upper "$b") trajectory lookup failed for ${ref}"
        continue
      fi
      set +e
      summary="$(node "$ROOT/demos/d10-offline-continuity/matrix-verify.mjs" trajectory --file "$file" --boundary "$b" --stage "$stage" --workload "$workload_id" 2>/dev/null)"
      rc=$?
      set -e
      if [ "$rc" -ne 0 ]; then
        all=0
        [ "$attempt" -eq 1 ]||[ "$attempt" -eq 40 ]&&info "$(upper "$b") trajectory present but does not yet satisfy ${stage} semantics"
      fi
    done
    [ "$all" -eq 1 ]&&return 0
    info "Waiting for ${stage} seven-boundary trajectory durability ($attempt/40)"
    sleep 1
  done
  return 1
}
info "Require every online boundary event durable in Control before outage"
verify_all_trajectories online||die "refusing D10 outage because all seven online baselines are not durable in Control"
pass "online durability PASS · L1/L2/L3/L4/L5/MCP/L6"

info "Remove only D10 Node → Control transport; keep Node + all runtime boundaries alive"
stop_relay; relay_started=0; node_sync_health_json >/dev/null 2>&1||true
offline_health=""; for attempt in $(seq 1 30); do offline_health="$(node_health_json 2>/dev/null||true)"; if [ -n "$offline_health" ]&&HEALTH="$offline_health" node -e 'const x=JSON.parse(process.env.HEALTH),c=x.continuity||{};process.exit(x.controlConnected===false&&c.state==="offline-protected"&&Date.parse(c.leaseExpiresAt)>Date.now()?0:1)' >/dev/null 2>&1; then break; fi; info "Waiting for OFFLINE-PROTECTED ($attempt/30)"; sleep 0.5; done
HEALTH="$offline_health" node -e 'const x=JSON.parse(process.env.HEALTH||"{}"),c=x.continuity||{};process.exit(x.controlConnected===false&&c.state==="offline-protected"?0:1)'||die "D10 Node did not enter OFFLINE-PROTECTED"
pass "physical Control-path loss PASS · Node and all runtime boundaries stayed live"

info "Prove new one-time authority fails closed while offline"
NODE_URL="$NODE_URL" node <<'NODE'
const r=await fetch(`${process.env.NODE_URL}/v1/runtime/identity/exchange`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bootstrapToken:"scn_rib_open_immune_d10_probe"}),signal:AbortSignal.timeout(5000)});const x=await r.json().catch(()=>({}));if(r.status!==503||!/One-time runtime identity bootstrap is unavailable while Control is offline/i.test(String(x?.error?.message||"")))process.exit(2)
NODE
pass "fail-closed authority PASS · new runtime bootstrap denied offline"

spool_before="$(HEALTH="$offline_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(Number(x.continuity?.spoolBytes||0)))')"
info "Execute one protected offline action independently through every boundary"
for b in "${BOUNDARIES[@]}"; do run_boundary "$b" offline-protected; pass "OFFLINE-PROTECTED execution · $(upper "$b")"; done
[ "$(wc -l <"$LEDGER"|tr -d ' ')" -eq 14 ]||die "D10 consequence ledger must contain exactly fourteen online+offline actions"
node - "$LEDGER" <<'NODE'
const fs=require("node:fs"),rows=fs.readFileSync(process.argv[2],"utf8").trim().split(/\n+/).filter(Boolean).map(JSON.parse);if(rows.length!==14)throw new Error("expected 14 consequences");const ids=new Map();for(const r of rows)ids.set(r.consequenceId,(ids.get(r.consequenceId)||0)+1);if([...ids.values()].some(n=>n!==1)||ids.size!==14)throw new Error("consequence replay/duplicate detected");for(const b of ["l1","l2","l3","l4","l5","mcp","l6"])for(const p of ["online-baseline","offline-protected"])if(!rows.some(r=>r.boundary===b&&r.phase===p))throw new Error(`missing ${b}/${p}`)
NODE
pass "exactly-once consequence PASS · 14 unique actions · no execution replay"

buffered=0; spool_peak=0
for attempt in $(seq 1 40); do offline_health="$(node_health_json 2>/dev/null||true)"; if [ -n "$offline_health" ]; then spool_peak="$(HEALTH="$offline_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(Number(x.continuity?.spoolBytes||0)))')"; if [ "$spool_peak" -gt "$spool_before" ]; then buffered=1; break; fi; fi; info "Waiting for seven-boundary evidence spool growth ($attempt/40)"; sleep 0.25; done
[ "$buffered" -eq 1 ]||die "seven-boundary offline evidence did not enter bounded Node spool"
pass "offline evidence buffer PASS · ${spool_peak} bytes pending locally"

info "Prove none of the seven offline executions reached Control during isolation"
for b in "${BOUNDARIES[@]}"; do ref="$(correlation_for "$b")"; file="$TMP_DIR/offline-visible-${b}.json"; scaniom trajectory show "$ref" --limit 500 --json >"$file"; node "$ROOT/demos/d10-offline-continuity/matrix-verify.mjs" trajectory --file "$file" --boundary "$b" --stage online --workload "$workload_id" >/dev/null||die "offline $b evidence reached Control before reconnect or baseline disappeared"; done
pass "Control absence PASS · all seven offline evidence streams remained Node-local"

info "Restore exact same Control path without restarting Node or runtime boundaries"
start_relay
reconnected=0; reconnect_health=""
for attempt in $(seq 1 45); do reconnect_health="$(node_health_json 2>/dev/null||true)"; if [ -n "$reconnect_health" ]&&HEALTH="$reconnect_health" node -e 'const x=JSON.parse(process.env.HEALTH),c=x.continuity||{};process.exit(x.controlConnected===true&&c.state==="online"&&Number(c.spoolBytes||0)===0&&Number(c.lastEvidenceReplayCount||0)>0&&Boolean(c.lastEvidenceReplayAt)?0:1)' >/dev/null 2>&1; then reconnected=1; break; fi; info "Waiting for reconnect + ordered evidence replay ($attempt/45)"; sleep 1; done
[ "$reconnected" -eq 1 ]||die "D10 reconnect occurred without complete Node evidence replay"
replayed_count="$(HEALTH="$reconnect_health" node -e 'const x=JSON.parse(process.env.HEALTH);process.stdout.write(String(Number(x.continuity?.lastEvidenceReplayCount||0)))')"
pass "reconnect/replay PASS · Node spool drained · ${replayed_count} envelope(s) replayed"

info "Wait for seven attachment-specific trajectories to converge"
verify_all_trajectories full||die "one or more seven-boundary replayed trajectories did not converge"
pass "E1 matrix PASS · seven independent online+offline trajectories"

info "Verify seven signed correlated proofs"
for b in "${BOUNDARIES[@]}"; do ref="$(correlation_for "$b")"; proof="$TMP_DIR/proof-${b}.json"; ok=0; for attempt in $(seq 1 35); do set +e; scaniom proof correlated verify "$ref" --json >"$proof" 2>/dev/null; rc=$?; set -e; if [ "$rc" -eq 0 ]&&node "$ROOT/demos/d10-offline-continuity/matrix-verify.mjs" proof --file "$proof" --boundary "$b" --workload "$workload_id" >"$TMP_DIR/proof-summary-${b}.json" 2>/dev/null; then ok=1; break; fi; sleep 1; done; [ "$ok" -eq 1 ]||die "D10 $(upper "$b") signed correlated proof did not become valid"; proof_id="$(node -e 'const x=require(process.argv[1]);process.stdout.write(x.proofId)' "$TMP_DIR/proof-summary-${b}.json")"; pass "E2 proof · $(upper "$b") · $proof_id · VALID"; done

info "Render accepted B2 continuity + seven boundary proof summary"
scaniom runtime continuity --env "$ENV_NAME"
for b in "${BOUNDARIES[@]}"; do ref="$(correlation_for "$b")"; scaniom trajectory show "$ref" --limit 500; scaniom proof correlated verify "$ref"; done

info "Cleanly stop released boundary processes and D10 Node after synchronization"
stop_services; stop_pid "$consequence_pid"; consequence_pid=""
stop_d10_node||die "D10-owned Node did not stop cleanly"; node_running=0
stop_relay; relay_started=0; scaniom profile remove "$RELAY_PROFILE" >/dev/null 2>&1||true

RECEIPT="$RECEIPT" TMP_DIR="$TMP_DIR" LEDGER="$LEDGER" RUN_ID="$RUN_ID" ENVIRONMENT_ID="$environment_id" WORKLOAD_ID="$workload_id" NODE_ID="$node_id" NODE_NAME="$NODE_NAME" ROUTE_ID="$route_id" IDENTITY_ID="$identity_id" IDENTITY_GENERATION="$identity_generation" CONTINUITY_UNTIL="$continuity_until" SPOOL_PEAK="$spool_peak" REPLAYED_COUNT="$replayed_count" node <<'NODE'
const fs=require("node:fs"),path=require("node:path");const boundaries={};for(const b of ["l1","l2","l3","l4","l5","mcp","l6"]){const online=JSON.parse(fs.readFileSync(path.join(process.env.TMP_DIR,`online-baseline-${b}.json`),"utf8")),offline=JSON.parse(fs.readFileSync(path.join(process.env.TMP_DIR,`offline-protected-${b}.json`),"utf8")),proof=JSON.parse(fs.readFileSync(path.join(process.env.TMP_DIR,`proof-summary-${b}.json`),"utf8"));boundaries[b]={level:proof.level,source:proof.source,session:online.session,correlationId:proof.correlationId,proofId:proof.proofId,eventCount:proof.eventCount,onlineConsequenceId:online.consequenceId,offlineConsequenceId:offline.consequenceId};}
const receipt={version:2,labId:"d10-offline-continuity",status:"pass",release:"R18",scaniomVersion:"0.4.2",verifiedAt:new Date().toISOString(),environmentId:process.env.ENVIRONMENT_ID,workloadId:process.env.WORKLOAD_ID,nodeId:process.env.NODE_ID,nodeName:process.env.NODE_NAME,routeId:process.env.ROUTE_ID,runId:process.env.RUN_ID,continuityUntil:process.env.CONTINUITY_UNTIL,maxOfflineSeconds:14400,maxCredentialStaleSeconds:1800,maxSpoolBytes:268435456,spoolPeakBytes:Number(process.env.SPOOL_PEAK),replayedEnvelopes:Number(process.env.REPLAYED_COUNT),identity:{identityId:process.env.IDENTITY_ID,generation:Number(process.env.IDENTITY_GENERATION),attachments:["l1","l2","l3","l4","l5","mcp","l6"]},boundaries,checks:{signedContinuity:true,allSevenIdentityScopes:true,onlineBaselineAllSeven:true,offlineProtected:true,bootstrapDenied:true,protectedOfflineAllSeven:true,evidenceBuffered:true,controlAbsentWhileOffline:true,evidenceReplayed:true,allSevenTrajectories:true,allSevenProofs:true,noReplay:true,cleanShutdown:true}};
const tmp=`${process.env.RECEIPT}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+"\n",{mode:0o600});fs.renameSync(tmp,process.env.RECEIPT)
NODE
pass "D10 seven-boundary receipt written · ${RECEIPT#$ROOT/}"

trap - EXIT INT TERM

echo
echo "=============================================================="
echo " OPEN IMMUNE · D10 FULL SEVEN-BOUNDARY OFFLINE CONTINUITY PASS"
echo "=============================================================="
pass "L1 API Route · real offline provider-proxy consequence + replayed evidence + VALID proof"
pass "L2 SDK · real offline guard/execute/observe + replayed evidence + VALID proof"
pass "L3 Model Runtime · real runtime_hook pre/inference/post + replayed evidence + VALID proof"
pass "L4 Sidecar · real offline sidecar model consequence + replayed evidence + VALID proof"
pass "L5 Environment Gateway · explicit l5 guard/consequence/observe + replayed evidence + VALID proof"
pass "MCP Gateway · real offline tools/call consequence + replayed evidence + VALID proof"
pass "L6 Provider Native · real guard/consequence/observe + replayed evidence + VALID proof"
pass "all seven used one pre-isolation explicit scn_ri_v1 generation; no new authority minted offline"
pass "same D10 Node + boundary processes survived Control loss and recovered without restart"
pass "14 unique consequences · no execution replay · seven independent correlated proofs"
info "The signed 4h lease-expiry boundary is recorded but not time-warped or simulated."
