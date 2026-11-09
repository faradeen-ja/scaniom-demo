# D03 — L2 Agent SDK · Real Execution

D03 proves the released TypeScript and Python Scaniom SDKs against a real Scaniom Node/Gate without inventing a second auth, policy, or proof system.

The lab reuses the D00/D01/D02 authority and protected scope, preserves the shared B1 managed runtime-identity attachment scope (`l1,l2,l4`), then performs two harmless real semantic consequences:

```text
TypeScript @scaniom/sdk@0.4.1 ─┐
                               ├─ copy-once bootstrap → scn_ri_v1 → Node/Gate → local consequence → post-observe
Python scaniom==0.4.1 ─────────┘
                                                     ↓
                                           L2 / sdk evidence
                                                     ↓
                                        trajectory + signed proof
```

Run from the repository root:

```bash
./demos/d03-l2-agent-sdk/run.sh
```

Defaults reuse the existing public demo scope:

- environment: `scaniom-demo-production`
- workload: `scaniom-demo-agent`
- Node: `scaniom-demo-node`
- Node URL: `http://127.0.0.1:8787`

Override with `SCANIOM_ENVIRONMENT`, `SCANIOM_WORKLOAD`, `SCANIOM_NODE_NAME`, or `SCANIOM_NODE_URL`.

The test consequences are local timestamp heartbeat files under `.demo/d03/consequences/`. No provider key is required to prove L2 semantic action gating. Provider routes remain optional when an SDK application also sends model/provider traffic.

Security boundary:

- Open Immune never stores or renders runtime bootstrap/runtime token values.
- Each SDK gets a fresh single-use deployment bootstrap through the process environment.
- The SDK exchanges it for short-lived renewable runtime authority through the Scaniom Node.
- Provider credentials remain Node/runtime-local.
- Completion closes only from real L2 (`sdk`) evidence and signed Scaniom proof.
