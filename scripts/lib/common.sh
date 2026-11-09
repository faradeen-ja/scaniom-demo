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
DEMO_HOME="${SCANIOM_DEMO_HOME:-$ROOT/.demo}"

pass(){ printf '\033[32m✓ %s\033[0m\n' "$*"; }
info(){ printf '\033[36m• %s\033[0m\n' "$*"; }
warn(){ printf '\033[33m! %s\033[0m\n' "$*" >&2; }
die(){ printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
require_cmd(){ command -v "$1" >/dev/null 2>&1 || die "required command missing: $1"; }
require_file(){ test -f "$1" || die "required file missing: $1"; }

demo_env(){
  mkdir -p "$DEMO_HOME"
  chmod 700 "$DEMO_HOME"
  export SCANIOM_NO_ANIMATION=1
  export NO_COLOR=1
}

_open_ii_origin(){
  if [ -n "${OPEN_II_APP_ORIGIN:-}" ]; then
    printf '%s\n' "${OPEN_II_APP_ORIGIN%/}"
    return 0
  fi
  if [ -f "$ROOT/.env.local" ]; then
    local value
    value="$(sed -n 's/^OPEN_II_APP_ORIGIN=//p' "$ROOT/.env.local" | tail -n 1)"
    if [ -n "$value" ]; then printf '%s\n' "${value%/}"; return 0; fi
  fi
  printf '%s\n' "http://localhost:3000"
}

_realpath(){
  node -e 'const fs=require("node:fs");process.stdout.write(fs.realpathSync(process.argv[1]))' "$1"
}

scaniom_cli_path(){
  require_cmd node
  local cli="${SCANIOM_CLI_BIN:-}"
  if [ -z "$cli" ]; then cli="$(type -P scaniom 2>/dev/null || true)"; fi
  [ -n "$cli" ] || return 1
  [ -x "$cli" ] || return 1
  local real root_real
  real="$(_realpath "$cli")" || return 1
  root_real="$(_realpath "$ROOT")"
  case "$real" in
    "$root_real"|"$root_real"/*) return 2 ;;
    */scripts/scaniom-cli.mjs|*/scripts/scaniom-cli.js) return 3 ;;
  esac
  printf '%s\n' "$real"
}

verify_scaniom_cli_bundle(){
  local cli="$1" root
  root="$(cd "$(dirname "$cli")/.." && pwd -P)"
  [ -f "$root/manifest.json" ] || die "Installed 'scaniom' does not resolve to an accepted standalone bundle: missing $root/manifest.json"
  [ -x "$root/libexec/node" ] || die "Installed Scaniom bundle is incomplete: missing executable $root/libexec/node"
  [ -r "$root/libexec/scaniom-cli.mjs" ] || die "Installed Scaniom bundle is incomplete: missing $root/libexec/scaniom-cli.mjs"
  node - "$root" "$SCANIOM_VERSION" "$SCANIOM_RELEASE" <<'NODE'
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const [root,version,release]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));
if(manifest.schema!=="scaniom-standalone-bundle-v1"||manifest.product!=="Scaniom"||manifest.productVersion!==version||manifest.releaseTrain!==release||manifest.sourceRepositoryRequired!==false||manifest.nodeModulesRequired!==false){throw new Error(`not an accepted source-independent ${release}/${version} standalone bundle`)}
for(const rel of ["bin/scaniom","libexec/node","libexec/scaniom-cli.mjs"]){
  const row=(manifest.files||[]).find(item=>item.path===rel);if(!row||!/^[0-9a-f]{64}$/.test(String(row.sha256||"")))throw new Error(`standalone manifest missing ${rel}`);
  const file=path.join(root,rel);const actual=crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");if(actual!==row.sha256)throw new Error(`standalone file digest mismatch: ${rel}`);
}
NODE
}

require_scaniom_cli_install(){
  demo_env
  local cli rc version_json
  set +e
  cli="$(scaniom_cli_path)"; rc=$?
  set -e
  if [ "$rc" -eq 2 ]; then
    die "Refusing repo-local Scaniom CLI. Open Immune must use the installed public 'scaniom' command outside $ROOT. Fix PATH, then run: scaniom version --json"
  fi
  if [ "$rc" -eq 3 ]; then
    die "Refusing a Scaniom source-checkout CLI launcher. Open Immune must use the accepted source-independent R18/0.4.1 public CLI installation. Fix PATH, then run: scaniom version --json"
  fi
  [ "$rc" -eq 0 ] || die "Installed Scaniom CLI not found on PATH. Install the accepted public Scaniom CLI, then confirm: scaniom version --json"
  verify_scaniom_cli_bundle "$cli"
  version_json="$(SCANIOM_NO_ANIMATION=1 NO_COLOR=1 "$cli" version --json 2>/dev/null)" || die "Installed Scaniom CLI could not report version. Run directly: $cli version --json"
  node - "$version_json" "$SCANIOM_VERSION" "$SCANIOM_RELEASE" "$cli" <<'NODE'
const [raw, expectedVersion, expectedRelease, cli] = process.argv.slice(2);
const v = JSON.parse(raw);
if (v.version !== expectedVersion || v.release !== expectedRelease || v.status !== "accepted") {
  throw new Error(`Installed CLI is not the accepted ${expectedRelease}/${expectedVersion}: ${raw}`);
}
console.log(`✓ installed Scaniom CLI PASS · ${cli} · ${v.release}/${v.version}/${v.status}`);
NODE
}

scaniom(){
  local cli rc
  set +e
  cli="$(scaniom_cli_path)"; rc=$?
  set -e
  if [ "$rc" -eq 2 ]; then die "Refusing repo-local Scaniom CLI. Use the installed public 'scaniom' command from PATH."; fi
  if [ "$rc" -eq 3 ]; then die "Refusing a Scaniom source-checkout CLI launcher. Use the accepted source-independent R18/0.4.1 public CLI installation."; fi
  [ "$rc" -eq 0 ] || die "Installed Scaniom CLI is unavailable. Run: scaniom version --json"
  SCANIOM_NO_ANIMATION=1 NO_COLOR=1 "$cli" "$@"
}

configure_scaniom_profile(){
  require_scaniom_cli_install
  local probe="${TMPDIR:-/tmp}/open-ii-profile-config.$$"
  if scaniom profile show "$SCANIOM_PROFILE" >"$probe" 2>/dev/null; then
    grep -Fq "$SCANIOM_CONTROL_URL" "$probe" || { cat "$probe" >&2; rm -f "$probe"; die "CLI profile '$SCANIOM_PROFILE' already points to a different Control. Choose/fix the intended profile explicitly."; }
    grep -Fq "$SCANIOM_PROFILE_TYPE" "$probe" || { cat "$probe" >&2; rm -f "$probe"; die "CLI profile '$SCANIOM_PROFILE' already has a different deployment type."; }
  else
    local args=(profile add "$SCANIOM_PROFILE" --control "$SCANIOM_CONTROL_URL" --type "$SCANIOM_PROFILE_TYPE")
    if [ -n "$SCANIOM_CA_FILE" ]; then args+=(--ca-file "$SCANIOM_CA_FILE"); fi
    scaniom "${args[@]}"
  fi
  rm -f "$probe"
  scaniom profile use "$SCANIOM_PROFILE" >/dev/null
  scaniom profile test "$SCANIOM_PROFILE" >/dev/null
  pass "CLI profile configured · $SCANIOM_PROFILE · $SCANIOM_CONTROL_URL"
}

ensure_scaniom_profile(){
  require_scaniom_cli_install
  local probe="${TMPDIR:-/tmp}/open-ii-profile.$$"
  if ! scaniom profile show "$SCANIOM_PROFILE" >"$probe" 2>/dev/null; then
    rm -f "$probe"
    die "CLI profile '$SCANIOM_PROFILE' is not configured. Configure the same Control used by Open Immune, then rerun: scaniom profile add $SCANIOM_PROFILE --control $SCANIOM_CONTROL_URL --type $SCANIOM_PROFILE_TYPE && scaniom profile use $SCANIOM_PROFILE"
  fi
  grep -Fq "$SCANIOM_CONTROL_URL" "$probe" || {
    cat "$probe" >&2; rm -f "$probe"
    die "CLI profile '$SCANIOM_PROFILE' points to a different Control. Expected $SCANIOM_CONTROL_URL. Fix the profile before continuing."
  }
  grep -Fq "$SCANIOM_PROFILE_TYPE" "$probe" || {
    cat "$probe" >&2; rm -f "$probe"
    die "CLI profile '$SCANIOM_PROFILE' has a different deployment type. Expected $SCANIOM_PROFILE_TYPE."
  }
  rm -f "$probe"
  scaniom profile use "$SCANIOM_PROFILE" >/dev/null
  scaniom profile test "$SCANIOM_PROFILE" >/dev/null
  pass "CLI profile authority PASS · $SCANIOM_PROFILE · $SCANIOM_CONTROL_URL"
}

require_scaniom_cli_auth(){
  ensure_scaniom_profile
  if ! scaniom auth status >/dev/null 2>&1; then
    die "Scaniom CLI is not authorized for profile '$SCANIOM_PROFILE'. Run the real command: scaniom login"
  fi
  if ! scaniom whoami >/dev/null 2>&1; then
    die "Scaniom CLI session is not valid for $SCANIOM_CONTROL_URL. Run: scaniom login"
  fi
  pass "CLI authorization PASS · real installed scaniom session"
}

require_open_ii_web_auth(){
  require_cmd curl
  require_cmd node
  local origin start_json challenge approve_url status_json approved
  origin="$(_open_ii_origin)"
  case "$origin" in http://localhost:*|http://127.0.0.1:*|http://\[::1\]:*|https://localhost:*|https://127.0.0.1:*|https://\[::1\]:*) ;; *) die "Real CLI↔Web parity handoff is local-only. OPEN_II_APP_ORIGIN must be localhost/127.0.0.1/[::1]; got $origin" ;; esac
  start_json="$(curl -fsS --max-time 5 -X POST -H 'content-type: application/json' -d '{}' "$origin/api/auth/scaniom/cli-parity/start" 2>/dev/null)" || die "Open Immune Web is not reachable at $origin. Start the Web app, then rerun this Lab."
  challenge="$(node -e 'const x=JSON.parse(process.argv[1]);if(!x.challengeId||!x.approveUrl)process.exit(2);process.stdout.write(x.challengeId)' "$start_json")" || die "Open Immune Web returned an invalid CLI parity challenge."
  approve_url="$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(x.approveUrl)' "$start_json")"
  info "Open Immune Web authorization proof required · no browser token is shared with the CLI"
  info "Approve/confirm the live Web session here: $approve_url"
  if command -v open >/dev/null 2>&1; then open "$approve_url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$approve_url" >/dev/null 2>&1 || true
  fi
  approved=0
  for _ in $(seq 1 110); do
    status_json="$(curl -fsS --max-time 5 "$origin/api/auth/scaniom/cli-parity/status?challenge=$challenge" 2>/dev/null || true)"
    if [ -n "$status_json" ] && node - "$status_json" "$SCANIOM_PROFILE" "$SCANIOM_CONTROL_URL" <<'NODE' >/dev/null 2>&1
const [raw, expectedProfile, expectedControl] = process.argv.slice(2);
const body = JSON.parse(raw);
const normalize = (value) => String(value || "").replace(/\/+$/, "");
if (body.status !== "approved") process.exit(1);
if (String(body.profile?.name || "") !== expectedProfile) process.exit(2);
if (normalize(body.profile?.controlUrl) !== normalize(expectedControl)) process.exit(3);
NODE
    then
      approved=1
      break
    fi
    sleep 1
  done
  if [ "$approved" -ne 1 ]; then
    die "Open Immune Web authorization was not approved. Open $approve_url, connect Scaniom if required, and rerun the Lab."
  fi
  pass "Open Immune Web authorization PASS · live browser session proved without exposing its token"
}

require_open_immune_authority(){
  require_open_ii_web_auth
  require_scaniom_cli_auth
  pass "WEB ↔ CONTROL ↔ CLI AUTHORITY PARITY PASS · same Control · separate approved sessions"
}

# Historical demo scripts use this name. It now means the real installed CLI profile only.
ensure_public_profile(){ ensure_scaniom_profile; }
