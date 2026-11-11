#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
NODE_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
PORT="${SCANIOM_L6_PORT:-8794}"
BRIDGE_URL="${SCANIOM_L6_BRIDGE_URL:-http://127.0.0.1:${PORT}}"
PROVIDER="${SCANIOM_L6_PROVIDER:-open-immune}"
ADAPTER_ID="${SCANIOM_L6_ADAPTER:-open-immune.safe-native-v1}"
EVENT_KIND="${SCANIOM_L6_EVENT_KIND:-safe_record}"
START_BRIDGE="${SCANIOM_D08_START_BRIDGE:-1}"

STATE_DIR="$ROOT/.demo/d08"
TMP_DIR="$STATE_DIR/tmp"
LEDGER="$STATE_DIR/provider-native-ledger.jsonl"
BRIDGE_LOG="$STATE_DIR/l6-bridge.log"
BRIDGE_PID="$STATE_DIR/l6-bridge.pid"
ADAPTER_RESULT="$TMP_DIR/adapter-result.json"
TRAJECTORY_FILE="$TMP_DIR/trajectory.json"
PROOF_FILE="$TMP_DIR/proof.json"
BOOTSTRAP_FILE="$TMP_DIR/bootstrap.json"
EXCHANGE_FILE="$TMP_DIR/exchange.json"

mkdir -p "$TMP_DIR"
chmod 700 "$STATE_DIR" "$TMP_DIR" 2>/dev/null || true
bridge_pid=""
bridge_owned=0

cleanup() {
  if [ "$bridge_owned" -eq 1 ] && [ -n "$bridge_pid" ]; then
    kill "$bridge_pid" >/dev/null 2>&1 || true
    wait "$bridge_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

"$ROOT/scripts/ensure-scope.sh"

info "Verify real Node + live Control authority before creating L6 authority"
health="$(SCANIOM_NODE_URL="$NODE_URL" scaniom node health)"
printf '%s\n' "$health"
grep -q 'RUNTIME.*READY' <<<"$health" || die "Scaniom Node runtime is not READY"
grep -q 'CONTROL SYNC.*CONNECTED' <<<"$health" || die "Scaniom Node is not connected to Control"
grep -q 'CONTINUITY.*ONLINE' <<<"$health" || die "Scaniom Node is not ONLINE for D08 bootstrap"

decode_runtime_token() {
  TOKEN="$1" node <<'NODE'
const token=String(process.env.TOKEN||"");
if(!token.startsWith("scn_ri_v1."))process.exit(2);
const parts=token.split(".");
if(parts.length!==3)process.exit(2);
try{
  const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
  process.stdout.write(JSON.stringify(claims));
}catch{process.exit(2)}
NODE
}

runtime_token=""
claims_json=""
if [ -n "${SCANIOM_RUNTIME_TOKEN:-}" ]; then
  set +e
  claims_json="$(decode_runtime_token "$SCANIOM_RUNTIME_TOKEN" 2>/dev/null)"
  token_rc=$?
  set -e
  if [ "$token_rc" -eq 0 ] && CLAIMS="$claims_json" node <<'NODE' >/dev/null 2>&1
const c=JSON.parse(process.env.CLAIMS);
const ok=Array.isArray(c.attachments)
  &&c.attachments.map(v=>String(v).toLowerCase()).includes("l6")
  &&Date.parse(c.expiresAt)>Date.now()+30_000;
process.exit(ok?0:1);
NODE
  then
    current_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
    if TOKEN_CLAIMS="$claims_json" CURRENT="$current_json" node <<'NODE' >/dev/null 2>&1
const c=JSON.parse(process.env.TOKEN_CLAIMS),x=JSON.parse(process.env.CURRENT),i=x.identity||{};
const ok=i.status==="active"
  &&i.workloadId===c.workloadId
  &&Number(i.generation)===Number(c.generation)
  &&Array.isArray(i.attachments)
  &&i.attachments.map(v=>String(v).toLowerCase()).includes("l6");
process.exit(ok?0:1);
NODE
    then
      runtime_token="$SCANIOM_RUNTIME_TOKEN"
      info "Reuse supplied current L6 runtime identity authority"
    else
      info "Supplied L6 token is not the current Control generation; create current L6 authority"
    fi
  else
    info "Existing SCANIOM_RUNTIME_TOKEN is not current L6 authority; ignore prior-lab token"
  fi
fi

if [ -z "$runtime_token" ]; then
  info "Create one explicit least-privilege L6 bootstrap and exchange it through the live Node"
  scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l6 --json >"$BOOTSTRAP_FILE"
  bootstrap_token="$(node - "$BOOTSTRAP_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
if(!String(x.bootstrapToken||"").startsWith("scn_rib_"))process.exit(2);
process.stdout.write(x.bootstrapToken);
NODE
)"
  BOOTSTRAP_TOKEN="$bootstrap_token" NODE_URL="$NODE_URL" node <<'NODE' >"$EXCHANGE_FILE"
(async()=>{
  const response=await fetch(`${String(process.env.NODE_URL).replace(/\/+$/,"")}/v1/runtime/identity/exchange`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({bootstrapToken:process.env.BOOTSTRAP_TOKEN}),
    signal:AbortSignal.timeout(20_000),
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`runtime identity exchange HTTP ${response.status}: ${body?.error?.message||JSON.stringify(body)}`);
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
  runtime_token="$(node - "$EXCHANGE_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const token=String(x.credential?.token||"");
if(!token.startsWith("scn_ri_v1."))process.exit(2);
process.stdout.write(token);
NODE
)"
fi

claims_json="$(decode_runtime_token "$runtime_token")"
read -r workload_id generation <<<"$(CLAIMS="$claims_json" node <<'NODE'
const c=JSON.parse(process.env.CLAIMS);
const attachments=(c.attachments||[]).map(v=>String(v).toLowerCase());
if(!attachments.includes("l6"))throw new Error(`runtime identity lacks explicit l6 scope: ${attachments.join(",")}`);
if(!c.workloadId||!Number(c.generation))throw new Error("runtime identity is missing workload/generation authority");
process.stdout.write(`${c.workloadId} ${c.generation}`);
NODE
)"

identity_ready=0
for attempt in $(seq 1 12); do
  current_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
  if TOKEN_GENERATION="$generation" WORKLOAD_ID="$workload_id" CURRENT="$current_json" node <<'NODE' >/dev/null 2>&1
const x=JSON.parse(process.env.CURRENT),i=x.identity||{};
const ok=i.status==="active"
  &&i.workloadId===process.env.WORKLOAD_ID
  &&Number(i.generation)===Number(process.env.TOKEN_GENERATION)
  &&Array.isArray(i.attachments)
  &&i.attachments.map(v=>String(v).toLowerCase()).includes("l6");
process.exit(ok?0:1);
NODE
  then identity_ready=1; break; fi
  info "Waiting for L6 runtime identity generation convergence ($attempt/12)"
  SCANIOM_NODE_URL="$NODE_URL" scaniom node health >/dev/null || true
  sleep 0.5
done
[ "$identity_ready" -eq 1 ] || die "L6 runtime identity did not converge to generation $generation"
pass "L6 runtime identity authority PASS · generation $generation · L6"

info "Register the real custom provider-native adapter metadata in Scaniom Control"
SCANIOM_NODE_URL="$NODE_URL" scaniom attach l6 \
  --workload "$WORKLOAD" \
  --provider "$PROVIDER" \
  --adapter "$ADAPTER_ID" \
  --adapter-kind custom \
  --hook custom \
  --node-url "$NODE_URL" \
  --port "$PORT" >/dev/null
pass "L6 adapter inventory PASS · $PROVIDER · $ADAPTER_ID"

probe_bridge() {
  BRIDGE_URL="$BRIDGE_URL" NODE_URL="$NODE_URL" node <<'NODE'
(async()=>{
  const response=await fetch(`${String(process.env.BRIDGE_URL).replace(/\/+$/,"")}/health`,{signal:AbortSignal.timeout(1500),cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)process.exit(2);
  if(body.service!=="scaniom-provider-native-bridge"||body.attachment!=="l6"||body.framework!=="provider_native")process.exit(3);
  const expected=String(process.env.NODE_URL||"").replace(/\/+$/,"");
  const targets=Array.isArray(body.nodeTargets)?body.nodeTargets.map(v=>String(v).replace(/\/+$/,"")):[];
  if(!targets.includes(expected))throw new Error(`L6 bridge targets ${targets.join(",")||"unknown"}, expected ${expected}`);
  if(body.contentBoundary!=="metadata_and_digests_only")throw new Error("L6 bridge privacy boundary is not metadata_and_digests_only");
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

bridge_json=""
set +e
bridge_json="$(probe_bridge 2>/dev/null)"
bridge_rc=$?
set -e

if [ "$bridge_rc" -eq 0 ]; then
  info "Reuse existing healthy L6 Provider-Native Bridge at $BRIDGE_URL"
elif [ "$START_BRIDGE" = "1" ]; then
  info "Start released L6 Provider-Native Bridge · listen :$PORT · explicit Node fabric $NODE_URL"
  : >"$BRIDGE_LOG"
  SCANIOM_NODE_URL="$NODE_URL" scaniom attach l6 \
    --workload "$WORKLOAD" \
    --provider "$PROVIDER" \
    --adapter "$ADAPTER_ID" \
    --adapter-kind custom \
    --hook custom \
    --node-url "$NODE_URL" \
    --port "$PORT" \
    --run >"$BRIDGE_LOG" 2>&1 &
  bridge_pid=$!
  bridge_owned=1
  printf '%s\n' "$bridge_pid" >"$BRIDGE_PID"

  bridge_ready=0
  for attempt in $(seq 1 30); do
    if ! kill -0 "$bridge_pid" >/dev/null 2>&1; then
      cat "$BRIDGE_LOG" >&2 || true
      die "L6 Provider-Native Bridge exited before becoming usable"
    fi
    set +e
    bridge_json="$(probe_bridge 2>/dev/null)"
    bridge_rc=$?
    set -e
    if [ "$bridge_rc" -eq 0 ]; then bridge_ready=1; break; fi
    info "Waiting for L6 bridge health ($attempt/30)"
    sleep 0.5
  done
  [ "$bridge_ready" -eq 1 ] || { cat "$BRIDGE_LOG" >&2 || true; die "L6 Provider-Native Bridge did not become healthy"; }
else
  die "No healthy L6 bridge is running at $BRIDGE_URL and SCANIOM_D08_START_BRIDGE=0"
fi

read -r guarded_before observed_before rejected_before <<<"$(node - "$bridge_json" <<'NODE'
const x=JSON.parse(process.argv[2]);
process.stdout.write(`${Number(x.guarded||0)} ${Number(x.observed||0)} ${Number(x.rejected||0)}`);
NODE
)"
pass "L6 bridge READY · $BRIDGE_URL → Node $NODE_URL · metadata/digests only"

ledger_before=0
if [ -f "$LEDGER" ]; then ledger_before="$(wc -l <"$LEDGER" | tr -d ' ')"; fi
session_id="open-ii-d08-l6-$(date +%s)-$$"

info "Execute one real safe provider-native adapter consequence behind L6 Gate"
SCANIOM_L6_BRIDGE_URL="$BRIDGE_URL" \
SCANIOM_RUNTIME_TOKEN="$runtime_token" \
SCANIOM_WORKLOAD_ID="$workload_id" \
SCANIOM_L6_ADAPTER_ID="$ADAPTER_ID" \
SCANIOM_L6_PROVIDER="$PROVIDER" \
SCANIOM_L6_EVENT_KIND="$EVENT_KIND" \
SCANIOM_L6_SESSION_ID="$session_id" \
OPEN_II_D08_LEDGER="$LEDGER" \
node "$ROOT/demos/d08-l6-provider-native/reference-adapter.mjs" >"$ADAPTER_RESULT"

read -r consequence_id pre_behavior post_behavior correlation_id <<<"$(node - "$ADAPTER_RESULT" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
if(x.ok!==true||x.contentStored!==false)throw new Error("D08 adapter result contract failed");
for(const value of [x.consequenceId,x.guard?.behaviorEventId,x.observe?.behaviorEventId,x.guard?.correlationId])if(!value)throw new Error("D08 adapter result missing evidence identity");
if(x.guard.correlationId!==x.observe.correlationId)throw new Error("guard/observe correlation mismatch");
process.stdout.write([x.consequenceId,x.guard.behaviorEventId,x.observe.behaviorEventId,x.guard.correlationId].join(" "));
NODE
)"
pass "real provider-native consequence PASS · $consequence_id"

bridge_after="$(probe_bridge)"
read -r guarded_after observed_after rejected_after <<<"$(node - "$bridge_after" <<'NODE'
const x=JSON.parse(process.argv[2]);
process.stdout.write(`${Number(x.guarded||0)} ${Number(x.observed||0)} ${Number(x.rejected||0)}`);
NODE
)"
[ "$guarded_after" -gt "$guarded_before" ] || die "L6 bridge guarded counter did not advance"
[ "$observed_after" -gt "$observed_before" ] || die "L6 bridge observed counter did not advance"
[ "$rejected_after" -eq "$rejected_before" ] || die "L6 bridge rejected counter changed during accepted reference execution"
pass "L6 consequence path PASS · guarded ${guarded_before} → ${guarded_after} · observed ${observed_before} → ${observed_after} · rejected unchanged"

ledger_after="$(wc -l <"$LEDGER" | tr -d ' ')"
[ "$ledger_after" -eq $((ledger_before + 1)) ] || die "D08 reference adapter did not execute exactly one local consequence"
CONSEQUENCE_ID="$consequence_id" LEDGER="$LEDGER" node <<'NODE'
const fs=require("node:fs");
const rows=fs.readFileSync(process.env.LEDGER,"utf8").trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const row=rows.find(x=>x.consequenceId===process.env.CONSEQUENCE_ID);
if(!row)throw new Error("accepted D08 consequence is missing from the reference ledger");
if(row.contentStored!==false||!/^sha256:[a-f0-9]{64}$/i.test(String(row.contextDigest||"")))throw new Error("D08 ledger privacy contract failed");
for(const forbidden of ["prompt","messages","content","input","output","requestBody","responseBody"])if(Object.hasOwn(row,forbidden))throw new Error(`raw field persisted: ${forbidden}`);
NODE
pass "reference adapter privacy ledger PASS · exactly one digest-only consequence"

info "Wait for exact L6 pre-Gate + post-observe trajectory"
trajectory_ok=0
for attempt in $(seq 1 25); do
  set +e
  scaniom trajectory show "$correlation_id" --limit 500 --json >"$TRAJECTORY_FILE" 2>/dev/null
  trajectory_rc=$?
  set -e
  if [ "$trajectory_rc" -eq 0 ] && node - "$TRAJECTORY_FILE" "$pre_behavior" "$post_behavior" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,preId,postId,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8"));
const events=x.events||[];
const pre=events.find(e=>e.behaviorEventId===preId);
const post=events.find(e=>e.behaviorEventId===postId);
const ok=pre&&post
  &&pre.workloadId===workloadId&&post.workloadId===workloadId
  &&String(pre.attachmentSource||"").toLowerCase()==="provider_native"
  &&String(post.attachmentSource||"").toLowerCase()==="provider_native"
  &&String(pre.actionType||"").toLowerCase()==="custom_action"
  &&String(post.actionType||"").toLowerCase()==="custom_action"
  &&String(pre.executionPhase||"").toLowerCase()==="pre"
  &&String(post.executionPhase||"").toLowerCase()==="post"
  &&post.parentBehaviorEventId===preId;
process.exit(ok?0:1);
NODE
  then
    trajectory_ok=1
    break
  fi
  info "Waiting for selected-workload L6 pre/post trajectory ($attempt/25)"
  sleep 1
done
[ "$trajectory_ok" -eq 1 ] || die "D08 consequence executed but exact provider_native pre/post trajectory did not reach Control"
pass "E1 trajectory PASS · provider_native · custom_action · pre + post · parent lineage"

info "Wait for exact E2 correlated L6 proof and verify its signature"
proof_ok=0
for attempt in $(seq 1 25); do
  set +e
  scaniom proof correlated verify "$correlation_id" --json >"$PROOF_FILE" 2>/dev/null
  proof_rc=$?
  set -e
  if [ "$proof_rc" -eq 0 ] && node - "$PROOF_FILE" "$correlation_id" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,correlationId,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8")),p=x.verification?.payload||{};
const levels=(p.attachmentLevels||[]).map(v=>String(v).toLowerCase());
const sources=(p.attachmentSources||[]).map(v=>String(v).toLowerCase());
const ok=x.verification?.valid===true
  &&String(x.item?.correlationId||p.correlationId||"")===correlationId
  &&p.workloadId===workloadId
  &&Number(p.eventCount||0)>=2
  &&levels.includes("l6")
  &&sources.includes("provider_native");
process.exit(ok?0:1);
NODE
  then
    proof_ok=1
    break
  fi
  info "Waiting for valid signed L6 correlated proof ($attempt/25)"
  sleep 1
done
[ "$proof_ok" -eq 1 ] || die "D08 L6 trajectory exists but no valid L6 correlated proof was available"

node - "$PROOF_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8")),p=x.verification?.payload||{};
console.log(`✓ E2 signed proof ${x.item?.proofId||"verified"} · VALID · ${(p.attachmentLevels||[]).map(v=>String(v).toUpperCase()).join("+")} · ${p.eventCount||0} events`);
NODE

unset runtime_token bootstrap_token SCANIOM_RUNTIME_TOKEN || true

info "Render accepted D08 evidence from the released CLI"
scaniom attach status --workload "$WORKLOAD"
scaniom live --env "$ENV_NAME" --workload "$WORKLOAD" --limit 20
scaniom trajectory show "$correlation_id" --limit 500
scaniom proof correlated verify "$correlation_id"

echo
echo "=============================================================="
echo " OPEN IMMUNE · D08 L6 PROVIDER NATIVE REAL EXECUTION PASS"
echo "=============================================================="
pass "released Scaniom 0.4.2 L6 bridge only"
pass "explicit least-privilege L6 runtime identity"
pass "real custom provider-native adapter identity"
pass "metadata/digest-only context boundary"
pass "Gate before one real safe adapter consequence"
pass "post-consequence observation with causal parent"
pass "provider_native pre + post trajectory"
pass "VALID L6 correlated signed proof"
pass "no bundled/vendor privileged adapter claim"
