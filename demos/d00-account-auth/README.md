# D00 — Account + Auth

Proves a real operator can use the selected Scaniom Control profile for Web + CLI identity.

Default public path:

```text
profile  cloud
Control  https://control.scaniom.com
signup   https://control.scaniom.com/signup
login    https://control.scaniom.com/login
```

`run.sh` installs the accepted public CLI and starts Scaniom browser device authorization. The password remains in Scaniom Control; the CLI receives a scoped operator session only after approval.

For self-hosted or private-enterprise demonstrations, set `SCANIOM_PROFILE`, `SCANIOM_PROFILE_TYPE`, `SCANIOM_CONTROL_URL`, and when required `SCANIOM_CA_FILE` before running D00.
