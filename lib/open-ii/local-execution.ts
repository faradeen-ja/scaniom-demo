import { readFile } from "node:fs/promises";
import path from "node:path";

export type D01PublicInstallReceipt = {
  version: 1;
  labId: "d01-public-install";
  status: "pass";
  release: "R18";
  scaniomVersion: "0.4.2";
  verifiedAt: string;
  checks: {
    publicRelease: true;
    standaloneCli: true;
    npmSdk: true;
    pypiSdk: true;
  };
};

export type D09FleetFailoverReceipt = {
  version: 1;
  labId: "d09-fleet-failover";
  status: "pass";
  release: "R18";
  scaniomVersion: "0.4.2";
  verifiedAt: string;
  environmentId: string;
  workloadId: string;
  poolId: string;
  controlRouteKey: string;
  sdkSession: string;
  failedNodeId: string;
  failoverNodeId: string;
  correlationId: string;
  proofId: string;
  checks: {
    twoRealNodes: true;
    poolBound: true;
    deterministicRouting: true;
    healthFailover: true;
    protectedBefore: true;
    protectedAfter: true;
    validProof: true;
    noReplay: true;
    restored: true;
  };
};

export type D10BoundaryReceipt = {
  level: "l1" | "l2" | "l3" | "l4" | "l5" | "mcp" | "l6";
  source: "provider_proxy" | "sdk" | "runtime_hook" | "sidecar" | "gateway" | "mcp_gateway" | "provider_native";
  session: string;
  correlationId: string;
  proofId: string;
  eventCount: number;
  onlineConsequenceId: string;
  offlineConsequenceId: string;
};

export type D10OfflineContinuityReceipt = {
  version: 2;
  labId: "d10-offline-continuity";
  status: "pass";
  release: "R18";
  scaniomVersion: "0.4.2";
  verifiedAt: string;
  environmentId: string;
  workloadId: string;
  nodeId: string;
  nodeName: string;
  routeId: string;
  runId: string;
  continuityUntil: string;
  maxOfflineSeconds: 14400;
  maxCredentialStaleSeconds: 1800;
  maxSpoolBytes: 268435456;
  spoolPeakBytes: number;
  replayedEnvelopes: number;
  identity: {
    identityId: string;
    generation: number;
    attachments: Array<"l1" | "l2" | "l3" | "l4" | "l5" | "mcp" | "l6">;
  };
  boundaries: Record<"l1" | "l2" | "l3" | "l4" | "l5" | "mcp" | "l6", D10BoundaryReceipt>;
  checks: {
    signedContinuity: true;
    allSevenIdentityScopes: true;
    onlineBaselineAllSeven: true;
    offlineProtected: true;
    bootstrapDenied: true;
    protectedOfflineAllSeven: true;
    evidenceBuffered: true;
    controlAbsentWhileOffline: true;
    evidenceReplayed: true;
    allSevenTrajectories: true;
    allSevenProofs: true;
    noReplay: true;
    cleanShutdown: true;
  };
};

export type LocalExecutionState = {
  d01PublicInstall: D01PublicInstallReceipt | null;
  d09FleetFailover: D09FleetFailoverReceipt | null;
  d10OfflineContinuity: D10OfflineContinuityReceipt | null;
};

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validD01(value: unknown): value is D01PublicInstallReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<D01PublicInstallReceipt>;
  const checks = receipt.checks as Partial<D01PublicInstallReceipt["checks"]> | undefined;
  return receipt.version === 1
    && receipt.labId === "d01-public-install"
    && receipt.status === "pass"
    && receipt.release === "R18"
    && receipt.scaniomVersion === "0.4.2"
    && validTimestamp(receipt.verifiedAt)
    && checks?.publicRelease === true
    && checks?.standaloneCli === true
    && checks?.npmSdk === true
    && checks?.pypiSdk === true;
}

function validD09(value: unknown): value is D09FleetFailoverReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<D09FleetFailoverReceipt>;
  const checks = receipt.checks as Partial<D09FleetFailoverReceipt["checks"]> | undefined;
  const ids = [
    receipt.environmentId, receipt.workloadId, receipt.poolId,
    receipt.controlRouteKey, receipt.sdkSession, receipt.failedNodeId,
    receipt.failoverNodeId, receipt.correlationId, receipt.proofId,
  ];
  return receipt.version === 1
    && receipt.labId === "d09-fleet-failover"
    && receipt.status === "pass"
    && receipt.release === "R18"
    && receipt.scaniomVersion === "0.4.2"
    && validTimestamp(receipt.verifiedAt)
    && ids.every((item) => typeof item === "string" && item.length > 0)
    && receipt.failedNodeId !== receipt.failoverNodeId
    && receipt.correlationId?.startsWith("scn_corr_") === true
    && receipt.proofId?.startsWith("scn_cproof_") === true
    && checks?.twoRealNodes === true
    && checks?.poolBound === true
    && checks?.deterministicRouting === true
    && checks?.healthFailover === true
    && checks?.protectedBefore === true
    && checks?.protectedAfter === true
    && checks?.validProof === true
    && checks?.noReplay === true
    && checks?.restored === true;
}

function validD10(value: unknown): value is D10OfflineContinuityReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<D10OfflineContinuityReceipt>;
  const checks = receipt.checks as Partial<D10OfflineContinuityReceipt["checks"]> | undefined;
  const ids = [receipt.environmentId, receipt.workloadId, receipt.nodeId, receipt.nodeName, receipt.routeId, receipt.runId];
  const required = ["l1","l2","l3","l4","l5","mcp","l6"] as const;
  const sources = {l1:"provider_proxy",l2:"sdk",l3:"runtime_hook",l4:"sidecar",l5:"gateway",mcp:"mcp_gateway",l6:"provider_native"} as const;
  const minimumEvents = {l1:2,l2:4,l3:4,l4:2,l5:4,mcp:4,l6:4} as const;
  const attachments = receipt.identity?.attachments || [];
  const boundaries = receipt.boundaries as Partial<D10OfflineContinuityReceipt["boundaries"]> | undefined;
  const boundaryValid = Boolean(boundaries) && required.every((id) => {
    const row = boundaries?.[id];
    return Boolean(row)
      && row?.level === id
      && row?.source === sources[id]
      && typeof row?.session === "string" && row.session.length > 0
      && row?.correlationId?.startsWith("scn_corr_") === true
      && row?.proofId?.startsWith("scn_cproof_") === true
      && Number(row?.eventCount || 0) >= minimumEvents[id]
      && typeof row?.onlineConsequenceId === "string" && row.onlineConsequenceId.length > 0
      && typeof row?.offlineConsequenceId === "string" && row.offlineConsequenceId.length > 0
      && row.onlineConsequenceId !== row.offlineConsequenceId;
  });
  const consequenceIds = boundaries ? required.flatMap((id) => [boundaries[id]?.onlineConsequenceId, boundaries[id]?.offlineConsequenceId].filter((item): item is string => typeof item === "string" && item.length > 0)) : [];
  return receipt.version === 2
    && receipt.labId === "d10-offline-continuity"
    && receipt.status === "pass"
    && receipt.release === "R18"
    && receipt.scaniomVersion === "0.4.2"
    && validTimestamp(receipt.verifiedAt)
    && validTimestamp(receipt.continuityUntil)
    && ids.every((item) => typeof item === "string" && item.length > 0)
    && receipt.maxOfflineSeconds === 14400
    && receipt.maxCredentialStaleSeconds === 1800
    && receipt.maxSpoolBytes === 268435456
    && Number.isFinite(receipt.spoolPeakBytes) && Number(receipt.spoolPeakBytes) > 0
    && Number.isFinite(receipt.replayedEnvelopes) && Number(receipt.replayedEnvelopes) > 0
    && typeof receipt.identity?.identityId === "string" && receipt.identity.identityId.length > 0
    && Number.isInteger(receipt.identity?.generation) && Number(receipt.identity?.generation) > 0
    && required.every((id) => attachments.includes(id))
    && boundaryValid
    && consequenceIds.length === 14 && new Set(consequenceIds).size === 14
    && checks?.signedContinuity === true
    && checks?.allSevenIdentityScopes === true
    && checks?.onlineBaselineAllSeven === true
    && checks?.offlineProtected === true
    && checks?.bootstrapDenied === true
    && checks?.protectedOfflineAllSeven === true
    && checks?.evidenceBuffered === true
    && checks?.controlAbsentWhileOffline === true
    && checks?.evidenceReplayed === true
    && checks?.allSevenTrajectories === true
    && checks?.allSevenProofs === true
    && checks?.noReplay === true
    && checks?.cleanShutdown === true;
}

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function readLocalExecutionState(): Promise<LocalExecutionState> {
  const [d01, d09, d10] = await Promise.all([
    readJson(path.join(process.cwd(), ".demo", "receipts", "d01-public-install.json")),
    readJson(path.join(process.cwd(), ".demo", "receipts", "d09-fleet-failover.json")),
    readJson(path.join(process.cwd(), ".demo", "receipts", "d10-offline-continuity.json")),
  ]);
  return {
    d01PublicInstall: validD01(d01) ? d01 : null,
    d09FleetFailover: validD09(d09) ? d09 : null,
    d10OfflineContinuity: validD10(d10) ? d10 : null,
  };
}
