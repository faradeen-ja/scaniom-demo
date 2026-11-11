# D00 - OIS Auth

> **D00 · OIS AUTH** · **PUBLIC / NATIVE SCANIOM FIRST** · `run.sh = INTERNAL / ACCEPTANCE ONLY`

```mermaid
flowchart LR
    WEB["Open Immune Web"] --> CTRL["Scaniom Control"]
    CLI["installed scaniom CLI"] --> CTRL
    CTRL --> ORG["same organization"]
    classDef immune fill:#132015,stroke:#a9ff54,color:#f0ffe6,stroke-width:2px;
    classDef oii fill:#0b1416,stroke:#55e6d2,color:#eafffb,stroke-width:2px;
    classDef evidence fill:#171326,stroke:#a88cff,color:#f2edff,stroke-width:2px;
    class CTRL,CLI,ORG immune;
    class WEB oii;
```

**Public path:** Workbench + real Scaniom Web/CLI authority. Normal users do not run this directory's shell harness.

## Public / native Scaniom flow

1. Select the Cloud or explicit self-hosted/private profile in Open Immune.
2. Verify the same Control from the installed CLI.
3. Authorize CLI and Open Immune separately through Scaniom device authorization.
4. Confirm the same operator and organization.

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom whoami
scaniom auth status
```

```text
Browser -> OIS Auth -> Scaniom Control <- installed Scaniom CLI
                        |
                  same organization
```

No browser token is shared with the CLI and no CLI credential is copied into the browser.

## Completion

D00 completes from real Scaniom profile, identity, and organization authority.

## Internal / engineering acceptance

`run.sh` is an engineering/CI parity harness. It is not the public learning workflow.

```bash
bash demos/d00-account-auth/run.sh
```
