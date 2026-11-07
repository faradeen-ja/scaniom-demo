# Open Immune Intelligence — local start

This source bundle is the public `faradeen-ja/scaniom-demo` repository with the A0 Open Immune Intelligence profile/auth foundation already applied locally.

## Open in VS Code

From the parent directory:

```bash
cd open-immune-intelligence
code .
```

## Install web dependencies

From the repository root:

```bash
npm install
```

Then generate the local Open Immune secret/environment file if needed:

```bash
bash scripts/open-ii-bootstrap.sh
```

## Run local acceptance

```bash
bash scripts/open-ii-local-acceptance.sh
```

## Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Future changes

All normal future build/fix/update packages go under `up-patches/` and are applied from this repository root. Do not run these Open Immune patches in the private `faradeen-ja/scaniom` product repository.

GitHub/Vercel mutation remains a second stage after local A1 acceptance.
