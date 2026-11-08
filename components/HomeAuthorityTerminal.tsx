"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OpenIiContextResponse } from "@/lib/open-ii/types";
import type { PublicReleaseStatus } from "@/lib/open-ii/public-release";

type AuthStatus = {
  signedIn: boolean;
  profile: { name: string; label: string; type: string; controlUrl: string };
  identity?: { email: string; displayName: string; organizationName: string; role: string };
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function title(value: { id: string; name?: string; slug?: string } | undefined): string {
  return value?.name || value?.slug || value?.id || "—";
}

export function HomeAuthorityTerminal() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [context, setContext] = useState<OpenIiContextResponse | null>(null);
  const [release, setRelease] = useState<PublicReleaseStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      getJson<AuthStatus>("/api/auth/scaniom/status"),
      getJson<PublicReleaseStatus>("/api/scaniom/public-release"),
    ]).then(async ([authResult, releaseResult]) => {
      if (cancelled) return;
      if (releaseResult.status === "fulfilled") setRelease(releaseResult.value);
      if (authResult.status !== "fulfilled") return;
      const auth = authResult.value;
      setStatus(auth);
      if (!auth.signedIn) return;
      try {
        const next = await getJson<OpenIiContextResponse>("/api/scaniom/context");
        if (!cancelled) setContext(next);
      } catch {
        if (!cancelled) setContext(null);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const environment = context?.environments.find((item) => item.id === context.workspace?.environmentId);
  const workload = context?.workloads.find((item) => item.id === context.workspace?.workloadId);
  const online = Boolean(status?.signedIn);
  const scopeReady = Boolean(environment && workload);

  return <section className="home-terminal" aria-label="Open Immune Scaniom authorization status">
    <header><span className="terminal-dots">● ● ●</span><b>OIS AUTH</b><em className={online ? "online" : "offline"}>{online ? "ONLINE" : "AUTH REQUIRED"}</em></header>
    <div className="home-terminal-body">
      <div><span>CONTROL</span><b>{status?.profile.label || "Scaniom Cloud"}</b><small>{status?.profile.controlUrl || "https://control.scaniom.com"}</small></div>
      <div><span>OPERATOR</span><b>{online ? status?.identity?.displayName || status?.identity?.email || "Authorized" : "Not authorized"}</b><small>{online ? status?.identity?.organizationName || "Scaniom organization" : "Approve on Scaniom Control"}</small></div>
      <div><span>SCOPE</span><b>{scopeReady ? `${title(environment)} / ${title(workload)}` : online ? "Select environment + workload" : "Available after OIS Auth"}</b><small>{scopeReady ? "ready for Labs" : "real Scaniom resources only"}</small></div>
      <div><span>PUBLIC RELEASE</span><b>{release ? `${release.release} / ${release.version}` : "R18 / 0.4.1"}</b><small>{release?.source === "github" ? "GitHub release live" : "accepted pinned baseline"}</small></div>
    </div>
    <footer><code>{online ? scopeReady ? "ois://ready/labs" : "ois://authorized/scope-required" : "ois://auth/scaniom"}</code><div><Link href="/workspace">OIS Auth →</Link><Link href="/workbench">Labs →</Link><Link href="/docs">Start A–Z →</Link></div></footer>
  </section>;
}
