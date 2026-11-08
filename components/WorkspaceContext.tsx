"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Environment = { id: string; name?: string; slug?: string; kind?: string; status?: string };
type Workload = { id: string; name?: string; slug?: string; kind?: string; status?: string; environment_id?: string; environmentId?: string };
type Context = {
  profile: { name: string; label: string; type: string; controlUrl: string };
  identity: { email: string; displayName: string; organizationId: string; organizationName: string; organizationSlug: string; role: string };
  whoami: { user: { id: string; email: string; name: string }; organization: { id: string; name: string; slug: string }; role: string; credential: { kind: string; name: string } };
  deployment: { id?: string; label?: string; type?: string; mode?: string };
  workspace: { environmentId: string | null; workloadId: string | null } | null;
  environments: Environment[];
  workloads: Workload[];
  cli: string[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

const title = (value: { id: string; name?: string; slug?: string }) => value.name || value.slug || value.id;

export function WorkspaceContext() {
  const [context, setContext] = useState<Context | null>(null);
  const [environment, setEnvironment] = useState("");
  const [workload, setWorkload] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api<Context>("/api/scaniom/context");
      setContext(next);
      setEnvironment(next.workspace?.environmentId || "");
      setWorkload(next.workspace?.workloadId || "");
      setError("");
    } catch (err) {
      setContext(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<Context>("/api/scaniom/context").then((next) => {
      if (cancelled) return;
      setContext(next);
      setEnvironment(next.workspace?.environmentId || "");
      setWorkload(next.workspace?.workloadId || "");
      setError("");
    }).catch((err: unknown) => {
      if (!cancelled) { setContext(null); setError(err instanceof Error ? err.message : String(err)); }
    });
    const refresh = () => { void load(); };
    window.addEventListener("open-ii-auth-changed", refresh);
    return () => { cancelled = true; window.removeEventListener("open-ii-auth-changed", refresh); };
  }, [load]);

  const visibleWorkloads = useMemo(() => {
    if (!context || !environment) return context?.workloads || [];
    return context.workloads.filter((item) => String(item.environment_id || item.environmentId || "") === environment);
  }, [context, environment]);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/workspace/context", { method: "POST", body: JSON.stringify({ environment, workload }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  if (!context) return <section className="panel scope-empty"><div><span className="state-dot waiting"/><small>REAL SCANIOM SCOPE</small><h2>Authorize Scaniom first.</h2><p>{error || "Environment and workload become available after the operator session is approved."}</p></div><Link className="button" href="#connection">Go to authorization</Link></section>;

  const selectedEnvironment = context.environments.find((item) => item.id === context.workspace?.environmentId);
  const selectedWorkload = context.workloads.find((item) => item.id === context.workspace?.workloadId);
  const ready = Boolean(selectedEnvironment && selectedWorkload);

  return <div className="scope-layout">
    <section className="panel scope-picker">
      <div className="panel-heading"><div><small>REAL SCANIOM SCOPE</small><h2>Environment + workload</h2></div><span className={ready ? "accepted-badge" : "scope-state"}>{ready ? "✓ READY" : "SELECT"}</span></div>
      <p className="muted">Choose existing Scaniom resources. Open Immune stores only this selection and validates that the workload belongs to the selected environment.</p>
      <form onSubmit={save}>
        <label><span>01 · ENVIRONMENT</span><select value={environment} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setEnvironment(e.target.value); setWorkload(""); }}><option value="">Select real environment…</option>{context.environments.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.status ? ` · ${item.status}` : ""}</option>)}</select></label>
        <label><span>02 · WORKLOAD</span><select value={workload} onChange={(e: ChangeEvent<HTMLSelectElement>) => setWorkload(e.target.value)}><option value="">Select real workload…</option>{visibleWorkloads.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.kind ? ` · ${item.kind}` : ""}</option>)}</select></label>
        <button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : ready ? "Update scope" : "Use this scope"}</button>
      </form>
      {error ? <p className="error-box">{error}</p> : null}
    </section>

    <section className="panel scope-current">
      <div className="panel-heading"><div><small>CURRENT AUTHORITY</small><h2>{ready ? "Ready for a lab." : "Scope incomplete."}</h2></div><span>{context.profile.name}</span></div>
      <div className="scope-current-stack">
        <div><small>CONTROL</small><b>{context.profile.label}</b><span>{context.profile.controlUrl}</span></div>
        <div><small>ORGANIZATION</small><b>{context.whoami.organization.name}</b><span>{context.whoami.organization.slug} · {context.whoami.role.replaceAll("_", " ")}</span></div>
        <div className={selectedEnvironment ? "online" : "waiting"}><small>ENVIRONMENT</small><b>{selectedEnvironment ? title(selectedEnvironment) : "Not selected"}</b><span>{selectedEnvironment?.status || "Required before workload"}</span></div>
        <div className={selectedWorkload ? "online" : "waiting"}><small>WORKLOAD</small><b>{selectedWorkload ? title(selectedWorkload) : "Not selected"}</b><span>{selectedWorkload?.kind || "Required for runtime identity"}</span></div>
      </div>
      <div className="button-row"><Link className={`button ${ready ? "" : "secondary"}`} href="/workbench">{ready ? "Choose a lab" : "Preview lab library"}</Link><Link className="button ghost" href="/profiles">Profiles</Link></div>
    </section>

    <section className="panel cli-block scope-cli">
      <div className="panel-heading"><div><small>WEB + CLI PARITY</small><h2>Same authority, same scope.</h2></div><span>{context.whoami.credential.kind}</span></div>
      <p className="microcopy">These commands target the same Control profile. Lab-specific commands appear in the workbench after you select a Lab.</p>
      <pre>{context.cli.join("\n")}{selectedWorkload ? `\nscaniom workload use ${selectedWorkload.slug || selectedWorkload.name || selectedWorkload.id}\nscaniom attach status --workload ${selectedWorkload.slug || selectedWorkload.name || selectedWorkload.id}` : ""}</pre>
    </section>
  </div>;
}
