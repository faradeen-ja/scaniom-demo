# Repository architecture

```text
faradeen-ja/scaniom (private product source)
        │ accepted public releases
        ▼
npm / PyPI / GitHub Release / OCI / Helm / Terraform / CLI
        │
        ▼
faradeen-ja/scaniom-demo
        │
        ├── OIS Auth · real Scaniom authority
        │     profile → operator → org → environment → workload
        │
        ├── Lab Manifest Engine
        │     D00–D12 + Flagship + system blueprints
        │
        ├── Lab Fabric Workbench
        │     Library → Architecture → Tree · Matrix · Inspector · Intelligence
        │
        ├── executable public Lab scripts under demos/
        ├── public release verification
        └── Start A–Z runbooks
```

The Web app and CLI operate the same released Scaniom contracts. The public repository does not import private Scaniom implementation files.

## Open Immune vs future Scaniom Console

**Open Immune now:** choose a Lab/system, understand its architecture, then build the expected fabric from zero through real Scaniom commands and deployment/integration work.

**Future Scaniom Console Fabric Builder:** freeform production fabric authoring where customers create arbitrary environments, Nodes, pools, attachments, providers and policies.

The interaction language may converge, but Open Immune remains Lab-driven while the production Console builder becomes freeform.

## Truth boundary

OIS Auth currently verifies profile, operator identity, organization, environment and workload. Runtime/fabric execution steps unlock in Lab order but remain unverified until real Scaniom evidence proves them.
