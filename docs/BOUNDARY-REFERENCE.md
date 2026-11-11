# Open Immune Seven-Boundary Reference

This is the canonical quick reference for the seven frozen R18 attachment boundaries used by Open Immune.

## One fabric, seven entry points

```text
                          SCANIOM CONTROL
                    policy / identity / proof
                              |
                       environment authority
                              |
                         workload identity
                              |
                        SCANIOM NODE / GATE
                              |
       +---------+---------+---+---+---------+----------+---------+
       |         |         |       |         |          |         |
      L1        L2        L3      L4        L5         MCP       L6
   API route    SDK      model   sidecar   env gate   gateway   native
       |         |       runtime    |         |          |         |
       +---------+---------+--------+---------+----------+---------+
                              |
                    behavior -> trajectory -> proof
```

| Boundary | Best fit | Runtime identity | Gate position | Consequence semantics | Evidence |
| --- | --- | --- | --- | --- | --- |
| L1 | provider/model API routing | `l1` | before provider dispatch | one runtime event per call | `provider_proxy` |
| L2 | agent/app semantic actions | shared B1 `l1,l2,l4` | before app/tool consequence; observe after | pre + post | `sdk` |
| L3 | vLLM/NIM/Triton/compatible inference | explicit `l3` | before inference; observe outcome | pre + post | `runtime_hook` |
| L4 | app-local sidecar | shared B1 `l1,l2,l4` | before provider dispatch at sidecar | one runtime event per call | `sidecar` |
| L5 | explicit environment ingress | explicit `l5` | gateway guard before attributed consequence | pre + post for guard/observe | `gateway` |
| MCP | Streamable HTTP MCP | explicit `mcp` | before `tools/call` / resource consequence | pre + post | `mcp_gateway` |
| L6 | provider/runtime-native integration | explicit `l6` | immediately before native consequence | pre + post | `provider_native` |

## Identity rule

The default managed B1/F1 identity remains L1/L2/L4. L3/L5/MCP/L6 are explicit least-privilege opt-ins. Open Immune must not silently broaden or narrow identity authority.

## Offline continuity rule

B2 is Node/runtime continuity, not an L2-only feature. Existing known authority can continue inside the signed last-known-good window. New/unknown authority fails closed while Control is unavailable.

```text
online: sync policy + identity + routes + signed B2 lease
                     |
Control unavailable  X
                     |
known authority -> local Gate -> consequence -> local evidence spool
unknown authority -> DENY
                     |
Control returns -> ordered/idempotent evidence replay -> E1/E2 proof
```

Default accepted bounds:

| Bound | R18 default |
| --- | ---: |
| fresh config | 300 seconds |
| max offline | 14,400 seconds (4h) |
| credential stale allowance | 1,800 seconds (30m) |
| evidence spool | 268,435,456 bytes (256 MiB) |
| unknown authority | deny |
| bootstrap while offline | denied |
| replay | required |

## Deployment placement

| Place | Typical boundaries |
| --- | --- |
| local developer host | L1, L2, L3, L4, MCP, L6 for learning/testing |
| VM/systemd | Node + L1/L2/L3/L4/MCP/L6; L5 at shared ingress when needed |
| Docker/Compose | Node service, L4 sidecar, L3 adapter, MCP/L6 bridge |
| Kubernetes | Node pool + L2 native identity + L3/L4/L5/MCP/L6 services |
| managed K8s/private cloud | same contracts with platform-native identity and external secret stores |
| edge/physical systems | L2/L4/L6 close to consequence; Node authority remains workload-scoped |
