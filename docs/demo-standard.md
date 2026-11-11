# Lab standard

Every Open Immune Lab must state what it proves, which accepted public Scaniom artifacts it needs, where the operator must work, what real identity and protected scope are required, which attachment boundary is exercised, which provider/runtime credentials stay at the Node or enterprise secret boundary, what traffic is real, what evidence should appear, and which command proves completion.

A Lab must guide the operator end-to-end instead of jumping directly to an attachment command. Where relevant, the runbook covers public release verification, Scaniom CLI installation, OIS Auth, environment/workload scope, Scaniom Address, Node, policy, provider BYOK, runtime identity, application/runtime/deployment integration, real traffic, Gate/trajectory and signed proof.

No Lab may import from `../scaniom`, execute `scripts/scaniom-cli.mjs` from private source, require an unpublished package, copy provider keys into Open Immune, or mark a step complete without real Scaniom state/evidence.


## Installed CLI authority contract

All customer-real Lab runtime operations use the released `scaniom` command or the equivalent Scaniom Control/Web authority. Shell harnesses under `demos/` exist only for engineering/CI acceptance; they are never a customer prerequisite, never appear as the normal Lab workflow, and never replace Control/CLI authority.

Before a Lab can create or mutate environment, workload, Node, policy, attachment, traffic or proof state, it must verify:

1. Open Immune Web has an active HttpOnly operator session for the selected Control profile.
2. `scaniom` resolves from the operator installation outside the Open Immune repository.
3. `scaniom version --json` is accepted `R18 / 0.4.2`.
4. CLI profile URL/type matches the selected Open Immune Control profile.
5. `scaniom auth status` and `scaniom whoami` succeed.

Web and CLI credentials remain separate. Their parity is the shared Scaniom Control state, not credential sharing.

Deeper runtime boundaries are least-privilege opt-ins. In particular, D05/L3 must verify a real active model-runtime inventory from Scaniom Control, explicit `l3` workload runtime-identity scope, `runtime_hook` evidence, and an attachment-specific signed proof. It must not infer completion from a configured diagram or from unrelated L1/L2/L4 evidence.


## Two-lane documentation contract

Every Lab must document both lanes without mixing them:

1. **Public / native Scaniom flow first** - Workbench, real Control, installed released CLI/SDK/runtime, exact placement/integration, live evidence and proof.
2. **Internal / engineering acceptance second** - optional `demos/dXX/run.sh` automation for maintainers/CI.

The public Web Start A-Z surface must never display repository `run.sh` commands. Per-Lab READMEs may document the internal harness only under a clearly labeled internal section. The Lab manifest remains the executable source of public steps and commands.


## Complete catalog documentation contract

The public documentation surface covers both focused Labs (D00-D12 + Flagship) and all five System Blueprints. System Blueprint definitions remain manifest-owned in `lib/open-ii/labs.ts`, are rendered by Workbench and Web Start A-Z, and have repo guidebooks under `docs/system-blueprints/`. They do not introduce a second execution engine or a public `run.sh` path.
