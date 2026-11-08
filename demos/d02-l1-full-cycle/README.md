# D02 — L1 Full Cycle

Real application/provider traffic through Scaniom Node / L1. Provider credentials remain Node-local.

Run:

```bash
./demos/d02-l1-full-cycle/run.sh
```

The flow reuses the real Scaniom authority already exposed in Open Immune: environment, workload, Scaniom Address, policy, Node, provider route and L1 attachment. It then sends a real provider-backed request, inspects live/trajectory state and requires signed proof evidence for the selected workload before reporting PASS.

Open Immune does not create a second proof system. The Workbench reads the existing authenticated Scaniom operator proof endpoints and marks `Signed proof` VERIFIED only when the selected workload has valid signed evidence.
