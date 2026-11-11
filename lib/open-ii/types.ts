export const SCANIOM_PROFILE_TYPES = [
  "local",
  "cloud",
  "self-hosted",
  "private-enterprise",
  "staging",
] as const;

export type ScaniomProfileType = (typeof SCANIOM_PROFILE_TYPES)[number];
export type ProfileSource = "built-in" | "server" | "user";

export type PublicControlProfile = {
  name: string;
  label: string;
  type: ScaniomProfileType;
  controlUrl: string;
  source: ProfileSource;
  removable: boolean;
  customTrust: boolean;
  privateNetwork: boolean;
};

export type ResolvedControlProfile = PublicControlProfile & {
  caEnv: string | null;
  allowPrivateNetwork: boolean;
};

export type UserControlProfile = {
  name: string;
  label: string;
  type: ScaniomProfileType;
  controlUrl: string;
};

export type ProfileCookieState = {
  version: 1;
  activeProfile: string | null;
  userProfiles: UserControlProfile[];
};

export type ScaniomIdentity = {
  sessionId?: string;
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  deviceLabel?: string | null;
  expiresAt?: string;
  controlDeploymentId?: string;
};

export type OpenIiAuthAttempt = {
  version: 1;
  profileName: string;
  profileType: ScaniomProfileType;
  controlUrl: string;
  deviceCode: string;
  userCode: string;
  authorizeUrl: string;
  controlDeploymentId: string;
  expiresAt: string;
  interval: number;
};

export type OpenIiSession = {
  version: 1;
  profileName: string;
  profileType: ScaniomProfileType;
  controlUrl: string;
  token: string;
  identity: ScaniomIdentity;
  issuedAt: string;
  expiresAt: string;
};

export type WorkspaceCookieState = {
  version: 1;
  profileName: string;
  organizationId: string;
  environmentId: string | null;
  workloadId: string | null;
};

export type OperatorWhoAmI = {
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string; slug: string };
  role: string;
  credential: { kind: string; name: string };
};

export type ControlDeploymentResponse = {
  deployment: {
    id?: string;
    label?: string;
    type?: string;
    mode?: string;
    [key: string]: unknown;
  };
  modes?: unknown;
};

export type OperatorEnvironment = {
  id: string;
  name?: string;
  slug?: string;
  kind?: string;
  status?: string;
  [key: string]: unknown;
};

export type OperatorWorkload = {
  id: string;
  name?: string;
  slug?: string;
  environment_id?: string;
  environmentId?: string;
  kind?: string;
  status?: string;
  [key: string]: unknown;
};


export type OperatorNode = {
  id: string;
  name?: string;
  slug?: string;
  environment_id?: string;
  environmentId?: string;
  environment_name?: string;
  operational_state?: string;
  status?: string;
  node_version?: string;
  runtime?: string;
  platform?: string;
  arch?: string;
  connections?: number;
  [key: string]: unknown;
};

export type OperatorConnection = {
  id: string;
  name?: string;
  provider?: string;
  protocol?: string;
  endpoint?: string;
  model_hint?: string;
  secret_ref?: string;
  status?: string;
  node_id?: string;
  node_name?: string;
  workload_id?: string;
  workload_name?: string;
  environment_id?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OperatorPolicy = {
  environment_id?: string;
  environment_name?: string;
  mode?: string;
  profile?: string;
  version?: number;
  policy_digest?: string;
  [key: string]: unknown;
};

export type OperatorAttachmentLevel = {
  id?: string;
  level?: string;
  name?: string;
  configured?: boolean;
  ready?: boolean;
  evidence?: { total?: number; [key: string]: unknown };
  [key: string]: unknown;
};

export type OperatorAttachmentState = {
  workload?: { id?: string; name?: string; slug?: string; environment?: string; address?: string | null } | null;
  levels?: OperatorAttachmentLevel[];
  counts?: Record<string, number>;
  sources?: Record<string, unknown>;
  [key: string]: unknown;
};


export type OperatorProofEvidence = {
  id: string;
  kind: "receipt" | "batch";
  occurred_at: string;
  environment_id: string;
  environment_name: string;
  workload_name: string;
  node_name: string;
  provider: string;
  attachment_source: string;
  attachment_label: string;
  policy_version: number;
  policy_digest: string | null;
  machine_action: string;
  count: number;
  behavior_event_id: string | null;
  merkle_root: string | null;
  key_fingerprint: string | null;
  verification: "valid" | "invalid" | "accepted-batch";
};

export type OperatorProofState = {
  summary?: {
    evidenceObjects?: number;
    receiptCount?: number;
    batchCount?: number;
    latestEvidenceAt?: string | null;
    recentReceiptSample?: { checked?: number; valid?: number; invalid?: number };
    [key: string]: unknown;
  };
  evidence?: OperatorProofEvidence[];
};

export type OperatorRuntimeIdentity = {
  identityId?: string;
  workloadId?: string;
  workloadName?: string;
  environmentId?: string;
  scaniomAddress?: string;
  status?: string;
  generation?: number;
  attachments?: string[];
  lastIssuedAt?: string | null;
  lastRenewedAt?: string | null;
  revokedAt?: string | null;
  lease?: {
    leaseId?: string;
    credentialId?: string;
    generation?: number;
    status?: string;
    issuedAt?: string;
    renewAfter?: string;
    expiresAt?: string;
    authoritySource?: string;
  } | null;
  [key: string]: unknown;
};

export type OperatorRuntimeIdentityState = {
  ok?: boolean;
  identity?: OperatorRuntimeIdentity | null;
};

export type OperatorModelRuntimeKind = "vllm" | "nvidia_nim" | "triton" | "openai_compatible";

export type OperatorModelRuntimeAdapter = {
  id: string;
  organizationId?: string;
  environmentId: string;
  environmentName?: string;
  workloadId: string;
  workloadName?: string;
  workloadSlug?: string;
  name: string;
  kind: OperatorModelRuntimeKind;
  endpoint: string;
  modelHint?: string | null;
  authSecretRef?: string | null;
  status: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type OperatorModelRuntimeState = {
  ok?: boolean;
  contract?: string;
  kinds?: OperatorModelRuntimeKind[];
  runtimes?: OperatorModelRuntimeAdapter[];
};

export type OperatorCorrelatedProof = {
  proofId?: string;
  correlationId?: string;
  workloadId?: string;
  workloadName?: string;
  environmentId?: string;
  verification?: string;
  eventCount?: number;
  [key: string]: unknown;
};


export type OperatorFabricNodePoolMember = {
  nodeId: string;
  name?: string;
  slug?: string;
  state?: string;
  eligible?: boolean;
  eligibilityReasons?: string[];
  routingState?: string;
  routingWeight?: number;
  runtimeEndpoint?: string | null;
  [key: string]: unknown;
};

export type OperatorFabricNodePool = {
  id: string;
  environmentId?: string;
  name?: string;
  slug?: string;
  status?: string;
  isDefault?: boolean;
  memberCount?: number;
  onlineCount?: number;
  eligibleCount?: number;
  capacityState?: string;
  members?: OperatorFabricNodePoolMember[];
  [key: string]: unknown;
};

export type OperatorFabricPoolBinding = {
  workloadId?: string;
  poolId: string;
  poolName?: string;
  poolSlug?: string;
  memberCount?: number;
  onlineCount?: number;
  eligibleCount?: number;
  workloadEligibleCount?: number;
  availability?: string;
  [key: string]: unknown;
};

export type OperatorFabricRoutingCandidate = {
  nodeId: string;
  nodeName?: string;
  endpoint?: string | null;
  state?: string;
  rank?: number | null;
  [key: string]: unknown;
};

export type OperatorFabricRoutingPlan = {
  version?: string;
  workloadId?: string;
  workloadName?: string;
  environmentId?: string;
  routeKey?: string;
  strategy?: string;
  ready?: boolean;
  failClosed?: boolean;
  redundant?: boolean;
  selectedNodeId?: string | null;
  selectedEndpoint?: string | null;
  readyCandidates?: number;
  retryPolicy?: string;
  candidates?: OperatorFabricRoutingCandidate[];
  [key: string]: unknown;
};

export type OperatorFabricWorkload = {
  id: string;
  environmentId?: string;
  name?: string;
  slug?: string;
  poolBindings?: OperatorFabricPoolBinding[];
  routing?: OperatorFabricRoutingPlan | null;
  [key: string]: unknown;
};

export type OperatorFabricSnapshot = {
  selectedEnvironmentId?: string | null;
  nodePools?: OperatorFabricNodePool[];
  workloads?: OperatorFabricWorkload[];
  totals?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OperatorOfflineContinuityContract = {
  mode?: string;
  maxOfflineSeconds?: number;
  maxCredentialStaleSeconds?: number;
  maxSpoolBytes?: number;
  unknownAuthority?: string;
  bootstrapWhileOffline?: boolean;
  evidenceReplayRequired?: boolean;
  [key: string]: unknown;
};

export type OperatorOfflineContinuityItem = {
  nodeId: string;
  nodeName?: string;
  environmentId?: string;
  environmentName?: string;
  operationalState?: string;
  lastHeartbeatAt?: string | null;
  reported?: Record<string, unknown>;
  controlView?: "online" | "continuity-window" | "expired" | "unavailable" | "revoked" | string;
  continuityUntil?: string | null;
  note?: string;
  [key: string]: unknown;
};

export type OperatorOfflineContinuityState = {
  ok?: boolean;
  contract?: OperatorOfflineContinuityContract;
  items?: OperatorOfflineContinuityItem[];
};

export type OpenIiLocalExecution = {
  d01PublicInstall?: {
    version: 1;
    labId: "d01-public-install";
    status: "pass";
    release: "R18";
    scaniomVersion: "0.4.2";
    verifiedAt: string;
    checks: { publicRelease: true; standaloneCli: true; npmSdk: true; pypiSdk: true };
  } | null;
  d09FleetFailover?: {
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
  } | null;  d10OfflineContinuity?: {
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
    identity: { identityId: string; generation: number; attachments: string[] };
    boundaries: Record<string, { level: string; source: string; session: string; correlationId: string; proofId: string; eventCount: number; onlineConsequenceId: string; offlineConsequenceId: string }>;
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
  } | null;

};

export type OpenIiContextResponse = {
  profile: {
    name: string;
    label: string;
    type: ScaniomProfileType;
    controlUrl: string;
  };
  identity: ScaniomIdentity;
  whoami: OperatorWhoAmI;
  deployment: ControlDeploymentResponse["deployment"];
  workspace: WorkspaceCookieState | null;
  environments: OperatorEnvironment[];
  workloads: OperatorWorkload[];
  nodes?: OperatorNode[];
  connections?: OperatorConnection[];
  policies?: OperatorPolicy[];
  attachments?: OperatorAttachmentState | null;
  runtimeIdentity?: OperatorRuntimeIdentityState | null;
  modelRuntimes?: OperatorModelRuntimeAdapter[];
  fabric?: OperatorFabricSnapshot | null;
  offlineContinuity?: OperatorOfflineContinuityState | null;
  proof?: OperatorProofState | null;
  correlatedProofs?: OperatorCorrelatedProof[];
  execution?: OpenIiLocalExecution;
  cli: string[];
};
