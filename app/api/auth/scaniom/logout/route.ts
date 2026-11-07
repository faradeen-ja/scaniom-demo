import { clearOpenIiAuth, currentOpenIiSession } from "@/lib/open-ii/auth";
import { controlJson } from "@/lib/open-ii/control-client";
import { noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { requestHost } from "@/lib/open-ii/profile-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  const current = await currentOpenIiSession(requestHost(request));
  if (current) {
    try {
      await controlJson(current.profile, "/api/v1/cli/session/revoke", { method: "POST", token: current.session.token });
    } catch {
      // Local session is still cleared if the selected Control is temporarily unreachable.
    }
  }
  await clearOpenIiAuth();
  return noStore({ ok: true });
}
