import { clearCookie, ATTEMPT_COOKIE, readAuthAttempt, writeOpenIiSession } from "@/lib/open-ii/cookies";
import { sessionMaxAgeSeconds } from "@/lib/open-ii/config";
import { controlApi, controlJson } from "@/lib/open-ii/control-client";
import { identityFromWhoAmI } from "@/lib/open-ii/auth";
import { jsonError, noStore, requestClientIp, sameOriginRequest } from "@/lib/open-ii/http";
import { activeProfile, requestHost } from "@/lib/open-ii/profile-store";
import type { OperatorWhoAmI, ScaniomIdentity } from "@/lib/open-ii/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceToken = {
  token?: string;
  tokenType?: string;
  identity?: ScaniomIdentity;
  error?: string;
};

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const [attempt, profile] = await Promise.all([readAuthAttempt(), activeProfile(requestHost(request))]);
    if (!attempt || attempt.version !== 1) return noStore({ status: "missing" }, { status: 400 });
    if (Date.parse(attempt.expiresAt) <= Date.now()) {
      await clearCookie(ATTEMPT_COOKIE);
      return noStore({ status: "expired" }, { status: 410 });
    }
    if (attempt.profileName !== profile.name || attempt.profileType !== profile.type || attempt.controlUrl !== profile.controlUrl) {
      await clearCookie(ATTEMPT_COOKIE);
      return noStore({ status: "profile_changed" }, { status: 409 });
    }

    const tokenResponse = await controlJson<DeviceToken>(profile, "/api/v1/cli/device/token", {
      method: "POST",
      body: { deviceCode: attempt.deviceCode, deviceLabel: `Open Immune Intelligence · ${requestHost(request) || "web"}` },
      clientIp: requestClientIp(request),
    });
    const error = tokenResponse.body?.error;
    if (tokenResponse.status === 428 || error === "authorization_pending") {
      return noStore({ status: "pending", interval: attempt.interval });
    }
    if (error === "slow_down" || tokenResponse.status === 429) {
      return noStore({ status: "pending", interval: Math.min(attempt.interval + 2, 10) }, { status: 202 });
    }
    if (!tokenResponse.ok) {
      if (["access_denied", "device_code_consumed", "expired_token"].includes(String(error))) await clearCookie(ATTEMPT_COOKIE);
      return noStore({ status: String(error || "failed") }, { status: tokenResponse.status });
    }
    const token = String(tokenResponse.body.token || "");
    const tokenIdentity = tokenResponse.body.identity;
    if (!token.startsWith("scn_cli_") || !tokenIdentity?.email) throw new Error("Scaniom Control returned an invalid authorization token.");
    if (tokenIdentity.controlDeploymentId && tokenIdentity.controlDeploymentId !== attempt.controlDeploymentId) {
      await clearCookie(ATTEMPT_COOKIE);
      throw new Error("Scaniom authorization was issued by a different Control deployment.");
    }

    const whoami = await controlApi<OperatorWhoAmI>(profile, "/api/v1/operator/whoami", token);
    const identity = identityFromWhoAmI(whoami, tokenIdentity);
    const tokenExpiry = tokenIdentity.expiresAt ? Date.parse(tokenIdentity.expiresAt) : Number.POSITIVE_INFINITY;
    const appExpiry = Date.now() + sessionMaxAgeSeconds() * 1000;
    const expiresAtMs = Math.min(Number.isFinite(tokenExpiry) ? tokenExpiry : appExpiry, appExpiry);
    const maxAge = Math.max(60, Math.floor((expiresAtMs - Date.now()) / 1000));
    const session = {
      version: 1 as const,
      profileName: profile.name,
      profileType: profile.type,
      controlUrl: profile.controlUrl,
      token,
      identity,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
    await writeOpenIiSession(session, maxAge);
    await clearCookie(ATTEMPT_COOKIE);
    return noStore({
      status: "authorized",
      identity,
      profile: { name: profile.name, label: profile.label, type: profile.type, controlUrl: profile.controlUrl },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return jsonError(error, 502);
  }
}
