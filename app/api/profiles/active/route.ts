import { NextResponse } from "next/server";
import { jsonError, noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { requestHost, selectProfile } from "@/lib/open-ii/profile-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as { name?: unknown };
    const profile = await selectProfile(body.name, requestHost(request));
    return NextResponse.json({ activeProfile: profile.name }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
