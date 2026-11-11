# Open Immune Intelligence - End-to-End Public + Internal Operating Packet

**Release baseline:** Scaniom R18 / 0.4.2
**Repository:** `faradeen-ja/scaniom-demo`
**Public Control:** `https://control.scaniom.com`

## Purpose

This packet freezes how Open Immune is used, taught, tested, extended, accepted, and released.

There are two lanes that exercise the same Scaniom contracts but serve different people:

```text
PUBLIC EXPERIENCE                         INTERNAL ENGINEERING
human learns/builds                       automation validates
Open Immune Workbench                     demos/dXX/run.sh
real Scaniom CLI/Web/SDK/runtime          same released Scaniom contracts
live Control/Node evidence                deterministic convergence checks
trajectory + signed proof                 receipt + PASS + regression gate
```

The internal lane is never a second product layer. The public lane never requires a repository shell harness.

## Install Scaniom before opening a runtime Lab

The public path uses the released standalone CLI. The full checksum-verified macOS/Linux and Windows commands are in the repository root `README.md` and `docs/PUBLIC-EXPERIENCE-RUNBOOK.md`.

## Your names, not our demo names

Scaniom does not require names such as `production`, `$YOUR_WORKLOAD`, or `$YOUR_NODE_NAME`. Those are examples only. **Use names that belong to your environment.**

Set your values once before following the examples:

```bash
export YOUR_ENVIRONMENT="production"          # choose your environment name
export YOUR_WORKLOAD="$YOUR_WORKLOAD"        # choose your workload name / slug
export YOUR_NODE_NAME="$YOUR_NODE_NAME"           # choose your Node name
export YOUR_MODEL="gpt-5-mini"               # choose the model for your real route
```

| Value used in this README | What it means | Example only | Find your existing value |
| --- | --- | --- | --- |
| `$YOUR_ENVIRONMENT` | protected Scaniom environment | `production` | `scaniom env list` |
| `$YOUR_WORKLOAD` | protected workload name/slug | `$YOUR_WORKLOAD` | `scaniom workload list` |
| `$YOUR_NODE_NAME` | **your enrolled Node name** | `$YOUR_NODE_NAME` | `scaniom node list` |
| `$YOUR_MODEL` | model used by your route/runtime | `gpt-5-mini` | `scaniom provider list` / your runtime |

Example:

```bash
scaniom node enroll "$YOUR_NODE_NAME" --env "$YOUR_ENVIRONMENT" --background

scaniom provider add openai \
  --node "$YOUR_NODE_NAME" \
  --workload "$YOUR_WORKLOAD" \
  --model "$YOUR_MODEL"
```

`$YOUR_NODE_NAME` above is **not pre-created by Open Immune**. It is simply an example value for `$YOUR_NODE_NAME`. If you already enrolled a Node, use the name shown by `scaniom node list`.

## Public experience in ten moves

1. Open Open Immune.
2. Complete OIS Auth.
3. Show the same Scaniom Control, operator, organization, environment, and workload in Web + CLI.
4. Select a Lab/system blueprint.
5. Inspect the Fabric Tree and Fabric Matrix.
6. Run the native Scaniom commands shown by Inspector at the real work surface.
7. Place/integrate the required boundary in the actual application/runtime/deployment.
8. Cause a real harmless behavior.
9. Inspect behavior and E1 trajectory.
10. Verify the E2/signed proof.

## Public authority objects

A user/team owns and operates real Scaniom objects:

```text
Scaniom account
  -> organization
     -> Control profile
        -> environment
           -> workload + Scaniom Address
              -> Node / pool
                 -> runtime identities
                    -> provider BYOK / runtime targets
                       -> environment policy / Gate
                          -> behavior
                             -> trajectory
                                -> proofs
```

## Seven-boundary map

| Boundary | Surface | Identity | Evidence | Completion proof |
| --- | --- | --- | --- | --- |
| L1 API Route | application/provider route | `l1` | `provider_proxy` | L1 trajectory + valid proof |
| L2 SDK | app/agent code | shared `l1,l2,l4` | `sdk` | pre/post + valid proof |
| L3 Model Runtime | inference host | `l3` | `runtime_hook` | pre/post + valid proof |
| L4 Sidecar | workload-local proxy | shared `l1,l2,l4` | `sidecar` | L4 trajectory + valid proof |
| L5 Environment Gateway | environment ingress | `l5` | `gateway` | attributed pre/post + valid proof |
| MCP Gateway | MCP path | `mcp` | `mcp_gateway` | tools/call pre/post + valid proof |
| L6 Provider Native | provider/runtime adapter | `l6` | `provider_native` | native guard/observe + valid proof |

## Lab catalog

| Lab | Public learning outcome | Boundary/system |
| --- | --- | --- |
| D00 | authorize Open Immune + CLI to same real Scaniom authority | OIS Auth |
| D01 | verify public release and SDK distributions | distribution |
| D02 | complete real provider-backed API route cycle | L1 |
| D03 | instrument TS/Python semantic action | L2 |
| D04 | protect existing workload through sidecar | L4 |
| D05 | Gate before inference runtime | L3 |
| D06 | protect shared environment ingress with workload attribution | L5 |
| D07 | Gate MCP tool consequence | MCP |
| D08 | guard provider/runtime-native consequence | L6 |
| D09 | build pool/binding/routing and prove failover | D1/D2/D3 |
| D10 | prove bounded offline continuity across all seven boundaries | B2 + L1-L6/MCP |
| D11 | preserve one identity/policy across multiple providers | multi-provider |
| D12 | run repeatable Immunex behavioral campaign | Immunex |
| Flagship | compose the complete Immune Fabric | all of the above |

## D10 full accepted architecture

```text
                             REAL SCANIOM CONTROL
                                      |
                         signed policy / identity / B2
                                      |
                     +----------------+----------------+
                     |                                 |
                ONLINE BASELINE                    PATH LOSS
                     |                                 X
             L1 L2 L3 L4 L5 MCP L6                    |
                     |                          same Node stays alive
              Control durability                       |
                                                       v
                                               OFFLINE-PROTECTED
                                                       |
                                      known authority continues only
                                                       |
                                      L1 L2 L3 L4 L5 MCP L6
                                                       |
                                       14 unique consequences total
                                                       |
                                      bounded signed evidence spool
                                                       |
                                      new/unknown authority denied
                                                       |
                                             Control path returns
                                                       |
                                      ordered/idempotent evidence replay
                                                       |
                                    seven E1 trajectories + seven E2 proofs
```

Accepted D10 result: all seven online and offline executions, exactly 14 unique consequences with no execution replay, local evidence buffering, Control absence during isolation, same Node/boundary processes recover without restart, seven independent trajectories, seven VALID correlated proofs. The signed 4h lease boundary is recorded; it is not simulated with a fake clock.

## Public demo rule

Do not demo Open Immune by starting with a repository script. Demo the real product surfaces. The internal harness may be run backstage before the demo as health/acceptance proof, or shown afterward as engineering rigor.

## Internal acceptance rule

```text
source change
  -> focused regression
  -> source audit
  -> typecheck
  -> full tests
  -> ESLint zero warnings
  -> production build
  -> npm run accept:local
  -> A1 LOCAL_ACCEPTED
  -> inspect git delta
  -> explicit authorization
  -> branch / push / PR / checks / merge
```

No local command implies GitHub authorization.

## Documentation source of truth

The repository must keep these synchronized:

| Surface | Responsibility |
| --- | --- |
| `lib/open-ii/labs.ts` | executable Lab manifest: steps, dependencies, native commands, placement, truth source |
| `/docs` Web route | public human Start A-Z + manifest-driven per-Lab command runbooks |
| `README.md` + `docs/start-here.md` | public repo entry + full native product model |
| `docs/LAB-COMMAND-MATRIX.md` | canonical public D00-D12/Flagship native command matrix |
| `docs/BOUNDARY-REFERENCE.md` | seven-boundary architecture/identity/evidence reference |
| `demos/dXX/README.md` | public native path first; internal harness second |
| `demos/dXX/run.sh` | internal acceptance only |
| `docs/INTERNAL-ENGINEERING-RUNBOOK.md` | patch/test/receipt/release governance |
| source audits/tests | prevent public/internal drift |

## Repository release checklist

- public Web contains no `demos/*.sh` prerequisite;
- every D00-D12/Flagship README starts with the native Scaniom path;
- every Lab manifest command is accepted by released CLI contract;
- D10 remains seven-boundary v2 and cannot close from a partial receipt;
- D09 receipts remain scope-bound;
- BYOK values remain outside Open Immune and Control;
- no private Scaniom source checkout is needed by customer-real Labs;
- no `.demo/`, backups, patch ZIPs, secrets, or tokens are staged;
- `OPEN IMMUNE INTELLIGENCE LOCAL ACCEPTANCE PASS` + `A1 LOCAL_ACCEPTED` before GitHub stage;
- push/PR/merge only with explicit operator authorization.

## Companion guides

- `docs/PUBLIC-EXPERIENCE-RUNBOOK.md`
- `docs/LAB-COMMAND-MATRIX.md`
- `docs/BOUNDARY-REFERENCE.md`
- `docs/INTERNAL-ENGINEERING-RUNBOOK.md`
- `docs/demo-standard.md`
- `docs/open-ii-lab-engine.md`
- `docs/open-ii-workbench.md`


## System Blueprints are first-class public runbooks

The Web catalog also exposes five composed systems. They are not decorative cards and they are not shell demos. Each has a native Scaniom guide:

- [`AI SaaS Operations Center`](system-blueprints/system-saas.md) — L1 + L2 + MCP
- [`Robot Fleet`](system-blueprints/system-robots.md) — L2 + L4 + L5 + MCP
- [`Autonomous Lanes`](system-blueprints/system-lanes.md) — L1 + L2 + L5 + L6
- [`AI Inference Factory`](system-blueprints/system-factory.md) — L3 + L4 + L5
- [`IFOC — Full Immune Fabric Operations Center`](system-blueprints/system-ifoc.md) — all seven boundaries

Workbench remains the live source for resolved selected-object values and evidence-driven completion.
