#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCANIOM_VERSION="${SCANIOM_VERSION:-0.4.1}"
SCANIOM_RELEASE="${SCANIOM_RELEASE:-R18}"
SCANIOM_CONTROL_URL="${SCANIOM_CONTROL_URL:-https://scaniom.com}"
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
ensure_public_profile(){
  demo_env
  if ! scaniom profile show public >/dev/null 2>&1; then
    scaniom profile add public --control "$SCANIOM_CONTROL_URL" --type cloud
  fi
  scaniom profile use public >/dev/null
}
