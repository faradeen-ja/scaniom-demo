# Authentication

The public Cloud authority is:

- signup: `https://control.scaniom.com/signup`
- login: `https://control.scaniom.com/login`
- Control/API: `https://control.scaniom.com`

The public product site `https://scaniom.com` is not the CLI/API Control origin.

Real CLI auth:

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom auth status
scaniom whoami
```

`scaniom login` uses Scaniom browser device authorization. The Web password remains in the browser on the selected Control.

Open Immune Intelligence uses the same approved device authorization contract for its Web-to-Control connection. It never reads or copies the host-only Scaniom browser session cookie.

See `open-ii-authentication.md` for the complete flow.

## Open Immune ↔ Scaniom CLI parity

Open Immune Web and the installed Scaniom CLI are separate approved operator sessions against the same selected Scaniom Control. Open Immune never copies the CLI credential into the browser and never copies its HttpOnly Web session into the CLI.

Customer-real Labs require both authorities before they mutate fabric/runtime state:

```bash
scaniom version --json
scaniom profile test cloud
scaniom auth status
scaniom whoami
```

The CLI executable must resolve outside the Open Immune repository. Repo-local `bin/scaniom`, `.demo/runtime/bin/scaniom`, source-repo launchers, and shell-script aliases are not accepted as Lab authority.
