import "server-only";
import { isProfileType, normalizeControlUrl, normalizeProfileName } from "@/lib/open-ii/profile-contract";
import type { ResolvedControlProfile } from "@/lib/open-ii/types";

export type ServerProfileConfig = ResolvedControlProfile;

function parseJson<T>(name: string, fallback: T): T {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${name} must contain valid JSON.`);
  }
}

export function serverProfiles(): ServerProfileConfig[] {
  const rows = parseJson<unknown[]>("OPEN_II_PROFILES_JSON", []);
  if (!Array.isArray(rows)) throw new Error("OPEN_II_PROFILES_JSON must be a JSON array.");
  const names = new Set<string>();
  const result: ServerProfileConfig[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("OPEN_II_PROFILES_JSON entries must be objects.");
    const value = raw as Record<string, unknown>;
    const name = normalizeProfileName(value.name);
    if (name === "cloud") throw new Error("OPEN_II_PROFILES_JSON cannot replace the built-in cloud profile.");
    if (names.has(name)) throw new Error(`Duplicate server profile: ${name}`);
    if (!isProfileType(value.type)) throw new Error(`Invalid server profile type for ${name}.`);
    const controlUrl = normalizeControlUrl(value.controlUrl, value.type);
    const caEnv = value.caEnv ? String(value.caEnv).trim() : null;
    if (caEnv && !/^[A-Z][A-Z0-9_]{2,127}$/.test(caEnv)) throw new Error(`Invalid caEnv for profile ${name}.`);
    result.push({
      name,
      label: String(value.label || name).trim().slice(0, 80) || name,
      type: value.type,
      controlUrl,
      source: "server",
      removable: false,
      customTrust: Boolean(caEnv),
      privateNetwork: Boolean(value.allowPrivateNetwork),
      caEnv,
      allowPrivateNetwork: Boolean(value.allowPrivateNetwork),
    });
    names.add(name);
  }
  return result;
}

export function hostProfileMap(): Record<string, string> {
  const raw = parseJson<Record<string, unknown>>("OPEN_II_HOST_PROFILE_MAP_JSON", {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("OPEN_II_HOST_PROFILE_MAP_JSON must be a JSON object.");
  const out: Record<string, string> = {};
  for (const [host, name] of Object.entries(raw)) {
    const normalizedHost = host.trim().toLowerCase().replace(/:\d+$/, "");
    if (!normalizedHost || normalizedHost.includes("/")) throw new Error(`Invalid host in OPEN_II_HOST_PROFILE_MAP_JSON: ${host}`);
    out[normalizedHost] = normalizeProfileName(name);
  }
  return out;
}

export function appVersion(): string {
  return String(process.env.OPEN_II_VERSION || "0.1.0").trim() || "0.1.0";
}

export function sessionMaxAgeSeconds(): number {
  const parsed = Number(process.env.OPEN_II_SESSION_MAX_AGE_SECONDS || 12 * 60 * 60);
  if (!Number.isFinite(parsed) || parsed < 300 || parsed > 7 * 24 * 60 * 60) return 12 * 60 * 60;
  return Math.floor(parsed);
}
