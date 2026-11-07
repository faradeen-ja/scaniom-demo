# Open Immune Intelligence — Real Scaniom Authentication

Open Immune does not create a parallel account/password system.

## Why the Control cookie is not shared

The Scaniom browser session is a host-only HttpOnly cookie on the selected Control. `open-ii.scaniom.com` therefore cannot and should not read the `control.scaniom.com` session cookie. This preserves the Control security boundary.

## Device authorization bridge

Open Immune reuses the released Scaniom device authorization contract:

```text
Open Immune
  POST selected-Control /api/v1/cli/device/start
        ↓
  receives device code + user code + verification path
        ↓
operator opens selected Scaniom Control
        ↓
  Control login if needed
        ↓
  approve matching authorization code
        ↓
Open Immune polls
  POST selected-Control /api/v1/cli/device/token
        ↓
  approved scn_cli_ operator session
        ↓
Open Immune validates
  GET /api/v1/operator/whoami
        ↓
identity + organization + role
```

The user's Scaniom password stays on Scaniom Control.

## Open Immune session handling

The approved Control token is stored only in an encrypted, HttpOnly, host-scoped Open Immune cookie. It is not returned to browser JavaScript and is not placed in localStorage.

`OPEN_II_SESSION_SECRET` is required in production and must be at least 32 characters. The local bootstrap generates a random development secret in `.env.local`.

Open Immune caps its application session (default 12 hours) even when the underlying Scaniom operator credential may be valid longer.

On sign out, Open Immune attempts `/api/v1/cli/session/revoke` on the selected Control and always clears its local session state.

## Identity and workspace

After authorization Open Immune reads real operator state:

- `/api/v1/operator/whoami`
- `/api/v1/control/deployment`
- `/api/v1/operator/environments`
- `/api/v1/operator/workloads`

The organization belongs to the Scaniom authorization. Environment/workload selection is validated against the live Control before Open Immune stores the workspace choice.

## Web + CLI parity

Web and CLI do not literally share a local config file. They share the same **Control profile contract and authority**.

The CLI stores its profiles in the Scaniom CLI configuration; Open Immune stores its Web profile metadata in its own encrypted cookie. Both target the same Control and expose the same user/organization/runtime objects.

## Rate-limit identity through the Web bridge

Open Immune forwards only a syntactically valid client IP from the deployment proxy (`x-forwarded-for` first hop or `x-real-ip`) on Scaniom device-start/token calls. This preserves Scaniom's existing per-client auth rate-limit behavior instead of collapsing all Open Immune users onto one server-egress identity. Browser JavaScript never controls this header directly.
