# Open Immune Internal Engineering, Acceptance, and Release Runbook

**Audience:** Open Immune maintainers, Scaniom engineers, release owners, CI maintainers, future team members.

**Hard boundary:** `demos/dXX/run.sh` is an engineering acceptance robot. It is not the public product workflow, not a replacement CLI, not an API layer, and not a prerequisite users should learn.

```text
PUBLIC / HUMAN                         INTERNAL / CI
Workbench                              demos/dXX/run.sh
   |                                       |
real Scaniom CLI/Web/SDK/runtime       same released Scaniom contracts
   |                                       |
live state + evidence                 deterministic acceptance checks
   |                                       |
user learns/builds                    credential-free receipt / PASS
```

## 1. Why the harness exists

The harness answers a release-engineering question: **does the Lab still work end-to-end against released Scaniom artifacts?** It automates repetitive setup, convergence waits, negative checks, evidence verification, cleanup, and receipt generation. It must never create a second authority system or fake a successful boundary.

Every harness must use the installed released Scaniom CLI/runtime. It may not import the private Scaniom source checkout as its runtime.

## 2. Local change lifecycle

From the Open Immune repository root:

```text
change request
   |
transactional ZIP patch under up-patches/
   |
backup affected files
   |
apply source change
   |
focused regressions
   |
source audit
   |
typecheck
   |
all tests
   |
ESLint --max-warnings=0
   |
production build
   |
full local acceptance
   |
A1 LOCAL_ACCEPTED
   |
review git diff / secrets / generated files
   |
only after explicit authorization: branch -> push -> PR -> checks -> merge
```

Canonical acceptance:

```bash
OPEN_II_CANDIDATE="<candidate-name>" npm run accept:local
```

Expected terminal authority:

```text
OPEN IMMUNE INTELLIGENCE LOCAL ACCEPTANCE PASS
A1 LOCAL_ACCEPTED
No GitHub push/PR/merge/deploy has been authorized by this command.
```

## 3. Before any Lab harness runs

The shared authority contract must prove:

1. Open Immune Web has an approved session for the selected Scaniom Control.
2. the installed `scaniom` executable is source-independent and R18/0.4.2 accepted;
3. CLI profile matches the selected Control;
4. `scaniom auth status` and `scaniom whoami` succeed;
5. Web and CLI prove parity without token sharing;
6. the protected environment/workload scope exists;
7. provider/runtime secrets never enter Open Immune.

Do not create an Open Immune-specific CLI home. Do not shadow the user's real CLI session. Do not use a private source launcher.

## 4. Harness matrix

| Lab | Internal harness purpose | Primary acceptance authority |
| --- | --- | --- |
| D00 | Web/CLI authorization parity | real Scaniom device auth + whoami |
| D01 | public distribution integrity | GitHub release + standalone CLI + npm + PyPI receipt |
| D02 | L1 provider cycle | provider_proxy evidence + signed proof |
| D03 | L2 TS/Python SDK | sdk pre/post evidence + signed proof |
| D04 | L4 sidecar | sidecar runtime evidence + proof |
| D05 | L3 inference runtime | runtime_hook pre/post + proof |
| D06 | L5 environment gateway | gateway evidence + proof |
| D07 | MCP gateway | mcp_gateway tools/call pre/post + proof |
| D08 | L6 provider-native | provider_native guard/observe + proof |
| D09 | D1/D2/D3 fleet/failover | pool/binding/routing + failover trajectory + proof + receipt |
| D10 | B2 seven-boundary offline continuity | real path loss + spool/replay + seven proofs + v2 receipt |
| D11 | multiple provider routes | same workload identity across real routes + trajectory |
| D12 | Immunex | real Scaniom runtime campaign + evidence |
| Flagship | complete fabric visibility | all seven boundaries + fleet/provider/continuity/proof |

Internal invocation pattern:

```bash
bash demos/d00-account-auth/run.sh
bash demos/d01-public-install/run.sh
bash demos/d02-l1-full-cycle/run.sh
bash demos/d03-l2-agent-sdk/run.sh
bash demos/d04-l4-sidecar/run.sh
bash demos/d05-l3-model-runtime/run.sh
bash demos/d06-l5-environment-gateway/run.sh
bash demos/d07-mcp-gateway/run.sh
bash demos/d08-l6-provider-native/run.sh
bash demos/d09-fleet-failover/run.sh
bash demos/d10-offline-continuity/run.sh
bash demos/d11-multi-provider/run.sh
bash demos/d12-immunex/run.sh
bash demos/flagship-full-fabric/run.sh
```

These commands belong in this internal guide and the per-Lab **Internal acceptance** sections - never in the public Web Start A-Z workflow.

## 5. D10 accepted engineering contract

D10 is a good model for how a harness can be deep without becoming a product layer.

```text
real Control authority
   |
transparent local transport relay (transport only, never authority)
   |
D10-owned released Scaniom Node
   |
pre-isolation all-seven scn_ri_v1 authority
   |
online L1/L2/L3/L4/L5/MCP/L6 consequences
   |
confirm Control durability
   |
cut only Node -> Control transport
   |
OFFLINE-PROTECTED
   |
new bootstrap denied
   |
offline L1/L2/L3/L4/L5/MCP/L6 consequences
   |
14 unique consequences total / no execution replay
   |
local evidence spool / no Control visibility
   |
restore same transport without Node or boundary restart
   |
ordered idempotent replay
   |
seven E1 trajectories (attachment-specific)
   |
7 VALID E2 correlated proofs
```

Accepted D10 does **not** time-warp the 4h expiry. It records the signed bound truthfully and proves immediate fail-closed new authority plus real offline continuation/recovery.

## 6. Receipt rules

A local receipt must be:

- credential-free;
- scoped to the exact environment/workload and, where relevant, pool/correlation/proof IDs;
- written only after all required real checks pass;
- ignored by git under `.demo/`;
- incapable of closing another workload's Lab;
- versioned when the acceptance contract materially expands.

D10 v2 is the example: the earlier L2-only core receipt cannot satisfy full seven-boundary D10.

## 7. Patch standard

Every distributed change package should be transactional:

```text
up-patches/<PATCH>/<PACKAGE>/install.sh
```

The installer should:

- verify repository root;
- back up touched files under `.open-ii-backups/`;
- apply idempotently or fail with a clear precondition;
- run `git diff --check` where appropriate;
- run focused tests first;
- run source audit;
- run TypeScript validation;
- run full tests;
- run ESLint with zero warnings;
- run production build;
- run `npm run accept:local`;
- print an explicit PASS banner;
- never push, create a PR, merge, or deploy.

## 8. Pre-commit repository hygiene

```bash
git status --short
git diff --check
git diff --stat
```

Never stage:

```text
.demo/
.open-ii-backups/
up-patches/
*.zip
.env.local
provider keys
runtime bootstrap/token values
private CA material
```

Inspect the staged delta:

```bash
git diff --cached --check
git diff --cached --stat
git status --short
```

## 9. GitHub release stage - only after explicit authorization

Example branch/PR sequence after A1 acceptance:

```bash
git switch -c open-ii/<closeout-branch>
git add <accepted-source-files>
git diff --cached --check
git commit -m "<accepted change>"
git push -u origin open-ii/<closeout-branch>

gh pr create --base main --head open-ii/<closeout-branch> --title "<title>" --body "<accepted scope>"
gh pr checks --watch
```

Merge only after checks pass **and** the operator explicitly authorizes merge:

```bash
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only origin main
```

No installer, test, or local acceptance command is authorization to push or merge.

## 10. Adding a future Lab

A new Lab is incomplete until all of these agree:

```text
lib/open-ii/labs.ts manifest
        |
Workbench Tree/Matrix/Inspector
        |
public native runbook
        |
per-Lab README public section
        |
internal harness (when automation is useful)
        |
source audit + tests
        |
real execution evidence / receipt rules
```

The public manifest and docs must name only commands supported by the released Scaniom CLI contract. Internal automation may orchestrate those commands, but cannot introduce a second user-facing command language.
