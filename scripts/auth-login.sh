#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
demo_env
for path in / /signup /login; do
  code="$(curl -Ls -o /dev/null -w '%{http_code}' "$SCANIOM_CONTROL_URL$path")"
  case "$code" in 200|301|302|307|308) ;; *) die "$path HTTP $code" ;; esac
done
pass "public Web auth routes reachable"
ensure_public_profile
info "If needed, create the real account at $SCANIOM_CONTROL_URL/signup"
scaniom login
scaniom auth status
scaniom whoami
pass "Web + CLI identity PASS"
