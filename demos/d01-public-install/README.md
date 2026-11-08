# D01 — Public Install

Verifies the accepted Scaniom R18 / 0.4.1 public distribution without private source:

- GitHub release identity, checksums, publication receipt and OCI digest record
- native standalone CLI/Node archive and executable permissions
- `@scaniom/sdk@0.4.1` from npm
- `scaniom==0.4.1` from PyPI

After every real check passes, `run.sh` writes a credential-free local execution receipt at `.demo/receipts/d01-public-install.json`. The local Open Immune server reads that receipt so the D01 Lab can become VERIFIED. `.demo/` is gitignored and the receipt contains no operator token, provider key, password, prompt or model output.
