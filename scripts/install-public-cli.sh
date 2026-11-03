#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
mkdir -p "$ROOT/bin" "$ROOT/.demo/downloads"
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) TARGET=darwin-arm64 ;;
  Darwin/x86_64) TARGET=darwin-x64 ;;
  Linux/x86_64) TARGET=linux-amd64 ;;
  Linux/aarch64|Linux/arm64) TARGET=linux-arm64 ;;
  *) die "unsupported host: $(uname -s)/$(uname -m)" ;;
esac
ARCHIVE="r18-standalone-${TARGET}.tar.gz"
BASE="https://github.com/faradeen-ja/scaniom-releases/releases/download/v${SCANIOM_VERSION}"
DL="$ROOT/.demo/downloads"
curl -fL "$BASE/$ARCHIVE" -o "$DL/$ARCHIVE"
curl -fL "$BASE/SHA256SUMS" -o "$DL/SHA256SUMS"
(cd "$DL"; grep "  $ARCHIVE\$" SHA256SUMS > "$ARCHIVE.sha256"; shasum -a 256 -c "$ARCHIVE.sha256")
rm -rf "$ROOT/.demo/runtime"; mkdir -p "$ROOT/.demo/runtime"
tar -C "$ROOT/.demo/runtime" -xzf "$DL/$ARCHIVE"
for f in bin/scaniom bin/scaniom-node libexec/node; do test -x "$ROOT/.demo/runtime/$f" || die "executable bit missing: $f"; done
ln -sfn "$ROOT/.demo/runtime/bin/scaniom" "$ROOT/bin/scaniom"
ln -sfn "$ROOT/.demo/runtime/bin/scaniom-node" "$ROOT/bin/scaniom-node"
JSON="$("$ROOT/bin/scaniom" version --json)"
node - "$JSON" "$SCANIOM_VERSION" "$SCANIOM_RELEASE" <<'NODE'
const [raw,version,release]=process.argv.slice(2); const v=JSON.parse(raw);
if(v.version!==version||v.release!==release||v.status!=="accepted") throw new Error(raw);
console.log(`✓ public CLI ${v.release} / ${v.version} / ${v.status}`);
NODE
