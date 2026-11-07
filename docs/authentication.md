# Authentication

The public Cloud authority is:

- signup: `https://control.scaniom.com/signup`
- login: `https://control.scaniom.com/login`
- Control/API: `https://control.scaniom.com`

The public product site `https://scaniom.com` is not the CLI/API Control origin.

Real CLI auth:

```bash
./bin/scaniom profile use cloud
./bin/scaniom profile test cloud
./bin/scaniom login
./bin/scaniom auth status
./bin/scaniom whoami
```

`scaniom login` uses Scaniom browser device authorization. The Web password remains in the browser on the selected Control.

Open Immune Intelligence uses the same approved device authorization contract for its Web-to-Control connection. It never reads or copies the host-only Scaniom browser session cookie.

See `open-ii-authentication.md` for the complete flow.
