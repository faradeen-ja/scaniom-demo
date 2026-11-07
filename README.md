# Open Immune Intelligence

**Public engineering experience powered by released Scaniom contracts.**

This repository remains intentionally separate from the private Scaniom product source. It now has two complementary surfaces:

1. **Open Immune Intelligence Web** — profile, identity, organization, environment and workload context; later the guided Fabric Tree / Fabric Matrix / live intelligence workbench.
2. **Executable D00–D12 + Flagship demos** — customer-real demonstrations that install, configure, exercise and verify accepted public Scaniom artifacts. A demo may use Scaniom; it must never patch private Scaniom source.

## A0 foundation

This slice establishes the authority layer before the visual Fabric Builder:

```text
Open Immune host
  open-ii.scaniom.com / company domain / local deployment
        │
        ▼
Scaniom Control profile
  cloud (default) / self-hosted / private-enterprise / staging / local
        │
        ▼
real Scaniom authorization
  browser approval on selected Control
        │
        ▼
identity + organization
        │
        ▼
environment + workload workspace
        │
        ├── Open Immune Web
        └── Scaniom CLI parity
```

Default public Control is **`https://control.scaniom.com`**. `https://scaniom.com` remains the public product site.

## Local Web start

From the repository root:

```bash
bash scripts/open-ii-bootstrap.sh
bash scripts/open-ii-local-acceptance.sh
npm run dev
```

Open `http://localhost:3000`.

The bootstrap creates `.env.local` with a random local session secret when one does not already exist, installs the pinned Web dependencies, and creates `package-lock.json`. Keep that lockfile with the accepted candidate.

## Real Scaniom connection

The Web app does **not** maintain a second password database and does not share the Scaniom Control browser cookie across domains.

1. Select a Control profile (`cloud` by default).
2. Choose **Connect Scaniom**.
3. Open the authorization URL on that Scaniom Control.
4. Sign in there if required and approve the matching code.
5. Open Immune validates `/api/v1/operator/whoami` and loads real organization/environment/workload context.

CLI parity for the default profile:

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom auth status
scaniom whoami
```

See `docs/open-ii-authentication.md` and `docs/open-ii-profiles.md`.

## Existing demo program

```bash
./scripts/doctor.sh
./demos/d00-account-auth/run.sh
./demos/d01-public-install/run.sh
./demos/d02-l1-full-cycle/run.sh
```

Series:

- D00 — real account + Web/CLI auth
- D01 — clean public install
- D02 — L1 full cycle
- D03 — L2 agent SDK
- D04 — L4 sidecar
- D05 — L3 model runtime
- D06 — L5 environment gateway
- D07 — MCP gateway
- D08 — L6 provider-native framework
- D09 — fleet + failover
- D10 — offline continuity
- D11 — multi-provider
- D12 — Immunex
- Flagship — all seven boundaries

## Repository boundary

The public repo consumes published artifacts only. `scripts/doctor.sh`, the repository-integrity workflow and `scripts/open-ii-source-audit.mjs` reject private-source coupling.

The future Open Immune workbench must visualize and drive these public contracts; it must not copy private Scaniom implementation code.

## Acceptance

A0 local acceptance:

```bash
npm run accept:local
```

A successful run ends with:

```text
A1 LOCAL_ACCEPTED
```

That command does **not** push, create a PR, merge or deploy. Remote Stage 2 begins only when explicitly authorized under the Scaniom Acceptance Pipeline.
