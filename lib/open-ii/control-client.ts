import "server-only";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import type { ResolvedControlProfile } from "@/lib/open-ii/types";
import { loopbackAddress, remoteAddressAllowed } from "@/lib/open-ii/network-policy";

export type ControlJsonResponse<T> = {
  ok: boolean;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: T;
};

type JsonInit = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  timeoutMs?: number;
  clientIp?: string | null;
};

function allowedHostByConfiguration(hostname: string): boolean {
  const raw = String(process.env.OPEN_II_CONTROL_HOST_ALLOWLIST || "").trim();
  if (!raw) return true;
  const host = hostname.toLowerCase();
  return raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith("*.")) return host.endsWith(rule.slice(1)) && host !== rule.slice(2);
    return host === rule;
  });
}




async function pinnedTarget(profile: ResolvedControlProfile): Promise<{ address: string; family: 4 | 6; ca?: string }> {
  const url = new URL(profile.controlUrl);
  if (!allowedHostByConfiguration(url.hostname)) throw new Error(`Control host is not allowed by this Open Immune deployment: ${url.hostname}`);

  const localAllowed = profile.type === "local" && process.env.NODE_ENV !== "production" && process.env.OPEN_II_ALLOW_LOCAL_PROFILES !== "0";
  if (profile.type === "local" && !localAllowed) {
    throw new Error("Local Control profiles are available only when Open Immune is itself running locally.");
  }

  const literalFamily = isIP(url.hostname.replace(/^\[|\]$/g, ""));
  const answers: Array<{ address: string; family: number }> = literalFamily
    ? [{ address: url.hostname.replace(/^\[|\]$/g, ""), family: literalFamily as 4 | 6 }]
    : await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!answers.length) throw new Error(`Control host did not resolve: ${url.hostname}`);

  const allowPrivate = profile.source === "server" && profile.allowPrivateNetwork;
  const valid = answers.find((answer) => {
    if (profile.type === "local") return loopbackAddress(answer.address, answer.family);
    return remoteAddressAllowed(answer.address, answer.family, allowPrivate);
  });
  if (!valid) {
    throw new Error(`Control host resolves only to private/reserved addresses. Configure it as a server-managed private profile when Open Immune is deployed inside that network.`);
  }

  let ca: string | undefined;
  if (profile.caEnv) {
    ca = String(process.env[profile.caEnv] || "").trim();
    if (!ca) throw new Error(`Server profile ${profile.name} requires CA material in ${profile.caEnv}.`);
  }
  return { address: valid.address, family: valid.family as 4 | 6, ...(ca ? { ca } : {}) };
}

export async function controlJson<T>(profile: ResolvedControlProfile, route: string, init: JsonInit = {}): Promise<ControlJsonResponse<T>> {
  if (!route.startsWith("/")) throw new Error("Control API route must begin with '/'.");
  const base = new URL(profile.controlUrl);
  const target = await pinnedTarget(profile);
  const body = init.body === undefined ? null : JSON.stringify(init.body);
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "Open-Immune-Intelligence/0.1",
    ...(body ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) } : {}),
    ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    ...(init.clientIp && isIP(init.clientIp) ? { "x-forwarded-for": init.clientIp } : {}),
  };
  const transport = base.protocol === "https:" ? https : http;
  const timeoutMs = Math.min(Math.max(Number(init.timeoutMs || 12_000), 1_000), 30_000);
  const originalHostname = base.hostname.replace(/^\[|\]$/g, "");
  headers.host = base.host;

  return new Promise<ControlJsonResponse<T>>((resolve, reject) => {
    const request = transport.request({
      protocol: base.protocol,
      hostname: target.address,
      family: target.family,
      port: base.port || undefined,
      method: init.method || "GET",
      path: route,
      headers,
      timeout: timeoutMs,
      ...(base.protocol === "https:" ? { rejectUnauthorized: true, ...(isIP(originalHostname) ? {} : { servername: originalHostname }), ...(target.ca ? { ca: target.ca } : {}) } : {}),
    }, (response: http.IncomingMessage) => {
      let raw = "";
      let bytes = 0;
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 2 * 1024 * 1024) {
          request.destroy(new Error("Control response exceeded 2 MiB."));
          return;
        }
        raw += chunk;
      });
      response.on("end", () => {
        if (request.destroyed && bytes > 2 * 1024 * 1024) return;
        let parsed: unknown = {};
        if (raw) {
          try { parsed = JSON.parse(raw); }
          catch { parsed = { error: "Control returned a non-JSON response." }; }
        }
        const status = response.statusCode || 500;
        resolve({ ok: status >= 200 && status < 300, status, headers: response.headers, body: parsed as T });
      });
    });
    request.on("timeout", () => request.destroy(new Error(`Control request timed out after ${timeoutMs} ms.`)));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

export class ControlHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ControlHttpError";
    this.status = status;
  }
}

export async function controlApi<T>(profile: ResolvedControlProfile, route: string, token: string, init: Omit<JsonInit, "token"> = {}): Promise<T> {
  const response = await controlJson<T & { error?: string }>(profile, route, { ...init, token });
  if (!response.ok) throw new ControlHttpError(response.status, response.body?.error || `Scaniom Control returned HTTP ${response.status}.`);
  return response.body;
}

export type VerifiedScaniomControl = {
  deployment: {
    id: string;
    label?: string;
    type?: string;
    controlUrl: string;
    apiContract: string;
    authProtocol: string;
    network?: string;
    trust?: string;
    [key: string]: unknown;
  };
  modes?: unknown;
};

export async function verifyScaniomControl(profile: ResolvedControlProfile): Promise<VerifiedScaniomControl> {
  const response = await controlJson<VerifiedScaniomControl & { error?: string }>(profile, "/api/v1/control/deployment", { timeoutMs: 7_000 });
  if (!response.ok) throw new Error(response.body?.error || `Control deployment endpoint returned HTTP ${response.status}.`);
  const deployment = response.body?.deployment;
  if (!deployment?.id || deployment.apiContract !== "scaniom-control-v1" || deployment.authProtocol !== "scaniom-cli-device-v1") {
    throw new Error("Target did not present the required Scaniom Control API/auth contract and deployment identity.");
  }
  let canonical: string;
  try { canonical = new URL(deployment.controlUrl).origin; }
  catch { throw new Error("Scaniom Control returned an invalid canonical Control origin."); }
  if (canonical !== profile.controlUrl) {
    throw new Error(`Control reports a different canonical origin: ${deployment.controlUrl}`);
  }
  return response.body;
}
