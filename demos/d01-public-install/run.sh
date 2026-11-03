#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/verify-public-release.sh"
"$ROOT/scripts/install-public-cli.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/npm"; cd "$TMP/npm"; npm init -y >/dev/null
npm install --ignore-scripts --no-audit --no-fund "@scaniom/sdk@${SCANIOM_VERSION}"
node --input-type=module -e "import {SCANIOM_SDK_VERSION} from '@scaniom/sdk'; if(SCANIOM_SDK_VERSION!=='${SCANIOM_VERSION}') process.exit(2)"
python3 -m venv "$TMP/py"
"$TMP/py/bin/pip" install --disable-pip-version-check "scaniom==${SCANIOM_VERSION}"
"$TMP/py/bin/python" -c "import scaniom; assert scaniom.__version__=='${SCANIOM_VERSION}'"
pass "D01 PUBLIC INSTALL PASS"
