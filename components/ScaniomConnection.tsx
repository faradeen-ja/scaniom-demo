"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Status = {
  signedIn: boolean;
  profile: { name: string; label: string; type: string; controlUrl: string };
  identity?: { email: string; displayName: string; organizationName: string; role: string };
  expiresAt?: string;
  loginUrl?: string;
  signupUrl?: string;
};

type Attempt = {
  status: string;
  userCode: string;
  authorizeUrl: string;
  signupUrl: string;
  interval: number;
  profile: { name: string; label: string; type: string; controlUrl: string };
};

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}
function browserOnlineSnapshot(): boolean { return navigator.onLine; }
function serverOnlineSnapshot(): boolean { return true; }

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function ScaniomConnection({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "waiting" | "error" | "offline">("idle");
  const [error, setError] = useState("");
  const online = useSyncExternalStore(subscribeOnline, browserOnlineSnapshot, serverOnlineSnapshot);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const next = await json<Status>("/api/auth/scaniom/status");
      setStatus(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    void json<Status>("/api/auth/scaniom/status").then((next) => {
      if (!cancelled) { setStatus(next); setError(""); }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [online]);

  async function poll(interval: number): Promise<void> {
    if (!navigator.onLine) {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      setPhase("offline");
      return;
    }
    try {
      const response = await fetch("/api/auth/scaniom/poll", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { status?: string; interval?: number; error?: string };
      if (response.ok && body.status === "authorized") {
        setAttempt(null);
        setPhase("idle");
        await refresh();
        window.dispatchEvent(new Event("open-ii-auth-changed"));
        return;
      }
      if ((response.ok || response.status === 202) && body.status === "pending") {
        const seconds = Math.max(1, Number(body.interval || interval));
        pollTimer.current = setTimeout(() => { void poll(seconds); }, seconds * 1000);
        return;
      }
      throw new Error(body.error || `Authorization ${body.status || "failed"}.`);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function start() {
    if (!navigator.onLine) {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      setPhase("offline");
      setError("");
      return;
    }
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setPhase("starting");
    setError("");
    try {
      const next = await json<Attempt>("/api/auth/scaniom/start", { method: "POST", body: "{}" });
      setAttempt(next);
      setPhase("waiting");
      pollTimer.current = setTimeout(() => { void poll(next.interval); }, next.interval * 1000);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function logout() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    await fetch("/api/auth/scaniom/logout", { method: "POST", headers: { "content-type": "application/json" } });
    setAttempt(null);
    setPhase("idle");
    await refresh();
    window.dispatchEvent(new Event("open-ii-auth-changed"));
  }

  if (!online && !status?.signedIn) return <section className={`connection-card activation-card offline ${compact ? "compact" : ""}`}>
    <div className="connection-head"><div><span className="state-dot waiting"/>NETWORK OFFLINE</div><span>Scaniom Control not contacted</span></div>
    <p className="connection-offline-note">Open Immune will not launch or poll Scaniom Control while this browser is offline. Reconnect the network; your previous authorization is not replaced by an offline error.</p>
    <div className="button-row"><button className="button" type="button" disabled>Connect Scaniom</button><Link className="button ghost" href="/profiles">Review profile</Link></div>
  </section>;

  if (!status) return <section className={`connection-card activation-card ${compact ? "compact" : ""}`}><span className="state-dot waiting"/>Reading selected Scaniom profile…</section>;

  if (status.signedIn) {
    return <section className={`connection-card activation-card connected ${compact ? "compact" : ""}`}>
      <div className="connection-head"><div><span className={`state-dot ${online ? "ready" : "waiting"}`}/>{online ? "SCANIOM AUTHORITY ONLINE" : "SESSION PRESENT · NETWORK OFFLINE"}</div><span>{status.profile.name} · {status.profile.type}</span></div>
      <div className="connection-summary">
        <div><small>PROFILE</small><b>{status.profile.label}</b><span>{status.profile.controlUrl}</span></div>
        <div><small>OPERATOR</small><b>{status.identity?.displayName || status.identity?.email}</b><span>{status.identity?.email}</span></div>
        <div><small>ORGANIZATION</small><b>{status.identity?.organizationName}</b><span>{String(status.identity?.role || "").replaceAll("_", " ")}</span></div>
      </div>
      <div className="connection-foot"><p>{online ? "This operator session was approved by the selected Scaniom Control. Environment and workload are the remaining scope choices before a lab can use live authority." : "The browser still has an Open Immune session record, but live Scaniom authority cannot be refreshed while this device is offline."}</p>{!online ? <p className="connection-offline-note">Reconnect the network before opening Control, refreshing resources or starting a live Lab.</p> : null}<div className="button-row"><Link className="button" href="/workbench">Choose a lab</Link><Link className="button secondary" href="/profiles">Profiles</Link>{online ? <a className="button ghost" href={`${status.profile.controlUrl}/console`} target="_blank" rel="noreferrer">Scaniom Control</a> : <button className="button ghost" type="button" disabled>Control offline</button>}<button className="button ghost" type="button" onClick={() => void logout()}>Sign out</button></div></div>
    </section>;
  }

  return <section className={`connection-card activation-card ${compact ? "compact" : ""}`}>
    <div className="connection-head"><div><span className="state-dot waiting"/>AUTHORIZATION REQUIRED</div><span>{status.profile.label} · {status.profile.type}</span></div>
    <div className="preconnect-grid">
      <div><small>1 · PROFILE</small><b>{status.profile.label}</b><span>{status.profile.controlUrl}</span><Link href="/profiles">Change or test profile →</Link></div>
      <div><small>2 · AUTHORIZATION</small><b>Approve Open Immune</b><span>Your password stays on Scaniom Control. Open Immune receives only a short-lived approved operator session.</span></div>
      <div><small>3 · SCOPE</small><b>Organization → environment → workload</b><span>Those real Scaniom resources become the authority used by every selected Lab or system.</span></div>
    </div>
    {!online ? <p className="connection-offline-note">Network offline. Authorization is paused and no Scaniom Control window will be opened until connectivity returns.</p> : null}
    {attempt && online ? <div className="authorization-box">
      <small>AUTHORIZE OPEN IMMUNE INTELLIGENCE</small>
      <strong>{attempt.userCode}</strong>
      <p>Open the selected Scaniom Control, sign in if needed, verify this code, then approve the connection. This page will update automatically.</p>
      <div className="button-row"><a className="button" href={attempt.authorizeUrl} target="_blank" rel="noreferrer">Open Scaniom Control</a><a className="button ghost" href={attempt.signupUrl} target="_blank" rel="noreferrer">Create account</a><button className="button ghost" type="button" onClick={() => void start()}>Restart authorization</button></div>
      <span className="waiting-copy"><span className="state-dot waiting"/>Waiting for approval…</span>
    </div> : <div className="button-row"><button className="button" type="button" disabled={!online || phase === "starting"} onClick={() => void start()}>{!online ? "Network offline" : phase === "starting" ? "Starting…" : "Connect Scaniom"}</button>{online ? <a className="button secondary" href={status.signupUrl} target="_blank" rel="noreferrer">Create Scaniom account</a> : null}<Link className="button ghost" href="/profiles">Review profile</Link></div>}
    {error ? <p className="error-box">{error}</p> : null}
  </section>;
}
