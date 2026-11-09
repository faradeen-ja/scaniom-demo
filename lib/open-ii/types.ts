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

export type OpenIiLocalExecution = {
  d01PublicInstall?: {
    version: 1;
    labId: "d01-public-install";
    status: "pass";
    release: "R18";
    scaniomVersion: "0.4.1";
    verifiedAt: string;
    checks: { publicRelease: true; standaloneCli: true; npmSdk: true; pypiSdk: true };
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
  proof?: OperatorProofState | null;
  correlatedProofs?: OperatorCorrelatedProof[];
  execution?: OpenIiLocalExecution;
  cli: string[];
};
