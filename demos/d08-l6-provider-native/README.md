# D08 — L6 Provider Native

D08 proves the released Scaniom 0.4.2 **generic provider-native framework** without pretending Scaniom ships undocumented or privileged vendor hooks.

## Public learning flow

A normal Open Immune user works through the Workbench and released Scaniom CLI:

1. select the real environment/workload;
2. verify the real Node and environment policy;
3. create/reuse an explicit `l6`-scoped `scn_ri_v1` runtime identity;
4. register the legitimate provider/runtime adapter identity;
5. run the L6 bridge at the adapter boundary;
6. the adapter sends metadata/capabilities/targets plus an optional SHA-256 context digest to `/v1/guard`;
7. only when Gate permits, the adapter performs its provider/runtime-specific consequence;
8. the adapter sends `/v1/observe` with the pre-behavior parent and outcome;
9. verify `provider_native` **pre + post** trajectory and a VALID L6 correlated proof.

`scaniom attach test l6` is a useful released connectivity check, but it intentionally performs a **synthetic guard only**. It does not execute a provider consequence and does not fabricate post-observe evidence, so that command alone cannot close D08.

## Reference execution harness

`run.sh` is the engineering/reference acceptance harness, not the primary public Lab UI. It uses the installed source-independent Scaniom 0.4.2 CLI and a harmless custom provider-native reference adapter.

The reference adapter's one real consequence is a local append-only audit record under `.demo/d08/`. The record contains only adapter identity, event kind, a SHA-256 context digest and a consequence ID. Raw prompt/content is neither sent to the generic L6 bridge nor persisted in the reference ledger.

The generic bridge never owns/retries the provider consequence. Vendor-specific privileged adapters remain separate integrations that must use legitimate documented provider/runtime interfaces.
