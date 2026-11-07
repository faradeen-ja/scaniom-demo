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
      if (!cancelled) {
        setContext(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
    const refresh = () => { void load(); };
    window.addEventListener("open-ii-auth-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("open-ii-auth-changed", refresh);
    };
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

  if (!context) return <section className="panel"><div className="panel-heading"><div><small>WORKSPACE CONTEXT</small><h2>Connect Scaniom first</h2></div></div><p>{error || "Reading environments and workloads…"}</p><Link className="button" href="/">Go to connection</Link></section>;

  const selectedEnvironment = context.environments.find((item) => item.id === context.workspace?.environmentId);
  const selectedWorkload = context.workloads.find((item) => item.id === context.workspace?.workloadId);

  return <div className="workspace-grid">
    <section className="panel workspace-scope">
      <div className="panel-heading"><div><small>REAL SCANIOM AUTHORITY</small><h2>Current operator context</h2></div><span className="accepted-badge">LIVE</span></div>
      <dl className="facts">
        <div><dt>Identity</dt><dd>{context.whoami.user.name}<small>{context.whoami.user.email}</small></dd></div>
        <div><dt>Organization</dt><dd>{context.whoami.organization.name}<small>{context.whoami.organization.slug} · {context.whoami.role.replaceAll("_", " ")}</small></dd></div>
        <div><dt>Credential</dt><dd>{context.whoami.credential.kind}<small>{context.whoami.credential.name}</small></dd></div>
        <div><dt>Control</dt><dd>{context.profile.label}<small>{context.profile.controlUrl}</small></dd></div>
        <div><dt>Deployment</dt><dd>{context.deployment?.label || context.deployment?.id || "Scaniom Control"}<small>{context.deployment?.type || context.deployment?.mode || "active"}</small></dd></div>
      </dl>
      <p className="microcopy">The organization comes from the Scaniom authorization that minted this operator session. To move to another Scaniom organization, change organization in that Control, sign out here, and reconnect.</p>
    </section>

    <section className="panel workspace-selector">
      <div className="panel-heading"><div><small>OPEN IMMUNE WORKSPACE</small><h2>Environment + workload</h2></div><span>{context.environments.length} env · {context.workloads.length} workload</span></div>
      <form onSubmit={save}>
        <label>Environment<select value={environment} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setEnvironment(e.target.value); setWorkload(""); }}><option value="">No environment selected</option>{context.environments.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.status ? ` · ${item.status}` : ""}</option>)}</select></label>
        <label>Workload<select value={workload} onChange={(e: ChangeEvent<HTMLSelectElement>) => setWorkload(e.target.value)}><option value="">No workload selected</option>{visibleWorkloads.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.kind ? ` · ${item.kind}` : ""}</option>)}</select></label>
        <button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Use workspace"}</button>
      </form>
      <div className="workspace-current"><small>CURRENT</small><b>{selectedEnvironment ? title(selectedEnvironment) : "No environment"}</b><span>{selectedWorkload ? title(selectedWorkload) : "No workload"}</span></div>
      {error ? <p className="error-box">{error}</p> : null}
    </section>

    <section className="panel cli-block workspace-cli">
      <div className="panel-heading"><div><small>WEB + CLI PARITY</small><h2>Same Control profile</h2></div></div>
      <pre>{context.cli.join("\n")}</pre>
      {selectedWorkload ? <pre>{`scaniom workload use ${selectedWorkload.slug || selectedWorkload.name || selectedWorkload.id}\nscaniom attach status --workload ${selectedWorkload.slug || selectedWorkload.name || selectedWorkload.id}`}</pre> : null}
    </section>
  </div>;
}
