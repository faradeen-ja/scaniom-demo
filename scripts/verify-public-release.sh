#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
BASE="https://github.com/faradeen-ja/scaniom-releases/releases/download/v${SCANIOM_VERSION}"
curl -fL "$BASE/SHA256SUMS" -o "$TMP/SHA256SUMS"
curl -fL "$BASE/SHA256SUMS.sigstore.json" -o "$TMP/SHA256SUMS.sigstore.json"
curl -fL "$BASE/publication-receipt.json" -o "$TMP/publication-receipt.json"
node - "$TMP/publication-receipt.json" "$SCANIOM_VERSION" "$SCANIOM_RELEASE" <<'NODE'
const fs=require("fs");
const [file,version,release]=process.argv.slice(2);
const r=JSON.parse(fs.readFileSync(file,"utf8"));
if(r.version!==version||r.release!==release) throw new Error("publication identity mismatch");
for(const id of ["scaniom-node","scaniom-sidecar","scaniom-gateway","scaniom-runtime-adapter","scaniom-environment-gateway","scaniom-mcp-gateway","scaniom-provider-native-bridge"]){
  if(!/@sha256:[0-9a-f]{64}$/.test(String(r.oci?.[id]||""))) throw new Error(`${id} digest missing`);
}
console.log("✓ publication receipt PASS");
NODE
if command -v cosign >/dev/null 2>&1; then
  cosign verify-blob "$TMP/SHA256SUMS" \
    --bundle "$TMP/SHA256SUMS.sigstore.json" \
    --certificate-identity-regexp='^https://github.com/faradeen-ja/scaniom/.github/workflows/r18-public-release.yml@refs/heads/main$' \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com >/dev/null
  pass "Sigstore verification PASS"
else
  info "cosign not installed locally; signed receipt remains available and CI still checks public bytes"
fi
