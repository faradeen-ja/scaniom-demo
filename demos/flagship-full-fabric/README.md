# Flagship - Full Immune Fabric

> **FLAGSHIP · FULL IMMUNE FABRIC** · **PUBLIC / NATIVE SCANIOM FIRST** · `run.sh = INTERNAL / ACCEPTANCE ONLY`

```mermaid
flowchart LR
    AUTH["authority"] --> WORK["workload identity"] --> POOL["Node pool"] --> B["all 7 boundaries"] --> TARGET["multi-provider / runtime"]
    B --> CONT["continuity"] --> PROOF["correlated proofs"]
    classDef immune fill:#132015,stroke:#a9ff54,color:#f0ffe6,stroke-width:2px;
    classDef oii fill:#0b1416,stroke:#55e6d2,color:#eafffb,stroke-width:2px;
    classDef evidence fill:#171326,stroke:#a88cff,color:#f2edff,stroke-width:2px;
    class AUTH,WORK,POOL,B,TARGET,CONT immune;
    class PROOF evidence;
```

### Use your own Scaniom names

Commands shown in Workbench resolve the selected real environment/workload/Node. Names such as `scaniom-demo-agent`, `prod-ai-01`, or `open-immune-node` are examples only. Check your own state with:

```bash
scaniom env list
scaniom workload list
scaniom node list
```

**Public path:** compose the real Scaniom system; do not use a shortcut script as the customer experience. Normal users do not run this directory's shell harness.

## Public / native Scaniom flow

Build D02-D12 against one coherent protected workload/fabric:

```text
Control / OIS Auth
   -> environment + workload + Address
   -> Node pool + policy + routing
   -> provider routes / runtime targets
   -> L1 + L2 + L3 + L4 + L5 + MCP + L6
   -> multi-provider
   -> failover
   -> offline continuity
   -> Immunex
   -> behavior / trajectory / proof / authority
```

Use each Lab's native commands in the Workbench. Finish with:

```bash
scaniom attach status --workload "$YOUR_WORKLOAD"
scaniom fleet --env "$YOUR_ENVIRONMENT"
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
scaniom authority --category all --limit 30
```

## Completion

The Flagship closes only when the real selected fabric exposes all seven accepted boundaries and the required evidence/proof authority. It does not invent state to make the diagram green.

## Internal / engineering acceptance

The harness is a visibility/verifier stage after the focused Labs have already produced real evidence:

```bash
bash demos/flagship-full-fabric/run.sh
```
