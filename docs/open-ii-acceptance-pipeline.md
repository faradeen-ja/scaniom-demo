# Open Immune local-first ship flow

Open Immune intentionally uses a lightweight engineering flow.

```text
versioned up-patch
  ↓
bash install
  ↓
local fixes / localhost verification
  ↓
npm run accept:local
  ↓
LOCAL PASS
  ↓
npm run ship -- <slice>
  ↓
branch → commit → push → PR
  ↓
GitHub checks
  ↓
green-only squash merge
  ↓
main
```

The PR conversation records local acceptance, GitHub check status and the merged SHA.

Open Immune does not require Vercel, an accepted-build ledger, signed provenance receipts, or Product History entries. Those belong to Scaniom product releases in the private Scaniom repository.
