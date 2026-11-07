import "server-only";
import { clearCookie, ATTEMPT_COOKIE, SESSION_COOKIE, WORKSPACE_COOKIE, readProfileCookie, writeProfileCookie } from "@/lib/open-ii/cookies";
import { hostProfileMap, serverProfiles } from "@/lib/open-ii/config";
import { DEFAULT_CLOUD_PROFILE, isProfileType, normalizeControlUrl, normalizeProfileName } from "@/lib/open-ii/profile-contract";
import type { ProfileCookieState, PublicControlProfile, ResolvedControlProfile, UserControlProfile } from "@/lib/open-ii/types";

const DEFAULT_STATE: ProfileCookieState = { version: 1, activeProfile: null, userProfiles: [] };
const MAX_USER_PROFILES = 12;

function builtInCloud(): ResolvedControlProfile {
  return {
    ...DEFAULT_CLOUD_PROFILE,
    source: "built-in",
    removable: false,
    customTrust: false,
    privateNetwork: false,
    caEnv: null,
    allowPrivateNetwork: false,
  };
}

function sanitizeUserProfile(raw: unknown): UserControlProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  try {
    const name = normalizeProfileName(value.name);
    if (name === "cloud") return null;
    if (!isProfileType(value.type)) return null;
    const controlUrl = normalizeControlUrl(value.controlUrl, value.type);
    const label = String(value.label || name).trim().slice(0, 80) || name;
    return { name, label, type: value.type, controlUrl };
  } catch {
    return null;
  }
}

async function profileState(): Promise<ProfileCookieState> {
  const raw = await readProfileCookie();
  if (!raw || raw.version !== 1 || !Array.isArray(raw.userProfiles)) return { ...DEFAULT_STATE };
  const userProfiles = raw.userProfiles.map(sanitizeUserProfile).filter((item): item is UserControlProfile => Boolean(item)).slice(0, MAX_USER_PROFILES);
  const activeProfile = raw.activeProfile ? (() => { try { return normalizeProfileName(raw.activeProfile); } catch { return null; } })() : null;
  return { version: 1, activeProfile, userProfiles };
}

function toResolvedUser(profile: UserControlProfile): ResolvedControlProfile {
  return {
    ...profile,
    source: "user",
    removable: true,
    customTrust: false,
    privateNetwork: false,
    caEnv: null,
    allowPrivateNetwork: false,
  };
}

export async function listResolvedProfiles(host = ""): Promise<ResolvedControlProfile[]> {
  const state = await profileState();
  const configuredServerProfiles = serverProfiles();
  const mappedProfile = hostProfileMap()[host.toLowerCase()] || null;
  const visibleServerProfiles = process.env.NODE_ENV !== "production"
    ? configuredServerProfiles
    : configuredServerProfiles.filter((item) => item.name === mappedProfile);
  const fixed = [builtInCloud(), ...visibleServerProfiles];
  const reserved = new Set(["cloud", ...configuredServerProfiles.map((item) => item.name)]);
  const users = state.userProfiles.filter((item) => !reserved.has(item.name)).map(toResolvedUser);
  return [...fixed, ...users];
}

export function requestHost(request: Request): string {
  const raw = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

export async function activeProfile(host = ""): Promise<ResolvedControlProfile> {
  const [state, profiles] = await Promise.all([profileState(), listResolvedProfiles(host)]);
  const mapped = hostProfileMap()[host.toLowerCase()] || null;
  const selected = state.activeProfile || mapped || "cloud";
  return profiles.find((item) => item.name === selected) || profiles[0];
}

export async function profileByName(nameInput: unknown, host = ""): Promise<ResolvedControlProfile> {
  const name = normalizeProfileName(nameInput);
  const profile = (await listResolvedProfiles(host)).find((item) => item.name === name);
  if (!profile) throw new Error(`Control profile not found: ${name}`);
  return profile;
}

export async function publicProfileState(host = ""): Promise<{ activeProfile: string; profiles: PublicControlProfile[] }> {
  const [active, profiles] = await Promise.all([activeProfile(host), listResolvedProfiles(host)]);
  return {
    activeProfile: active.name,
    profiles: profiles.map((profile) => ({
      name: profile.name,
      label: profile.label,
      type: profile.type,
      controlUrl: profile.controlUrl,
      source: profile.source,
      removable: profile.removable,
      customTrust: profile.customTrust,
      privateNetwork: profile.privateNetwork,
    })),
  };
}

export async function addUserProfile(input: unknown): Promise<PublicControlProfile> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Profile body is required.");
  const value = input as Record<string, unknown>;
  const name = normalizeProfileName(value.name);
  if (!isProfileType(value.type)) throw new Error("Profile type must be local, cloud, self-hosted, private-enterprise, or staging.");
  const controlUrl = normalizeControlUrl(value.controlUrl, value.type);
  const label = String(value.label || name).trim().slice(0, 80) || name;
  const state = await profileState();
  const fixedNames = new Set(["cloud", ...serverProfiles().map((item) => item.name)]);
  if (fixedNames.has(name)) throw new Error(`Profile ${name} is managed by this Open Immune deployment and cannot be replaced.`);
  const existing = state.userProfiles.find((item) => item.name === name);
  if (!existing && state.userProfiles.length >= MAX_USER_PROFILES) throw new Error(`At most ${MAX_USER_PROFILES} user profiles can be stored in this browser.`);
  const next: UserControlProfile = { name, label, type: value.type, controlUrl };
  const authorityChanged = Boolean(existing && (existing.controlUrl !== next.controlUrl || existing.type !== next.type));
  const userProfiles = existing
    ? state.userProfiles.map((item) => item.name === name ? next : item)
    : [...state.userProfiles, next];
  await writeProfileCookie({ version: 1, activeProfile: state.activeProfile, userProfiles });
  if (authorityChanged && state.activeProfile === name) {
    await Promise.all([clearCookie(SESSION_COOKIE), clearCookie(ATTEMPT_COOKIE), clearCookie(WORKSPACE_COOKIE)]);
  }
  return { ...next, source: "user", removable: true, customTrust: false, privateNetwork: false };
}

export async function selectProfile(nameInput: unknown, host = ""): Promise<ResolvedControlProfile> {
  const name = normalizeProfileName(nameInput);
  const profiles = await listResolvedProfiles(host);
  const selected = profiles.find((item) => item.name === name);
  if (!selected) throw new Error(`Control profile not found: ${name}`);
  const state = await profileState();
  const changed = state.activeProfile !== selected.name;
  await writeProfileCookie({ ...state, activeProfile: selected.name });
  if (changed) {
    // A token minted by one Control must never cross to another profile.
    await Promise.all([clearCookie(SESSION_COOKIE), clearCookie(ATTEMPT_COOKIE), clearCookie(WORKSPACE_COOKIE)]);
  }
  return selected;
}

export async function removeUserProfile(nameInput: unknown): Promise<void> {
  const name = normalizeProfileName(nameInput);
  const state = await profileState();
  const target = state.userProfiles.find((item) => item.name === name);
  if (!target) throw new Error(`User profile not found or not removable: ${name}`);
  const userProfiles = state.userProfiles.filter((item) => item.name !== name);
  const wasActive = state.activeProfile === name;
  await writeProfileCookie({ version: 1, activeProfile: wasActive ? "cloud" : state.activeProfile, userProfiles });
  if (wasActive) {
    await Promise.all([clearCookie(SESSION_COOKIE), clearCookie(ATTEMPT_COOKIE), clearCookie(WORKSPACE_COOKIE)]);
  }
}
