# Open Immune patch workspace

Open Immune keeps the original local-first development method.

1. Put the next versioned patch under `up-patches/`.
2. Run its `install.sh` from the repository root.
3. Fix/test locally until `npm run accept:local` passes.
4. Ship the accepted source with one command:

```bash
npm run ship -- <slice-name>
```

`ship` creates one candidate branch and commit, pushes it, opens a PR with the local acceptance note, waits for GitHub checks, and squash-merges only when green.

There is no Vercel gate and no Scaniom release-ledger/provenance machinery in this public Open Immune repository. Full release provenance and Product History remain part of the real Scaniom product repository workflow.

Patch ZIPs, extracted patch folders and local backups stay ignored by Git.
