#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Scaniom, SCANIOM_SDK_VERSION } from "@scaniom/sdk";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const workloadId = required("SCANIOM_WORKLOAD_ID");
const runtimeToken = required("SCANIOM_RUNTIME_TOKEN");
const nodeUrl = required("SCANIOM_D10_NODE_URL");
const session = required("SCANIOM_D10_SESSION");
const phase = required("SCANIOM_D10_PHASE");
const ledger = required("SCANIOM_D10_LEDGER");
if (!runtimeToken.startsWith("scn_ri_v1.")) throw new Error("D10 requires a released scn_ri_v1 runtime identity");
if (!new Set(["online-baseline", "offline-protected"]).has(phase)) throw new Error(`unsupported D10 phase: ${phase}`);

const scaniom = new Scaniom({
  workloadId,
  runtimeToken,
  nodeUrl,
  autoRenewRuntimeIdentity: false,
  timeoutMs: 10_000,
});

const consequenceId = `oii_d10_${randomUUID()}`;
const { decision, result } = await scaniom.guardAction({
  session,
  action: "agent_action",
  text: `Record harmless Open Immune D10 ${phase} continuity heartbeat`,
  target: "file://open-immune/d10/continuity-ledger",
  capabilities: ["file_access"],
  production: false,
  metadata: {
    openImmuneLab: "D10",
    phase,
    safeConsequence: true,
    continuityProbe: true,
    contentStored: false,
  },
  execute: () => {
    mkdirSync(dirname(ledger), { recursive: true, mode: 0o700 });
    const row = {
      version: 1,
      consequenceId,
      phase,
      occurredAt: new Date().toISOString(),
      contentStored: false,
    };
    appendFileSync(ledger, `${JSON.stringify(row)}\n`, { encoding: "utf8", mode: 0o600 });
    return { consequenceId, phase };
  },
});

if (!decision.permitted) throw new Error(`D10 action unexpectedly blocked: ${decision.machineAction}`);
process.stdout.write(JSON.stringify({
  ok: true,
  phase,
  sdkVersion: SCANIOM_SDK_VERSION,
  nodeUrl,
  consequenceId: result.consequenceId,
  behaviorEventId: decision.behaviorEventId,
  correlationId: decision.correlationId,
  machineAction: decision.machineAction,
  riskScore: decision.riskScore,
}, null, 2));
