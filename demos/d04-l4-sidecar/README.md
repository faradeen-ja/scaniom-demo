# D04 — L4 Sidecar

D04 is completed from the Open Immune Workbench using real Scaniom state and L4/sidecar evidence. Normal users do not run this directory's shell harness.

Product path:

1. Connect Open Immune to Scaniom Control and select the real environment/workload.
2. Establish or reuse the shared B1 `l1,l2,l4` runtime identity.
3. Start/place the released L4 sidecar with `scaniom attach l4 ...` or the equivalent deployment materialization.
4. Point real workload traffic at the sidecar boundary.
5. Open Immune refreshes live attachment/evidence/proof state; L4 verifies only after `sidecar` evidence exists for the selected workload.

`run.sh` is retained only as an internal engineering/CI acceptance harness.
