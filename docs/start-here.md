# Start here

Open Immune now has a Web authority foundation plus the existing executable demo program.

## Web foundation

```bash
bash scripts/open-ii-bootstrap.sh
bash scripts/open-ii-local-acceptance.sh
npm run dev
```

Then open `http://localhost:3000`, keep the default `cloud` profile, and connect your real Scaniom account through browser approval on `https://control.scaniom.com`.

## Executable demos

D00 proves a real person can use the selected Scaniom Control signup/login and authorize the public CLI.
D01 proves a clean customer can install Scaniom 0.4.1 without the private product repository.

The scripts use an isolated demo `HOME` so an existing operator session cannot silently make the demo pass.

The future Fabric Tree/Matrix will guide these same real steps rather than replacing them with simulated completion.
