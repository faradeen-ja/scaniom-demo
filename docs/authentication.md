# Authentication

Real Web auth:

- https://scaniom.com/signup
- https://scaniom.com/login

Real CLI auth:

```bash
./bin/scaniom profile add public --control https://scaniom.com --type cloud
./bin/scaniom profile use public
./bin/scaniom login
./bin/scaniom whoami
```

`scaniom login` uses the browser device flow. The Web password remains in the browser.
