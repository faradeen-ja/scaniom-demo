#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
function base(value) { return String(value).replace(/\/+$/, ""); }
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }

const bridgeUrl = base(required("SCANIOM_L6_BRIDGE_URL"));
const runtimeToken = required("SCANIOM_RUNTIME_TOKEN");
const workloadId = required("SCANIOM_WORKLOAD_ID");
const adapterId = required("SCANIOM_L6_ADAPTER_ID");
const provider = required("SCANIOM_L6_PROVIDER");
const sessionId = required("SCANIOM_L6_SESSION_ID");
const ledgerPath = required("OPEN_II_D08_LEDGER");
const eventKind = String(process.env.SCANIOM_L6_EVENT_KIND || "safe_record").trim();
const target = `provider-native://${provider}/${eventKind}`;

// Raw provider/runtime context stays inside this adapter. Only its SHA-256 digest
// crosses the generic Scaniom L6 bridge.
const nativeContext = JSON.stringify({
  contract: "open-immune-d08-reference-native-v1",
  provider,
  adapterId,
  eventKind,
  consequence: "append privacy-minimized local audit record",
});
const contextDigest = sha256(nativeContext);

async function bridge(path, body) {
  const response = await fetch(`${bridgeUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${runtimeToken}`,
      "x-scaniom-workload-id": workloadId,
      "x-scaniom-provider-adapter": adapterId,
      "x-scaniom-provider-event-kind": eventKind,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`L6 ${path} failed HTTP ${response.status}: ${data?.error?.message || JSON.stringify(data)}`);
  }
  return data;
}

const common = {
  sessionId,
  provider,
  actionType: "custom_action",
  target,
  capabilities: [],
  production: false,
  contextDigest,
  metadata: {
    provenance: "live",
    openImmuneLab: "D08",
    boundary: "l6",
    adapterContract: "open-immune-d08-reference-native-v1",
  },
};

const guard = await bridge("/v1/guard", common);
if (!guard.behaviorEventId || !guard.correlationId) throw new Error("L6 guard response is missing evidence identity");
if (guard.permitted !== true) throw new Error(`L6 Gate did not permit the safe reference consequence: ${guard.machineAction || "unknown"}`);

const consequenceId = `oii_l6_${randomUUID()}`;
const record = {
  version: 1,
  consequenceId,
  occurredAt: new Date().toISOString(),
  provider,
  adapterId,
  eventKind,
  contextDigest,
  contentStored: false,
};

let consequenceError = null;
try {
  mkdirSync(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  appendFileSync(ledgerPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
} catch (error) {
  consequenceError = error;
}

const observe = await bridge("/v1/observe", {
  ...common,
  preBehaviorEventId: guard.behaviorEventId,
  outcome: consequenceError ? "error" : "success",
  metadata: {
    ...common.metadata,
    preBehaviorEventId: guard.behaviorEventId,
    outcome: consequenceError ? "error" : "success",
  },
});

if (!observe.behaviorEventId || !observe.correlationId) throw new Error("L6 observe response is missing evidence identity");
if (observe.correlationId !== guard.correlationId) throw new Error("L6 guard/observe correlation identity diverged");
if (consequenceError) throw consequenceError;

process.stdout.write(JSON.stringify({
  ok: true,
  consequenceId,
  contextDigest,
  contentStored: false,
  guard: {
    behaviorEventId: guard.behaviorEventId,
    correlationId: guard.correlationId,
    machineAction: guard.machineAction,
    riskScore: guard.riskScore,
    permitted: guard.permitted,
  },
  observe: {
    behaviorEventId: observe.behaviorEventId,
    correlationId: observe.correlationId,
    machineAction: observe.machineAction,
    riskScore: observe.riskScore,
  },
}, null, 2));
