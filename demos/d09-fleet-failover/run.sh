#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
PRIMARY_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
SECONDARY_NAME="${SCANIOM_D09_SECONDARY_NODE:-open-immune-d09-node-02}"
SECONDARY_PORT="${SCANIOM_D09_SECONDARY_PORT:-8788}"
SECONDARY_URL="http://127.0.0.1:${SECONDARY_PORT}"
SECONDARY_STATE="${SCANIOM_D09_SECONDARY_STATE_DIR:-$HOME/.scaniom/nodes/open-immune-d09-node-02}"
POOL_NAME="${SCANIOM_D09_POOL:-open-immune-d09-pool}"

STATE_DIR="$ROOT/.demo/d09"
TMP_DIR="$STATE_DIR/tmp"
SDK_DIR="$STATE_DIR/typescript"
LEDGER="$STATE_DIR/failover-ledger.jsonl"
RECEIPT_DIR="$ROOT/.demo/receipts"
RECEIPT="$RECEIPT_DIR/d09-fleet-failover.json"
BEFORE_RESULT="$TMP_DIR/before.json"
AFTER_RESULT="$TMP_DIR/after.json"
TRAJECTORY_FILE="$TMP_DIR/trajectory.json"
PROOF_FILE="$TMP_DIR/proof.json"

mkdir -p "$TMP_DIR" "$SDK_DIR" "$RECEIPT_DIR"
chmod 700 "$STATE_DIR" "$TMP_DIR" "$SDK_DIR" "$RECEIPT_DIR" 2>/dev/null || true

secondary_node_id=""
pool_id=""
secondary_stopped=0
secondary_routing_disabled=0

scaniom_at() {
  local url="$1"; shift
  SCANIOM_NODE_URL="$url" scaniom "$@"
}

secondary_health() {
  SECONDARY_URL="$SECONDARY_URL" SECONDARY_NODE_ID="$secondary_node_id" node <<'NODE'
(async()=>{
  try {
    const response=await fetch(`${process.env.SECONDARY_URL}/health`,{signal:AbortSignal.timeout(1200),cache:"no-store"});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.service!=="scaniom-node")process.exit(2);
    if(process.env.SECONDARY_NODE_ID&&body.nodeId!==process.env.SECONDARY_NODE_ID)process.exit(3);
    process.stdout.write(JSON.stringify(body));
  } catch { process.exit(1); }
})()
NODE
}

restore_secondary() {
  set +e
  if [ "$secondary_stopped" -eq 1 ] && [ -n "$secondary_node_id" ] && [ -f "$SECONDARY_STATE/state.json" ]; then
    info "Recovery: restart the same D09 secondary Node"
    SCANIOM_NODE_URL="$SECONDARY_URL" scaniom node start \
      --background \
      --state-dir "$SECONDARY_STATE" \
      --port "$SECONDARY_PORT" >/dev/null 2>&1
    for _ in $(seq 1 30); do
      if secondary_health >/dev/null 2>&1; then
        secondary_stopped=0
        break
      fi
      sleep 0.5
    done
  fi
  if [ "$secondary_routing_disabled" -eq 1 ] && [ -n "$pool_id" ] && [ -n "$secondary_node_id" ]; then
    info "Recovery: restore D09 secondary routing authority"
    scaniom fabric routing node \
      --env "$ENV_NAME" \
      --pool "$pool_id" \
      --node "$secondary_node_id" \
      --endpoint "$SECONDARY_URL" \
      --state active \
      --weight 100 >/dev/null 2>&1
    secondary_routing_disabled=0
  fi
  set -e
}

cleanup() {
  restore_secondary
}
trap cleanup EXIT INT TERM

"$ROOT/scripts/ensure-scope.sh"

info "Verify the existing primary Node; D09 never re-enrolls or replaces it"
primary_health="$(scaniom_at "$PRIMARY_URL" node health)"
printf '%s\n' "$primary_health"
primary_node_id="$(PRIMARY_URL="$PRIMARY_URL" node <<'NODE'
(async()=>{
  const response=await fetch(`${process.env.PRIMARY_URL}/health?sync=1`,{signal:AbortSignal.timeout(5000),cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||body.service!=="scaniom-node"||!body.nodeId)throw new Error("primary Scaniom Node health contract failed");
  process.stdout.write(body.nodeId);
})().catch(error=>{console.error(error.message);process.exit(1)})
NODE
)"
[ -n "$primary_node_id" ] || die "D09 could not resolve the existing primary Node identity"
pass "primary Node authority PASS · $primary_node_id · $PRIMARY_URL"

fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
selected_environment_id="$(FABRIC="$fabric_json" node <<'NODE'
const x=JSON.parse(process.env.FABRIC);
if(!x.selectedEnvironmentId)process.exit(2);
process.stdout.write(x.selectedEnvironmentId);
NODE
)"
primary_environment_id="$(PRIMARY_URL="$PRIMARY_URL" node <<'NODE'
(async()=>{
  const response=await fetch(`${process.env.PRIMARY_URL}/health`,{signal:AbortSignal.timeout(1500)});
  const body=await response.json();
  if(!body.environmentId)process.exit(2);
  process.stdout.write(body.environmentId);
})().catch(()=>process.exit(1))
NODE
)"
[ "$selected_environment_id" = "$primary_environment_id" ] || die "primary Node does not belong to selected D09 environment"

control_secondary_id="$(FABRIC="$fabric_json" SECONDARY_NAME="$SECONDARY_NAME" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),name=process.env.SECONDARY_NAME;
const rows=(x.nodes||[]).filter(n=>n.name===name||n.slug===name);
if(rows.length>1)throw new Error(`ambiguous D09 secondary Node ${name}`);
process.stdout.write(rows[0]?.id||"");
NODE
)"

if [ -n "$control_secondary_id" ]; then
  [ -f "$SECONDARY_STATE/state.json" ] || die "D09 secondary exists in Control but its local durable state is missing: $SECONDARY_STATE"
  local_secondary_id="$(node - "$SECONDARY_STATE/state.json" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
process.stdout.write(String(x.nodeId||""));
NODE
)"
  [ "$local_secondary_id" = "$control_secondary_id" ] || die "D09 secondary local state does not match Control Node identity"
  secondary_node_id="$control_secondary_id"
  if ! secondary_health >/dev/null 2>&1; then
    info "Start existing durable D09 secondary Node · $SECONDARY_URL"
    SCANIOM_NODE_URL="$SECONDARY_URL" scaniom node start \
      --background \
      --state-dir "$SECONDARY_STATE" \
      --port "$SECONDARY_PORT"
  else
    info "Reuse existing healthy D09 secondary Node · $SECONDARY_URL"
  fi
else
  if [ -f "$SECONDARY_STATE/state.json" ]; then
    stale_id="$(node - "$SECONDARY_STATE/state.json" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
process.stdout.write(String(x.nodeId||"unknown"));
NODE
)"
    die "local D09 secondary state already exists for Node $stale_id but that Node is not active in Control; refusing duplicate enrollment"
  fi
  info "Enroll exactly one additional durable Node for the two-member D09 fleet"
  SCANIOM_NODE_URL="$SECONDARY_URL" scaniom node enroll "$SECONDARY_NAME" \
    --env "$ENV_NAME" \
    --background \
    --state-dir "$SECONDARY_STATE" \
    --port "$SECONDARY_PORT"

  fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
  secondary_node_id="$(FABRIC="$fabric_json" SECONDARY_NAME="$SECONDARY_NAME" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),name=process.env.SECONDARY_NAME;
const row=(x.nodes||[]).find(n=>n.name===name||n.slug===name);
if(!row?.id)process.exit(2);
process.stdout.write(row.id);
NODE
)"
fi

secondary_ready=0
for attempt in $(seq 1 30); do
  if secondary_health >/dev/null 2>&1; then secondary_ready=1; break; fi
  info "Waiting for D09 secondary Node health ($attempt/30)"
  sleep 0.5
done
[ "$secondary_ready" -eq 1 ] || die "D09 secondary Node did not become healthy"
pass "two real Nodes ONLINE · primary $PRIMARY_URL · secondary $SECONDARY_URL"

info "Create or converge the persisted D1 Node pool"
pools_json="$(scaniom fabric pools --env "$ENV_NAME" --json)"
pool_id="$(POOLS="$pools_json" POOL_NAME="$POOL_NAME" node <<'NODE'
const pools=JSON.parse(process.env.POOLS),ref=process.env.POOL_NAME.toLowerCase();
const row=(pools||[]).find(p=>[p.id,p.slug,p.name].some(v=>String(v||"").toLowerCase()===ref));
process.stdout.write(row?.id||"");
NODE
)"

if [ -z "$pool_id" ]; then
  pool_json="$(scaniom fabric pool create \
    --env "$ENV_NAME" \
    --name "$POOL_NAME" \
    --desired 2 \
    --min 1 \
    --max 5 \
    --capabilities l1,l2,l4 \
    --nodes "$primary_node_id,$secondary_node_id" \
    --json)"
  pool_id="$(POOL="$pool_json" node -e 'const x=JSON.parse(process.env.POOL); if(!x.id)process.exit(2); process.stdout.write(x.id)')"
else
  scaniom fabric pool update \
    --env "$ENV_NAME" \
    --pool "$pool_id" \
    --desired 2 \
    --min 1 \
    --max 5 \
    --capabilities l1,l2,l4 \
    --json >/dev/null
  scaniom fabric pool members \
    --env "$ENV_NAME" \
    --pool "$pool_id" \
    --nodes "$primary_node_id,$secondary_node_id" \
    --json >/dev/null
fi

pool_json="$(scaniom fabric pools --env "$ENV_NAME" --json)"
POOL_ID="$pool_id" PRIMARY_ID="$primary_node_id" SECONDARY_ID="$secondary_node_id" POOLS="$pool_json" node <<'NODE'
const pools=JSON.parse(process.env.POOLS);
const pool=pools.find(p=>p.id===process.env.POOL_ID);
if(!pool)throw new Error("D09 pool missing after convergence");
const members=pool.members||[];
for(const id of [process.env.PRIMARY_ID,process.env.SECONDARY_ID]){
  const m=members.find(x=>x.nodeId===id);
  if(!m)throw new Error(`D09 pool missing member ${id}`);
  if(m.state!=="online"||m.eligible!==true)throw new Error(`D09 member ${m.name||id} is not online/eligible`);
}
if(Number(pool.memberCount)<2||Number(pool.onlineCount)<2||Number(pool.eligibleCount)<2)throw new Error("D09 pool is not two-member healthy/eligible");
NODE
pass "D1 persisted Node pool PASS · $POOL_NAME · 2 healthy eligible members"

info "Converge the workload Runtime Contract to shared B1 L1/L2/L4 authority"
fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
needs_contract="$(FABRIC="$fabric_json" WORKLOAD="$WORKLOAD" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),ref=process.env.WORKLOAD.toLowerCase();
const w=(x.workloads||[]).find(v=>[v.id,v.slug,v.name].some(k=>String(k||"").toLowerCase()===ref));
if(!w)throw new Error(`workload not found: ${process.env.WORKLOAD}`);
const a=(w.contract?.attachmentPlan||[]).map(v=>String(v).toLowerCase()).sort();
const wanted=["l1","l2","l4"];
const match=a.length===wanted.length&&wanted.every((v,i)=>a[i]===v)&&w.placement?.strategy==="shared_pool";
process.stdout.write(match?"0":"1");
NODE
)"
if [ "$needs_contract" = "1" ]; then
  scaniom fabric configure workload \
    --workload "$WORKLOAD" \
    --attachments l1,l2,l4 \
    --node-strategy shared_pool >/dev/null
else
  pass "Runtime Contract already matches L1/L2/L4 shared-pool authority"
fi

scaniom fabric workload pools \
  --workload "$WORKLOAD" \
  --pools "$pool_id" \
  --json >/dev/null

scaniom fabric routing node \
  --env "$ENV_NAME" --pool "$pool_id" --node "$primary_node_id" \
  --endpoint "$PRIMARY_URL" --state active --weight 100 --json >/dev/null
scaniom fabric routing node \
  --env "$ENV_NAME" --pool "$pool_id" --node "$secondary_node_id" \
  --endpoint "$SECONDARY_URL" --state active --weight 100 --json >/dev/null

fabric_json="$(scaniom fabric --env "$ENV_NAME" --json)"
read -r workload_id binding_pool_id <<<"$(FABRIC="$fabric_json" WORKLOAD="$WORKLOAD" POOL_ID="$pool_id" node <<'NODE'
const x=JSON.parse(process.env.FABRIC),ref=process.env.WORKLOAD.toLowerCase(),poolId=process.env.POOL_ID;
const w=(x.workloads||[]).find(v=>[v.id,v.slug,v.name].some(k=>String(k||"").toLowerCase()===ref));
if(!w)throw new Error("selected workload missing from Fabric snapshot");
const binding=(w.poolBindings||[]).find(b=>b.poolId===poolId);
if(!binding)throw new Error("selected workload is not bound to D09 pool");
if(Number(binding.workloadEligibleCount)<2)throw new Error("D09 workload does not have two eligible pool members");
process.stdout.write(`${w.id} ${binding.poolId}`);
NODE
)"
[ "$binding_pool_id" = "$pool_id" ] || die "D2 workload pool binding mismatch"
pass "D2 workload → pool binding PASS · $workload_id → $pool_id"

decode_runtime_token() {
  TOKEN="$1" node <<'NODE'
const token=String(process.env.TOKEN||"");
if(!token.startsWith("scn_ri_v1."))process.exit(2);
const p=token.split(".");
if(p.length!==3)process.exit(2);
try{process.stdout.write(JSON.stringify(JSON.parse(Buffer.from(p[1],"base64url").toString("utf8"))))}catch{process.exit(2)}
NODE
}

runtime_token=""
if [ -n "${SCANIOM_RUNTIME_TOKEN:-}" ]; then
  set +e
  claims_json="$(decode_runtime_token "$SCANIOM_RUNTIME_TOKEN" 2>/dev/null)"
  token_rc=$?
  set -e
  if [ "$token_rc" -eq 0 ] && CLAIMS="$claims_json" WORKLOAD_ID="$workload_id" node <<'NODE' >/dev/null 2>&1
const c=JSON.parse(process.env.CLAIMS),a=(c.attachments||[]).map(v=>String(v).toLowerCase());
const ok=c.workloadId===process.env.WORKLOAD_ID
  &&["l1","l2","l4"].every(v=>a.includes(v))
  &&Date.parse(c.expiresAt)>Date.now()+30_000;
process.exit(ok?0:1);
NODE
  then
    current_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
    if CLAIMS="$claims_json" CURRENT="$current_json" node <<'NODE' >/dev/null 2>&1
const c=JSON.parse(process.env.CLAIMS),i=JSON.parse(process.env.CURRENT).identity||{},a=(i.attachments||[]).map(v=>String(v).toLowerCase());
process.exit(i.status==="active"&&i.workloadId===c.workloadId&&Number(i.generation)===Number(c.generation)&&["l1","l2","l4"].every(v=>a.includes(v))?0:1);
NODE
    then runtime_token="$SCANIOM_RUNTIME_TOKEN"; info "Reuse supplied current shared B1 runtime identity"; fi
  fi
fi

if [ -z "$runtime_token" ]; then
  info "Create one copy-once shared B1 bootstrap for L1/L2/L4 and exchange through the primary Node"
  bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments l1,l2,l4 --json)"
  bootstrap_token="$(BOOTSTRAP="$bootstrap_json" node -e 'const x=JSON.parse(process.env.BOOTSTRAP); if(!String(x.bootstrapToken||"").startsWith("scn_rib_"))process.exit(2); process.stdout.write(x.bootstrapToken)')"
  exchange_json="$(BOOTSTRAP_TOKEN="$bootstrap_token" NODE_URL="$PRIMARY_URL" node <<'NODE'
(async()=>{
  const r=await fetch(`${process.env.NODE_URL}/v1/runtime/identity/exchange`,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({bootstrapToken:process.env.BOOTSTRAP_TOKEN}),
    signal:AbortSignal.timeout(20_000),
  });
  const x=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(x?.error?.message||`identity exchange HTTP ${r.status}`);
  process.stdout.write(JSON.stringify(x));
})().catch(e=>{console.error(e.message);process.exit(1)})
NODE
)"
  runtime_token="$(EXCHANGE="$exchange_json" node -e 'const x=JSON.parse(process.env.EXCHANGE); const t=String(x.credential?.token||""); if(!t.startsWith("scn_ri_v1."))process.exit(2); process.stdout.write(t)')"
  unset bootstrap_json bootstrap_token exchange_json
fi

claims_json="$(decode_runtime_token "$runtime_token")"
generation="$(CLAIMS="$claims_json" node -e 'const c=JSON.parse(process.env.CLAIMS);process.stdout.write(String(c.generation||""))')"
[ -n "$generation" ] || die "D09 runtime identity generation missing"

identity_ready=0
for attempt in $(seq 1 16); do
  current_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
  if CURRENT="$current_json" GEN="$generation" WORKLOAD_ID="$workload_id" node <<'NODE' >/dev/null 2>&1
const i=JSON.parse(process.env.CURRENT).identity||{},a=(i.attachments||[]).map(v=>String(v).toLowerCase());
const ok=i.status==="active"&&i.workloadId===process.env.WORKLOAD_ID&&Number(i.generation)===Number(process.env.GEN)&&["l1","l2","l4"].every(v=>a.includes(v));
process.exit(ok?0:1);
NODE
  then identity_ready=1; break; fi
  info "Waiting for shared B1 runtime identity convergence ($attempt/16)"
  scaniom_at "$PRIMARY_URL" node health >/dev/null || true
  scaniom_at "$SECONDARY_URL" node health >/dev/null || true
  sleep 0.5
done
[ "$identity_ready" -eq 1 ] || die "D09 shared B1 runtime identity did not converge"
scaniom_at "$PRIMARY_URL" node health >/dev/null
scaniom_at "$SECONDARY_URL" node health >/dev/null
pass "shared B1 runtime identity PASS · generation $generation · L1+L2+L4"

info "Install/verify the released TypeScript SDK in an isolated D09 runtime directory"
cat >"$SDK_DIR/package.json" <<'JSON'
{"name":"open-immune-d09-fleet-client","private":true,"type":"module"}
JSON
cp "$ROOT/demos/d09-fleet-failover/reference-client.mjs" "$SDK_DIR/reference-client.mjs"
(
  cd "$SDK_DIR"
  npm install --ignore-scripts --no-audit --no-fund --package-lock=false "@scaniom/sdk@${SCANIOM_VERSION}"
  node --input-type=module -e "import {SCANIOM_SDK_VERSION} from '@scaniom/sdk'; if(SCANIOM_SDK_VERSION!=='${SCANIOM_VERSION}') process.exit(2)"
)
pass "public @scaniom/sdk@${SCANIOM_VERSION} multi-Node client verified"

control_route_key="$(PRIMARY_ID="$primary_node_id" SECONDARY_ID="$secondary_node_id" node <<'NODE'
const primary=process.env.PRIMARY_ID,secondary=process.env.SECONDARY_ID;
function hash(value){let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0}
function score(key,id){const u=(hash(`${key}\0${id}`)+1)/4294967297;return -Math.log(u)/100}
for(let i=0;i<20000;i++){
  const key=`open-immune-d09-control-${i}`;
  if(score(key,secondary)<score(key,primary)){process.stdout.write(key);process.exit(0)}
}
process.exit(2)
NODE
)"
[ -n "$control_route_key" ] || die "could not derive deterministic D3 route key preferring the secondary Node"

preview_one="$(scaniom fabric routing preview --workload "$WORKLOAD" --key "$control_route_key" --json)"
preview_two="$(scaniom fabric routing preview --workload "$WORKLOAD" --key "$control_route_key" --json)"
PREVIEW_ONE="$preview_one" PREVIEW_TWO="$preview_two" SECONDARY_ID="$secondary_node_id" node <<'NODE'
const a=JSON.parse(process.env.PREVIEW_ONE),b=JSON.parse(process.env.PREVIEW_TWO),secondary=process.env.SECONDARY_ID;
for(const x of [a,b]){
  if(x.version!=="scaniom-r18-d3-health-routing-failover-v1")throw new Error("wrong D3 routing contract");
  if(x.strategy!=="weighted_rendezvous"||x.retryPolicy!=="pre_dispatch_health_failover_no_ambiguous_replay")throw new Error("wrong D3 strategy/retry policy");
  if(x.ready!==true||x.redundant!==true||Number(x.readyCandidates)<2)throw new Error("D3 plan is not redundant");
  if(x.selectedNodeId!==secondary)throw new Error(`D3 key did not select secondary Node: ${x.selectedNodeId}`);
}
const ranks=x=>JSON.stringify((x.candidates||[]).map(v=>[v.nodeId,v.state,v.rank,v.endpoint]));
if(a.selectedNodeId!==b.selectedNodeId||ranks(a)!==ranks(b))throw new Error("same D3 route key did not produce a stable topology ordering");
NODE
pass "D3 deterministic Control routing PASS · same key → same selected Node · $secondary_node_id"

sdk_session="$(WORKLOAD_ID="$workload_id" PRIMARY_URL="$PRIMARY_URL" SECONDARY_URL="$SECONDARY_URL" node <<'NODE'
const workload=process.env.WORKLOAD_ID,primary=process.env.PRIMARY_URL,secondary=process.env.SECONDARY_URL;
function hash(value){let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0}
function score(key,url){const u=(hash(`${key}\0${url}`)+1)/4294967297;return -Math.log(u)/100}
const stamp=Date.now();
for(let i=0;i<20000;i++){
  const session=`open-ii-d09-runtime-${i}-${stamp}`;
  const key=`${workload}:${session}`;
  if(score(key,secondary)<score(key,primary)){process.stdout.write(session);process.exit(0)}
}
process.exit(2)
NODE
)"
[ -n "$sdk_session" ] || die "could not derive SDK session preferring the secondary runtime URL"

node_targets="$(PRIMARY_URL="$PRIMARY_URL" SECONDARY_URL="$SECONDARY_URL" node -e 'process.stdout.write(JSON.stringify([{url:process.env.PRIMARY_URL,weight:100},{url:process.env.SECONDARY_URL,weight:100}]))')"

ledger_before=0
if [ -f "$LEDGER" ]; then ledger_before="$(wc -l <"$LEDGER" | tr -d ' ')"; fi

run_reference_client() {
  local phase="$1" out="$2"
  (
    cd "$SDK_DIR"
    SCANIOM_RUNTIME_TOKEN="$runtime_token" \
    SCANIOM_WORKLOAD_ID="$workload_id" \
    SCANIOM_D09_NODE_TARGETS="$node_targets" \
    SCANIOM_D09_SESSION="$sdk_session" \
    SCANIOM_D09_PHASE="$phase" \
    SCANIOM_D09_LEDGER="$LEDGER" \
    SCANIOM_D09_EXPECTED_PREFERRED="$SECONDARY_URL" \
    node reference-client.mjs >"$out"
  )
}

info "Execute protected L2 action while the preferred secondary Node is healthy"
run_reference_client "before-failure" "$BEFORE_RESULT"
read -r before_behavior correlation_id before_consequence <<<"$(node - "$BEFORE_RESULT" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
if(x.ok!==true||x.phase!=="before-failure")throw new Error("before-failure client result failed");
if(!x.behaviorEventId||!x.correlationId||!x.consequenceId)throw new Error("before-failure client result missing evidence");
process.stdout.write(`${x.behaviorEventId} ${x.correlationId} ${x.consequenceId}`);
NODE
)"
pass "protected pre-failure action PASS · correlation $correlation_id"

# The before-failure action is intentionally executed by the secondary Node. Do not
# take that Node offline until its complete L2 pre/post pair is already durable in
# Control; otherwise a successful local action can leave its evidence buffered on
# the very member D09 is about to stop.
info "Confirm pre-failure L2 evidence is durable in Control before stopping the secondary Node"
before_evidence_ok=0
for attempt in $(seq 1 30); do
  set +e
  scaniom trajectory show "$correlation_id" --limit 500 --json >"$TRAJECTORY_FILE" 2>/dev/null
  before_trajectory_rc=$?
  set -e
  if [ "$before_trajectory_rc" -eq 0 ] && node - "$TRAJECTORY_FILE" "$before_behavior" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,beforePre,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8")),events=x.events||[];
const l2=events.filter(e=>e.workloadId===workloadId&&String(e.attachmentSource||"").toLowerCase()==="sdk"&&String(e.actionType||"").toLowerCase()==="agent_action");
const beforeBarrierPre=l2.find(e=>e.behaviorEventId===beforePre&&String(e.executionPhase||"").toLowerCase()==="pre");
const beforeBarrierPost=l2.find(e=>String(e.executionPhase||"").toLowerCase()==="post"&&e.parentBehaviorEventId===beforePre);
process.exit(beforeBarrierPre&&beforeBarrierPost?0:1);
NODE
  then
    before_evidence_ok=1
    break
  fi

  # Keep the evidence-owning Node online and give its normal Control sync/replay
  # path another opportunity before checking again.
  scaniom_at "$SECONDARY_URL" node health >/dev/null 2>&1 || true
  info "Waiting for pre-failure L2 evidence durability ($attempt/30)"
  sleep 1
done
[ "$before_evidence_ok" -eq 1 ] || die "D09 before-failure action completed but its L2 pre/post evidence did not reach Control; refusing to stop evidence-owning Node"
pass "pre-failure evidence durability barrier PASS · L2 pre + post visible in Control"

info "Stop only the D09-owned secondary Node; primary :8787 remains untouched"
SCANIOM_NODE_URL="$SECONDARY_URL" scaniom node stop \
  --state-dir "$SECONDARY_STATE" \
  --port "$SECONDARY_PORT"
secondary_stopped=1

down_confirmed=0
for attempt in $(seq 1 20); do
  if ! secondary_health >/dev/null 2>&1; then down_confirmed=1; break; fi
  info "Waiting for secondary Node to stop ($attempt/20)"
  sleep 0.25
done
[ "$down_confirmed" -eq 1 ] || die "secondary Node remained reachable after stop"
pass "physical Node health loss confirmed · $SECONDARY_URL unavailable"

info "Execute a new protected action with the same preferred route key; SDK must health-probe before dispatch"
run_reference_client "after-failover" "$AFTER_RESULT"
read -r after_behavior after_correlation after_consequence <<<"$(node - "$AFTER_RESULT" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
if(x.ok!==true||x.phase!=="after-failover")throw new Error("after-failover client result failed");
if(!x.behaviorEventId||!x.correlationId||!x.consequenceId)throw new Error("after-failover result missing evidence");
process.stdout.write(`${x.behaviorEventId} ${x.correlationId} ${x.consequenceId}`);
NODE
)"
[ "$after_correlation" = "$correlation_id" ] || die "failover action did not preserve the same correlated session"
[ "$after_consequence" != "$before_consequence" ] || die "failover action reused the first consequence identity"
pass "runtime health failover PASS · preferred $SECONDARY_URL down → protected action completed through surviving $PRIMARY_URL"

ledger_after="$(wc -l <"$LEDGER" | tr -d ' ')"
[ "$ledger_after" -eq $((ledger_before + 2)) ] || die "D09 consequence ledger must grow by exactly two explicit actions"
BEFORE="$before_consequence" AFTER="$after_consequence" LEDGER="$LEDGER" node <<'NODE'
const fs=require("node:fs"),rows=fs.readFileSync(process.env.LEDGER,"utf8").trim().split(/\n+/).filter(Boolean).map(JSON.parse);
for(const id of [process.env.BEFORE,process.env.AFTER]){
  const count=rows.filter(r=>r.consequenceId===id).length;
  if(count!==1)throw new Error(`consequence ${id} occurred ${count} times`);
}
NODE
pass "no ambiguous consequence replay PASS · exactly two requested consequences, each executed once"

info "Update authoritative D3 topology after confirmed member failure"
scaniom fabric routing node \
  --env "$ENV_NAME" \
  --pool "$pool_id" \
  --node "$secondary_node_id" \
  --endpoint "$SECONDARY_URL" \
  --state disabled \
  --weight 100 \
  --json >/dev/null
secondary_routing_disabled=1

preview_failed="$(scaniom fabric routing preview --workload "$WORKLOAD" --key "$control_route_key" --json)"
PREVIEW="$preview_failed" PRIMARY_ID="$primary_node_id" SECONDARY_ID="$secondary_node_id" node <<'NODE'
const x=JSON.parse(process.env.PREVIEW);
if(x.ready!==true||x.failClosed!==false||Number(x.readyCandidates)!==1)throw new Error("D3 did not retain one ready survivor");
if(x.selectedNodeId!==process.env.PRIMARY_ID)throw new Error(`D3 did not remap to primary survivor: ${x.selectedNodeId}`);
const failed=(x.candidates||[]).find(v=>v.nodeId===process.env.SECONDARY_ID);
if(!failed||failed.state!=="disabled")throw new Error("failed member is not explicitly disabled in D3 topology");
NODE
pass "authoritative D3 remap PASS · failed member disabled · survivor selected"

info "Wait for one correlated L2 trajectory spanning before and after failover"
trajectory_ok=0
for attempt in $(seq 1 30); do
  set +e
  scaniom trajectory show "$correlation_id" --limit 500 --json >"$TRAJECTORY_FILE" 2>/dev/null
  trajectory_rc=$?
  set -e
  if [ "$trajectory_rc" -eq 0 ] && node - "$TRAJECTORY_FILE" "$before_behavior" "$after_behavior" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,beforePre,afterPre,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8")),events=x.events||[];
const l2=events.filter(e=>e.workloadId===workloadId&&String(e.attachmentSource||"").toLowerCase()==="sdk"&&String(e.actionType||"").toLowerCase()==="agent_action");
const before=l2.find(e=>e.behaviorEventId===beforePre&&e.executionPhase==="pre");
const after=l2.find(e=>e.behaviorEventId===afterPre&&e.executionPhase==="pre");
const beforePost=l2.find(e=>e.executionPhase==="post"&&e.parentBehaviorEventId===beforePre);
const afterPost=l2.find(e=>e.executionPhase==="post"&&e.parentBehaviorEventId===afterPre);
process.exit(before&&after&&beforePost&&afterPost&&l2.length>=4?0:1);
NODE
  then trajectory_ok=1; break; fi
  info "Waiting for before+after L2 trajectory ($attempt/30)"
  sleep 1
done
[ "$trajectory_ok" -eq 1 ] || die "D09 actions executed but the four-event L2 failover trajectory did not reach Control"
pass "E1 trajectory PASS · SDK pre/post before failure + SDK pre/post after failover · one correlated session"

info "Wait for the signed correlated proof to include all four protected events"
proof_ok=0
for attempt in $(seq 1 30); do
  set +e
  scaniom proof correlated verify "$correlation_id" --json >"$PROOF_FILE" 2>/dev/null
  proof_rc=$?
  set -e
  if [ "$proof_rc" -eq 0 ] && node - "$PROOF_FILE" "$correlation_id" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,corr,workload]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8")),p=x.verification?.payload||{};
const levels=(p.attachmentLevels||[]).map(v=>String(v).toLowerCase());
const sources=(p.attachmentSources||[]).map(v=>String(v).toLowerCase());
const ok=x.verification?.valid===true
  &&String(x.item?.correlationId||p.correlationId||"")===corr
  &&p.workloadId===workload
  &&Number(p.eventCount||0)>=4
  &&levels.includes("l2")
  &&sources.includes("sdk");
process.exit(ok?0:1);
NODE
  then proof_ok=1; break; fi
  info "Waiting for valid four-event failover proof ($attempt/30)"
  sleep 1
done
[ "$proof_ok" -eq 1 ] || die "D09 trajectory exists but its four-event L2 correlated proof is not yet valid"

proof_id="$(node - "$PROOF_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const id=String(x.item?.proofId||"");
if(!id)process.exit(2);
process.stdout.write(id);
NODE
)"
pass "E2 signed proof PASS · $proof_id · VALID · L2 · 4+ events"

info "Restore the same secondary Node and return the pool to healthy redundant routing"
SCANIOM_NODE_URL="$SECONDARY_URL" scaniom node start \
  --background \
  --state-dir "$SECONDARY_STATE" \
  --port "$SECONDARY_PORT" >/dev/null
secondary_stopped=0

secondary_ready=0
for attempt in $(seq 1 30); do
  if secondary_health >/dev/null 2>&1; then secondary_ready=1; break; fi
  info "Waiting for restored secondary Node health ($attempt/30)"
  sleep 0.5
done
[ "$secondary_ready" -eq 1 ] || die "secondary Node did not recover"

scaniom fabric routing node \
  --env "$ENV_NAME" \
  --pool "$pool_id" \
  --node "$secondary_node_id" \
  --endpoint "$SECONDARY_URL" \
  --state active \
  --weight 100 \
  --json >/dev/null
secondary_routing_disabled=0

restored_preview="$(scaniom fabric routing preview --workload "$WORKLOAD" --key "$control_route_key" --json)"
RESTORED="$restored_preview" SECONDARY_ID="$secondary_node_id" node <<'NODE'
const x=JSON.parse(process.env.RESTORED);
if(x.ready!==true||x.redundant!==true||Number(x.readyCandidates)<2)throw new Error("restored D3 plan is not redundant");
if(x.selectedNodeId!==process.env.SECONDARY_ID)throw new Error("restored deterministic route did not return to the preferred secondary Node");
NODE
pass "fleet restoration PASS · two healthy candidates · deterministic route restored"

mkdir -p "$RECEIPT_DIR"
chmod 700 "$RECEIPT_DIR" 2>/dev/null || true
RECEIPT="$RECEIPT" \
ENVIRONMENT_ID="$selected_environment_id" \
WORKLOAD_ID="$workload_id" \
POOL_ID="$pool_id" \
CONTROL_ROUTE_KEY="$control_route_key" \
SDK_SESSION="$sdk_session" \
FAILED_NODE_ID="$secondary_node_id" \
FAILOVER_NODE_ID="$primary_node_id" \
CORRELATION_ID="$correlation_id" \
PROOF_ID="$proof_id" \
node <<'NODE'
const fs=require("node:fs");
const receipt={
  version:1,
  labId:"d09-fleet-failover",
  status:"pass",
  release:"R18",
  scaniomVersion:"0.4.2",
  verifiedAt:new Date().toISOString(),
  environmentId:process.env.ENVIRONMENT_ID,
  workloadId:process.env.WORKLOAD_ID,
  poolId:process.env.POOL_ID,
  controlRouteKey:process.env.CONTROL_ROUTE_KEY,
  sdkSession:process.env.SDK_SESSION,
  failedNodeId:process.env.FAILED_NODE_ID,
  failoverNodeId:process.env.FAILOVER_NODE_ID,
  correlationId:process.env.CORRELATION_ID,
  proofId:process.env.PROOF_ID,
  checks:{
    twoRealNodes:true,
    poolBound:true,
    deterministicRouting:true,
    healthFailover:true,
    protectedBefore:true,
    protectedAfter:true,
    validProof:true,
    noReplay:true,
    restored:true,
  },
};
const tmp=`${process.env.RECEIPT}.${process.pid}.tmp`;
fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+"\n",{mode:0o600});
fs.renameSync(tmp,process.env.RECEIPT);
NODE
pass "D09 local execution receipt written · ${RECEIPT#$ROOT/}"

unset runtime_token claims_json SCANIOM_RUNTIME_TOKEN || true

info "Render accepted D09 fabric/evidence from the released CLI"
scaniom fabric pools --env "$ENV_NAME"
scaniom fabric routing preview --workload "$WORKLOAD" --key "$control_route_key"
scaniom fleet --env "$ENV_NAME"
scaniom trajectory show "$correlation_id" --limit 500
scaniom proof correlated verify "$correlation_id"

echo
echo "=============================================================="
echo " OPEN IMMUNE · D09 FLEET + FAILOVER REAL EXECUTION PASS"
echo "=============================================================="
pass "two real enrolled Nodes · $PRIMARY_URL + $SECONDARY_URL"
pass "persisted D1 Node pool · two healthy eligible members"
pass "D2 workload → pool binding"
pass "shared B1 L1/L2/L4 runtime identity"
pass "deterministic D3 Control route stable before topology change"
pass "physical secondary Node health failure detected before new dispatch"
pass "released SDK failed over to the surviving healthy Node"
pass "no ambiguous consequence replay"
pass "authoritative D3 plan remapped after failed member was disabled"
pass "protection continued before + after routing change"
pass "one four-event L2 correlated trajectory + VALID signed proof"
pass "secondary Node restored · pool returned to healthy redundant state"
