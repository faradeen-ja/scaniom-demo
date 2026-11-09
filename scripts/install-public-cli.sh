#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
warn "scripts/install-public-cli.sh no longer installs or links a repo-local CLI. Open Immune requires the real installed public 'scaniom' command."
require_scaniom_cli_install
pass "real installed Scaniom CLI verified; no Open Immune bin/scaniom was created"
