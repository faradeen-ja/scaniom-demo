import { noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { activeProfile, profileByName, requestHost } from "@/lib/open-ii/profile-store";
import { verifyScaniomControl } from "@/lib/open-ii/control-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as { name?: unknown };
    const host = requestHost(request);
    const profile = body.name ? await profileByName(body.name, host) : await activeProfile(host);
    const result = await verifyScaniomControl(profile);
    return noStore({
      ok: true,
      profile: { name: profile.name, label: profile.label, type: profile.type, controlUrl: profile.controlUrl },
      deployment: result.deployment,
    });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
