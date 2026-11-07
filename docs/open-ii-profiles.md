# Open Immune Intelligence — Scaniom Control Profiles

Open Immune follows the released Scaniom CLI profile contract instead of inventing a second deployment model.

## Profile types

```text
local
cloud
self-hosted
private-enterprise
staging
```

**Enterprise is a commercial/operational context, not a sixth profile type.** A profile named `company` or `enterprise` normally uses `private-enterprise` or `self-hosted`.

The public default is:

```text
name     cloud
type     cloud
Control  https://control.scaniom.com
```

Remote profiles require HTTPS. Local profiles are loopback-only and work only when Open Immune itself runs locally.

## Runtime placement is independent

A Control profile answers **where management authority lives**. Runtime/Fabric placement answers **where protected AI execution lives**.

Cloud Control can manage local machines, VMs, Docker, Kubernetes, managed cloud or private infrastructure. A private-enterprise Control can manage the same attachment/runtime contracts inside a private network.

## Web profile storage

Browser-added profiles store only non-secret metadata in an encrypted HttpOnly Open Immune cookie:

- name
- label
- type
- Control origin

They cannot enable private-network access or custom CA material.

Deployment-managed enterprise profiles are defined server-side with `OPEN_II_PROFILES_JSON`. They may opt into private-network reachability and may reference a server environment variable containing CA PEM material. In production, a server-managed profile is exposed only on the hostname explicitly mapped to that profile; it is not leaked through the public Cloud hostname.

Private-network opt-in permits RFC1918/CGNAT/ULA enterprise addressing. Loopback, link-local/cloud-metadata, multicast, unspecified and documentation ranges remain blocked for remote profiles.

Example deployment configuration:

```text
OPEN_II_PROFILES_JSON=[{"name":"company","label":"Company Private","type":"private-enterprise","controlUrl":"https://control.company.example","allowPrivateNetwork":true,"caEnv":"COMPANY_CONTROL_CA_PEM"}]
COMPANY_CONTROL_CA_PEM=<PEM value in deployment secret storage>
```

For a private intranet address to work, the Open Immune deployment itself must have network reachability to that Control. The public Vercel deployment cannot magically reach an isolated customer LAN.

## Host-to-profile defaults

`OPEN_II_HOST_PROFILE_MAP_JSON` can select the initial profile for a hostname when the browser has not chosen one yet.

```text
{"open-ii.scaniom.com":"cloud","company.scaniom.com":"company"}
```

The same codebase can therefore serve the public Cloud experience and a company-specific deployment/hostname without hardcoding Control origins in application code.

## Control verification parity

Before device authorization begins, Open Immune verifies the selected target using the same Control identity contract as `scaniom profile test`:

- `/api/v1/control/deployment` is reachable
- `apiContract` is `scaniom-control-v1`
- `authProtocol` is `scaniom-cli-device-v1`
- a deployment identity is present
- the Control-reported canonical origin exactly matches the selected profile origin

The Profiles screen also exposes **Test Control** so an operator can verify any configured profile before activating or authenticating it. A generic HTTPS server is not accepted as Scaniom Control.

## Cross-profile credential rule

Switching active profile clears:

- Open Immune Scaniom operator session
- pending authorization attempt
- environment/workload selection

A session minted by one Control is never forwarded to another Control.

## CLI parity

Open Immune shows the exact conceptual equivalent of its active Web profile:

```bash
scaniom profile add company --control https://control.company.example --type private-enterprise
scaniom profile use company
scaniom profile test company
scaniom login
scaniom auth status
scaniom whoami
```

Custom enterprise CA files remain local to the CLI host and are never uploaded through the browser profile editor.
