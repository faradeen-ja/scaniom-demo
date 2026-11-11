"use client";

import Link from "next/link";
import { type ChangeEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LAB_CATALOG,
  buildLabRuntime,
  labById,
  labResolvedValues,
  nextLabStep,
  resolveLabCommand,
  type LabGuideOption,
  type LabKind,
  type LabManifest,
  type LabRuntime,
  type LabRuntimeStep,
  type LabStepGroup,
} from "@/lib/open-ii/labs";
import { labProgress, resourceTitle, selectedEnvironment, selectedWorkload, topologyNodeStatus, workloadEnvironmentId } from "@/lib/open-ii/workbench";
import { isReleasedScaniomCliCommand } from "@/lib/open-ii/scaniom-cli-contract";
import type { OpenIiContextResponse, OperatorWorkload } from "@/lib/open-ii/types";
import { StackIcon } from "@/components/StackIcon";
import styles from "./OpenImmuneWorkbench.module.css";

type IntelTab = "guidance" | "cli" | "live";

const GROUP_LABELS: Record<LabStepGroup, string> = {
  authority: "Authority",
  fabric: "Fabric",
  runtime: "Runtime boundaries",
  evidence: "Intelligence + proof",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function statusLabel(status: LabRuntimeStep["status"]): string {
  if (status === "verified") return "DONE";
  if (status === "ready") return "NEXT";
  return "LOCKED";
}

function runtimeWithoutContext(labId: string): LabRuntime | null {
  const lab = labById(labId);
  if (!lab) return null;
  return {
    ...lab,
    runtimeSteps: lab.steps.map((step, index) => ({ ...step, status: index === 0 ? "ready" : "locked" })),
  };
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function providerIcon(provider: string): string {
  const value = provider.toLowerCase();
  if (value.includes("openai")) return "openai";
  if (value.includes("anthropic")) return "anthropic";
  if (value.includes("gemini")) return "gemini";
  if (value.includes("bedrock") || value.includes("aws")) return "aws";
  return "server";
}

function ProviderReality({ context, onOpen }: { context: OpenIiContextResponse | null; onOpen: () => void }) {
  const workloadId = context?.workspace?.workloadId;
  const routes = (context?.connections || []).filter((item) => item.workload_id === workloadId && item.status !== "paused");
  const readyRoutes = Number(context?.attachments?.counts?.readyRoutes || 0);
  const providers = ["OpenAI", "Anthropic", "Gemini", "Bedrock", "Custom"];

  return <section className={styles.providerInspectorBlock} aria-label="Provider and runtime authority">
    <div className={styles.providerAuthorityStack}>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="code" size={18}/></span>
        <div><small>OPEN IMMUNE WEB</small><b>Never paste provider keys here</b></div>
      </div>
      <div className={styles.providerAuthorityConnector} aria-hidden="true"><span/></div>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="cloud" size={18}/></span>
        <div><small>SCANIOM CONTROL</small><b>Route metadata + secret reference only</b></div>
      </div>
    </div>

    <div className={styles.providerValuePanel}>
      <div className={styles.providerValueHeading}>
        <div><small>MULTI-PROVIDER VALUE</small><b>One workload identity. Many upstreams. One Gate + trajectory.</b></div>
        <span>{routes.length} ROUTE{routes.length === 1 ? "" : "S"} · {readyRoutes} READY</span>
      </div>

      <div className={styles.providerValuePath}>
        <div className={styles.providerValueStageCard}>
          <span><StackIcon kind="server" size={18}/></span>
          <div><small>PROTECTED SYSTEM</small><b>Workload</b></div>
        </div>
        <div className={styles.providerValuePathLine} aria-hidden="true"><span/></div>
        <div className={styles.providerValueStageCard}>
          <span><StackIcon kind="scaniom" size={18}/></span>
          <div><small>SCANIOM AUTHORITY</small><b>Identity + Gate</b></div>
        </div>
        <div className={styles.providerValuePathLine} aria-hidden="true"><span/></div>
        <div className={styles.providerCardsGrid} aria-label="Supported provider routes">
          {providers.map((provider) => <div className={styles.providerRouteCard} key={provider}>
            <span><StackIcon kind={providerIcon(provider)} size={17}/></span><b>{provider}</b>
          </div>)}
        </div>
        <div className={styles.providerValuePathLine} aria-hidden="true"><span/></div>
        <div className={`${styles.providerValueStageCard} ${styles.providerValueHistoryCard}`}>
          <span><StackIcon kind="shield" size={18}/></span>
          <div><small>VERIFIABLE HISTORY</small><b>Trajectory + proof</b></div>
        </div>
      </div>
    </div>

    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>REAL ROUTES FROM SCANIOM CONTROL</div>
      {routes.length ? <div className={styles.providerRouteRows}>{routes.map((route) => <div className={styles.providerRouteRow} key={route.id}>
        <span className={styles.providerRouteIcon}><StackIcon kind={providerIcon(String(route.provider || "custom"))} size={17}/></span>
        <div><small>{String(route.provider || "custom").toUpperCase()} · {route.status || "active"}</small><b>{route.name || route.id}</b><em>{route.model_hint || "route default"} · {route.node_name || route.node_id || "Node pending"}</em></div>
      </div>)}</div> : <div className={styles.providerRoutesEmpty}>No provider route is attached to the selected workload yet. Choose a provider card below and run its Scaniom commands.</div>}
      <p className={styles.providerRoutesNote}>A route can exist before the raw key is available on the Node. <code>scaniom providers</code> is the Node-side credential-readiness check; Open Immune never reads the secret value.</p>
      <button type="button" className={styles.providerRoutesAction} onClick={onOpen}>Choose provider / open setup guide <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}

function runtimeKindLabel(kind: string): string {
  if (kind === "vllm") return "vLLM";
  if (kind === "nvidia_nim") return "NVIDIA NIM";
  if (kind === "triton") return "NVIDIA Triton";
  if (kind === "openai_compatible") return "OpenAI-compatible";
  return kind || "Runtime";
}

function ModelRuntimeReality({ context }: { context: OpenIiContextResponse | null }) {
  const workloadId = context?.workspace?.workloadId;
  const runtimes = (context?.modelRuntimes || []).filter((item) => item.workloadId === workloadId && item.status === "active");
  return <section className={styles.providerInspectorBlock} aria-label="L3 model runtime authority">
    <div className={styles.providerAuthorityStack}>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="gpu" size={18}/></span>
        <div><small>REAL INFERENCE TARGET</small><b>vLLM · NIM · Triton · compatible runtime</b></div>
      </div>
      <div className={styles.providerAuthorityConnector} aria-hidden="true"><span/></div>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="scaniom" size={18}/></span>
        <div><small>SCANIOM L3</small><b>Gate before inference · observe after outcome</b></div>
      </div>
    </div>
    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>REAL MODEL RUNTIMES FROM SCANIOM CONTROL</div>
      {runtimes.length ? <div className={styles.providerRouteRows}>{runtimes.map((runtime) => <div className={styles.providerRouteRow} key={runtime.id}>
        <span className={styles.providerRouteIcon}><StackIcon kind="gpu" size={17}/></span>
        <div><small>{runtimeKindLabel(runtime.kind).toUpperCase()} · {runtime.status.toUpperCase()}</small><b>{runtime.name}</b><em>{runtime.endpoint} · {runtime.modelHint || "model chosen by request"}</em></div>
      </div>)}</div> : <div className={styles.providerRoutesEmpty}>No active L3 model runtime is registered for the selected workload yet. Register the real target in Scaniom Control or with the released <code>scaniom attach l3</code> command, then refresh.</div>}
      <p className={styles.providerRoutesNote}>Control stores the runtime endpoint and optional secret-reference name only. Runtime credential values remain at the protected runtime boundary and never enter Open Immune.</p>
    </div>
  </section>;
}

function EnvironmentGatewayReality({ context }: { context: OpenIiContextResponse }) {
  const environmentId = context.workspace?.environmentId;
  const workloadId = context.workspace?.workloadId;
  const environment = context.environments.find((item) => item.id === environmentId);
  const workload = context.workloads.find((item) => item.id === workloadId);
  const level = context.attachments?.levels?.find((item) => String(item.id || item.level || "").toLowerCase() === "l5") || null;
  const evidence = Number(level?.evidence?.total || 0);
  const configured = level?.configured === true;
  const ready = level?.ready === true;
  return <section className={styles.providerInspectorBlock} aria-label="L5 environment gateway authority">
    <div className={styles.providerAuthorityStack}>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="kubernetes" size={18}/></span>
        <div><small>ENVIRONMENT INGRESS</small><b>{String(environment?.name || environment?.slug || environmentId || "Select environment")}</b></div>
      </div>
      <div className={styles.providerAuthorityConnector} aria-hidden="true"><span/></div>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="shield" size={18}/></span>
        <div><small>WORKLOAD ATTRIBUTION</small><b>{String(workload?.name || workload?.slug || workloadId || "Select workload")}</b></div>
      </div>
    </div>
    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>REAL L5 GATEWAY STATE FROM SCANIOM CONTROL</div>
      <div className={styles.providerRouteRows}>
        <div className={styles.providerRouteRow}>
          <span className={styles.providerRouteIcon}><StackIcon kind="kubernetes" size={17}/></span>
          <div><small>L5 · {ready ? "READY" : configured ? "CONFIGURED" : "NOT CONFIGURED"}</small><b>Environment Gateway</b><em>{evidence} selected-workload gateway evidence object{evidence === 1 ? "" : "s"}</em></div>
        </div>
      </div>
      <p className={styles.providerRoutesNote}>L5 is shared environment ingress, not shared identity. D06 closes only when the selected workload carries explicit L5 runtime authority and Scaniom reports gateway-sourced evidence plus valid signed proof for that workload.</p>
    </div>
  </section>;
}

function ResolvedRuntimeValues({ context, lab }: { context: OpenIiContextResponse; lab: LabManifest }) {
  const values = labResolvedValues(context, lab);
  const rows = [
    ["ENVIRONMENT", values.environment],
    ["WORKLOAD", values.workload],
    ["NODE", values.node],
    ["PROVIDER", values.provider],
    ["MODEL", values.model],
    ["CONNECTION", values.connection],
  ];
  return <div className={styles.resolvedValues}>
    <header><div><small>REAL VALUE RESOLUTION</small><b>Open Immune replaces safe placeholders from live Scaniom state.</b></div><StackIcon kind="scaniom" size={24}/></header>
    <div className={styles.resolvedGrid}>{rows.map(([label, value]) => <div key={label}><span>{label}</span><code className={value.startsWith("<") ? styles.unresolvedValue : ""}>{value}</code></div>)}</div>
    <div className={styles.secretBoundaryNote}><StackIcon kind="shield" size={18}/><p><b>Deployment-only values are intentionally not auto-filled in the browser.</b> Raw provider keys, <code>SCANIOM_RUNTIME_TOKEN</code>, and a private Node service URL belong to the runtime/deployment secret boundary. Use <code>scaniom configure show {values.workload}</code> and <code>scaniom configure bootstrap {values.workload}</code> to print the deployment contract from the installed CLI.</p></div>
  </div>;
}



function ProviderNativeReality({ context }: { context: OpenIiContextResponse }) {
  const level = context.attachments?.levels?.find((item) => String(item.id || item.level || "").toLowerCase() === "l6") || null;
  const evidence = Number(level?.evidence?.total || 0);
  const configured = level?.configured === true;
  const ready = level?.ready === true;
  return <section className={styles.providerInspectorBlock} aria-label="L6 provider-native authority">
    <div className={styles.providerAuthorityStack}>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="code" size={18}/></span>
        <div><small>REAL PROVIDER / RUNTIME ADAPTER</small><b>Adapter owns the legitimate consequence</b></div>
      </div>
      <div className={styles.providerAuthorityConnector} aria-hidden="true"><span/></div>
      <div className={styles.providerAuthorityCard}>
        <span className={styles.providerAuthorityIcon}><StackIcon kind="scaniom" size={18}/></span>
        <div><small>SCANIOM L6</small><b>Guard before consequence · observe after outcome</b></div>
      </div>
    </div>
    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>REAL L6 STATE FROM SCANIOM CONTROL</div>
      <div className={styles.providerRouteRows}>
        <div className={styles.providerRouteRow}>
          <span className={styles.providerRouteIcon}><StackIcon kind="shield" size={17}/></span>
          <div><small>{configured ? "ADAPTER REGISTERED" : "ADAPTER NOT REGISTERED"} · {ready ? "FABRIC READY" : "FABRIC NOT READY"}</small><b>{evidence} provider-native behavior event{evidence === 1 ? "" : "s"} / 24h</b><em>Evidence source: provider_native · proof level: L6</em></div>
        </div>
      </div>
      <p className={styles.providerRoutesNote}>The generic bridge never dispatches a vendor consequence. A legitimate provider/runtime adapter must call L6 guard, perform the consequence only when permitted, then call observe with the pre-behavior parent. Raw prompt/content stays outside the generic bridge.</p>
    </div>
  </section>;
}


function FleetFailoverReality({ context }: { context: OpenIiContextResponse }) {
  const workloadId = context.workspace?.workloadId;
  const workload = (context.fabric?.workloads || []).find((item) => item.id === workloadId) || null;
  const binding = workload?.poolBindings?.[0] || null;
  const pool = (context.fabric?.nodePools || []).find((item) => item.id === binding?.poolId)
    || (context.fabric?.nodePools || []).find((item) => Number(item.memberCount || 0) >= 2)
    || null;
  const routing = workload?.routing || null;
  const receipt = context.execution?.d09FleetFailover || null;
  const members = pool?.members || [];

  return <section className={styles.providerInspectorBlock} aria-label="D09 fleet and failover authority">
    <div className={styles.providerValuePanel}>
      <div className={styles.providerValueHeading}>
        <div><small>D1 · D2 · D3 FABRIC</small><b>One workload identity. Multiple machine authorities. Health-aware selection.</b></div>
        <span>{members.length} NODE{members.length === 1 ? "" : "S"} · {routing?.readyCandidates || 0} READY</span>
      </div>
      <div className={styles.providerRouteRows}>
        {members.map((member) => <div className={styles.providerRouteRow} key={member.nodeId}>
          <span className={styles.providerRouteIcon}><StackIcon kind="server" size={17}/></span>
          <div><small>{String(member.state || "unknown").toUpperCase()} · {String(member.routingState || "active").toUpperCase()} · w{member.routingWeight || 100}</small><b>{member.name || member.nodeId}</b><em>{member.runtimeEndpoint || "runtime endpoint not declared"}</em></div>
        </div>)}
      </div>
    </div>
    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>REAL ROUTING FROM SCANIOM CONTROL</div>
      <div className={styles.providerRouteRows}>
        <div className={styles.providerRouteRow}>
          <span className={styles.providerRouteIcon}><StackIcon kind="shield" size={17}/></span>
          <div><small>{binding ? `BOUND · ${binding.poolName || binding.poolSlug || binding.poolId}` : "WORKLOAD NOT BOUND"} · {routing?.redundant ? "REDUNDANT" : "NOT REDUNDANT"}</small><b>{routing?.selectedNodeId ? `Selected ${routing.selectedNodeId}` : "No routable selection yet"}</b><em>{routing?.retryPolicy || "pre-dispatch routing not configured"}</em></div>
        </div>
        <div className={styles.providerRouteRow}>
          <span className={styles.providerRouteIcon}><StackIcon kind="code" size={17}/></span>
          <div><small>{receipt ? "REAL FAILOVER VERIFIED" : "FAILOVER NOT YET VERIFIED"}</small><b>{receipt ? `${receipt.failedNodeId} → ${receipt.failoverNodeId}` : "Run the D09 health-failure flow"}</b><em>{receipt ? `${receipt.correlationId} · ${receipt.proofId}` : "Open Immune closes only from the real failover receipt + Scaniom proof."}</em></div>
        </div>
      </div>
      <p className={styles.providerRoutesNote}>Control D3 ranks persisted Node identities. Released SDK/gateways rank configured runtime URLs and probe health before dispatch. D09 proves both surfaces without claiming the two identifiers always produce the same first-ranked member for one literal key.</p>
    </div>
  </section>;
}


function OfflineContinuityReality({ context }: { context: OpenIiContextResponse }) {
  const receipt = context.execution?.d10OfflineContinuity || null;
  const contract = context.offlineContinuity?.contract || null;
  const environmentId = context.workspace?.environmentId;
  const item = (context.offlineContinuity?.items || []).find((candidate) => candidate.nodeId === receipt?.nodeId)
    || (context.offlineContinuity?.items || []).find((candidate) => candidate.environmentId === environmentId)
    || null;
  const windowHours = Math.round(Number(contract?.maxOfflineSeconds || 0) / 3600);
  const graceMinutes = Math.round(Number(contract?.maxCredentialStaleSeconds || 0) / 60);
  const spoolMiB = Math.round(Number(contract?.maxSpoolBytes || 0) / 1024 / 1024);
  const rows = [
    ["l1", "L1 API Route", "provider_proxy"], ["l2", "L2 SDK", "sdk"], ["l3", "L3 Model Runtime", "runtime_hook"],
    ["l4", "L4 Sidecar", "sidecar"], ["l5", "L5 Environment Gateway", "gateway"], ["mcp", "MCP Gateway", "mcp_gateway"], ["l6", "L6 Provider Native", "provider_native"],
  ] as const;
  const verified = receipt ? rows.filter(([id]) => Boolean(receipt.boundaries?.[id]?.proofId)).length : 0;
  const proofSummary = verified === 7 ? "7/7 PROOFS" : `${verified}/7 PROOFS`;

  return <section className={styles.providerInspectorBlock} aria-label="D10 seven-boundary offline runtime continuity">
    <div className={styles.providerValuePanel}>
      <div className={styles.providerValueHeading}>
        <div><small>R18-B2 · FULL IMMUNE FABRIC</small><b>Control can disappear. Seven attachment boundaries keep bounded signed protection.</b></div>
        <span>{proofSummary} · {windowHours || 0}H · {graceMinutes || 0}M</span>
      </div>
      <div className={styles.providerRouteRows}>
        {rows.map(([id,label,source]) => {
          const row = receipt?.boundaries?.[id];
          return <div className={styles.providerRouteRow} key={id}>
            <span className={styles.providerRouteIcon}><StackIcon kind="shield" size={17}/></span>
            <div><small>{source.toUpperCase()} · {row ? `${row.eventCount} EVENTS` : "PENDING"}</small><b>{label} · {row ? "OFFLINE + REPLAY VERIFIED" : "REAL EXECUTION REQUIRED"}</b><em>{row?.proofId || "No D10 v2 attachment proof yet"}</em></div>
          </div>;
        })}
      </div>
    </div>
    <div className={styles.providerRoutesPanel}>
      <div className={styles.providerRoutesTitle}>BOUNDED CONTINUITY AUTHORITY</div>
      <p className={styles.providerRoutesNote}>{item?.nodeName || receipt?.nodeName || "D10 continuity Node"} · {spoolMiB || 0} MiB spool · unknown authority {String(contract?.unknownAuthority || "deny").toUpperCase()} · OFFLINE BOOTSTRAP {contract?.bootstrapWhileOffline ? "ALLOWED" : "DENIED"}. L1/L4 truthfully produce runtime events; L2/L3/L5/MCP/L6 produce guard/observe pairs. The acceptance does not fast-forward four hours or simulate lease expiry.</p>
      <p className={styles.providerRoutesNote}>{receipt ? `${receipt.replayedEnvelopes} replayed envelope(s) · ${receipt.spoolPeakBytes} bytes peak · 14 unique online/offline consequences` : "Run D10 full matrix to produce the v2 receipt."}</p>
    </div>
  </section>;
}

function RuntimeIdentityReality({ context, lab }: { context: OpenIiContextResponse; lab: LabManifest }) {
  const identity = context.runtimeIdentity?.identity || null;
  const attachments = (identity?.attachments || []).map((item) => String(item).toUpperCase()).join(" + ") || "—";
  const isL3 = lab.id === "d05-l3-model-runtime";
  const isL5 = lab.id === "d06-l5-environment-gateway";
  const isMcp = lab.id === "d07-mcp-gateway";
  const isL6 = lab.id === "d08-l6-provider-native";
  const rows = identity ? [
    ["STATE", String(identity.status || "unknown").toUpperCase()],
    ["IDENTITY", identity.identityId || "—"],
    ["GENERATION", String(identity.generation ?? "—")],
    ["ATTACHMENTS", attachments],
    ["LEASE", identity.lease ? String(identity.lease.status || "active").toUpperCase() : "AWAITING EXCHANGE"],
  ] : [["STATE", "NOT BOOTSTRAPPED"]];
  return <div className={styles.resolvedValues}>
    <header><div><small>REAL RUNTIME IDENTITY</small><b>Scaniom Control reports workload authority; secrets stay outside the browser.</b></div><StackIcon kind="shield" size={24}/></header>
    <div className={styles.resolvedGrid}>{rows.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code></div>)}</div>
    <div className={styles.secretBoundaryNote}><StackIcon kind="scaniom" size={18}/>{isL3
      ? <p><b>L3 is an explicit least-privilege runtime-identity scope.</b> Use <code>scaniom runtime identity bootstrap --workload &lt;workload&gt; --attachments l3</code>. The L3 adapter exchanges that bootstrap for renewable <code>scn_ri_v1</code> authority before using <code>/v1/runtime/guard</code> and <code>/v1/runtime/observe</code>.</p>
      : isL5
        ? <p><b>L5 is an explicit least-privilege environment-gateway scope.</b> Use <code>scaniom runtime identity bootstrap --workload &lt;workload&gt; --attachments l5</code>. Every request through the shared environment ingress must still carry the originating workload authority; Open Immune never receives the copy-once bootstrap or renewable <code>scn_ri_v1</code> token.</p>
        : isMcp
          ? <p><b>MCP is an explicit least-privilege tool-boundary scope.</b> Use <code>scaniom runtime identity bootstrap --workload &lt;workload&gt; --attachments mcp</code>. The MCP Gateway carries that workload authority into Gate before <code>tools/call</code> reaches the upstream server, then records post-observe lineage without exposing the token to Open Immune.</p>
          : isL6
        ? <p><b>L6 is an explicit least-privilege provider-native scope.</b> Use <code>scaniom runtime identity bootstrap --workload &lt;workload&gt; --attachments l6</code>. The provider/runtime adapter keeps its own adapter identity, asks the L6 bridge before consequence, and reports the outcome afterward. Open Immune never receives the copy-once bootstrap or renewable <code>scn_ri_v1</code> token.</p>
        : <p><b>L2/L4 share the frozen B1 managed identity scope with L1.</b> Use <code>scaniom runtime identity bootstrap --workload &lt;workload&gt; --attachments l1,l2,l4</code> once per deployment bootstrap. Open Immune never receives the copy-once bootstrap or renewable <code>scn_ri_v1</code> token.</p>}
    </div>
  </div>;
}


function controlPathForStep(stepId: string, lab?: LabManifest): string {
  if (stepId === "profile") return "/console/settings/control";
  if (stepId === "identity") return "/console/account";
  if (stepId === "organization") return "/console/organization";
  if (stepId === "environment") return "/console/environments";
  if (stepId === "workload") return "/console/workloads";
  if (stepId === "address") return "/console/addresses";
  if (stepId === "node") return "/console/nodes";
  if (stepId === "policy") return "/console/policies";
  if (stepId === "runtime-identity") return "/console/settings/runtime-access";
  if (["continuity", "offline-protected", "replay"].includes(stepId)) return "/console/settings/runtime-access";
  if (stepId === "provider") return lab?.id === "d05-l3-model-runtime" ? "/console/attachments" : "/console/connect";
  if (stepId.startsWith("attach-")) return "/console/attachments";
  if (stepId.includes("immunex")) return "/console/immunex";
  if (stepId.includes("fleet") || stepId.includes("pool") || stepId.includes("route")) return "/console/fleet";
  if (stepId === "behavior") return "/console/investigate";
  if (stepId === "proof") return "/console/proof";
  return "/console/setup";
}

function localPathForStep(stepId: string): string {
  if (["profile", "identity", "organization", "environment", "workload"].includes(stepId)) return "/workspace";
  return "/workbench";
}

function WorkSurfaceLinks({ step, context, command, lab }: { step: LabRuntimeStep; context: OpenIiContextResponse | null; command?: string; lab?: LabManifest }) {
  const control = context?.profile.controlUrl || "https://control.scaniom.com";
  return <div className={styles.workSurfaceLinks}>
    <span>WORK SURFACES</span>
    <div>
      <Link href={localPathForStep(step.id)}>Open Immune</Link>
      <a href={`${control}${controlPathForStep(step.id, lab)}`} target="_blank" rel="noreferrer">Scaniom Control ↗</a>
      {command ? <button type="button" onClick={() => copyText(command)}>Copy CLI</button> : null}
    </div>
  </div>;
}

function GuideModal({ open, step, options, selected, context, lab, onSelect, onClose }: { open: boolean; step: LabRuntimeStep | null; options: LabGuideOption[]; selected: LabGuideOption | null; context: OpenIiContextResponse | null; lab: LabManifest; onSelect: (id: string) => void; onClose: () => void }) {
  if (!open || !step) return null;
  const resolvedCommands = selected?.commands.map((command) => context ? resolveLabCommand(command, context, lab) : command) || [];
  const resolvedCode = selected?.code ? (context ? resolveLabCommand(selected.code, context, lab) : selected.code) : "";
  if (typeof document === "undefined") return null;
  return createPortal(<div className={styles.guideModal} role="dialog" aria-modal="true" aria-label={`${step.label} placement guide`}>
    <button className={styles.guideModalBackdrop} aria-label="Close placement guide" onClick={onClose}/>
    <section className={styles.guideModalCard}>
      <header className={styles.guideModalHead}><div><small>{step.eyebrow}</small><h2>{step.label}</h2><p>Choose the actual stack or placement, then copy only the commands and code for that path.</p></div><button type="button" onClick={onClose}>×</button></header>
      <div className={styles.guideModalLayout}>
        <aside className={styles.guideModalOptions}>{options.map((option) => <button key={option.id} type="button" className={selected?.id === option.id ? styles.guideModalOptionActive : ""} onClick={() => onSelect(option.id)}><i><StackIcon kind={option.icon} size={21}/></i><span><small>{option.kicker}</small><b>{option.label}</b></span></button>)}</aside>
        <main className={styles.guideModalBody}>
          {selected ? <>
            <div className={styles.guideModalIntro}><i><StackIcon kind={selected.icon} size={28}/></i><div><small>{selected.kicker}</small><h3>{selected.label}</h3><p>{selected.description}</p></div></div>
            <WorkSurfaceLinks step={step} context={context} command={resolvedCommands.find(isReleasedScaniomCliCommand)} lab={lab}/>
            <div className={styles.guideModalFlow}>{selected.flow.map((node, index) => <div key={`${node}-${index}`}><span>{node}</span>{index < selected.flow.length - 1 ? <i>→</i> : null}</div>)}</div>
            {selected.install?.length ? <section className={styles.guideModalSection}><b>INSTALL IN PROJECT</b>{selected.install.map((command) => <div className={styles.commandLine} key={command}><code>{command}</code><button onClick={() => copyText(command)}>COPY</button></div>)}</section> : null}
            {resolvedCommands.filter(isReleasedScaniomCliCommand).length ? <section className={styles.guideModalSection}><b>SCANIOM CLI</b>{resolvedCommands.filter(isReleasedScaniomCliCommand).map((command) => <div className={styles.commandLine} key={command}><code>{command}</code><button onClick={() => copyText(command)}>COPY</button></div>)}</section> : null}
            {resolvedCode ? <section className={styles.guideModalSection}><b>DEPLOYMENT / CODE</b><div className={styles.guideModalCode}><pre><code>{resolvedCode}</code></pre><button onClick={() => copyText(resolvedCode)}>COPY</button></div></section> : null}
            {selected.notes?.length ? <section className={styles.guideModalNotes}>{selected.notes.map((note) => <p key={note}>{note}</p>)}</section> : null}
          </> : <div className={styles.guideModalEmpty}><StackIcon kind="terminal" size={30}/><h3>Choose an option.</h3><p>Select a provider, SDK language, runtime or deployment placement from the left.</p></div>}
        </main>
      </div>
    </section>
  </div>, document.body);
}

function LabTreeGroup({
  kind,
  label,
  previewId,
  onPreview,
}: {
  kind: LabKind;
  label: string;
  previewId: string;
  onPreview: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const labs = LAB_CATALOG.filter((lab) => lab.kind === kind);
  return <div className={styles.libraryGroup}>
    <button className={styles.libraryGroupButton} onClick={() => setOpen((value) => !value)}>
      <span>{open ? "▾" : "▸"}</span><b>{label}</b><em>{labs.length}</em>
    </button>
    {open ? <div className={styles.libraryChildren}>{labs.map((lab) => <button key={lab.id} className={`${styles.libraryItem} ${previewId === lab.id ? styles.libraryItemActive : ""}`} onClick={() => onPreview(lab.id)}>
      <span className={styles.libraryCode}>{lab.code === "SYSTEM" ? "◇" : lab.code}</span>
      <span><b>{lab.title}</b><small>{lab.attachments.length ? lab.attachments.join(" · ") : "AUTHORITY"}</small></span>
      <i>›</i>
    </button>)}</div> : null}
  </div>;
}

function Readiness({ context }: { context: OpenIiContextResponse | null }) {
  const states = [
    { label: "OIS", done: Boolean(context?.profile.name) },
    { label: "Identity", done: Boolean(context?.whoami.user.id) },
    { label: "Org", done: Boolean(context?.whoami.organization.id) },
    { label: "Env", done: Boolean(context?.workspace?.environmentId) },
    { label: "Workload", done: Boolean(context?.workspace?.workloadId) },
  ];
  return <div className={styles.readiness}>{states.map((state, index) => <div key={state.label} className={state.done ? styles.readinessDone : ""}><i>{state.done ? "✓" : index + 1}</i><span>{state.label}</span></div>)}</div>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function topologyPositions(lab: LabManifest): Record<string, { x: number; y: number }> {
  return Object.fromEntries(lab.topology.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

function architectureToneLabel(tone?: string): string {
  if (tone === "control") return "CONTROL";
  if (tone === "environment") return "ENV";
  if (tone === "workload") return "WORKLOAD";
  if (tone === "node") return "NODE";
  if (tone === "attachment") return "BOUNDARY";
  if (tone === "provider") return "TARGET";
  if (tone === "policy") return "POLICY";
  if (tone === "evidence") return "EVIDENCE";
  return "FABRIC";
}

function ArchitecturePreview({ lab }: { lab: LabManifest }) {
  const [focusedNodeId, setFocusedNodeId] = useState(lab.topology.nodes[0]?.id || "");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => topologyPositions(lab));
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const focusedNode = lab.topology.nodes.find((node) => node.id === focusedNodeId) || lab.topology.nodes[0] || null;
  const toneLabel = (tone: string | undefined) => architectureToneLabel(tone);
  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    dragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    const drag = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId || !rect) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    setPositions((current) => ({ ...current, [id]: { x: clamp(((event.clientX - rect.left) / rect.width) * 100, 7, 93), y: clamp(((event.clientY - rect.top) / rect.height) * 100, 9, 91) } }));
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    const drag = dragRef.current;
    if (drag?.id === id && drag.pointerId === event.pointerId && !drag.moved) setFocusedNodeId(id);
    dragRef.current = null;
  };
  const point = (id: string) => positions[id] || { x: 50, y: 50 };

  return <div ref={canvasRef} className={styles.architecturePreview} aria-label={`${lab.title} architecture preview`}>
    <div className={styles.architectureBackdrop}/>
    <div className={styles.architectureMark}>SCANIOM <span>IMMUNE FABRIC</span></div>
    <button type="button" className={styles.architectureReset} onClick={() => setPositions(topologyPositions(lab))}>RESET LAYOUT</button>
    <svg className={styles.architectureEdges} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={`flow-${lab.id}`} x1="0" x2="1"><stop offset="0%" stopColor="#76f7e2" stopOpacity="0.18"/><stop offset="55%" stopColor="#c9ff75" stopOpacity="0.72"/><stop offset="100%" stopColor="#76f7e2" stopOpacity="0.18"/></linearGradient></defs>
      {lab.topology.edges.map((edge) => { const from = point(edge.from), to = point(edge.to); return <g key={`${edge.from}-${edge.to}`}><line className={styles.architectureEdgeBase} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/><line className={styles.architectureEdgeFlow} style={{ stroke: `url(#flow-${lab.id})` }} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/></g>; })}
    </svg>
    {lab.topology.nodes.map((node) => { const pos = point(node.id); return <button type="button" key={node.id} className={`${styles.architectureNode} ${styles[`architectureTone_${node.tone || "neutral"}`]} ${focusedNode?.id === node.id ? styles.architectureNodeFocused : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onPointerDown={(event) => beginDrag(event, node.id)} onPointerMove={(event) => moveDrag(event, node.id)} onPointerUp={(event) => endDrag(event, node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setFocusedNodeId(node.id); }}>
      <small>{toneLabel(node.tone)}</small><b>{node.label}</b><i>{node.eyebrow}</i>
    </button>; })}
    {focusedNode ? <div className={styles.architectureFocus}><span>{toneLabel(focusedNode.tone)}</span><b>{focusedNode.label}</b><small>Drag nodes to reform this view · click a node to inspect it.</small></div> : null}
    <div className={styles.architectureLegend}><span>FREE-FORM MANIFEST ARCHITECTURE</span><b>{lab.topology.nodes.length} nodes · {lab.topology.edges.length} links</b></div>
  </div>;
}

function LabLibrary({
  onStart,
  onClose,
  context,
  initialPreviewId = "",
}: {
  onStart: (id: string) => void;
  onClose?: () => void;
  context: OpenIiContextResponse | null;
  initialPreviewId?: string;
}) {
  const [previewId, setPreviewId] = useState(initialPreviewId);
  const preview = labById(previewId);
  const contextReady = Boolean(context?.workspace?.environmentId && context?.workspace?.workloadId);
  const architecturePath = preview ? [...preview.topology.nodes].sort((a, b) => a.y - b.y || a.x - b.x).map((node) => node.label) : [];

  return <div className={styles.libraryHome}>
    <header className={styles.libraryTopbar}>
      <div><span className={styles.kicker}>OPEN IMMUNE INTELLIGENCE</span><b>Select a lab or system to inspect its architecture.</b></div>
      <div className={styles.libraryTopActions}>
        <Readiness context={context}/>
        {onClose ? <button className={styles.iconButton} onClick={onClose} aria-label="Close lab selector">×</button> : null}
      </div>
    </header>

    <div className={styles.libraryLayout}>
      <aside className={styles.libraryTree}>
        <div className={styles.libraryTreeHead}><span>LAB / SYSTEM TREE</span><em>CLICK TO INSPECT</em></div>
        <div className={styles.libraryTreeScroll}>
          <LabTreeGroup kind="lab" label="Labs" previewId={preview?.id || ""} onPreview={setPreviewId}/>
          <LabTreeGroup kind="system" label="System blueprints" previewId={preview?.id || ""} onPreview={setPreviewId}/>
        </div>
        <div className={styles.libraryTreeFoot}><span>↳</span><p>Selection redraws the center architecture. Start Lab turns that manifest into the executable Fabric Tree.</p></div>
      </aside>

      <main className={styles.libraryVisual}>
        <div className={styles.visualHeading}>
          <span>LIVE ARCHITECTURE · MANIFEST PREVIEW</span>
          <b>{preview ? preview.title : "Select something from the tree"}</b>
        </div>
        {preview ? <ArchitecturePreview key={preview.id} lab={preview}/> : <div className={styles.architectureEmpty}>
          <div className={styles.emptySignal}><i/><i/><i/></div>
          <span>NO ARCHITECTURE SELECTED</span>
          <h2>Choose a Lab or system.</h2>
          <p>The selected manifest draws its Scaniom Control, protected scope, runtime placement, boundaries, provider/target path and evidence architecture here.</p>
        </div>}
      </main>

      <aside className={styles.libraryPreview}>
        {preview ? <>
          <div className={styles.previewKind}><span>{preview.kind === "lab" ? preview.code : "SYSTEM"}</span><em>{preview.difficulty}</em></div>
          <h1>{preview.title}</h1>
          <p className={styles.previewSubtitle}>{preview.subtitle}</p>

          <div className={styles.architectureSummary}>
            <span>ARCHITECTURE PATH</span>
            <p>{architecturePath.join(" → ")}</p>
          </div>

          <div className={styles.previewSection}><span>WHAT YOU BUILD</span><b>{preview.goal}</b></div>
          <div className={styles.previewSection}><span>SCANIOM BOUNDARIES</span><div className={styles.previewTags}>{preview.attachments.length ? preview.attachments.map((item) => <i key={item}>{item}</i>) : <i>AUTHORITY</i>}</div></div>
          <div className={styles.previewSection}><span>RUNTIME / ENVIRONMENT</span><p>{preview.platforms.join(" · ")}</p></div>
          <div className={styles.previewSection}><span>PROVIDERS / TARGETS</span><p>{preview.providers.join(" · ")}</p></div>
          <div className={styles.previewSection}><span>WHY THIS LAB</span><p>{preview.summary}</p></div>

          <div className={styles.previewAuthority}>
            <i className={contextReady ? styles.authorityReady : ""}/>
            <div><small>{context ? "REAL SCANIOM AUTHORITY" : "AUTHORITY STATUS"}</small><b>{contextReady ? `${resourceTitle(selectedEnvironment(context!))} · ${resourceTitle(selectedWorkload(context!))}` : context ? "Environment/workload not selected · enter Lab to continue setup" : "OIS Auth not connected · enter Lab to begin setup"}</b></div>
          </div>

          <button className={styles.startLabButton} onClick={() => onStart(preview.id)}>Go to {preview.kind === "lab" ? "Lab" : "System Lab"}<span>→</span></button>
          <Link className={styles.contextLink} href="/workspace">{contextReady ? "Review OIS Auth" : "Set up OIS Auth"} ↗</Link>
        </> : <div className={styles.previewEmpty}>
          <span>ARCHITECTURE</span><h2>Nothing selected yet.</h2><p>Use the tree to inspect a lab/system architecture before starting it.</p><Link href="/workspace">Review OIS Auth ↗</Link>
        </div>}
      </aside>
    </div>
  </div>;
}

export function OpenImmuneWorkbench() {
  const [context, setContext] = useState<OpenIiContextResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState("");
  const [intelTab, setIntelTab] = useState<IntelTab>("guidance");
  const [intelCollapsed, setIntelCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<LabStepGroup>>(new Set());
  const [guideChoice, setGuideChoice] = useState<Record<string, string>>({});
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [matrixPositions, setMatrixPositions] = useState<Record<string, { x: number; y: number }>>({});
  const matrixCanvasRef = useRef<HTMLDivElement | null>(null);
  const matrixDragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const next = await api<OpenIiContextResponse>("/api/scaniom/context");
      setContext(next);
      setError("");
    } catch (err) {
      setContext(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api<OpenIiContextResponse>("/api/scaniom/context").then((next) => {
      if (!cancelled) { setContext(next); setError(""); }
    }).catch((err: unknown) => {
      if (!cancelled) { setContext(null); setError(err instanceof Error ? err.message : String(err)); }
    });
    const refresh = () => { void load(); };
    window.addEventListener("open-ii-auth-changed", refresh);
    return () => { cancelled = true; window.removeEventListener("open-ii-auth-changed", refresh); };
  }, [load]);


  const lab = useMemo(() => labById(selectedLabId), [selectedLabId]);
  const runtime = useMemo(() => lab ? (context ? buildLabRuntime(lab, context) : runtimeWithoutContext(lab.id)) : null, [lab, context]);
  const nextStep = runtime ? nextLabStep(runtime) : null;
  const progress = runtime ? labProgress(runtime) : null;
  const currentEnvironment = context ? selectedEnvironment(context) : null;
  const currentWorkload = context ? selectedWorkload(context) : null;


  const selectedStep = runtime?.runtimeSteps.find((step) => step.id === selectedStepId) || nextStep || runtime?.runtimeSteps[0] || null;
  const visibleWorkloads = useMemo(() => {
    if (!context) return [];
    const environmentId = context.workspace?.environmentId || "";
    if (!environmentId) return context.workloads;
    return context.workloads.filter((item) => workloadEnvironmentId(item) === environmentId);
  }, [context]);

  function selectLab(id: string) {
    const next = labById(id);
    if (!next) return;
    setSelectedLabId(next.id);
    setCatalogOpen(false);
    setSelectedStepId(next.steps[0]?.id || "");
    setMatrixPositions(topologyPositions(next));
  }

  async function updateWorkspace(environment: string, workload: string) {
    setBusy(true);
    try {
      await api("/api/workspace/context", { method: "POST", body: JSON.stringify({ environment, workload }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  function toggleGroup(group: LabStepGroup) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  function beginMatrixDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    matrixDragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMatrixDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    const drag = matrixDragRef.current;
    const rect = matrixCanvasRef.current?.getBoundingClientRect();
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId || !rect) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    setMatrixPositions((current) => ({ ...current, [id]: { x: clamp(((event.clientX - rect.left) / rect.width) * 100, 6, 94), y: clamp(((event.clientY - rect.top) / rect.height) * 100, 7, 93) } }));
  }

  function endMatrixDrag(event: ReactPointerEvent<HTMLButtonElement>, node: LabManifest["topology"]["nodes"][number]) {
    const drag = matrixDragRef.current;
    if (drag?.id === node.id && drag.pointerId === event.pointerId && !drag.moved && node.stepId) setSelectedStepId(node.stepId);
    matrixDragRef.current = null;
  }

  if (!lab || !runtime) return <section className={styles.shell}><LabLibrary onStart={selectLab} context={context}/></section>;

  const groups = (["authority", "fabric", "runtime", "evidence"] as LabStepGroup[]).map((group) => ({ group, steps: runtime.runtimeSteps.filter((step) => step.group === group) })).filter((item) => item.steps.length);
  const selectedCommands = selectedStep?.commands?.map((command) => context ? resolveLabCommand(command, context, lab) : command) || [];
  const guideOptions = selectedStep?.guideOptions || [];
  const liveProvider = selectedStep?.id === "provider" ? String((context?.connections || []).find((item) => item.workload_id === context?.workspace?.workloadId && item.status !== "paused")?.provider || "").toLowerCase() : "";
  const selectedGuide = guideOptions.find((option) => option.id === guideChoice[selectedStep?.id || ""]) || guideOptions.find((option) => option.id === liveProvider) || (selectedStep?.id === "provider" ? null : guideOptions[0] || null);
  const guideCommands = selectedGuide?.commands.map((command) => context ? resolveLabCommand(command, context, lab) : command) || [];
  const baseCli = context?.cli || [];
  const cliCommands = [...baseCli, ...(selectedGuide ? guideCommands : selectedCommands)].filter(isReleasedScaniomCliCommand);
  const allCli = cliCommands.filter((value, index, all) => all.indexOf(value) === index);


  return <section className={styles.shell}>
    {catalogOpen ? <div className={styles.catalogOverlay}><LabLibrary onStart={selectLab} onClose={() => setCatalogOpen(false)} context={context} initialPreviewId={lab.id}/></div> : null}
    <GuideModal open={guideModalOpen} step={selectedStep} options={guideOptions} selected={selectedGuide} context={context} lab={lab} onSelect={(id) => { if (selectedStep) setGuideChoice((current) => ({ ...current, [selectedStep.id]: id })); }} onClose={() => setGuideModalOpen(false)}/>

    <header className={styles.commandBar}>
      <button className={styles.labSwitch} onClick={() => setCatalogOpen(true)}>
        <span className={styles.labIcon}>{lab.code === "SYSTEM" ? "◇" : lab.code}</span>
        <span><small>{lab.kind === "lab" ? "LAB" : "SYSTEM BLUEPRINT"}</small><b>{lab.title}</b></span>
        <em>⌄</em>
      </button>
      <div className={styles.contextStrip}>
        <div><span>OIS AUTH</span><b>{context?.profile.label || "Authorize Scaniom"}</b></div>
        <div><span>ORG</span><b>{context?.whoami.organization.name || "—"}</b></div>
        <div><span>ENV</span><b>{resourceTitle(currentEnvironment)}</b></div>
        <div><span>WORKLOAD</span><b>{resourceTitle(currentWorkload)}</b></div>
      </div>
      <div className={styles.commandActions}>
        <div className={styles.progressMini}><span>{progress?.verified || 0}/{progress?.total || 0}</span><i><u style={{ width: `${progress?.percent || 0}%` }}/></i></div>
        <button className={styles.refreshButton} disabled={busy} onClick={() => void load()}>{busy ? "SYNCING" : "REFRESH"}</button>
      </div>
    </header>

    <div className={`${styles.workspace} ${intelCollapsed ? styles.intelCollapsed : ""}`}>
      <aside className={styles.treePane}>
        <div className={styles.paneTitle}>
          <span>FABRIC TREE</span>
          <em>LAB MANIFEST</em>
        </div>
        <div className={styles.treeIntro}>
          <span className={`${styles.stateDot} ${nextStep ? styles.ready : styles.verified}`}/>
          <div><small>{nextStep ? "DO NEXT" : "LAB STATE"}</small><b>{nextStep?.label || "Current verified state"}</b></div>
        </div>
        <div className={styles.treeScroll}>
          {groups.map(({ group, steps }) => <div className={styles.treeGroup} key={group}>
            <button className={styles.groupButton} onClick={() => toggleGroup(group)}><span>{collapsedGroups.has(group) ? "▸" : "▾"}</span>{GROUP_LABELS[group]}<em>{steps.filter((step) => step.status === "verified").length}/{steps.length}</em></button>
            {!collapsedGroups.has(group) ? <div className={styles.treeChildren}>
              {steps.map((step) => <button key={step.id} className={`${styles.treeRow} ${selectedStep?.id === step.id ? styles.treeSelected : ""}`} style={{ paddingLeft: `${18 + step.depth * 15}px` }} onClick={() => setSelectedStepId(step.id)}>
                <span className={`${styles.stateDot} ${styles[step.status]}`}/>
                <span className={styles.branchGlyph}>{step.depth ? "└" : ""}</span>
                <span className={styles.treeText}><small>{step.eyebrow}</small><b>{step.label}</b></span>
                <em className={styles.treeState}>{statusLabel(step.status)}</em>
              </button>)}
            </div> : null}
          </div>)}
        </div>
        <div className={styles.treeFooter}><span>+</span><p>Tree contents come from this lab manifest. Only the selected Lab manifest appears here. Real Scaniom evidence—not clicks—turns runtime steps green.</p></div>
      </aside>

      <main className={styles.matrixPane}>
        <div className={styles.paneTitle}><span>FABRIC MATRIX</span><div className={styles.matrixTitleActions}><button type="button" className={styles.matrixResetButton} onClick={() => setMatrixPositions(topologyPositions(lab))}>RESET</button><em>{lab.topology.nodes.length} NODES · {lab.topology.edges.length} LINKS</em></div></div>
        <div ref={matrixCanvasRef} className={styles.matrixCanvas}>
          <div className={styles.canvasGrid}/>
          <svg className={styles.edges} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {lab.topology.edges.map((edge) => {
              const fromNode = lab.topology.nodes.find((node) => node.id === edge.from);
              const toNode = lab.topology.nodes.find((node) => node.id === edge.to);
              if (!fromNode || !toNode) return null;
              const from = matrixPositions[fromNode.id] || { x: fromNode.x, y: fromNode.y };
              const to = matrixPositions[toNode.id] || { x: toNode.x, y: toNode.y };
              return <g key={`${edge.from}-${edge.to}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>{edge.label ? <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2}>{edge.label}</text> : null}</g>;
            })}
          </svg>
          {lab.topology.nodes.map((node) => {
            const status = topologyNodeStatus(node, runtime);
            const isSelected = Boolean(node.stepId && selectedStep?.id === node.stepId);
            const position = matrixPositions[node.id] || { x: node.x, y: node.y };
            return <button key={node.id} className={`${styles.matrixNode} ${styles[`tone_${node.tone || "neutral"}`]} ${status !== "neutral" ? styles[status] : ""} ${isSelected ? styles.nodeSelected : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} onPointerDown={(event) => beginMatrixDrag(event, node.id)} onPointerMove={(event) => moveMatrixDrag(event, node.id)} onPointerUp={(event) => endMatrixDrag(event, node)} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && node.stepId) setSelectedStepId(node.stepId); }}>
              <small>{node.eyebrow}</small><b>{node.label}</b>{status !== "neutral" ? <span>{status === "verified" ? "✓ VERIFIED" : status === "ready" ? "○ NEXT" : "· LOCKED"}</span> : null}
            </button>;
          })}
        </div>
      </main>

      <aside className={styles.inspectorPane}>
        <div className={styles.paneTitle}>
          <span>INSPECTOR</span>
          <em>{selectedStep?.status || "—"}</em>
        </div>
        <div className={styles.inspectorScroll}>
          {selectedStep ? <>
            <div className={styles.inspectorHero}><span className={`${styles.statusBadge} ${styles[selectedStep.status]}`}>{statusLabel(selectedStep.status)}</span><small>{selectedStep.eyebrow}</small><h2>{selectedStep.label}</h2><p>{selectedStep.detail}</p></div>
            <div className={styles.whyBlock}><small>WHY THIS EXISTS</small><p>{selectedStep.why}</p></div>
            {selectedStep.surface || selectedStep.artifacts?.length ? <div className={styles.executionMeta}>
              {selectedStep.surface ? <div><small>WORK HERE</small><b>{selectedStep.surface}</b></div> : null}
              {selectedStep.artifacts?.length ? <div><small>REQUIRES</small><b>{selectedStep.artifacts.join(" · ")}</b></div> : null}
            </div> : null}
            <WorkSurfaceLinks step={selectedStep} context={context} command={selectedCommands.find(isReleasedScaniomCliCommand)} lab={lab}/>
            {selectedStep.notes?.length ? <div className={styles.stepNotes}><small>BOUNDARY NOTES</small>{selectedStep.notes.map((note) => <p key={note}>{note}</p>)}</div> : null}
            {selectedStep.id === "provider" && lab.id !== "d05-l3-model-runtime" ? <ProviderReality context={context} onOpen={() => setGuideModalOpen(true)}/> : null}
            {selectedStep.id === "provider" && lab.id === "d05-l3-model-runtime" ? <ModelRuntimeReality context={context}/> : null}
            {context && lab.id === "d06-l5-environment-gateway" && selectedStep.id === "attach-l5" ? <EnvironmentGatewayReality context={context}/> : null}
            {context && lab.id === "d08-l6-provider-native" && selectedStep.id === "attach-l6" ? <ProviderNativeReality context={context}/> : null}
            {context && lab.id === "d09-fleet-failover" && ["node-pool", "routing", "failover"].includes(selectedStep.id) ? <FleetFailoverReality context={context}/> : null}
            {context && lab.id === "d10-offline-continuity" && ["continuity", "offline-protected", "replay"].includes(selectedStep.id) ? <OfflineContinuityReality context={context}/> : null}
            {context && ["runtime-identity", "attach-l2", "attach-l3", "attach-l5", "attach-mcp"].includes(selectedStep.id) ? <RuntimeIdentityReality context={context} lab={lab}/> : null}
            {context && ["provider", "attach-l1", "attach-l3", "attach-l4", "attach-l5", "attach-mcp", "attach-l6"].includes(selectedStep.id) ? <ResolvedRuntimeValues context={context} lab={lab}/> : null}

            {guideOptions.length ? <div className={styles.guideSurface}>
              <div className={styles.guideSurfaceHead}><div><small>PLACEMENT / INTEGRATION</small><b>{selectedStep.id === "provider" ? "Choose a provider or private route." : "Choose where this boundary lives."}</b></div><span>{guideOptions.length} OPTIONS</span></div>
              <div className={styles.guideOptionGrid}>
                {guideOptions.map((option) => <button key={option.id} type="button" className={`${styles.guideOptionCard} ${selectedGuide?.id === option.id ? styles.guideOptionActive : ""}`} onClick={() => { setGuideChoice((current) => ({ ...current, [selectedStep.id]: option.id })); setGuideModalOpen(true); }}>
                  <i><StackIcon kind={option.icon} size={22}/></i><span><small>{option.kicker}</small><b>{option.label}</b></span><em>›</em>
                </button>)}
              </div>
              <button type="button" className={styles.openGuideButton} onClick={() => setGuideModalOpen(true)}>{selectedGuide ? `Open ${selectedGuide.label} guide` : selectedStep.id === "provider" ? "Choose provider + open setup guide" : "Open integration guide"} →</button>
            </div> : null}

            {selectedStep.id === "environment" && context ? <div className={styles.controlBlock}><label>Real environment<select value={context.workspace?.environmentId || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => void updateWorkspace(event.target.value, "")}><option value="">Select environment…</option>{context.environments.map((item) => <option key={item.id} value={item.id}>{resourceTitle(item)}</option>)}</select></label></div> : null}
            {selectedStep.id === "workload" && context ? <div className={styles.controlBlock}><label>Real workload<select value={context.workspace?.workloadId || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => void updateWorkspace(context.workspace?.environmentId || "", event.target.value)}><option value="">Select workload…</option>{visibleWorkloads.map((item: OperatorWorkload) => <option key={item.id} value={item.id}>{resourceTitle(item)}</option>)}</select></label></div> : null}

            {!guideOptions.length && selectedCommands.filter(isReleasedScaniomCliCommand).length ? <div className={styles.commandList}><div className={styles.sectionLabel}>REAL SCANIOM COMMANDS</div>{selectedCommands.filter(isReleasedScaniomCliCommand).map((command) => <div className={styles.commandLine} key={command}><code>{command}</code><button onClick={() => copyText(command)}>COPY</button></div>)}</div> : null}
            {!guideOptions.length && selectedStep.code ? <div className={styles.integrationCode}><div className={styles.sectionLabel}>APPLICATION / RUNTIME INTEGRATION</div><pre><code>{context ? resolveLabCommand(selectedStep.code, context, lab) : selectedStep.code}</code></pre><button onClick={() => copyText(context ? resolveLabCommand(selectedStep.code || "", context, lab) : selectedStep.code || "")}>COPY CODE</button></div> : null}

            <div className={`${styles.inspectorNext} ${styles[`next_${selectedStep.status}`]}`}>
              {selectedStep.status === "verified" ? <><span>✓</span><div><b>Verified</b><p>Current Scaniom authority satisfies this step. Continue to the next unlocked item.</p></div></> : selectedStep.status === "ready" ? <><span>→</span><div><b>Do this next</b><p>{selectedStep.completion === "external" ? "Run the real CLI/runtime action, then refresh. This UI does not mark it complete without evidence." : "Complete this real Scaniom selection to unlock the next step."}</p></div></> : <><span>·</span><div><b>Locked</b><p>Complete the prerequisite above it in the Fabric Tree first.</p></div></>}
            </div>
          </> : null}
          {error ? <div className={styles.errorBox}>{error}<Link href="/workspace">OIS Auth</Link></div> : null}
        </div>
      </aside>

      <section className={styles.intelligencePane}>
        <div className={styles.intelBar}>
          <div className={styles.intelTabs}>{(["guidance", "cli", "live"] as IntelTab[]).map((tab) => <button key={tab} className={intelTab === tab ? styles.intelActive : ""} onClick={() => { setIntelTab(tab); setIntelCollapsed(false); }}>{tab === "guidance" ? "GUIDANCE" : tab === "cli" ? "CLI PARITY" : "LIVE INTELLIGENCE"}</button>)}</div>
          <div><span>{lab.code} · {lab.title}</span><button className={styles.collapseButton} onClick={() => setIntelCollapsed((value) => !value)}>{intelCollapsed ? "⌃" : "⌄"}</button></div>
        </div>
        {!intelCollapsed ? <div className={styles.intelBody}>
          {intelTab === "guidance" ? <div className={styles.guidanceGrid}>
            <div><small>LAB OUTCOME</small><b>{lab.goal}</b><p>{lab.summary}</p></div>
            <div><small>NEXT ACTION</small><b>{nextStep?.label || "No currently verifiable next step"}</b><p>{nextStep?.detail || "Refresh after real Scaniom evidence changes."}</p></div>
            <div><small>EXPECTED FABRIC</small><b>{lab.attachments.length ? lab.attachments.join(" + ") : "Control authority"}</b><p>{lab.stacks.join(" · ")}</p></div>
          </div> : null}
          {intelTab === "cli" ? <div className={styles.terminal}><div className={styles.terminalHead}><span className={styles.terminalDots}>● ● ●</span><b>SCANIOM CLI · selected lab + step</b></div><pre>{allCli.length ? allCli.join("\n") : "Complete OIS Auth to load CLI parity."}</pre></div> : null}
          {intelTab === "live" ? <div className={styles.liveEmpty}><span className={styles.livePulse}/><div><b>Live channel reserved for real Scaniom events.</b><p>Real action/Gate/trajectory/routing/proof streaming is connected Lab by Lab. No synthetic events are emitted here.</p></div></div> : null}
        </div> : null}
      </section>
    </div>
  </section>;
}
