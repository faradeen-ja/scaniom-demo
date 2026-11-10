#!/usr/bin/env bash
# INTERNAL ENGINEERING / CI ACCEPTANCE HARNESS.
# Normal Open Immune users operate D07 from the Workbench + released standalone Scaniom CLI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/ensure-scope.sh"

ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
NODE_URL="${SCANIOM_NODE_URL:-http://127.0.0.1:8787}"
PORT="${SCANIOM_MCP_PORT:-8793}"
GATEWAY_URL="${SCANIOM_MCP_GATEWAY_URL:-http://127.0.0.1:${PORT}}"
SERVER_ID="${SCANIOM_MCP_SERVER_ID:-open-immune-d07-tools}"
REFERENCE_HOST="${OPEN_II_D07_MCP_HOST:-127.0.0.1}"
REFERENCE_PORT="${OPEN_II_D07_MCP_PORT:-3001}"
REFERENCE_ENDPOINT="http://${REFERENCE_HOST}:${REFERENCE_PORT}/mcp"
MCP_ENDPOINT="${SCANIOM_MCP_ENDPOINT:-$REFERENCE_ENDPOINT}"
TOOL_NAME="${SCANIOM_MCP_TOOL:-open_immune_record}"
TOOL_ARGS="${SCANIOM_MCP_TOOL_ARGS:-{\"message\":\"Open Immune D07 real MCP tool consequence\"}}"
START_REFERENCE="${OPEN_II_D07_START_REFERENCE:-1}"
START_GATEWAY="${SCANIOM_MCP_START_GATEWAY:-1}"
LOG_DIR="$ROOT/.demo/d07"
REFERENCE_LOG="$LOG_DIR/reference-mcp.log"
REFERENCE_PID_FILE="$LOG_DIR/reference-mcp.pid"
GATEWAY_LOG="$LOG_DIR/mcp-gateway.log"
GATEWAY_PID_FILE="$LOG_DIR/mcp-gateway.pid"
TOOL_RESULT_FILE="$LOG_DIR/tool-result.json"
TRAJECTORY_FILE="$LOG_DIR/trajectory.json"
PROOF_FILE="$LOG_DIR/correlated-proof.json"
LEDGER_FILE="$LOG_DIR/reference-mcp-ledger.jsonl"

mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"

runtime_token="${SCANIOM_RUNTIME_TOKEN:-}"
workload_id=""
identity_id=""
token_generation=""
reference_owned=0
gateway_owned=0
session_id="open-ii-d07-mcp-$(date +%s)"

cleanup() {
  unset runtime_token SCANIOM_RUNTIME_TOKEN BOOTSTRAP_TOKEN || true
  rm -f "$TOOL_RESULT_FILE" "$TRAJECTORY_FILE" "$PROOF_FILE" 2>/dev/null || true
  if [ "$gateway_owned" -eq 1 ] && [ -f "$GATEWAY_PID_FILE" ]; then
    local pid
    pid="$(cat "$GATEWAY_PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$GATEWAY_PID_FILE"
  fi
  if [ "$reference_owned" -eq 1 ] && [ -f "$REFERENCE_PID_FILE" ]; then
    local pid
    pid="$(cat "$REFERENCE_PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$REFERENCE_PID_FILE"
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

parse_runtime_token() {
  RUNTIME_TOKEN="$runtime_token" node <<'NODE'
const token=String(process.env.RUNTIME_TOKEN||"");
if(!token.startsWith("scn_ri_v1.")) throw new Error("MCP requires a scn_ri_v1 runtime identity token");
const parts=token.split(".");
if(parts.length!==3) throw new Error("runtime identity token structure is invalid");
const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
const attachments=(claims.attachments||[]).map(v=>String(v).toLowerCase());
if(!attachments.includes("mcp")) throw new Error(`runtime identity lacks explicit mcp scope: ${attachments.join(",")}`);
if(!claims.workloadId||!claims.identityId||!Number.isInteger(Number(claims.generation))) throw new Error("runtime identity claims are incomplete");
process.stdout.write([claims.workloadId,claims.identityId,String(claims.generation),attachments.join(",")].join("\t"));
NODE
}

info "Verify real Node + live Control authority before creating MCP authority"
health_json="$(node_health_sync)"
node - "$health_json" "$NODE_URL" <<'NODE'
const [raw,nodeUrl]=process.argv.slice(2),x=JSON.parse(raw);
console.log(`✓ Scaniom Node authority PASS · ${x.name||x.nodeId} · ${nodeUrl}`);
console.log(`✓ Control sync CONNECTED · continuity ${String(x.continuity?.state||"").toUpperCase()}`);
NODE

if [ -n "$runtime_token" ]; then
  set +e
  supplied_token_claims="$(parse_runtime_token 2>/dev/null)"
  supplied_token_rc=$?
  set -e
  if [ "$supplied_token_rc" -ne 0 ]; then
    info "Existing SCANIOM_RUNTIME_TOKEN is not MCP-scoped; ignore prior-lab authority and create explicit MCP authority"
    runtime_token=""
  else
    supplied_workload_id="${supplied_token_claims%%$'\t'*}"
    if [ -z "$supplied_workload_id" ]; then
      info "Existing SCANIOM_RUNTIME_TOKEN has no usable workload authority; create explicit MCP authority"
      runtime_token=""
    fi
  fi
fi

if [ -z "$runtime_token" ]; then
  info "Create one explicit least-privilege MCP bootstrap and exchange it through the live Node"
  bootstrap_json="$(scaniom runtime identity bootstrap --workload "$WORKLOAD" --attachments mcp --json)"
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
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({bootstrapToken:process.env.BOOTSTRAP_TOKEN}),signal:AbortSignal.timeout(20000),
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`MCP runtime identity exchange failed HTTP ${response.status}: ${body?.error?.message||JSON.stringify(body)}`);
  const credential=body.credential||{};
  if(!String(credential.token||"").startsWith("scn_ri_v1.")) throw new Error("Node exchange returned no scn_ri_v1 credential.token");
  if(!(credential.attachments||[]).map(v=>String(v).toLowerCase()).includes("mcp")) throw new Error("Node exchange returned credential without mcp scope");
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
)"
  unset bootstrap_token BOOTSTRAP_TOKEN
  runtime_token="$(node - "$exchange_json" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(String(x.credential?.token||""));
NODE
)"
  unset exchange_json
else
  info "Use supplied MCP runtime identity without rotating authority"
fi

IFS=$'\t' read -r workload_id identity_id token_generation token_attachments <<<"$(parse_runtime_token)"
[ -n "$workload_id" ] || die "runtime identity did not contain workload authority"

# Match Scaniom Node's privacy-minimized E1 session + correlation identity exactly.
IFS=$'\t' read -r evidence_session_id correlation_id <<<"$(SESSION_ID="$session_id" WORKLOAD_ID="$workload_id" node <<'NODE'
const {createHash}=require("node:crypto");
const raw=String(process.env.SESSION_ID||"");
const workload=String(process.env.WORKLOAD_ID||"");
if(!raw||!workload)throw new Error("D07 correlation identity requires session + workload");
const evidenceSessionId=`sha256:${createHash("sha256").update(raw).digest("hex")}`;
const digest=createHash("sha256")
  .update(`scaniom-correlation-v1\0${workload}\0${evidenceSessionId}`)
  .digest("hex");
process.stdout.write(`${evidenceSessionId}\t${`scn_corr_${digest}`}`);
NODE
)"
[ -n "$evidence_session_id" ] && [ -n "$correlation_id" ] || die "D07 could not derive Scaniom correlation identity"
pass "MCP correlation identity PASS · $correlation_id"

control_ready=0
for attempt in $(seq 1 12); do
  identity_json="$(scaniom runtime identity status --workload "$WORKLOAD" --json)"
  read -r control_generation control_identity_id <<<"$(node - "$identity_json" <<'NODE'
const x=JSON.parse(process.argv[2]),i=x.identity||{};
if(String(i.status||"").toLowerCase()!=="active") throw new Error("runtime identity is not active in Control");
if(!(i.attachments||[]).map(v=>String(v).toLowerCase()).includes("mcp")) throw new Error("Control runtime identity does not include mcp scope");
process.stdout.write(`${i.generation||0} ${i.identityId||""}`);
NODE
)"
  if [ "$control_generation" = "$token_generation" ] && [ "$control_identity_id" = "$identity_id" ]; then control_ready=1; break; fi
  info "Waiting for Control runtime generation convergence · token=$token_generation control=$control_generation ($attempt/12)"
  sleep 0.5
done
[ "$control_ready" -eq 1 ] || die "MCP runtime identity generation did not converge in Control; refusing to mint or rotate again blindly"
pass "MCP runtime identity authority PASS · generation $token_generation · MCP"

node_health_sync >/dev/null
node_health_sync >/dev/null

reference_health() {
  REFERENCE_HEALTH_URL="http://${REFERENCE_HOST}:${REFERENCE_PORT}/health" node <<'NODE'
(async()=>{const r=await fetch(process.env.REFERENCE_HEALTH_URL,{signal:AbortSignal.timeout(1500),cache:"no-store"});const b=await r.json().catch(()=>({}));if(!r.ok)process.exit(2);if(b.service!=="open-immune-d07-reference-mcp"||b.transport!=="streamable_http")process.exit(3);process.stdout.write(JSON.stringify(b));})().catch(()=>process.exit(1));
NODE
}

using_reference=0
if [ "$MCP_ENDPOINT" = "$REFERENCE_ENDPOINT" ]; then
  using_reference=1
  set +e
  reference_json="$(reference_health 2>/dev/null)"
  reference_rc=$?
  set -e
  if [ "$reference_rc" -eq 0 ]; then
    info "Reuse existing D07 reference MCP server at $MCP_ENDPOINT"
  elif [ "$START_REFERENCE" = "1" ]; then
    info "Start real safe Streamable HTTP MCP reference server · $MCP_ENDPOINT"
    : >"$REFERENCE_LOG"
    OPEN_II_D07_MCP_HOST="$REFERENCE_HOST" OPEN_II_D07_MCP_PORT="$REFERENCE_PORT" OPEN_II_D07_LEDGER="$LEDGER_FILE" \
      node "$ROOT/demos/d07-mcp-gateway/reference-server.mjs" >"$REFERENCE_LOG" 2>&1 &
    reference_pid=$!
    reference_owned=1
    printf '%s\n' "$reference_pid" >"$REFERENCE_PID_FILE"
    reference_ready=0
    for attempt in $(seq 1 30); do
      if ! kill -0 "$reference_pid" >/dev/null 2>&1; then cat "$REFERENCE_LOG" >&2 || true; die "D07 reference MCP server exited before becoming usable"; fi
      set +e
      reference_json="$(reference_health 2>/dev/null)"
      reference_rc=$?
      set -e
      if [ "$reference_rc" -eq 0 ]; then reference_ready=1; break; fi
      info "Waiting for reference MCP health ($attempt/30)"
      sleep 0.25
    done
    [ "$reference_ready" -eq 1 ] || { cat "$REFERENCE_LOG" >&2 || true; die "D07 reference MCP server did not become healthy"; }
  else
    die "No D07 reference MCP server is running and OPEN_II_D07_START_REFERENCE=0"
  fi
  reference_calls_before="$(node - "$reference_json" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(String(Number(x.toolCalls||0)));
NODE
)"
fi

probe_gateway_health() {
  GATEWAY_URL="$GATEWAY_URL" NODE_URL="$NODE_URL" SERVER_ID="$SERVER_ID" MCP_ENDPOINT="$MCP_ENDPOINT" node <<'NODE'
(async()=>{
  const response=await fetch(`${String(process.env.GATEWAY_URL).replace(/\/+$/,"")}/health`,{signal:AbortSignal.timeout(1500),cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)process.exit(2);
  if(body.service!=="scaniom-mcp-gateway"||body.attachment!=="mcp"||body.transport!=="streamable_http")process.exit(3);
  if(body.serverId!==process.env.SERVER_ID)throw new Error(`MCP gateway serverId ${body.serverId||"unknown"}, expected ${process.env.SERVER_ID}`);
  const expectedNode=String(process.env.NODE_URL||"").replace(/\/+$/,"");
  if(!(body.nodeTargets||[]).map(v=>String(v).replace(/\/+$/,"")).includes(expectedNode))throw new Error(`MCP gateway Node targets do not include ${expectedNode}`);
  const expectedOrigin=new URL(process.env.MCP_ENDPOINT).origin;
  if(String(body.upstream||"")!==expectedOrigin)throw new Error(`MCP gateway upstream origin ${body.upstream||"unknown"}, expected ${expectedOrigin}`);
  if(body.requireIdentity!==true)throw new Error("MCP gateway runtime identity requirement is disabled");
  process.stdout.write(JSON.stringify(body));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

set +e
gateway_json="$(probe_gateway_health 2>/dev/null)"
gateway_rc=$?
set -e
if [ "$gateway_rc" -eq 0 ]; then
  info "Reuse existing healthy MCP Gateway at $GATEWAY_URL"
elif [ "$START_GATEWAY" = "1" ]; then
  info "Start released MCP Gateway · listen :$PORT · explicit Node fabric $NODE_URL"
  : >"$GATEWAY_LOG"
  SCANIOM_NODE_URL="$NODE_URL" scaniom attach mcp \
    --workload "$WORKLOAD" \
    --server-id "$SERVER_ID" \
    --endpoint "$MCP_ENDPOINT" \
    --node-url "$NODE_URL" \
    --port "$PORT" \
    --run >"$GATEWAY_LOG" 2>&1 &
  gateway_pid=$!
  gateway_owned=1
  printf '%s\n' "$gateway_pid" >"$GATEWAY_PID_FILE"
  gateway_ready=0
  for attempt in $(seq 1 30); do
    if ! kill -0 "$gateway_pid" >/dev/null 2>&1; then cat "$GATEWAY_LOG" >&2 || true; die "MCP Gateway exited before becoming usable"; fi
    set +e
    gateway_json="$(probe_gateway_health 2>/dev/null)"
    gateway_rc=$?
    set -e
    if [ "$gateway_rc" -eq 0 ]; then gateway_ready=1; break; fi
    info "Waiting for MCP Gateway health ($attempt/30)"
    sleep 0.5
  done
  [ "$gateway_ready" -eq 1 ] || { cat "$GATEWAY_LOG" >&2 || true; die "MCP Gateway did not become healthy"; }
else
  die "No healthy MCP Gateway is running at $GATEWAY_URL and SCANIOM_MCP_START_GATEWAY=0"
fi

read -r forwarded_before observed_before blocked_before <<<"$(node - "$gateway_json" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(`${Number(x.forwarded||0)} ${Number(x.observed||0)} ${Number(x.blocked||0)}`);
NODE
)"
pass "MCP Gateway READY · ${GATEWAY_URL}/mcp → Node $NODE_URL → upstream $MCP_ENDPOINT"

run_tool_once() {
  RUNTIME_TOKEN="$runtime_token" WORKLOAD_ID="$workload_id" GATEWAY_URL="$GATEWAY_URL" SESSION_ID="$session_id" TOOL_NAME="$TOOL_NAME" TOOL_ARGS="$TOOL_ARGS" node <<'NODE'
(async()=>{
  let args;try{args=JSON.parse(process.env.TOOL_ARGS||"{}");}catch{throw new Error("SCANIOM_MCP_TOOL_ARGS must be valid JSON");}
  const requestId=`oii-d07-${Date.now()}`;
  const rpc={jsonrpc:"2.0",id:requestId,method:"tools/call",params:{name:process.env.TOOL_NAME,arguments:args,_meta:{"io.modelcontextprotocol/clientInfo":{name:"open-immune-d07",version:"1.0.0"}}}};
  const response=await fetch(`${String(process.env.GATEWAY_URL).replace(/\/+$/,"")}/mcp`,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      accept:"application/json, text/event-stream",
      authorization:`Bearer ${process.env.RUNTIME_TOKEN}`,
      "x-scaniom-workload-id":process.env.WORKLOAD_ID,
      "x-scaniom-session-id":process.env.SESSION_ID,
      "mcp-protocol-version":"2026-07-28",
      "mcp-method":"tools/call",
      "mcp-name":process.env.TOOL_NAME,
    },
    body:JSON.stringify(rpc),signal:AbortSignal.timeout(20000),
  });
  const text=await response.text();
  if(!response.ok){
    if(response.status===403&&/generation.{0,40}stale/i.test(text))process.exit(42);
    throw new Error(`MCP tools/call failed HTTP ${response.status}: ${text.slice(0,1200)}`);
  }
  if(response.headers.get("x-scaniom-mcp-gateway")!=="streamable-http")throw new Error("Scaniom MCP gateway response header is missing");
  if(response.headers.get("x-scaniom-mcp-server")!==process.env.SERVER_ID&&process.env.SERVER_ID)throw new Error("Scaniom MCP server lineage header mismatch");
  let body=null;try{body=JSON.parse(text);}catch{}
  if(body?.error)throw new Error(`MCP JSON-RPC error: ${body.error.message||JSON.stringify(body.error)}`);
  if(body?.result?.isError===true)throw new Error(`MCP tool returned isError: ${JSON.stringify(body.result)}`);
  process.stdout.write(JSON.stringify({status:response.status,contentType:response.headers.get("content-type")||"",body,raw:body?null:text.slice(0,4000)}));
})().catch(error=>{console.error(`ERROR: ${error.message}`);process.exit(1)});
NODE
}

info "Execute real MCP tools/call through Scaniom Gate before upstream consequence"
tool_ok=0
for attempt in $(seq 1 12); do
  set +e
  SERVER_ID="$SERVER_ID" run_tool_once >"$TOOL_RESULT_FILE"
  tool_rc=$?
  set -e
  if [ "$tool_rc" -eq 0 ]; then tool_ok=1; break; fi
  if [ "$tool_rc" -eq 42 ]; then
    info "Node runtime generation snapshot is still converging · force signed Control sync ($attempt/12)"
    node_health_sync >/dev/null
    sleep 0.5
    continue
  fi
  die "D07 MCP tools/call execution failed"
done
[ "$tool_ok" -eq 1 ] || die "Node never converged to MCP runtime generation $token_generation"

if [ "$using_reference" -eq 1 ]; then
  node - "$TOOL_RESULT_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8")),r=x.body?.result;
if(!r||r.isError===true)throw new Error("reference MCP tool returned no successful result");
const row=r.structuredContent||{};
if(!String(row.recordId||"").startsWith("oii_mcp_"))throw new Error("reference MCP tool did not perform the real record consequence");
if(!/^sha256:[0-9a-f]{64}$/.test(String(row.messageDigest||"")))throw new Error("reference MCP tool result missing privacy-minimized digest");
if(row.contentStored!==false)throw new Error("reference MCP tool unexpectedly retained raw message content");
console.log(`✓ real upstream MCP tool consequence PASS · ${row.recordId}`);
NODE
fi

counter_ready=0
for attempt in $(seq 1 20); do
  gateway_after="$(probe_gateway_health)"
  read -r forwarded_after observed_after blocked_after <<<"$(node - "$gateway_after" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(`${Number(x.forwarded||0)} ${Number(x.observed||0)} ${Number(x.blocked||0)}`);
NODE
)"
  if [ "$forwarded_after" -gt "$forwarded_before" ] && [ "$observed_after" -gt "$observed_before" ] && [ "$blocked_after" -eq "$blocked_before" ]; then counter_ready=1; break; fi
  info "Waiting for MCP forward + post-observe counters ($attempt/20)"
  sleep 0.5
done
[ "$counter_ready" -eq 1 ] || die "MCP Gateway did not record one permitted forward followed by post-observe"
pass "MCP Gateway consequence path PASS · forwarded ${forwarded_before} → ${forwarded_after} · observed ${observed_before} → ${observed_after} · blocked unchanged"

if [ "$using_reference" -eq 1 ]; then
  reference_after="$(reference_health)"
  reference_calls_after="$(node - "$reference_after" <<'NODE'
const x=JSON.parse(process.argv[2]);process.stdout.write(String(Number(x.toolCalls||0)));
NODE
)"
  [ "$reference_calls_after" -gt "$reference_calls_before" ] || die "reference MCP server did not execute the real tool call"
  pass "upstream reference MCP execution counter PASS · $reference_calls_before → $reference_calls_after"
fi

info "Wait for exact MCP pre-Gate + post-observe trajectory"
trajectory_ok=0
for attempt in $(seq 1 25); do
  set +e
  scaniom trajectory show "$correlation_id" --limit 500 --json >"$TRAJECTORY_FILE" 2>/dev/null
  trajectory_rc=$?
  set -e
  if [ "$trajectory_rc" -eq 0 ] && node - "$TRAJECTORY_FILE" "$workload_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,workloadId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8"));
const events=(x.events||[]).filter(e=>e.workloadId===workloadId&&String(e.attachmentSource||"").toLowerCase()==="mcp_gateway"&&String(e.actionType||"").toLowerCase()==="tool_call");
const phases=new Set(events.map(e=>String(e.executionPhase||"").toLowerCase()));
process.exit(events.length>=2&&phases.has("pre")&&phases.has("post")?0:1);
NODE
  then trajectory_ok=1; break; fi
  info "Waiting for selected-workload MCP pre/post trajectory ($attempt/25)"
  sleep 1
done
[ "$trajectory_ok" -eq 1 ] || die "D07 tool executed but exact MCP pre/post trajectory did not reach Control"
pass "E1 trajectory PASS · mcp_gateway · tool_call · pre + post"

info "Wait for exact E2 correlated MCP proof and verify its signature"
proof_ok=0
for attempt in $(seq 1 25); do
  set +e
  scaniom proof correlated verify "$correlation_id" --json >"$PROOF_FILE" 2>/dev/null
  proof_rc=$?
  set -e
  if [ "$proof_rc" -eq 0 ] && node - "$PROOF_FILE" "$evidence_session_id" "$workload_id" "$correlation_id" <<'NODE' >/dev/null 2>&1
const fs=require("node:fs"),[file,evidenceSessionId,workloadId,correlationId]=process.argv.slice(2),x=JSON.parse(fs.readFileSync(file,"utf8")),p=x.verification?.payload||{};
const levels=(p.attachmentLevels||[]).map(v=>String(v).toLowerCase());
const ok=x.verification?.valid===true
  &&p.sessionId===evidenceSessionId
  &&p.workloadId===workloadId
  &&String(x.item?.correlationId||p.correlationId||"")===correlationId
  &&Number(p.eventCount||0)>=2
  &&levels.includes("mcp");
process.exit(ok?0:1);
NODE
  then proof_ok=1; break; fi
  info "Waiting for valid signed MCP correlated proof ($attempt/25)"
  sleep 1
done
[ "$proof_ok" -eq 1 ] || die "D07 MCP trajectory exists but no valid MCP correlated proof was available"
node - "$PROOF_FILE" <<'NODE'
const fs=require("node:fs"),x=JSON.parse(fs.readFileSync(process.argv[2],"utf8")),p=x.verification?.payload||{};
console.log(`✓ E2 signed proof ${x.item?.proofId||p.proofId||"verified"} · VALID · ${(p.attachmentLevels||[]).map(v=>String(v).toUpperCase()).join("+")} · ${p.eventCount||0} events`);
NODE

unset runtime_token SCANIOM_RUNTIME_TOKEN || true

info "Render accepted D07 evidence from released CLI"
scaniom attach status --workload "$WORKLOAD"
scaniom live --env "$ENV_NAME" --workload "$WORKLOAD" --limit 20
scaniom trajectory show "$correlation_id" --limit 500
scaniom proof correlated verify "$correlation_id"

pass "D07 MCP GATEWAY REAL EXECUTION PASS · explicit MCP identity + Gate-before-tools/call + real upstream consequence + mcp_gateway pre/post trajectory + E2 signed proof"
