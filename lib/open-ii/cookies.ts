import "server-only";
import { cookies } from "next/headers";
import { sealJson, unsealJson } from "@/lib/open-ii/crypto";
import type { OpenIiAuthAttempt, OpenIiSession, ProfileCookieState, WorkspaceCookieState } from "@/lib/open-ii/types";

export const PROFILE_COOKIE = "open_ii_profiles_v1";
export const ATTEMPT_COOKIE = "open_ii_auth_attempt_v1";
export const SESSION_COOKIE = "open_ii_session_v1";
export const WORKSPACE_COOKIE = "open_ii_workspace_v1";

function baseCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

export async function readSealedCookie<T>(name: string, purpose: string): Promise<T | null> {
  const jar = await cookies();
  return unsealJson<T>(purpose, jar.get(name)?.value);
}

export async function writeSealedCookie<T>(name: string, purpose: string, value: T, maxAge: number): Promise<void> {
  const jar = await cookies();
  jar.set(name, sealJson(purpose, value), baseCookie(maxAge));
}

export async function clearCookie(name: string): Promise<void> {
  const jar = await cookies();
  jar.set(name, "", { ...baseCookie(0), maxAge: 0 });
}

export const readProfileCookie = () => readSealedCookie<ProfileCookieState>(PROFILE_COOKIE, "profiles");
export const writeProfileCookie = (value: ProfileCookieState) => writeSealedCookie(PROFILE_COOKIE, "profiles", value, 180 * 24 * 60 * 60);
export const readAuthAttempt = () => readSealedCookie<OpenIiAuthAttempt>(ATTEMPT_COOKIE, "auth-attempt");
export const writeAuthAttempt = (value: OpenIiAuthAttempt, maxAge: number) => writeSealedCookie(ATTEMPT_COOKIE, "auth-attempt", value, maxAge);
export const readOpenIiSession = () => readSealedCookie<OpenIiSession>(SESSION_COOKIE, "session");
export const writeOpenIiSession = (value: OpenIiSession, maxAge: number) => writeSealedCookie(SESSION_COOKIE, "session", value, maxAge);
export const readWorkspaceCookie = () => readSealedCookie<WorkspaceCookieState>(WORKSPACE_COOKIE, "workspace");
export const writeWorkspaceCookie = (value: WorkspaceCookieState) => writeSealedCookie(WORKSPACE_COOKIE, "workspace", value, 30 * 24 * 60 * 60);
