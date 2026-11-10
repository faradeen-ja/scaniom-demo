#!/usr/bin/env bash
# INTERNAL ENGINEERING / CI ACCEPTANCE HARNESS.
# Normal Open Immune users use the Workbench + released standalone Scaniom CLI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/ensure-scope.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
MODEL="${SCANIOM_MODEL:-gpt-5-mini}"
PORT="${SCANIOM_L5_PORT:-8791}"
NODE_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
GATEWAY_URL="${SCANIOM_L5_GATEWAY_URL:-http://127.0.0.1:${PORT}}"
START_GATEWAY="${SCANIOM_L5_START_GATEWAY:-1}"
PROVIDER_PROBE="${SCANIOM_D06_PROVIDER_PROBE:-0}"
LOG_DIR="$ROOT/.demo/d06"
LOG_FILE="$LOG_DIR/environment-gateway.log"
PID_FILE="$LOG_DIR/environment-gateway.pid"
GUARD_FILE="$LOG_DIR/guard-result.json"
PROOF_FILE="$LOG_DIR/correlated-proof.json"
TRAJECTORY_FILE="$LOG_DIR/trajectory.json"

mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"

runtime_token="${SCANIOM_RUNTIME_TOKEN:-}"
workload_id=""
identity_id=""
token_generation=""
gateway_owned=0
correlation_id=""
behavior_id=""
session_id=""

cleanup() {
  unset runtime_token SCANIOM_RUNTIME_TOKEN BOOTSTRAP_TOKEN || true
  rm -f "$GUARD_FILE" "$PROOF_FILE" "$TRAJECTORY_FILE" 2>/dev/null || true
  if [ "$gateway_owned" -eq 1 ] && [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT INT TERM

node_health_sync() {
  NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{
  const base=String(process.env.NODE_URL||"").replace(/\/+$/,"");
  const response=await fetch(`${base}/health?sync=1`,{signal:AbortSignal.timeout(10000),cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`Node health sync failed HTTP ${response.status}: ${JSON.stringify(body)}`);
  if(body.service!=="scaniom-node") throw new Error(`${base} is not a Scaniom Node`);
  if(body.phase3Ready!==true) throw new Error("Scaniom Node runtime is not ready");
  if(body.controlConnected!==true) throw new Error(`Scaniom Node is not connected to Control: ${body.controlLastHeartbeatError||"unknown"}`);
  if(body.continuity?.state!=="online") throw new Error(`Scaniom Node continuity is not online: ${body.continuity?.state||"unknown"}`);
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

info "Verify real Node + live Control authority before creating L5 authority"
health_json="$(node_health_sync)"
node - "$health_json" "$NODE_URL" <<'NODE'
const [raw,nodeUrl]=process.argv.slice(2),x=JSON.parse(raw);
console.log(`✓ Scaniom Node authority PASS · ${x.name||x.nodeId} · ${nodeUrl}`);
console.log(`✓ Control sync CONNECTED · continuity ${String(x.continuity?.state||"").toUpperCase()}`);
NODE

parse_runtime_token() {
  RUNTIME_TOKEN="$runtime_token" node <<'NODE'
const token=String(process.env.RUNTIME_TOKEN||"");
if(!token.startsWith("scn_ri_v1.")) throw new Error("L5 requires a scn_ri_v1 runtime identity token");
const parts=token.split(".");
if(parts.length!==3) throw new Error("runtime identity token structure is invalid");
const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
const attachments=(claims.attachments||[]).map(v=>String(v).toLowerCase());
if(!attachments.includes("l5")) throw new Error(`runtime identity lacks explicit l5 scope: ${attachments.join(",")}`);
if(!claims.workloadId||!claims.identityId||!Number.isInteger(Number(claims.generation))) throw new Error("runtime identity claims are incomplete");
process.stdout.write([claims.workloadId,claims.identityId,String(claims.generation),attachments.join(",")].join("\t"));
NODE
}

if [ -z "$runtime_token" ]; then
  info "Create one explicit least-privilege L5 bootstrap and exchange it through the live Node"
  bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l5 --json)"
  bootstrap_token="$(node - "$bootstrap_json" <<'NODE'
const x=JSON.parse(process.argv[2]);
if(!String(x.bootstrapToken||"").startsWith("scn_rib_")) throw new Error("Scaniom did not return a one-time runtime identity bootstrap");
process.stdout.write(String(x.bootstrapToken));
NODE
)"
  unset bootstrap_json

  exchange_json="$(BOOTSTRAP_TOKEN="$bootstrap_token" NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{
  const response=await fetch(`${String(process.env.NODE_URL).replace(/\/+$/,"")}/v1/runtime/identity/exchange`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({bootstrapToken:process.env.BOOTSTRAP_TOKEN}),
    signal:AbortSignal.timeout(20000),
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`L5 runtime identity exchange failed HTTP ${response.status}: ${body?.error?.message||JSON.stringify(body)}`);
  const credential=body.credential||{};
  if(!String(credential.token||"").startsWith("scn_ri_v1.")) throw new Error("Node exchange returned no scn_ri_v1 credential.token");
  if(!(credential.attachments||[]).map(v=>String(v).toLowerCase()).includes("l5")) throw new Error("Node exchange returned credential without l5 scope");
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
)"
  unset bootstrap_token BOOTSTRAP_TOKEN

  runtime_token="$(node - "$exchange_json" <<'NODE'
const x=JSON.parse(process.argv[2]);
process.stdout.write(String(x.credential?.token||""));
NODE
)"
  unset exchange_json
else
  info "Use supplied L5 runtime identity without rotating authority"
fi

IFS=$'\t' read -r workload_id identity_id token_generation token_attachments <<<"$(parse_runtime_token)"
[ -n "$workload_id" ] || die "runtime identity did not contain workload authority"

identity_json=""
control_generation=""
control_identity_id=""
control_ready=0
for attempt in $(seq 1 12); do
  identity_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
  read -r control_generation control_identity_id <<<"$(node - "$identity_json" <<'NODE'
const x=JSON.parse(process.argv[2]),i=x.identity||{};
if(String(i.status||"").toLowerCase()!=="active") throw new Error("runtime identity is not active in Control");
if(!(i.attachments||[]).map(v=>String(v).toLowerCase()).includes("l5")) throw new Error("Control runtime identity does not include l5 scope");
process.stdout.write(`${i.generation||0} ${i.identityId||""}`);
NODE
)"
  if [ "$control_generation" = "$token_generation" ] && [ "$control_identity_id" = "$identity_id" ]; then
    control_ready=1
    break
  fi
  info "Waiting for Control runtime generation convergence · token=$token_generation control=$control_generation ($attempt/12)"
  sleep 0.5
done
[ "$control_ready" -eq 1 ] || die "runtime identity generation did not converge in Control; refusing to mint or rotate again blindly"
pass "L5 runtime identity authority PASS · generation $token_generation · L5"

# Force a fresh signed Node config before the gateway executes. The real runtime
# acceptance below also retries only the specific scaniom_runtime_generation_stale
# race; every other authorization error fails immediately.
node_health_sync >/dev/null
node_health_sync >/dev/null

probe_gateway_health() {
  GATEWAY_URL="$GATEWAY_URL" NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{
  const response=await fetch(`${String(process.env.GATEWAY_URL).replace(/\/+$/,"")}/health`,{signal:AbortSignal.timeout(1500),cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) process.exit(2);
  if(body.service!=="scaniom-environment-gateway"||body.attachment!=="l5") process.exit(3);
  const actual=String(body.nodeUrl||"").replace(/\/+$/,"");
  const expected=String(process.env.NODE_URL||"").replace(/\/+$/,"");
  if(actual!==expected) throw new Error(`L5 gateway targets ${actual||"unknown"}, expected ${expected}`);
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

gateway_json=""
set +e
gateway_json="$(probe_gateway_health 2>/dev/null)"
gateway_rc=$?
set -e

if [ "$gateway_rc" -eq 0 ]; then
  info "Reuse existing healthy L5 Environment Gateway at $GATEWAY_URL"
elif [ "$START_GATEWAY" = "1" ]; then
  info "Start the real L5 Environment Gateway · explicit Node fabric $NODE_URL"
  : >"$LOG_FILE"
  SCANIOM_NODE_URL="$NODE_URL" scaniom attach l5 \
    --environment "$ENV_NAME" \
    --node-url "$NODE_URL" \
    --port "$PORT" \
    --run >"$LOG_FILE" 2>&1 &
  gateway_pid=$!
  gateway_owned=1
  printf '%s\n' "$gateway_pid" >"$PID_FILE"

  gateway_ready=0
  for attempt in $(seq 1 30); do
    if ! kill -0 "$gateway_pid" >/dev/null 2>&1; then
      cat "$LOG_FILE" >&2 || true
      die "L5 Environment Gateway exited before becoming usable"
    fi
    set +e
    gateway_json="$(probe_gateway_health 2>/dev/null)"
    gateway_rc=$?
    set -e
    if [ "$gateway_rc" -eq 0 ]; then gateway_ready=1; break; fi
    info "Waiting for L5 gateway health ($attempt/30)"
    sleep 0.5
  done
  [ "$gateway_ready" -eq 1 ] || { cat "$LOG_FILE" >&2 || true; die "L5 Environment Gateway did not become healthy"; }
else
  die "No healthy L5 gateway is running at $GATEWAY_URL and SCANIOM_L5_START_GATEWAY=0"
fi

forwarded_before="$(node - "$gateway_json" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(String(Number(x.forwarded||0)));
NODE
)"
node - "$gateway_json" <<'NODE'
const x=JSON.parse(process.argv[2]);
console.log(`✓ L5 gateway READY · ${x.version||"unknown"} · Node ${x.nodeUrl}`);
console.log(`✓ explicit workload attribution required · forwarded=${x.forwarded||0} rejected=${x.rejected||0}`);
NODE

run_guard_once() {
  RUNTIME_TOKEN="$runtime_token" WORKLOAD_ID="$workload_id" GATEWAY_URL="$GATEWAY_URL" SESSION_ID="$session_id" node <<'NODE'
(async()=>{
  const payload={
    sessionId:process.env.SESSION_ID,
    actionType:"custom_action",
    text:"Open Immune D06 authenticated L5 environment ingress",
    target:"open-immune://d06/l5",
    capabilities:[],
    production:false,
    metadata:{provenance:"live",openImmuneLab:"D06",boundary:"l5"},
  };
  const response=await fetch(`${String(process.env.GATEWAY_URL).replace(/\/+$/,"")}/v1/guard`,{
    method:"POST",
    headers:{
      authorization:`Bearer ${process.env.RUNTIME_TOKEN}`,
      "x-scaniom-workload-id":process.env.WORKLOAD_ID,
      "x-scaniom-session-id":process.env.SESSION_ID,
      "content-type":"application/json",
      accept:"application/json",
    },
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(20000),
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok){
    if(body?.error?.type==="scaniom_runtime_generation_stale") process.exit(42);
    throw new Error(`L5 /v1/guard failed HTTP ${response.status}: ${body?.error?.type||"unknown"} · ${body?.error?.message||JSON.stringify(body)}`);
  }
  if(response.headers.get("x-scaniom-l5-gateway")!=="environment") throw new Error("L5 gateway authority header is missing");
  for(const key of ["machineAction","behaviorEventId","correlationId"]) if(!body[key]) throw new Error(`L5 Gate response missing ${key}`);
  process.stdout.write(JSON.stringify({...body,gatewayHeader:"environment"}));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

info "Execute provider-neutral D06 core acceptance through authenticated L5 /v1/guard"
guard_ok=0
for attempt in $(seq 1 12); do
  session_id="open-ii-d06-l5-$(date +%s)-$attempt"
  set +e
  run_guard_once >"$GUARD_FILE"
  guard_rc=$?
  set -e
  if [ "$guard_rc" -eq 0 ]; then
    guard_ok=1
    break
  fi
  if [ "$guard_rc" -eq 42 ]; then
    info "Node runtime generation snapshot is still converging · force signed Control sync ($attempt/12)"
    node_health_sync >/dev/null
    sleep 0.5
    continue
  fi
  die "D06 L5 Gate execution failed"
done
[ "$guard_ok" -eq 1 ] || die "Node never converged to runtime generation $token_generation after signed Control synchronization"

read -r behavior_id correlation_id machine_action permitted risk_score <<<"$(node - "$GUARD_FILE" <<'NODE'
const x=JSON.parse(require("node:fs").readFileSync(process.argv[2],"utf8"));
process.stdout.write([x.behaviorEventId,x.correlationId,x.machineAction,String(x.permitted),String(x.riskScore??0)].join(" "));
NODE
)"
[ -n "$behavior_id" ] && [ -n "$correlation_id" ] || die "D06 L5 Gate did not return evidence identifiers"
pass "REAL L5 GATE PASS · action=$machine_action permitted=$permitted risk=$risk_score"
pass "behavior $behavior_id"
pass "correlation $correlation_id"

gateway_after="$(probe_gateway_health)"
forwarded_after="$(node - "$gateway_after" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(String(Number(x.forwarded||0)));
NODE
)"
[ "$forwarded_after" -gt "$forwarded_before" ] || die "L5 gateway forwarded counter did not advance"
pass "L5 gateway forwarding PASS · $forwarded_before → $forwarded_after"

info "Wait for exact E1 L5 trajectory evidence"
trajectory_ok=0
for attempt in $(seq 1 20); do
  set +e
  scaniom trajectory show "$correlation_id" --limit 500 --json >"$TRAJECTORY_FILE" 2>/dev/null
  trajectory_rc=$?
  set -e
  if [ "$trajectory_rc" -eq 0 ] && node - "$TRAJECTORY_FILE" "$behavior_id" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,behaviorId,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8"));
const ok=(x.events||[]).some(e=>
  e.behaviorEventId===behaviorId &&
  e.workloadId===workloadId &&
  String(e.attachmentSource||"").toLowerCase()==="gateway" &&
  String(e.executionPhase||"").toLowerCase()==="pre"
);
process.exit(ok?0:1);
NODE
  then
    trajectory_ok=1
    break
  fi
  info "Waiting for selected-workload L5 trajectory ($attempt/20)"
  sleep 1
done
[ "$trajectory_ok" -eq 1 ] || die "D06 behavior exists but exact selected-workload L5 trajectory did not reach Control"
pass "E1 trajectory PASS · attachment source gateway / L5"

info "Wait for exact E2 correlated proof and verify its signature"
proof_ok=0
for attempt in $(seq 1 20); do
  set +e
  scaniom proof correlated verify "$correlation_id" --json >"$PROOF_FILE" 2>/dev/null
  proof_rc=$?
  set -e
  if [ "$proof_rc" -eq 0 ] && node - "$PROOF_FILE" "$correlation_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,correlationId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8"));
const payload=x.verification?.payload||{};
const levels=(payload.attachmentLevels||[]).map(v=>String(v).toLowerCase());
const ok=x.verification?.valid===true && x.item?.correlationId===correlationId && levels.includes("l5");
process.exit(ok?0:1);
NODE
  then
    proof_ok=1
    break
  fi
  info "Waiting for valid signed L5 correlated proof ($attempt/20)"
  sleep 1
done
[ "$proof_ok" -eq 1 ] || die "D06 L5 trajectory exists but no valid L5 correlated proof was available"

node - "$PROOF_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8")),p=x.verification?.payload||{};
console.log(`✓ E2 signed proof ${x.item?.proofId||"verified"} · VALID · ${(p.attachmentLevels||[]).map(v=>String(v).toUpperCase()).join("+")}`);
NODE

# Provider-backed /v1/responses is deliberately not the core D06 gate. A workload
# can prove real L5 identity/Gate/evidence with zero provider routes. Run the
# provider route proof only when a real BYOK route is intentionally configured.
if [ "$PROVIDER_PROBE" = "1" ]; then
  info "Run optional provider-route L5 /v1/responses proof"
  SCANIOM_RUNTIME_TOKEN="$runtime_token" scaniom attach test l5 \
    --workload "$WORKLOAD" \
    --gateway-url "$GATEWAY_URL" \
    --model "$MODEL" \
    -- "Say hello in one sentence"
else
  info "Provider route proof is optional for D06 core acceptance · set SCANIOM_D06_PROVIDER_PROBE=1 only when this workload has a real BYOK route"
fi

unset runtime_token SCANIOM_RUNTIME_TOKEN || true

info "Render accepted D06 evidence from the released CLI"
scaniom attach status --workload "$WORKLOAD"
scaniom live --env "$ENV_NAME" --workload "$WORKLOAD" --limit 20
scaniom trajectory show "$correlation_id" --limit 500
scaniom proof correlated verify "$correlation_id"

pass "D06 L5 ENVIRONMENT GATEWAY REAL EXECUTION PASS · explicit L5 identity + generation convergence + authenticated /v1/guard + gateway forwarding + E1 trajectory + E2 signed proof"
