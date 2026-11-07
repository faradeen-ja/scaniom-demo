import { validateOpenIiSession } from "@/lib/open-ii/auth";
import { noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { requestHost } from "@/lib/open-ii/profile-store";
import { setWorkspaceSelection } from "@/lib/open-ii/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  const current = await validateOpenIiSession(requestHost(request));
  if (!current) return noStore({ error: "Not connected to Scaniom Control." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({})) as { environment?: unknown; workload?: unknown };
    const workspace = await setWorkspaceSelection(body, current.profile, current.session);
    return noStore({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return noStore({ error: message }, { status: 400 });
  }
}
