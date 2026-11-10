# D07 — MCP Gateway · Real Execution

D07 is the real Streamable HTTP MCP attachment lab. It places the released Scaniom 0.4.2 MCP Gateway between an MCP client/agent and an actual upstream MCP server, then proves that Scaniom Gate executes **before** `tools/call` reaches the upstream tool.

## Accepted D07 path

```text
MCP client / agent
    │  Authorization: Bearer scn_ri_v1… · explicit mcp scope
    │  x-scaniom-workload-id
    │  tools/call
    ▼
Scaniom MCP Gateway :8793
    │  /v1/mcp/guard · source=mcp_gateway · phase=pre
    ▼
Scaniom Node :8787 → deterministic Gate
    │  permitted only
    ▼
real Streamable HTTP MCP server :3001/mcp
    │  open_immune_record tool consequence
    ▼
Scaniom /v1/mcp/observe · phase=post
    ▼
E1 MCP trajectory · E2 VALID correlated proof
```

The gateway never collapses workload identity into MCP server identity. The request keeps the selected workload, MCP server ID, tool name, session/correlation lineage and privacy-minimized request digest.

## Default safe upstream

For a reproducible public lab, D07 ships a dependency-free loopback Streamable HTTP MCP reference server at `http://127.0.0.1:3001/mcp`. It implements the current stateless `tools/call` path plus compatibility discovery/initialize methods and exposes one harmless tool:

- `open_immune_record({ message })`
- performs a real local consequence by appending one JSONL audit record
- stores only record ID, timestamp, SHA-256 digest and byte count
- raw tool message content is not stored

This is an Open Immune reference service, not a claim that Open Immune is the upstream MCP product. Set `SCANIOM_MCP_ENDPOINT` and `SCANIOM_MCP_TOOL` to use another real Streamable HTTP MCP server.

## Runtime identity

MCP is an explicit opt-in least-privilege workload scope:

```bash
scaniom runtime identity bootstrap \
  --workload scaniom-demo-agent \
  --attachments mcp \
  --json
```

The one-time bootstrap is exchanged through the live Scaniom Node into `credential.token`. The bootstrap token is never used as steady-state bearer authority and Open Immune never stores or prints either secret.

## Port authority

Scaniom 0.4.2 uses one CLI option parser for service and Node ports. D07 therefore pins the Node URL explicitly while the MCP gateway listens on its own port:

```bash
export SCANIOM_NODE_URL="http://127.0.0.1:8787"

scaniom attach mcp \
  --workload scaniom-demo-agent \
  --server-id open-immune-d07-tools \
  --endpoint http://127.0.0.1:3001/mcp \
  --node-url "$SCANIOM_NODE_URL" \
  --port 8793 \
  --run
```

This is the same 0.4.2 service-port workaround used by D06. It does not alter or republish the closed public 0.4.2 artifacts.

## Run the accepted lab

From the Open Immune repository root with the existing real Node online:

```bash
export SCANIOM_CLI_BIN="$HOME/.local/lib/scaniom/0.4.2/bin/scaniom"
export SCANIOM_NODE_URL="http://127.0.0.1:8787"

bash demos/d07-mcp-gateway/run.sh
```

The harness will start the safe reference MCP server and MCP Gateway only when needed, create/exchange an MCP-scoped runtime identity when no valid token is supplied, execute one real tool consequence, wait for post-observe, then verify the exact MCP trajectory and signed proof.

## Use another real MCP server

```bash
export SCANIOM_MCP_SERVER_ID="internal-tools"
export SCANIOM_MCP_ENDPOINT="https://mcp.example.internal/mcp"
export SCANIOM_MCP_TOOL="lookup"
export SCANIOM_MCP_TOOL_ARGS='{"id":"safe-test"}'

bash demos/d07-mcp-gateway/run.sh
```

If the upstream requires bearer authentication, configure its secret through the released Scaniom MCP attachment command with `--secret-env <ENV_NAME>` on the runtime host. Do not place that secret in Open Immune or Scaniom Control.

## D07 acceptance requires

1. public standalone Scaniom 0.4.2 only; no private source checkout execution
2. Web ↔ Control ↔ CLI authority parity
3. real selected environment/workload/Scaniom Address/policy/Node
4. explicit `mcp` runtime identity whose token generation converges with Control
5. MCP Gateway health = `attachment:mcp`, `transport:streamable_http`, runtime identity required
6. gateway Node target exactly includes `http://127.0.0.1:8787`
7. real `tools/call` reaches the upstream only after Gate permits it
8. gateway `forwarded` increases and `observed` increases; permitted-path `blocked` stays unchanged
9. exact selected-workload E1 trajectory contains `attachmentSource=mcp_gateway`, `actionType=tool_call`, `pre` and `post`
10. `scaniom proof correlated verify <session>` returns VALID, attachment level MCP, and at least two correlated events

A UI click, gateway startup, or configured MCP endpoint alone never completes D07.

## Failure semantics

- Node not ready, Control disconnected, or continuity not online → fail before runtime identity creation.
- Missing `mcp` scope → fail.
- Runtime identity generations disagree → wait for convergence; do not mint/rotate repeatedly.
- Gateway Node target resolves to `:8793` instead of `:8787` → fail.
- Missing workload header or bearer runtime identity → gateway fails closed.
- Gate denies → upstream tool is not dispatched and `blocked` increases.
- Upstream tool dispatch has begun → ambiguous failures are never blindly replayed.
- Missing post-observe, wrong attachment source, wrong workload, or missing pre/post MCP trajectory → fail.
- Missing/invalid E2 proof or proof without MCP → fail.


## Gate / observe evidence


The accepted trajectory must contain **pre + post** MCP evidence for the same real tool consequence:

- `pre` — Gate executes before `tools/call` reaches the upstream MCP server.
- `post` — Scaniom observes the result after the one real upstream tool dispatch.
- both events retain `attachment_source=mcp_gateway`.
- ambiguous tool execution is never blindly replayed.
