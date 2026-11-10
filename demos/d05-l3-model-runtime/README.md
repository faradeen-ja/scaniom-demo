# D05 — L3 Model Runtime

D05 is a Workbench-first real Scaniom L3 flow. Normal users do not run this directory's shell harness.

## What D05 proves

A selected Scaniom workload can place Gate immediately before a real inference runtime, preserve workload/session lineage, and emit `runtime_hook` evidence into the same trajectory and signed-proof system used by the rest of the Immune Fabric.

Supported released R18 / 0.4.2 runtime kinds:

- `vllm`
- `nvidia_nim`
- `triton` — HTTP V2 JSON inference/generate paths
- `openai_compatible`

Triton gRPC and the HTTP binary tensor extension are not claimed by the released G1 contract.

## Real Workbench path

1. Complete OIS Auth and select the real organization, environment and workload.
2. Issue/verify the workload Scaniom Address, online Node and environment policy.
3. Run the real inference target and register it with `scaniom attach l3 ...` or Scaniom Control. Open Immune reads `/api/v1/operator/model-runtimes` and does not mark the target complete from a click.
4. Opt the workload into the deeper L3 runtime-identity scope with `scaniom runtime identity bootstrap --workload <workload> --attachments l3`. L3 is explicit opt-in; it does not replace the default B1 `l1,l2,l4` scope.
5. Start the released L3 runtime adapter beside the inference runtime and send a real harmless inference request through `scaniom attach test l3`. Gate executes before the upstream model runtime is invoked.
6. Refresh Open Immune. L3 closes only when the selected workload has L3 attachment evidence and a valid signed proof with `attachment_source=runtime_hook`.

If Gate blocks, the model runtime is never invoked. If dispatch may already have reached the runtime and a failure is ambiguous, the adapter does not automatically replay the inference request.

Provider/runtime credential values remain at the protected runtime boundary. Scaniom Control stores only endpoint metadata and an optional environment-variable secret reference. Open Immune never receives the credential value or runtime token.

`run.sh` is retained only as an internal engineering/CI acceptance harness.
