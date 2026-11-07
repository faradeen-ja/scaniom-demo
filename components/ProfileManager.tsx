"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Profile = {
  name: string;
  label: string;
  type: "local" | "cloud" | "self-hosted" | "private-enterprise" | "staging";
  controlUrl: string;
  source: "built-in" | "server" | "user";
  removable: boolean;
  customTrust: boolean;
  privateNetwork: boolean;
};

type State = { activeProfile: string; profiles: Profile[] };

type ControlTest = {
  profile: string;
  ok: boolean;
  message: string;
  deployment?: { id: string; label?: string; type?: string; apiContract?: string; authProtocol?: string };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function commands(profile: Profile): string[] {
  const lines: string[] = [];
  if (profile.name !== "cloud" || profile.controlUrl !== "https://control.scaniom.com" || profile.type !== "cloud") {
    lines.push(`scaniom profile add ${profile.name} --control ${profile.controlUrl} --type ${profile.type}${profile.customTrust ? " --ca-file /path/to/company-ca.pem" : ""}`);
  }
  lines.push(`scaniom profile use ${profile.name}`);
  lines.push(`scaniom profile test ${profile.name}`);
  lines.push("scaniom login", "scaniom auth status", "scaniom whoami");
  return lines;
}

export function ProfileManager() {
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [controlTest, setControlTest] = useState<ControlTest | null>(null);
  const [form, setForm] = useState({ name: "", label: "", type: "self-hosted", controlUrl: "https://" });

  const load = useCallback(async () => {
    try {
      const next = await api<State>("/api/profiles");
      setState(next);
      setSelected((current) => {
        if (current) {
          const preserved = next.profiles.find((item) => item.name === current.name);
          if (preserved) return preserved;
        }
        return next.profiles.find((item) => item.name === next.activeProfile) || next.profiles[0] || null;
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<State>("/api/profiles").then((next) => {
      if (cancelled) return;
      setState(next);
      setSelected(next.profiles.find((item) => item.name === next.activeProfile) || next.profiles[0] || null);
      setError("");
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => { cancelled = true; };
  }, []);

  const active = useMemo(() => state?.profiles.find((item) => item.name === state.activeProfile) || null, [state]);

  async function activate(name: string) {
    setBusy(true); setError(""); setControlTest(null);
    try {
      await api("/api/profiles/active", { method: "POST", body: JSON.stringify({ name }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  async function add(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setControlTest(null);
    try {
      await api("/api/profiles", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", label: "", type: "self-hosted", controlUrl: "https://" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  async function remove(name: string) {
    setBusy(true); setError(""); setControlTest(null);
    try { await api(`/api/profiles/${encodeURIComponent(name)}`, { method: "DELETE" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  async function testControl(profile: Profile) {
    setBusy(true); setError(""); setControlTest(null);
    try {
      const result = await api<{ ok: true; deployment: { id: string; label?: string; type?: string; apiContract?: string; authProtocol?: string } }>("/api/profiles/test", {
        method: "POST",
        body: JSON.stringify({ name: profile.name }),
      });
      setControlTest({
        profile: profile.name,
        ok: true,
        message: `${result.deployment.label || "Scaniom Control"} · ${result.deployment.type || profile.type} · verified`,
        deployment: result.deployment,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setControlTest({ profile: profile.name, ok: false, message });
    } finally { setBusy(false); }
  }

  if (!state) return <div className="panel"><span className="state-dot waiting"/>Loading profiles…</div>;

  return <div className="profile-layout">
    <section className="panel profile-list">
      <div className="panel-heading"><div><small>CONTROL AUTHORITY</small><h2>Scaniom profiles</h2></div><span>{state.profiles.length}</span></div>
      <p className="muted">The active profile selects which Scaniom Control owns authentication and operator state. Runtime placement is independent.</p>
      <div className="profile-items">{state.profiles.map((profile) => <button key={profile.name} type="button" className={`profile-item ${profile.name === state.activeProfile ? "active" : ""}`} onClick={() => { setSelected(profile); setControlTest(null); setError(""); }}>
        <span className={`state-dot ${profile.name === state.activeProfile ? "ready" : ""}`}/><div><b>{profile.label}</b><small>{profile.name} · {profile.type}</small></div><em>{profile.source}</em>
      </button>)}</div>
      <form className="profile-form" onSubmit={add}>
        <small>ADD CONTROL PROFILE</small>
        <div className="form-grid"><label>Name<input required maxLength={48} value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}/></label><label>Label<input maxLength={80} value={form.label} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, label: e.target.value })}/></label></div>
        <label>Deployment type<select value={form.type} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, type: e.target.value })}><option value="self-hosted">Self-hosted</option><option value="private-enterprise">Private enterprise</option><option value="staging">Staging</option><option value="local">Local Open Immune development</option></select></label>
        <label>Control origin<input required value={form.controlUrl} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, controlUrl: e.target.value })} spellCheck={false}/></label>
        <p className="microcopy">Remote profiles require HTTPS. Private-network and custom-CA Controls must be configured by the Open Immune deployment operator, not by browser input.</p>
        <button className="button" type="submit" disabled={busy}>Add profile</button>
      </form>
      {error ? <p className="error-box">{error}</p> : null}
    </section>

    <section className="panel profile-detail">
      {selected ? <>
        <div className="panel-heading"><div><small>{selected.name === state.activeProfile ? "ACTIVE PROFILE" : "PROFILE"}</small><h2>{selected.label}</h2></div><span>{selected.type}</span></div>
        <dl className="facts"><div><dt>Control</dt><dd>{selected.controlUrl}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>Trust</dt><dd>{selected.customTrust ? "server-managed CA" : "system TLS"}</dd></div><div><dt>Network</dt><dd>{selected.privateNetwork ? "private network enabled" : "public/loopback policy"}</dd></div></dl>
        <div className="button-row"><button className="button secondary" disabled={busy} type="button" onClick={() => void testControl(selected)}>Test Control</button>{selected.name !== state.activeProfile ? <button className="button" disabled={busy} type="button" onClick={() => void activate(selected.name)}>Use profile</button> : <span className="accepted-badge">✓ ACTIVE</span>}{selected.removable ? <button className="button danger" disabled={busy} type="button" onClick={() => void remove(selected.name)}>Remove</button> : null}</div>
        {controlTest?.profile === selected.name ? <div className={controlTest.ok ? "control-test-result success" : "control-test-result failure"}><b>{controlTest.ok ? "CONTROL VERIFIED" : "CONTROL TEST FAILED"}</b><span>{controlTest.message}</span>{controlTest.ok && controlTest.deployment ? <small>{controlTest.deployment.apiContract} · {controlTest.deployment.authProtocol} · {controlTest.deployment.id}</small> : null}</div> : null}
        <div className="cli-block"><small>CLI PARITY</small><pre>{commands(selected).join("\n")}</pre></div>
        {selected.name !== active?.name ? <p className="microcopy">Switching profiles clears the Open Immune Scaniom session and workspace selection. This prevents credentials minted by one Control from crossing into another.</p> : null}
      </> : <p>Select a profile.</p>}
    </section>
  </div>;
}
