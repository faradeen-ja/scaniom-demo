#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; require_open_immune_authority
W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"; M="${SCANIOM_MODEL:-gpt-5-mini}"
scaniom node health
printf '\nBlock only this Node host/process from Control, keep Node running, then press Enter.\n'; read -r _
H="$(scaniom node health)"; printf '%s\n' "$H"; grep -q OFFLINE-PROTECTED <<<"$H" || die "Node did not enter OFFLINE-PROTECTED"
scaniom attach test l1 --workload "$W" --model "$M" -- "Say hello while Control is unreachable"
printf '\nRestore Control reachability, then press Enter.\n'; read -r _
for _ in $(seq 1 30); do scaniom node health | grep -q 'CONTROL SYNC.*CONNECTED' && { pass "D10 RECOVERY PASS"; exit 0; }; sleep 2; done
die "Node did not reconnect"
