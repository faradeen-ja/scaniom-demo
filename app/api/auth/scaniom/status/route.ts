import { validateOpenIiSession } from "@/lib/open-ii/auth";
import { controlApi } from "@/lib/open-ii/control-client";
import { noStore } from "@/lib/open-ii/http";
import { activeProfile, requestHost } from "@/lib/open-ii/profile-store";
import type { ControlDeploymentResponse } from "@/lib/open-ii/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = requestHost(request);
  const profile = await activeProfile(host);
  const current = await validateOpenIiSession(host);
  if (!current) {
    return noStore({
      signedIn: false,
      profile: { name: profile.name, label: profile.label, type: profile.type, controlUrl: profile.controlUrl },
      loginUrl: `${profile.controlUrl}/login`,
      signupUrl: `${profile.controlUrl}/signup`,
    });
  }
  let deployment: ControlDeploymentResponse | null = null;
  try {
    deployment = await controlApi<ControlDeploymentResponse>(current.profile, "/api/v1/control/deployment", current.session.token);
  } catch {
    // Deployment identity is useful metadata; whoami already validated the session.
  }
  return noStore({
    signedIn: true,
    profile: { name: current.profile.name, label: current.profile.label, type: current.profile.type, controlUrl: current.profile.controlUrl },
    identity: current.session.identity,
    whoami: current.whoami,
    deployment: deployment?.deployment || null,
    expiresAt: current.session.expiresAt,
  });
}
