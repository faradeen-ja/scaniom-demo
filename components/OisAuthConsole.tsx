"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ScaniomConnection } from "@/components/ScaniomConnection";
import { StackIcon } from "@/components/StackIcon";
import type { OpenIiContextResponse } from "@/lib/open-ii/types";

type AuthStatus = {
  signedIn: boolean;
  profile: { name: string; label: string; type: string; controlUrl: string };
  identity?: { email: string; displayName: string; organizationName: string; role: string };
  expiresAt?: string;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

const title = (value: { id: string; name?: string; slug?: string } | undefined) => value?.name || value?.slug || value?.id || "—";
const copy = (value: string) => { void navigator.clipboard?.writeText(value); };

export function OisAuthConsole() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [context, setContext] = useState<OpenIiContextResponse | null>(null);
  const [environment, setEnvironment] = useState("");
  const [workload, setWorkload] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scopeHelp, setScopeHelp] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextAuth = await api<AuthStatus>("/api/auth/scaniom/status");
      setAuth(nextAuth);
      if (!nextAuth.signedIn) { setContext(null); setEnvironment(""); setWorkload(""); setError(""); return; }
      const nextContext = await api<OpenIiContextResponse>("/api/scaniom/context");
      setContext(nextContext);
      setEnvironment(nextContext.workspace?.environmentId || "");
      setWorkload(nextContext.workspace?.workloadId || "");
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<AuthStatus>("/api/auth/scaniom/status").then(async (nextAuth) => {
      if (cancelled) return;
      setAuth(nextAuth);
      if (!nextAuth.signedIn) return;
      const nextContext = await api<OpenIiContextResponse>("/api/scaniom/context");
      if (cancelled) return;
      setContext(nextContext); setEnvironment(nextContext.workspace?.environmentId || ""); setWorkload(nextContext.workspace?.workloadId || "");
    }).catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    const refresh = () => { void load(); };
    window.addEventListener("open-ii-auth-changed", refresh);
    return () => { cancelled = true; window.removeEventListener("open-ii-auth-changed", refresh); };
  }, [load]);

  const visibleWorkloads = useMemo(() => !context ? [] : !environment ? context.workloads : context.workloads.filter((item) => String(item.environment_id || item.environmentId || "") === environment), [context, environment]);
  const selectedEnvironment = context?.environments.find((item) => item.id === context.workspace?.environmentId);
  const selectedWorkload = context?.workloads.find((item) => item.id === context.workspace?.workloadId);
  const signedIn = Boolean(auth?.signedIn);
  const scopeReady = Boolean(selectedEnvironment && selectedWorkload);
  const ready = signedIn && scopeReady;
  const ownerName = context?.whoami.user.name || auth?.identity?.displayName || auth?.identity?.email || "Authorized operator";
  const controlUrl = auth?.profile.controlUrl || "https://control.scaniom.com";
  const profileName = auth?.profile.name || "cloud";

  async function saveScope(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/workspace/context", { method: "POST", body: JSON.stringify({ environment, workload }) }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError("");
    try {
      await api("/api/auth/scaniom/logout", { method: "POST", body: "{}" });
      setContext(null); setEnvironment(""); setWorkload("");
      await load();
      window.dispatchEvent(new Event("open-ii-auth-changed"));
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  return <section className="ois-auth-console ois-auth-console-v2">
    <header className="ois-auth-v2-head">
      <div><span className="eyebrow">OIS AUTH · OPEN IMMUNE ↔ SCANIOM</span><h1>{ready ? "Fabric authority ready." : signedIn ? "Finish the protected scope." : "Connect Scaniom authority."}</h1><p>Authorize once, select the real environment and workload, then every Lab uses the same Scaniom organization, identity and fabric state.</p></div>
      <div className="ois-auth-v2-actions">
        <span className={`ois-auth-state ${ready ? "ready" : signedIn ? "partial" : "offline"}`}><i/><span>{ready ? "READY FOR LABS" : signedIn ? "AUTH ONLINE · SCOPE REQUIRED" : "AUTH REQUIRED"}</span></span>
        {signedIn ? <button type="button" className="ois-auth-signout" disabled={busy} onClick={() => void signOut()}>Sign out</button> : null}
      </div>
    </header>

    <div className="ois-auth-progress-v2">
      {[{k:"CONTROL",v:auth?.profile.label || "Scaniom Cloud",done:Boolean(auth?.profile.name)},{k:"OWNER",v:ownerName,done:signedIn},{k:"ENVIRONMENT",v:title(selectedEnvironment),done:Boolean(selectedEnvironment)},{k:"WORKLOAD",v:title(selectedWorkload),done:Boolean(selectedWorkload)}].map((item, index) => <div key={item.k} className={item.done ? "done" : signedIn && index > 1 ? "next" : "locked"}><i>{item.done ? "✓" : index + 1}</i><span><small>{item.k}</small><b>{item.v}</b></span></div>)}
    </div>

    {!signedIn ? <div className="ois-auth-connect-v2"><ScaniomConnection compact/></div> : <div className="ois-auth-v2-grid">
      <section className="ois-auth-session-v2">
        <div className="ois-auth-section-title"><span>01</span><div><small>AUTHORIZED OPERATOR</small><b>Scaniom session</b></div></div>
        <dl>
          <div><dt>OWNER</dt><dd><b>{ownerName}</b><span>{context?.whoami.user.email || auth?.identity?.email}</span></dd></div>
          <div><dt>ORGANIZATION</dt><dd><b>{context?.whoami.organization.name || auth?.identity?.organizationName || "—"}</b><span>{String(context?.whoami.role || auth?.identity?.role || "").replaceAll("_", " ")}</span></dd></div>
          <div><dt>CONTROL</dt><dd><b>{auth?.profile.label}</b><span>{controlUrl}</span></dd></div>
          <div><dt>PROFILE</dt><dd><b>{profileName}</b><span>{auth?.profile.type}</span></dd></div>
        </dl>
        <div className="ois-auth-mini-actions"><a href={`${controlUrl}/console/account`} target="_blank" rel="noreferrer">Account ↗</a><a href={`${controlUrl}/console/organization`} target="_blank" rel="noreferrer">Organization ↗</a><Link href="/profiles">Profiles</Link></div>
      </section>

      <section className="ois-auth-scope-v2">
        <div className="ois-auth-section-title"><span>02</span><div><small>PROTECTED SCOPE</small><b>{scopeReady ? "Environment + workload selected" : "Choose the fabric scope used by Labs"}</b></div><em>{scopeReady ? "READY" : "DO NEXT"}</em></div>
        <form className="ois-scope-form-v2" onSubmit={saveScope}>
          <label><span>ENVIRONMENT</span><select value={environment} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setEnvironment(event.target.value); setWorkload(""); }}><option value="">Select real environment…</option>{context?.environments.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.kind ? ` · ${item.kind}` : ""}</option>)}</select></label>
          <label><span>WORKLOAD</span><select value={workload} onChange={(event: ChangeEvent<HTMLSelectElement>) => setWorkload(event.target.value)}><option value="">Select real workload…</option>{visibleWorkloads.map((item) => <option key={item.id} value={item.id}>{title(item)}{item.kind ? ` · ${item.kind}` : ""}</option>)}</select></label>
          <button className="button" disabled={busy || !environment || !workload}>{busy ? "Syncing…" : scopeReady ? "Update scope" : "Use scope"}</button>
        </form>
        <div className="ois-auth-scope-help-row"><p><b>New team/project?</b> Create an environment first, then register the workload that will carry Scaniom identity, policy, behavior and proof.</p><button type="button" onClick={() => setScopeHelp(true)}>How to create a scope →</button><button type="button" onClick={() => void load()}>Refresh resources</button></div>
        <div className="ois-auth-current-v2"><div><small>ENVIRONMENT</small><b>{title(selectedEnvironment)}</b><span>policy + deployment trust boundary</span></div><i>→</i><div><small>WORKLOAD</small><b>{title(selectedWorkload)}</b><span>application / agent / model / service</span></div><i>→</i><div><small>NEXT</small><b>{scopeReady ? "Open a Lab" : "Select both values"}</b><span>{scopeReady ? "identity → Node → policy → attachment" : "Labs stay preview-only until scope is ready"}</span></div></div>
      </section>
    </div>}

    {signedIn ? <section className="ois-auth-parity-v2">
      <div className="ois-auth-section-title"><span>03</span><div><small>WEB + CLI PARITY</small><b>Same Control. Same owner. Same scope.</b></div></div>
      <div className="ois-auth-parity-grid">
        <div><StackIcon kind="cloud" size={18}/><span><small>WEB</small><b>Scaniom Control</b><a href={`${controlUrl}/console/setup`} target="_blank" rel="noreferrer">Open Setup ↗</a></span></div>
        <div><StackIcon kind="terminal" size={18}/><span><small>CLI AUTH</small><b>scaniom login · whoami</b><button type="button" onClick={() => copy(`scaniom profile test ${profileName}\nscaniom login\nscaniom whoami\nscaniom auth status`)}>Copy commands</button></span></div>
        <div><StackIcon kind="server" size={18}/><span><small>CLI SCOPE</small><b>{scopeReady ? title(selectedWorkload) : "select workload"}</b><button type="button" onClick={() => copy(selectedWorkload ? `scaniom workload use ${selectedWorkload.slug || selectedWorkload.name || selectedWorkload.id}` : "scaniom workload list")}>Copy command</button></span></div>
        <div><StackIcon kind="scaniom" size={18}/><span><small>LABS</small><b>{ready ? "live authority enabled" : "preview only"}</b><Link href="/workbench">{ready ? "Open Labs →" : "Preview Labs →"}</Link></span></div>
      </div>
    </section> : null}

    {error ? <p className="error-box">{error}</p> : null}

    {scopeHelp ? <div className="ois-auth-modal" role="dialog" aria-modal="true" aria-label="Create protected scope"><button className="ois-auth-modal-backdrop" aria-label="Close" onClick={() => setScopeHelp(false)}/><section><header><div><small>NEW PROTECTED SCOPE</small><h2>Environment → workload → return to OIS Auth.</h2></div><button onClick={() => setScopeHelp(false)}>×</button></header><div className="ois-auth-modal-grid">
      <article><StackIcon kind="cloud" size={24}/><small>SCANIOM CONTROL · WEB</small><h3>Create with the operator UI</h3><ol><li>Open <b>Environments</b> and create the trust/deployment boundary.</li><li>Open <b>Workloads</b> and register the application, agent, model or service inside that environment.</li><li>Return here and click <b>Refresh resources</b>, then select both.</li></ol><div><a className="button" href={`${controlUrl}/console/environments`} target="_blank" rel="noreferrer">Open Environments ↗</a><a className="button ghost" href={`${controlUrl}/console/workloads`} target="_blank" rel="noreferrer">Open Workloads ↗</a></div></article>
      <article><StackIcon kind="terminal" size={24}/><small>SCANIOM CLI</small><h3>Create the same scope from terminal</h3><pre>{`scaniom env create production --type production\n\nscaniom workload create customer-agent \\\n  --env production \\\n  --kind application\n\nscaniom workload use customer-agent`}</pre><button className="button ghost" type="button" onClick={() => copy("scaniom env create production --type production\nscaniom workload create customer-agent --env production --kind application\nscaniom workload use customer-agent")}>Copy CLI flow</button><p>The Lab handles the next runtime stages—Scaniom Address, Node, policy, provider/target, attachment, behavior and proof. OIS Auth only selects the real authority + scope.</p></article>
    </div></section></div> : null}
  </section>;
}
