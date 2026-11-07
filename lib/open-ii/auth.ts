import "server-only";
import { clearCookie, ATTEMPT_COOKIE, SESSION_COOKIE, WORKSPACE_COOKIE, readOpenIiSession } from "@/lib/open-ii/cookies";
import { ControlHttpError, controlApi } from "@/lib/open-ii/control-client";
import { activeProfile } from "@/lib/open-ii/profile-store";
import type { OpenIiSession, OperatorWhoAmI, ResolvedControlProfile, ScaniomIdentity } from "@/lib/open-ii/types";

export function profileMatchesSession(profile: ResolvedControlProfile, session: OpenIiSession): boolean {
  return profile.name === session.profileName && profile.type === session.profileType && profile.controlUrl === session.controlUrl;
}

export function sessionExpired(session: OpenIiSession): boolean {
  const expires = Date.parse(session.expiresAt);
  return !Number.isFinite(expires) || expires <= Date.now();
}

export async function currentOpenIiSession(host = ""): Promise<{ profile: ResolvedControlProfile; session: OpenIiSession } | null> {
  const [profile, session] = await Promise.all([activeProfile(host), readOpenIiSession()]);
  if (!session || session.version !== 1 || sessionExpired(session) || !profileMatchesSession(profile, session)) return null;
  return { profile, session };
}

export async function validateOpenIiSession(host = ""): Promise<{
  profile: ResolvedControlProfile;
  session: OpenIiSession;
  whoami: OperatorWhoAmI;
} | null> {
  const current = await currentOpenIiSession(host);
  if (!current) return null;
  try {
    const whoami = await controlApi<OperatorWhoAmI>(current.profile, "/api/v1/operator/whoami", current.session.token);
    const session: OpenIiSession = {
      ...current.session,
      identity: identityFromWhoAmI(whoami, current.session.identity),
    };
    return { profile: current.profile, session, whoami };
  } catch (error) {
    if (error instanceof ControlHttpError && (error.status === 401 || error.status === 403)) {
      await Promise.all([clearCookie(SESSION_COOKIE), clearCookie(WORKSPACE_COOKIE)]);
    }
    // A temporary Control/network outage must not destroy a still-valid local session.
    return null;
  }
}

export function identityFromWhoAmI(whoami: OperatorWhoAmI, prior?: ScaniomIdentity): ScaniomIdentity {
  return {
    sessionId: prior?.sessionId,
    userId: whoami.user.id,
    email: whoami.user.email,
    displayName: whoami.user.name,
    organizationId: whoami.organization.id,
    organizationName: whoami.organization.name,
    organizationSlug: whoami.organization.slug,
    role: whoami.role,
    deviceLabel: prior?.deviceLabel,
    expiresAt: prior?.expiresAt,
    controlDeploymentId: prior?.controlDeploymentId,
  };
}

export async function clearOpenIiAuth(): Promise<void> {
  await Promise.all([clearCookie(SESSION_COOKIE), clearCookie(ATTEMPT_COOKIE), clearCookie(WORKSPACE_COOKIE)]);
}
