# Source baseline

Repository: `faradeen-ja/scaniom-demo`

Upstream public baseline:

```text
main
41e56f30aa308841e82397b9c0413c8ed06f3dea
Initialize Scaniom public demo program
```

This bundle preserves that exact Git commit and `origin` remote locally. The Open Immune Intelligence A0 profile/auth foundation is applied in the working tree but is intentionally not pushed, merged, or deployed.

That state is deliberate:

1. Install dependencies locally.
2. Run local A1 acceptance.
3. Fix locally until clean.
4. Only then authorize Stage 2 to create commits/branch/PR, run GitHub integration checks when available, then merge.

Future source changes arrive through repo-local `up-patches/` packages.
