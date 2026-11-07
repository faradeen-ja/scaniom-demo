#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCANIOM_VERSION="${SCANIOM_VERSION:-0.4.1}"
SCANIOM_RELEASE="${SCANIOM_RELEASE:-R18}"
SCANIOM_PROFILE="${SCANIOM_PROFILE:-cloud}"
SCANIOM_CONTROL_URL="${SCANIOM_CONTROL_URL:-https://control.scaniom.com}"
SCANIOM_PROFILE_TYPE="${SCANIOM_PROFILE_TYPE:-}"
if [ -z "$SCANIOM_PROFILE_TYPE" ]; then
  case "$SCANIOM_CONTROL_URL" in
    https://control.scaniom.com) SCANIOM_PROFILE_TYPE=cloud ;;
    http://localhost*|https://localhost*|http://127.0.0.1*|https://127.0.0.1*|http://\[::1\]*|https://\[::1\]*) SCANIOM_PROFILE_TYPE=local ;;
    *staging*|*test*) SCANIOM_PROFILE_TYPE=staging ;;
    *) SCANIOM_PROFILE_TYPE=self-hosted ;;
  esac
fi
SCANIOM_CA_FILE="${SCANIOM_CA_FILE:-}"
DEMO_HOME="${SCANIOM_DEMO_HOME:-$ROOT/.demo/home}"
BIN="$ROOT/bin/scaniom"

pass(){ printf '✓ %s\n' "$*"; }
info(){ printf '• %s\n' "$*"; }
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
require_cmd(){ command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"; }
require_file(){ test -f "$1" || die "required file missing: $1"; }

demo_env(){
  mkdir -p "$DEMO_HOME"
  chmod 700 "$DEMO_HOME"
  export HOME="$DEMO_HOME"
  export SCANIOM_NO_ANIMATION=1
  export NO_COLOR=1
}
scaniom(){
  require_file "$BIN"
  HOME="$DEMO_HOME" SCANIOM_NO_ANIMATION=1 NO_COLOR=1 "$BIN" "$@"
}
ensure_scaniom_profile(){
  demo_env
  local probe="${TMPDIR:-/tmp}/open-ii-profile.$$"
  if scaniom profile show "$SCANIOM_PROFILE" >"$probe" 2>/dev/null; then
    grep -Fq "$SCANIOM_CONTROL_URL" "$probe" || {
      rm -f "$probe"
      die "profile $SCANIOM_PROFILE already exists with a different Control. Choose another SCANIOM_PROFILE or correct the profile explicitly."
    }
    grep -Fq "$SCANIOM_PROFILE_TYPE" "$probe" || {
      rm -f "$probe"
      die "profile $SCANIOM_PROFILE exists with a different deployment type. Correct the profile explicitly before continuing."
    }
    rm -f "$probe"
  else
    rm -f "$probe"
    local args=(profile add "$SCANIOM_PROFILE" --control "$SCANIOM_CONTROL_URL" --type "$SCANIOM_PROFILE_TYPE")
    if [ -n "$SCANIOM_CA_FILE" ]; then args+=(--ca-file "$SCANIOM_CA_FILE"); fi
    scaniom "${args[@]}"
  fi
  scaniom profile use "$SCANIOM_PROFILE" >/dev/null
}
# Historical demo scripts call this name. It now resolves the selected Scaniom profile,
# with cloud as the default, instead of hardcoding a separate "public" profile.
ensure_public_profile(){ ensure_scaniom_profile; }
