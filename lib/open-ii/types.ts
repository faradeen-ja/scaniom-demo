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
