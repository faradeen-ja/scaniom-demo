# Open Immune Lab Matrix

Open Immune has two deliberately separate execution lanes.

| Lane | Audience | Entry point | Authority | Purpose |
| --- | --- | --- | --- | --- |
| Public native experience | developers, teams, integrators, security/operators | Workbench + Start A-Z | real Scaniom Web/CLI/SDK/runtime | learn, build, operate, inspect proof |
| Internal acceptance | maintainers/CI/release owners | `demos/dXX/run.sh` | same released Scaniom contracts | deterministic regression/closeout |

A shell harness is never a public Lab prerequisite.

## Universal public Lab discipline

1. Verify the accepted public Scaniom release.
2. Complete OIS Auth against the selected real Scaniom Control.
3. Verify the installed Scaniom CLI against the same Control with a separate approved session.
4. Create/select a real environment and workload.
5. Issue workload identity / Scaniom Address.
6. Enroll the real Node or Node pool and publish policy.
7. Configure the real provider/runtime target; provider secrets stay Node-local or in the enterprise secret store.
8. Build only the attachment boundaries required by the selected Lab.
9. Change the actual application/runtime/deployment at the correct surface: IDE, VM, Docker, Kubernetes, MCP path, model runtime, environment ingress, or provider-native adapter.
10. Exercise real traffic or an explicitly harmless consequence.
11. Inspect Gate, behavior, trajectory, and signed/correlated proof.
12. Never depend on a private Scaniom checkout.

## Lab matrix

| Lab | Public focus | Primary boundaries | Public completion authority | Internal acceptance role |
| --- | --- | --- | --- | --- |
| D00 | OIS Auth | authority | same Control/operator/org | browser/CLI parity automation |
| D01 | Public Install | distribution | accepted CLI + npm + PyPI | credential-free install receipt |
| D02 | L1 Full Cycle | L1 | provider_proxy evidence + proof | real provider cycle regression |
| D03 | L2 Agent SDK | L2 | sdk pre/post + proof | TS + Python SDK regression |
| D04 | L4 Sidecar | L4 | sidecar evidence + proof | sidecar runtime regression |
| D05 | L3 Model Runtime | L3 | runtime_hook pre/post + proof | model-runtime adapter regression |
| D06 | L5 Environment Gateway | L5 | gateway evidence + proof | environment gateway regression |
| D07 | MCP Gateway | MCP | mcp_gateway pre/post + proof | tools/call gateway regression |
| D08 | L6 Provider Native | L6 | provider_native pre/post + proof | native bridge regression |
| D09 | Fleet + Failover | L1/L2/L4 + D1/D2/D3 | pool/binding/routing + failover proof | deterministic failover receipt |
| D10 | Offline Continuity | all seven + B2 | OFFLINE-PROTECTED + replay + 7 proofs | full seven-boundary outage acceptance |
| D11 | Multi-provider | L1 routes | 2+ real providers + common trajectory | route/provider regression |
| D12 | Immunex | L1/L2/L4 | campaign evidence + proof | repeatable evaluation acceptance |
| Flagship | Full Immune Fabric | all seven | complete selected fabric authority | final visibility/closeout verifier |

The Workbench renders the public runbook from Lab manifests. Green/DONE means current Scaniom authority/evidence actually verifies that state; a UI click never synthesizes completion.
