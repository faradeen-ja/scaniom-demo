#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"
ENV_NAME="${SCANIOM_ENVIRONMENT:-scaniom-demo-production}"
WORKLOAD="${SCANIOM_WORKLOAD:-scaniom-demo-agent}"
require_open_immune_authority
scaniom env list | grep -Fq "$ENV_NAME" || scaniom env create "$ENV_NAME" --type production
scaniom workload list | grep -Fq "$WORKLOAD" || scaniom workload create "$WORKLOAD" --env "$ENV_NAME" --kind agent
scaniom workload use "$WORKLOAD"
scaniom address list | grep -F "$WORKLOAD" | grep -q ACTIVE || scaniom address issue --workload "$WORKLOAD"
policy_state="$(scaniom policy list)"
if printf '%s\n' "$policy_state" | grep -F "$ENV_NAME" | grep -Eq 'ENFORCE[[:space:]]+general'; then
  pass "policy already matches enforce / general · reuse current immutable revision"
else
  scaniom policy set --env "$ENV_NAME" --mode enforce --profile general
fi
pass "protected scope ready"
