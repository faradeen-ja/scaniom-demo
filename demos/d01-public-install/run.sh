#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/verify-public-release.sh"
require_scaniom_cli_install
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/npm"; cd "$TMP/npm"; npm init -y >/dev/null
npm install --ignore-scripts --no-audit --no-fund "@scaniom/sdk@${SCANIOM_VERSION}"
node --input-type=module -e "import {SCANIOM_SDK_VERSION} from '@scaniom/sdk'; if(SCANIOM_SDK_VERSION!=='${SCANIOM_VERSION}') process.exit(2)"
python3 -m venv "$TMP/py"
"$TMP/py/bin/pip" install --disable-pip-version-check "scaniom==${SCANIOM_VERSION}"
"$TMP/py/bin/python" -c "import scaniom; assert scaniom.__version__=='${SCANIOM_VERSION}'"

RECEIPT_DIR="$ROOT/.demo/receipts"
RECEIPT_FILE="$RECEIPT_DIR/d01-public-install.json"
mkdir -p "$RECEIPT_DIR"
node - "$RECEIPT_FILE" "$SCANIOM_VERSION" "$SCANIOM_RELEASE" <<'NODE'
const fs = require("node:fs");
const [file, version, release] = process.argv.slice(2);
if (version !== "0.4.2" || release !== "R18") throw new Error(`unexpected accepted release ${release}/${version}`);
const receipt = {
  version: 1,
  labId: "d01-public-install",
  status: "pass",
  release,
  scaniomVersion: version,
  verifiedAt: new Date().toISOString(),
  checks: { publicRelease: true, standaloneCli: true, npmSdk: true, pypiSdk: true },
};
fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
NODE
pass "D01 PUBLIC INSTALL PASS · local execution receipt recorded"
