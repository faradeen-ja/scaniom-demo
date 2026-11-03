# Scaniom Demo

Customer-real demonstrations of **Scaniom R18 / 0.4.1** using only released public artifacts.

This repo is intentionally separate from the private Scaniom product source. A demo may install, configure, exercise, and verify Scaniom. It must never patch Scaniom.

## Start

```bash
./scripts/doctor.sh
./demos/d00-account-auth/run.sh
./demos/d01-public-install/run.sh
./demos/d02-l1-full-cycle/run.sh
```

## Series

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

See `docs/demo-standard.md`.
