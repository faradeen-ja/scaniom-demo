"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function ScaniomConnection({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "waiting" | "error">("idle");
  const [error, setError] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await json<Status>("/api/auth/scaniom/status");
      setStatus(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void json<Status>("/api/auth/scaniom/status").then((next) => {
      if (!cancelled) {
        setStatus(next);
        setError("");
      }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  async function poll(interval: number): Promise<void> {
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

  if (!status) return <section className={`connection-card ${compact ? "compact" : ""}`}><span className="state-dot waiting"/>Reading Scaniom profile…</section>;

  if (status.signedIn) {
    return <section className={`connection-card connected ${compact ? "compact" : ""}`}>
      <div className="connection-head"><div><span className="state-dot ready"/>SCANIOM CONNECTED</div><span>{status.profile.name} · {status.profile.type}</span></div>
      <div className="identity-grid">
        <div><small>IDENTITY</small><b>{status.identity?.displayName || status.identity?.email}</b><span>{status.identity?.email}</span></div>
        <div><small>ORGANIZATION</small><b>{status.identity?.organizationName}</b><span>{String(status.identity?.role || "").replaceAll("_", " ")}</span></div>
        <div><small>CONTROL</small><b>{status.profile.label}</b><span>{status.profile.controlUrl}</span></div>
      </div>
      <div className="button-row"><Link className="button secondary" href="/workspace">Open workbench</Link><a className="button ghost" href={`${status.profile.controlUrl}/console`} target="_blank" rel="noreferrer">Scaniom Control</a><button className="button ghost" type="button" onClick={() => void logout()}>Sign out</button></div>
    </section>;
  }

  return <section className={`connection-card ${compact ? "compact" : ""}`}>
    <div className="connection-head"><div><span className="state-dot"/>SCANIOM NOT CONNECTED</div><span>{status.profile.name} · {status.profile.type}</span></div>
    <p>Open Immune uses the selected Scaniom Control profile. Your Scaniom password stays on that Control; this app receives only the approved short-lived operator session.</p>
    {attempt ? <div className="authorization-box">
      <small>AUTHORIZE OPEN IMMUNE INTELLIGENCE</small>
      <strong>{attempt.userCode}</strong>
      <p>Open the selected Scaniom Control, sign in if needed, verify this code, then approve the connection.</p>
      <div className="button-row"><a className="button" href={attempt.authorizeUrl} target="_blank" rel="noreferrer">Open Scaniom Control</a><a className="button ghost" href={attempt.signupUrl} target="_blank" rel="noreferrer">Create account</a><button className="button ghost" type="button" onClick={() => void start()}>Restart authorization</button></div>
      <span className="waiting-copy"><span className="state-dot waiting"/>Waiting for approval…</span>
    </div> : <div className="button-row"><button className="button" type="button" disabled={phase === "starting"} onClick={() => void start()}>{phase === "starting" ? "Starting…" : "Connect Scaniom"}</button><a className="button secondary" href={status.signupUrl} target="_blank" rel="noreferrer">Sign up</a></div>}
    {error ? <p className="error-box">{error}</p> : null}
  </section>;
}
