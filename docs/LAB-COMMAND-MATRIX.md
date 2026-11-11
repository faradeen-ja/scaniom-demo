# Open Immune Native Lab Command Matrix

**Public rule:** every row below is a human/native Scaniom path. Repository shell harnesses are intentionally omitted.

## Copy/paste convention - set your values once

Never copy angle-bracket placeholders into a shell. The public docs use shell variables for values that belong to your Scaniom deployment:

```bash
export YOUR_ENVIRONMENT="production"
export YOUR_WORKLOAD="customer-agent"
export YOUR_NODE_NAME="prod-ai-01"
export YOUR_MODEL="gpt-5-mini"
```

`prod-ai-01` is only an example. Use `scaniom node list` to choose the Node you actually enrolled.

```mermaid
flowchart LR
  E["$YOUR_ENVIRONMENT"] --> W["$YOUR_WORKLOAD"] --> N["$YOUR_NODE_NAME"] --> B["Lab boundary"] --> P["proof"]
  classDef immune fill:#132015,stroke:#a9ff54,color:#f0ffe6;
  class E,W,N,B,P immune;
```

## Universal beginning and ending

All runtime Labs start with real Scaniom authority:

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom whoami
scaniom auth status

scaniom env create "$YOUR_ENVIRONMENT" --type production
scaniom workload create "$YOUR_WORKLOAD" --env "$YOUR_ENVIRONMENT" --kind application
scaniom workload use "$YOUR_WORKLOAD"
scaniom address issue --workload "$YOUR_WORKLOAD" --ttl 24
scaniom node enroll "$YOUR_NODE_NAME" --env "$YOUR_ENVIRONMENT" --background
scaniom policy set --env "$YOUR_ENVIRONMENT" --mode enforce
```

All execution Labs finish with real evidence:

```bash
scaniom attach status --workload "$YOUR_WORKLOAD"
scaniom live --env "$YOUR_ENVIRONMENT" --limit 20
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
scaniom proof correlated verify <proof-or-correlation>
```

## D00-D12 + Flagship

| Lab | What the human builds/proves | Native Scaniom sequence | Verification |
| --- | --- | --- | --- |
| D00 OIS Auth | same Control / operator / org across Web + CLI | `profile use/test` -> `login` -> `whoami` -> `auth status` | OIS browser parity + same Control/org |
| D01 Public Install | released distribution, not source checkout | `version` -> `artifacts supply-chain` -> `profile test cloud` | accepted R18/0.4.2 CLI + public SDKs |
| D02 L1 | app API route through Node/Gate/provider | provider route/BYOK -> `attach l1` -> identity `l1` -> `attach test l1` | `provider_proxy` trajectory + proof |
| D03 L2 | TS/Python semantic guard around consequence | install SDK -> `attach l2` -> identity `l1,l2,l4` -> app guard/observe | `sdk` pre/post + proof |
| D04 L4 | sidecar beside existing workload | provider route -> `attach l4` -> shared identity -> route app through sidecar | `sidecar` evidence + proof |
| D05 L3 | Gate before inference runtime | register runtime -> identity `l3` -> `attach l3 --run` -> `attach test l3` | `runtime_hook` pre/post + proof |
| D06 L5 | attributed environment ingress | identity `l5` -> `attach l5 --run` -> attributed guard/traffic | `gateway` evidence + proof |
| D07 MCP | Gate MCP tool call | identity `mcp` -> `attach mcp --run` -> `attach test mcp` | `mcp_gateway` pre/post + proof |
| D08 L6 | native guard immediately before consequence | identity `l6` -> `attach l6 --run` -> `attach test l6` | `provider_native` pre/post + proof |
| D09 Fleet | multi-Node pool/binding/routing/failover | `fabric add nodes` -> pool -> members -> workload pools -> routing preview | health-aware remap + trajectory/proof |
| D10 Continuity | real Node protection during Control-path loss | continuity inspect -> all required identity scopes -> online traffic -> cut only Node->Control -> offline traffic -> restore | OFFLINE-PROTECTED + spool/replay + proofs |
| D11 Multi-provider | same workload over 2+ upstreams | provider add + secret configure for 2+ providers -> restart -> test routes | same identity/policy + multi-provider trajectory |
| D12 Immunex | repeatable behavioral evaluation | `immunex library` -> `preflight` -> `templates/blueprint` -> `immunex run` | Gate/trajectory/proof from campaign |
| Flagship | complete Immune Fabric | compose D02-D12 on one protected workload/fabric | all 7 boundaries + fleet + provider + continuity + proof |

## D00 - OIS Auth

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom whoami
scaniom auth status
```

Open `http://localhost:3000/workspace` and approve the Open Immune browser authorization. The Web session and CLI session stay separate.

## D01 - Public Install

```bash
scaniom version
scaniom artifacts supply-chain
scaniom profile test cloud
npm install @scaniom/sdk@0.4.2
python3 -m pip install scaniom==0.4.2
```

The SDK installs are distribution verification for D01 and runtime dependencies only when L2 is used.

## D02 - L1 Full Cycle

```bash
scaniom provider add openai --node "$YOUR_NODE_NAME" --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL"
scaniom secret configure OPENAI_API_KEY --node "$YOUR_NODE_NAME"
scaniom node restart
scaniom attach l1 --workload "$YOUR_WORKLOAD" --node "$YOUR_NODE_NAME" --preset openai --model "$YOUR_MODEL"
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l1
scaniom attach test l1 --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL" -- "Say hello in one sentence"
```

## D03 - L2 Agent SDK

```bash
npm install @scaniom/sdk@0.4.2
# or: python3 -m pip install scaniom==0.4.2
scaniom attach l2 --workload "$YOUR_WORKLOAD" --lang typescript
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l1,l2,l4
scaniom runtime identity status --workload "$YOUR_WORKLOAD"
```

Instrument the real application consequence with `guardTool` / `guard_action`, then inspect L2 evidence.

## D04 - L4 Sidecar

```bash
scaniom attach l4 --workload "$YOUR_WORKLOAD" --port 8790
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l1,l2,l4
scaniom attach test l4 --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL" -- "Say hello"
```

## D05 - L3 Model Runtime

```bash
scaniom attach l3 --workload "$YOUR_WORKLOAD" --kind <vllm|nvidia_nim|triton|openai_compatible> --endpoint <runtime-url> --model "$YOUR_MODEL"
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l3
scaniom attach l3 --workload "$YOUR_WORKLOAD" --kind <kind> --endpoint <runtime-url> --port 8792 --run
scaniom attach test l3 --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL" -- "Say hello"
```

## D06 - L5 Environment Gateway

```bash
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l5
scaniom attach l5 --environment "$YOUR_ENVIRONMENT" --port 8791 --run
scaniom attach test l5 --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL" -- "Say hello"
```

The core L5 proof is provider-neutral workload-attributed gateway execution; provider-backed traffic is optional when a route exists.

## D07 - MCP Gateway

```bash
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments mcp
scaniom attach mcp --workload "$YOUR_WORKLOAD" --server-id <server-id> --endpoint <mcp-server-url> --port 8793 --run
SCANIOM_RUNTIME_TOKEN=<mcp-scoped-runtime-token> scaniom attach test mcp --workload "$YOUR_WORKLOAD" --gateway-url http://127.0.0.1:8793 --tool <tool> --args '{}'
```

## D08 - L6 Provider Native

```bash
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l6
scaniom attach l6 --workload "$YOUR_WORKLOAD" --provider <provider> --adapter <adapter> --hook <family> --port 8794 --run
SCANIOM_RUNTIME_TOKEN=<l6-scoped-runtime-token> scaniom attach test l6 --workload "$YOUR_WORKLOAD" --provider <provider> --adapter <adapter> --event <event>
```

## D09 - Fleet + Failover

```bash
scaniom fabric add nodes --env "$YOUR_ENVIRONMENT" --prefix "$YOUR_NODE_PREFIX" --count 3
scaniom node list
scaniom node health
scaniom fabric pool create --env "$YOUR_ENVIRONMENT" --name "$YOUR_POOL_NAME" --desired 3 --min 1 --max 3 --capabilities l1,l2,l4 --nodes <id1,id2,id3>
scaniom fabric pool members --env "$YOUR_ENVIRONMENT" --pool "$YOUR_POOL_NAME" --nodes <id1,id2,id3>
scaniom fabric workload pools --workload "$YOUR_WORKLOAD" --pools "$YOUR_POOL_NAME"
scaniom fabric routing preview --workload "$YOUR_WORKLOAD" --key <session-key>
```

Stop/drain the selected Node through the real deployment boundary, verify health loss and deterministic remap, then restore it. Do not fake failover with a UI toggle.

## D10 - Offline Continuity

```bash
scaniom runtime identity bootstrap --workload "$YOUR_WORKLOAD" --attachments l1,l2,l3,l4,l5,mcp,l6
scaniom runtime identity status --workload "$YOUR_WORKLOAD"
scaniom runtime continuity --env "$YOUR_ENVIRONMENT"
scaniom node health
```

1. Start the boundaries you want to test using D02-D08 native commands.
2. Execute one online action per boundary and confirm trajectory/proof.
3. Remove only Node-to-Control transport using the real network/deployment control; keep Node, workloads, upstreams, and boundary processes alive.
4. Confirm local `OFFLINE-PROTECTED` state.
5. Execute the same boundaries from already-issued authority; new bootstrap/unknown authority must fail closed.
6. Restore the exact Control path without restarting the protected execution plane.
7. Confirm spool drain, ordered replay, trajectory convergence, and proof revisions.

## D11 - Multi-provider

```bash
scaniom provider add openai --node "$YOUR_NODE_NAME" --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL"
scaniom secret configure OPENAI_API_KEY --node "$YOUR_NODE_NAME"
scaniom provider add anthropic --node "$YOUR_NODE_NAME" --workload "$YOUR_WORKLOAD" --model "$YOUR_MODEL"
scaniom secret configure ANTHROPIC_API_KEY --node "$YOUR_NODE_NAME"
# add Gemini / Bedrock / custom the same way as needed
scaniom node restart
scaniom providers
scaniom provider list
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
```

## D12 - Immunex

```bash
scaniom immunex library
scaniom immunex preflight --workload "$YOUR_WORKLOAD" --connection <connection> --model "$YOUR_MODEL"
scaniom immunex templates
scaniom immunex blueprint list
scaniom immunex run --workload "$YOUR_WORKLOAD" --connection <connection> --model "$YOUR_MODEL" --attachments l1,l2,l4 --scenario-set core
```

## Flagship - Full Immune Fabric

Build the same real workload through D02-D12 instead of using a shortcut. Finish with:

```bash
scaniom attach status --workload "$YOUR_WORKLOAD"
scaniom fleet --env "$YOUR_ENVIRONMENT"
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
scaniom authority --category all --limit 30
```


## System Blueprints are first-class public runbooks

The Web catalog also exposes five composed systems. They are not decorative cards and they are not shell demos. Each has a native Scaniom guide:

- [`AI SaaS Operations Center`](system-blueprints/system-saas.md) — L1 + L2 + MCP
- [`Robot Fleet`](system-blueprints/system-robots.md) — L2 + L4 + L5 + MCP
- [`Autonomous Lanes`](system-blueprints/system-lanes.md) — L1 + L2 + L5 + L6
- [`AI Inference Factory`](system-blueprints/system-factory.md) — L3 + L4 + L5
- [`IFOC — Full Immune Fabric Operations Center`](system-blueprints/system-ifoc.md) — all seven boundaries

Workbench remains the live source for resolved selected-object values and evidence-driven completion.
