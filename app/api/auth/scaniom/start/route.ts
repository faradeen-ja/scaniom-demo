import { clearCookie, ATTEMPT_COOKIE, writeAuthAttempt } from "@/lib/open-ii/cookies";
import { appVersion } from "@/lib/open-ii/config";
import { controlJson, verifyScaniomControl } from "@/lib/open-ii/control-client";
import { jsonError, noStore, requestClientIp, sameOriginRequest } from "@/lib/open-ii/http";
import { activeProfile, requestHost } from "@/lib/open-ii/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeviceStart = {
  deviceCode?: string;
  userCode?: string;
  verificationPath?: string;
  expiresIn?: number;
  interval?: number;
  error?: string;
};

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const profile = await activeProfile(requestHost(request));
    await clearCookie(ATTEMPT_COOKIE);
    const verified = await verifyScaniomControl(profile);
    const response = await controlJson<DeviceStart>(profile, "/api/v1/cli/device/start", {
      method: "POST",
      body: { clientName: "Open Immune Intelligence", clientVersion: appVersion() },
      clientIp: requestClientIp(request),
    });
    if (!response.ok) throw new Error(response.body.error || `Scaniom Control returned HTTP ${response.status}.`);
    const { deviceCode, userCode, verificationPath } = response.body;
    if (!deviceCode || !userCode || !verificationPath) throw new Error("Scaniom Control returned an incomplete device authorization response.");
    const expiresIn = Math.min(Math.max(Number(response.body.expiresIn || 600), 60), 900);
    const interval = Math.min(Math.max(Number(response.body.interval || 2), 1), 10);
    const authorizationTarget = new URL(verificationPath, `${profile.controlUrl}/`);
    if (authorizationTarget.origin !== profile.controlUrl) throw new Error("Scaniom Control returned a cross-origin verification URL.");
    const authorizeUrl = authorizationTarget.toString();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    await writeAuthAttempt({
      version: 1,
      profileName: profile.name,
      profileType: profile.type,
      controlUrl: profile.controlUrl,
      deviceCode,
      userCode,
      authorizeUrl,
      controlDeploymentId: verified.deployment.id,
      expiresAt,
      interval,
    }, expiresIn);
    return noStore({
      status: "authorization_required",
      profile: { name: profile.name, label: profile.label, type: profile.type, controlUrl: profile.controlUrl },
      userCode,
      authorizeUrl,
      signupUrl: `${profile.controlUrl}/signup`,
      expiresIn,
      interval,
    });
  } catch (error) {
    return jsonError(error, 502);
  }
}
