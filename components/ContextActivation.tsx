"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AuthStatus = {
  signedIn: boolean;
  profile: { name: string; label: string; type: string; controlUrl: string };
  identity?: { email: string; displayName: string; organizationName: string; role: string };
};

type Context = {
  workspace: { environmentId: string | null; workloadId: string | null } | null;
  environments: Array<{ id: string; name?: string; slug?: string }>;
  workloads: Array<{ id: string; name?: string; slug?: string }>;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function resourceTitle(items: Array<{ id: string; name?: string; slug?: string }>, id?: string | null) {
  if (!id) return "Not selected";
  const item = items.find((value) => value.id === id);
  return item?.name || item?.slug || item?.id || id;
}

export function ContextActivation() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [context, setContext] = useState<Context | null>(null);

  const load = useCallback(async () => {
    try {
      const nextStatus = await getJson<AuthStatus>("/api/auth/scaniom/status");
      setStatus(nextStatus);
      if (nextStatus.signedIn) {
        try { setContext(await getJson<Context>("/api/scaniom/context")); }
        catch { setContext(null); }
      } else {
        setContext(null);
      }
    } catch {
      setStatus(null);
      setContext(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getJson<AuthStatus>("/api/auth/scaniom/status").then(async (nextStatus) => {
      if (cancelled) return;
      setStatus(nextStatus);
      if (!nextStatus.signedIn) {
        setContext(null);
        return;
      }
      try {
        const nextContext = await getJson<Context>("/api/scaniom/context");
        if (!cancelled) setContext(nextContext);
      } catch {
        if (!cancelled) setContext(null);
      }
    }).catch(() => {
      if (!cancelled) {
        setStatus(null);
        setContext(null);
      }
    });

    const refresh = () => { void load(); };
    window.addEventListener("open-ii-auth-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("open-ii-auth-changed", refresh);
    };
  }, [load]);

  const steps = [
    { id: "profile", label: "Profile", detail: status?.profile.label || "Choose Control authority", done: Boolean(status?.profile.name), href: "/profiles" },
    { id: "auth", label: "Authorize", detail: status?.signedIn ? "Operator session approved" : "Approve on Scaniom Control", done: Boolean(status?.signedIn), href: "#connection" },
    { id: "identity", label: "Identity", detail: status?.identity?.displayName || status?.identity?.email || "Waiting for authorization", done: Boolean(status?.identity?.email), href: "#connection" },
    { id: "organization", label: "Organization", detail: status?.identity?.organizationName || "Derived from Scaniom session", done: Boolean(status?.identity?.organizationName), href: "#connection" },
    { id: "environment", label: "Environment", detail: context ? resourceTitle(context.environments, context.workspace?.environmentId) : "Select real environment", done: Boolean(context?.workspace?.environmentId), href: "#scope" },
    { id: "workload", label: "Workload", detail: context ? resourceTitle(context.workloads, context.workspace?.workloadId) : "Select real workload", done: Boolean(context?.workspace?.workloadId), href: "#scope" },
  ];
  const done = steps.filter((step) => step.done).length;
  const ready = done === steps.length;

  return <section className="activation-surface">
    <div className="activation-copy">
      <span className="eyebrow">REAL SCANIOM AUTHORITY</span>
      <h1>{ready ? "OIS Auth ready." : "Bring the fabric authority online."}</h1>
      <p>Open Immune does not invent its own account or fabric state. Select a Scaniom Control profile, authorize the operator, then choose the real environment and workload your lab will use.</p>
      <div className="activation-actions">
        <Link className="button" href={ready ? "/workbench" : "/profiles"}>{ready ? "Choose a lab" : "Review profiles"}</Link>
        <a className="button ghost" href={status?.profile.controlUrl ? `${status.profile.controlUrl}/console` : "https://control.scaniom.com/console"} target="_blank" rel="noreferrer">Open Scaniom Control</a>
      </div>
    </div>
    <div className="activation-meter">
      <div className="activation-meter-head"><span>ACTIVATION STATE</span><b>{done}/{steps.length}</b></div>
      <div className="activation-meter-track"><i style={{ width: `${Math.round((done / steps.length) * 100)}%` }}/></div>
      <small>{ready ? "Ready for Lab/system selection" : "Complete the next amber step below"}</small>
    </div>
    <div className="activation-steps">
      {steps.map((step, index) => {
        const next = !step.done && steps.slice(0, index).every((item) => item.done);
        return <a key={step.id} href={step.href} className={`activation-step ${step.done ? "done" : next ? "next" : "locked"}`}>
          <i>{step.done ? "✓" : index + 1}</i>
          <span><small>{step.label}</small><b>{step.detail}</b></span>
          <em>{step.done ? "ONLINE" : next ? "DO NEXT" : "WAIT"}</em>
        </a>;
      })}
    </div>
  </section>;
}
