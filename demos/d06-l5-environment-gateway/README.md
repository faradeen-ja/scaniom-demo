# D06 — L5 Environment Gateway

D06 is a Workbench-first real Scaniom L5 flow. Normal Open Immune users operate it through the Workbench and the released standalone `scaniom` CLI. `run.sh` is the internal engineering / acceptance harness and uses the same public Scaniom contracts a customer deployment uses.

## Accepted D06 core path

D06 closes on a **provider-neutral authenticated L5 Gate action**, not on the existence of a provider route:

```text
selected workload
    │  x-scaniom-workload-id
    │  Authorization: Bearer scn_ri_v1… · explicit l5 scope
    ▼
L5 Environment Gateway :8791
    │  /v1/guard
    ▼
Scaniom Node fabric :8787
    │  current runtime generation
    │  environment policy + Gate
    ▼
behavior event · E1 trajectory · E2 correlated proof
```

The core execution path is `POST /v1/guard`. It proves the L5 boundary even when the selected workload intentionally has **zero provider routes**. Provider-backed `/v1/responses` remains an additional proof when the workload has a real BYOK route; it is not a prerequisite for proving L5 itself.

## What D06 proves

1. OIS Auth proves Open Immune Web and the installed public CLI are connected to the same Scaniom Control using separate approved sessions.
2. The selected environment/workload has a signed Scaniom Address, an online Node, and active environment policy.
3. The workload uses explicit least-privilege `l5` runtime-identity scope.

   ```bash
   scaniom runtime identity bootstrap \
     --workload scaniom-demo-agent \
     --attachments l5 \
     --json
   ```
4. A one-time bootstrap is exchanged through the live Node into `credential.token`; the bootstrap token itself is never used as runtime bearer authority.
5. Token generation and Control generation must converge before execution.
6. The Node is forced through a fresh signed Control synchronization. If the public Node briefly returns `scaniom_runtime_generation_stale`, the harness retries only that convergence condition; every other authorization error fails immediately.
7. The L5 gateway must report `attachment=l5` and its `nodeUrl` must exactly equal `SCANIOM_NODE_URL` (default `http://127.0.0.1:8787`). The harness passes `--node-url` explicitly so the gateway listen port never becomes the Node fabric port.
8. A harmless real `custom_action` is sent through `POST /v1/guard` with explicit workload attribution and the L5-scoped runtime identity.
9. The gateway `forwarded` counter must increase.
10. The exact returned behavior event must appear in the selected-workload E1 trajectory with `attachmentSource=gateway` / L5.
11. `scaniom proof correlated verify <correlation>` must return a valid E2 proof whose attachment levels include L5.

The historical evidence field remains `attachment_source=gateway`; the current R18 attachment level is **L5**.

## Optional provider-route proof

When a real provider route exists for the workload, add the provider-backed execution proof explicitly:

```bash
SCANIOM_D06_PROVIDER_PROBE=1 \
SCANIOM_RUNTIME_TOKEN='<current l5 scn_ri_v1 token>' \
bash demos/d06-l5-environment-gateway/run.sh
```

That enables the released command:

```bash
scaniom attach test l5 \
  --workload <workload> \
  --gateway-url http://127.0.0.1:8791 \
  --model <model> \
  -- "Say hello in one sentence"
```

Provider credentials remain Node-local / customer-secret-store owned. Open Immune never stores provider secret values.

## Failure semantics

- Node not `READY`, Control not connected, or continuity not online → fail before bootstrap/exchange.
- Missing `l5` scope → fail.
- Bootstrap returned but not exchanged into `credential.token` → fail.
- Token generation and Control generation differ → fail; do not rotate repeatedly.
- Temporary Node snapshot generation lag → force signed config sync and retry only `scaniom_runtime_generation_stale`.
- Gateway points at the wrong Node URL → fail.
- Missing `x-scaniom-workload-id` or invalid runtime identity → fail closed.
- Gateway does not forward the request → fail.
- Wrong-workload, wrong-attachment, or missing E1 trajectory → fail.
- Missing/invalid E2 correlated proof or proof without L5 → fail.
- No provider route → **does not fail the core L5 acceptance**; provider-backed `/v1/responses` is optional.

## Workbench completion

The D06 Inspector stays evidence-driven. It may show the configured gateway and explicit L5 authority, but D06 is complete only when live Scaniom evidence for the selected workload proves the L5 boundary and signed proof path.
