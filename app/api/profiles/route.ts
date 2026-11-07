import { NextResponse } from "next/server";
import { addUserProfile, publicProfileState, requestHost } from "@/lib/open-ii/profile-store";
import { jsonError, noStore, sameOriginRequest } from "@/lib/open-ii/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(await publicProfileState(requestHost(request)), { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return noStore({ error: "Origin rejected." }, { status: 403 });
  try {
    const body = await request.json();
    const profile = await addUserProfile(body);
    return NextResponse.json({ profile }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
