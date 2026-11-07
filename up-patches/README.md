# Open Immune patch workspace

Open Immune uses the local-first patch workflow.

1. Put the next versioned patch under `up-patches/`.
2. Run its `install.sh` from the repository root.
3. Run `npm run accept:local`.
4. Only accepted local source is pushed/merged to GitHub.

Patch ZIPs, extracted patch folders, backups, secrets and local environment files are never committed.

The public Open Immune repo is localhost-first. It does not use Vercel as a release gate.
