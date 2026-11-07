import { NextResponse } from "next/server";
import { jsonError, noStore, sameOriginRequest } from "@/lib/open-ii/http";
import { removeUserProfile } from "@/lib/open-ii/profile-store";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const { name } = await params;
    await removeUserProfile(name);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
