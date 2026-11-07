# Repository architecture

```text
faradeen-ja/scaniom (private product source)
        │ accepted public releases
        ▼
npm / PyPI / GitHub Release / OCI / Helm / Terraform / CLI
        │
        ▼
faradeen-ja/scaniom-demo (this public repository)
        │
        ├── Open Immune Intelligence Web
        │     profile → auth → org → environment/workload → future Fabric workbench
        │
        ├── D00–D12 + flagship executable labs
        ├── public artifact verification
        └── public runbooks
```

The Web app and CLI operate the same released Scaniom contracts. The repository does not import implementation files from the private Scaniom source tree.

## Locked UI direction

The later Open Immune workbench uses four major surfaces:

1. left guided Fabric Tree / demo progression,
2. center live Fabric Matrix/topology,
3. right inspector/actions,
4. bottom live behavior/Gate/trajectory/CLI/proof intelligence surface.

A later production Scaniom Console Fabric Builder can reuse the interaction model, but Open Immune remains the public guided engineering experience.
