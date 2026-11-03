#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; source "$ROOT/scripts/lib/common.sh"; "$ROOT/scripts/ensure-scope.sh"
E="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"; W="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"; P="${SCANIOM_POOL:-demo-pool}"
if [ -z "${SCANIOM_FLEET_NODES:-}" ]; then
  scaniom fabric add nodes --env "$E" --prefix demo-fleet-node --count 3
  die "Start the three Nodes from the printed commands, then export SCANIOM_FLEET_NODES=id1,id2,id3 and rerun"
fi
scaniom fabric pools --env "$E" | grep -Fq "$P" || scaniom fabric pool create --env "$E" --name "$P" --desired 3 --min 1 --max 3 --capabilities l1,l2,l4 --nodes "$SCANIOM_FLEET_NODES"
scaniom fabric pool members --env "$E" --pool "$P" --nodes "$SCANIOM_FLEET_NODES"
scaniom fabric workload pools --workload "$W" --pools "$P"
scaniom fabric routing preview --workload "$W" --key demo-session-a
scaniom fabric routing preview --workload "$W" --key demo-session-b
scaniom fleet --env "$E"
