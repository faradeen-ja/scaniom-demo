#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
"$ROOT/scripts/auth-login.sh"
require_open_ii_web_auth
pass "D00 OIS AUTH PASS · Open Immune Web + real installed Scaniom CLI authorized against the same Control"
