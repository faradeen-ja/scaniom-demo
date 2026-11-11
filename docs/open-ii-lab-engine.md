# Open Immune Lab Manifest Engine

The Lab engine is the contract between the public Lab Library and the workbench UI.

A manifest declares:

```text
identity / outcome
kind: lab | system
attachment boundaries
platforms / providers / stacks
suggested environment + workload
Fabric Tree steps
where each step happens
required public Scaniom artifact
exact CLI/code runbook
boundary notes
completion source
matrix topology nodes + edges
```

## Truth model

`profile`, `identity`, `organization`, `environment`, and `workload` can become verified from the accepted OIS Auth / Scaniom context APIs.

`external` means a real Scaniom CLI/runtime/deployment action must occur. External steps remain RUN/READY until live Scaniom evidence is connected; clicking a step never turns it green.

This keeps the public workbench honest while still exposing the complete end-to-end runbook for L1/L2/L3/L4/L5/MCP/L6, provider BYOK, Node placement, failure/recovery and proof.

## System blueprints

The five system families are public Lab definitions: AI SaaS Operations Center, Robot Fleet, Autonomous Lanes, AI Inference Factory and IFOC. They use the current released Scaniom contracts; the old standalone/shim implementation is not reintroduced.


## Complete catalog documentation contract

The public documentation surface covers both focused Labs (D00-D12 + Flagship) and all five System Blueprints. System Blueprint definitions remain manifest-owned in `lib/open-ii/labs.ts`, are rendered by Workbench and Web Start A-Z, and have repo guidebooks under `docs/system-blueprints/`. They do not introduce a second execution engine or a public `run.sh` path.
