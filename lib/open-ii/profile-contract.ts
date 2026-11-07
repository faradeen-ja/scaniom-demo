import { SCANIOM_PROFILE_TYPES, type ScaniomProfileType } from "@/lib/open-ii/types";

export const DEFAULT_CLOUD_PROFILE = Object.freeze({
  name: "cloud",
  label: "Scaniom Cloud",
  type: "cloud" as const,
  controlUrl: "https://control.scaniom.com",
});

const PROFILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,47}$/;

export function isProfileType(value: unknown): value is ScaniomProfileType {
  return typeof value === "string" && (SCANIOM_PROFILE_TYPES as readonly string[]).includes(value);
}

export function normalizeProfileName(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!PROFILE_NAME.test(name)) {
    throw new Error("Profile name must be 1-48 characters: letters, numbers, dot, underscore or dash.");
  }
  return name;
}

export function isLoopbackHost(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

export function inferProfileType(controlUrl: string): ScaniomProfileType {
  const url = new URL(controlUrl);
  if (isLoopbackHost(url.hostname)) return "local";
  if (url.hostname.toLowerCase() === "control.scaniom.com") return "cloud";
  if (/staging|test/i.test(url.hostname)) return "staging";
  return "self-hosted";
}

export function normalizeControlUrl(value: unknown, explicitType?: ScaniomProfileType): string {
  let url: URL;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    throw new Error(`Invalid Control URL: ${String(value || "(empty)")}`);
  }
  if (url.username || url.password) throw new Error("Control URL must not contain embedded credentials.");
  if (url.search || url.hash) throw new Error("Control URL must not contain query parameters or fragments.");
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("Control URL must be an origin, for example https://control.company.com (no path).");
  }

  const type = explicitType ?? inferProfileType(url.origin);
  if (!isProfileType(type)) throw new Error(`Unknown Control deployment type: ${String(type)}`);
  if (type === "local") {
    if (!isLoopbackHost(url.hostname)) {
      throw new Error("Local Control profiles may use only localhost/127.0.0.1/[::1].");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Local Control URL must use http or https.");
    }
  } else if (url.protocol !== "https:") {
    throw new Error("Remote Control profiles require HTTPS. Plain HTTP is allowed only for loopback local development.");
  }
  return url.origin;
}

export function profileCliCommands(profile: {
  name: string;
  type: ScaniomProfileType;
  controlUrl: string;
  customTrust?: boolean;
}): string[] {
  const lines: string[] = [];
  if (profile.name !== "cloud" || profile.controlUrl !== DEFAULT_CLOUD_PROFILE.controlUrl || profile.type !== "cloud") {
    lines.push(`scaniom profile add ${profile.name} --control ${profile.controlUrl} --type ${profile.type}${profile.customTrust ? " --ca-file /path/to/company-ca.pem" : ""}`);
  }
  lines.push(`scaniom profile use ${profile.name}`);
  lines.push("scaniom profile test " + profile.name);
  lines.push("scaniom login");
  lines.push("scaniom auth status");
  lines.push("scaniom whoami");
  return lines;
}
