import { validateOpenIiSession } from "@/lib/open-ii/auth";
import { approveCliParityChallenge, cliParityPublicState } from "@/lib/open-ii/cli-parity";
import { jsonError, noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { requestHost } from "@/lib/open-ii/profile-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loopback(request: Request): boolean {
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export async function POST(request: Request) {
  if (!loopback(request)) return noStore({ error: "CLI parity handoff is local-only." }, { status: 403 });
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as { challengeId?: unknown };
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    if (!challengeId) return noStore({ error: "challengeId is required." }, { status: 400 });
    const current = await validateOpenIiSession(requestHost(request));
    if (!current) return noStore({ error: "Open Immune Web is not connected to Scaniom Control." }, { status: 401 });
    const approved = approveCliParityChallenge({
      id: challengeId,
      profileName: current.profile.name,
      profileType: current.profile.type,
      controlUrl: current.profile.controlUrl,
      organizationId: current.whoami.organization.id,
      organizationName: current.whoami.organization.name,
    });
    return noStore(cliParityPublicState(approved));
  } catch (error) {
    return jsonError(error, 400);
  }
}
