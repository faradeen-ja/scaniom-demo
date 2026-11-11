# Open Immune Intelligence - local engineering start

This file is for repository contributors and maintainers. Public users should start in the Web `Start A-Z` guide and Workbench and use the installed released Scaniom CLI; they do not need repository acceptance scripts.

## Open in VS Code

```bash
cd OPEN-IMMUNE-INTELLIGENCE
code .
```

## Install web dependencies

```bash
npm install
bash scripts/open-ii-bootstrap.sh
```

`open-ii-bootstrap.sh` prepares Open Immune's local web environment. It does not replace Scaniom authentication, Node authority, or provider/runtime credentials.

## Run repository acceptance

```bash
OPEN_II_CANDIDATE="local-change" npm run accept:local
```

Required closeout:

```text
OPEN IMMUNE INTELLIGENCE LOCAL ACCEPTANCE PASS
A1 LOCAL_ACCEPTED
No GitHub push/PR/merge/deploy has been authorized by this command.
```

## Start the local Web experience

```bash
npm run dev
```

Open `http://localhost:3000`.

Public/customer Lab work then happens through:

```text
Open Immune Workbench
  -> OIS Auth
  -> installed released scaniom CLI
  -> real Scaniom Control / Node / SDK / runtime boundaries
  -> behavior / trajectory / proof
```

## Internal Lab harnesses

Files under `demos/` are internal engineering/CI acceptance harnesses. They automate the same released Scaniom contracts for regression and closeout; they are not another user-facing CLI and are not the public Lab workflow.

See:

- `docs/PUBLIC-EXPERIENCE-RUNBOOK.md`
- `docs/LAB-COMMAND-MATRIX.md`
- `docs/BOUNDARY-REFERENCE.md`
- `docs/INTERNAL-ENGINEERING-RUNBOOK.md`
- `docs/OPEN-IMMUNE-END-TO-END-PACKET.md`

## Future changes

Normal build/fix/update packages go under repo-local `up-patches/`. Apply them from this repository root, run the complete local acceptance gate, inspect the git delta, and only then enter the GitHub stage if explicitly authorized.
