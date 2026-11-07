import { isIP } from "node:net";
import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : String(error || "Request failed.");
  return NextResponse.json({ error: message }, { status });
}

export function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (!host) return false;
  try {
    const source = new URL(origin);
    const requestUrl = new URL(request.url);
    const protocol = forwardedProto === "http" || forwardedProto === "https" ? `${forwardedProto}:` : requestUrl.protocol;
    return source.host === host && source.protocol === protocol;
  } catch { return false; }
}

export function requestClientIp(request: Request): string | null {
  const candidates = [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
  ];
  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) return candidate;
  }
  return null;
}

export function noStore<T>(body: T, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}
