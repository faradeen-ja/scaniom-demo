#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from scaniom import Scaniom, __version__

for key in ("SCANIOM_NODE_URL", "SCANIOM_WORKLOAD_ID", "SCANIOM_RUNTIME_BOOTSTRAP_TOKEN", "SCANIOM_D03_CONSEQUENCE"):
    if not os.environ.get(key):
        raise RuntimeError(f"{key} is required")
if __version__ != "0.4.1":
    raise RuntimeError(f"Unexpected scaniom package version {__version__}")

consequence_path = Path(os.environ["SCANIOM_D03_CONSEQUENCE"]).resolve()
scaniom = Scaniom(
    node_url=os.environ["SCANIOM_NODE_URL"],
    workload_id=os.environ["SCANIOM_WORKLOAD_ID"],
    runtime_bootstrap_token=os.environ["SCANIOM_RUNTIME_BOOTSTRAP_TOKEN"],
    timeout=30.0,
)
session = scaniom.new_session()

def consequence() -> dict[str, object]:
    consequence_path.parent.mkdir(parents=True, exist_ok=True)
    value = f"python {datetime.now(timezone.utc).isoformat()}\n"
    consequence_path.write_text(value, encoding="utf-8")
    consequence_path.chmod(0o600)
    return {"path": str(consequence_path), "bytes": len(value.encode("utf-8"))}

result = scaniom.guard_action(
    session=session,
    action="agent_action",
    text="Record the harmless Open Immune D03 Python heartbeat",
    target=f"file://{consequence_path}",
    capabilities=["file_access"],
    production=False,
    metadata={"openImmuneLab": "D03", "sdk": "python", "consequence": "local-heartbeat"},
    execute=consequence,
)
if not consequence_path.exists():
    raise RuntimeError("Guarded Python consequence did not execute")

print(json.dumps({
    "sdk": "python",
    "sdkVersion": __version__,
    "machineAction": result.decision.get("machineAction"),
    "riskScore": result.decision.get("riskScore"),
    "behaviorEventId": result.decision.get("behaviorEventId"),
    "correlationId": result.decision.get("correlationId"),
    "sessionId": result.decision.get("sessionId"),
    "consequence": result.result,
}, indent=2))
