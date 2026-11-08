"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { StackIcon } from "@/components/StackIcon";

type BoundaryId = "l1" | "l2" | "l3" | "l4" | "l5" | "mcp" | "l6";
type Point = { x: number; y: number };

type Boundary = {
  id: BoundaryId;
  level: string;
  icon: string;
  title: string;
  where: string;
  install: string;
  path: string;
  note: string;
  command: string;
};

const BOUNDARIES: Boundary[] = [
  { id: "l1", level: "L1", icon: "api", title: "API Route", where: "Application/API client + Scaniom Node", install: "No SDK", path: "Application → Node /v1/responses → provider", note: "Use L1 for normal provider/model API traffic. The application authenticates to Scaniom; the provider key remains at the Node/secret boundary.", command: `scaniom attach l1 --workload customer-agent --node prod-ai-01 --preset openai --model <model>\nscaniom runtime identity bootstrap --workload customer-agent --attachments l1\nscaniom attach test l1 --workload customer-agent --model <model> -- "Say hello"` },
  { id: "l2", level: "L2", icon: "typescript", title: "SDK", where: "Application repository / agent code", install: "TypeScript or Python SDK", path: "Semantic action → SDK → Node/Gate", note: "Use L2 when the application can describe tools, delegation, memory, files, code, network or computer actions that a provider API route alone cannot fully express.", command: `npm install @scaniom/sdk@0.4.1\nscaniom attach l2 --workload customer-agent --lang typescript\nscaniom runtime identity bootstrap --workload customer-agent --attachments l2` },
  { id: "l3", level: "L3", icon: "gpu", title: "Model Runtime", where: "GPU host / VM / Docker / Kubernetes", install: "Runtime adapter", path: "Application → L3 adapter → Gate → inference runtime", note: "Use L3 when Scaniom must gate before vLLM, NVIDIA NIM, Triton or another compatible inference runtime executes.", command: `scaniom attach l3 --workload customer-agent --kind vllm --endpoint http://<runtime>:8000 --run\nscaniom runtime identity bootstrap --workload customer-agent --attachments l3` },
  { id: "l4", level: "L4", icon: "docker", title: "Sidecar", where: "Workload deployment / Pod / container group", install: "Scaniom sidecar", path: "Workload → local sidecar → Node", note: "Use L4 when you control workload deployment but do not want to rewrite every provider call site. The sidecar is an ingress boundary; Node/Gate remains authoritative.", command: `scaniom attach l4 --workload customer-agent --port 8790\nscaniom runtime identity bootstrap --workload customer-agent --attachments l4` },
  { id: "l5", level: "L5", icon: "kubernetes", title: "Environment Gateway", where: "Cluster / VPC / private ingress", install: "Environment gateway", path: "Many workloads → L5 gateway → Node fabric", note: "Use L5 for an environment-wide ingress while preserving explicit workload identity on every request.", command: `scaniom attach l5 --environment production --port 8791 --run\nscaniom runtime identity bootstrap --workload customer-agent --attachments l5` },
  { id: "mcp", level: "MCP", icon: "mcp", title: "MCP Gateway", where: "MCP client/server path", install: "MCP gateway", path: "MCP client → Gate → MCP server/tool", note: "Use MCP when tool calls must cross Scaniom before an upstream MCP server or tool consequence.", command: `scaniom attach mcp --workload customer-agent --server-id internal-tools --endpoint https://mcp.example/mcp --port 8793 --run\nscaniom runtime identity bootstrap --workload customer-agent --attachments mcp` },
  { id: "l6", level: "L6", icon: "code", title: "Provider Native", where: "Provider/runtime adapter or physical consequence edge", install: "L6 bridge/framework", path: "Native adapter → L6 bridge → Gate → consequence", note: "Use L6 when a provider/runtime-native adapter can ask Scaniom before a privileged consequence and report the result afterward.", command: `scaniom attach l6 --workload customer-agent --provider <provider> --adapter <adapter> --hook <family> --port 8794 --run\nscaniom runtime identity bootstrap --workload customer-agent --attachments l6` },
];

const DEFAULT_POSITIONS: Record<BoundaryId, Point> = {
  l1: { x: 19, y: 23 },
  l2: { x: 18, y: 50 },
  l3: { x: 27, y: 78 },
  l4: { x: 50, y: 86 },
  l5: { x: 73, y: 78 },
  mcp: { x: 82, y: 50 },
  l6: { x: 81, y: 23 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function AttachmentFabricGuide() {
  const [activeId, setActiveId] = useState<BoundaryId | null>(null);
  const [positions, setPositions] = useState<Record<BoundaryId, Point>>(DEFAULT_POSITIONS);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: BoundaryId; pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const active = activeId ? BOUNDARIES.find((item) => item.id === activeId) || null : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: BoundaryId) => {
    dragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: BoundaryId) => {
    const drag = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId || !rect) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    setPositions((current) => ({ ...current, [id]: { x: clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92), y: clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 88) } }));
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: BoundaryId) => {
    const drag = dragRef.current;
    if (drag?.id === id && drag.pointerId === event.pointerId && !drag.moved) setActiveId(id);
    dragRef.current = null;
  };

  return <section className="attachment-fabric-guide">
    <header className="attachment-fabric-heading">
      <div><span>SEVEN EXECUTABLE BOUNDARIES · ONE IMMUNE FABRIC</span><h3>Move the boundaries. Click one to expand its architecture.</h3><p>The seven boundaries are not seven separate products. They are seven places where one Scaniom identity, Node/Gate, policy, trajectory and proof fabric can enter a real AI system.</p></div>
      <button type="button" onClick={() => setPositions(DEFAULT_POSITIONS)}>Reset layout</button>
    </header>

    <div className="attachment-fabric-layer-strip" aria-label="Immune Fabric layers">
      {["Authority", "Environment", "Workload", "Node + Gate + Policy", "Attachment", "Provider / Runtime", "Evidence + Proof"].map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i><b>{label}</b>{index < 6 ? <em>→</em> : null}</span>)}
    </div>

    <div ref={canvasRef} className={`attachment-fabric-canvas ${active ? "has-active" : ""}`}>
      <div className="attachment-fabric-grid"/>
      <svg className="attachment-fabric-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="50" y1="47" x2="50" y2="8" className="fabric-trunk"/>
        <line x1="50" y1="47" x2="50" y2="96" className="fabric-trunk"/>
        {BOUNDARIES.map((item) => <line key={item.id} x1="50" y1="47" x2={positions[item.id].x} y2={positions[item.id].y} className={item.id === activeId ? "fabric-link active" : "fabric-link"}/>) }
      </svg>
      <div className="attachment-fabric-anchor authority"><StackIcon kind="cloud" size={22}/><span><small>AUTHORITY</small><b>Control · identity · policy</b></span></div>
      <div className="attachment-fabric-core"><StackIcon kind="scaniom" size={32}/><span><small>SCANIOM NODE / GATE</small><b>One machine-speed authority</b></span></div>
      <div className="attachment-fabric-anchor evidence"><StackIcon kind="shield" size={22}/><span><small>EVIDENCE</small><b>Behavior · trajectory · proof</b></span></div>
      {BOUNDARIES.map((item) => <button
        key={item.id}
        type="button"
        className={`attachment-boundary-node ${item.id === activeId ? "active" : ""}`}
        style={{ left: `${positions[item.id].x}%`, top: `${positions[item.id].y}%` }}
        onPointerDown={(event) => beginDrag(event, item.id)}
        onPointerMove={(event) => moveDrag(event, item.id)}
        onPointerUp={(event) => endDrag(event, item.id)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setActiveId(item.id); }}
      ><i><StackIcon kind={item.icon} size={23}/></i><span><small>{item.level}</small><b>{item.title}</b></span></button>)}

      {active ? <aside className="attachment-fabric-detail">
        <header><i><StackIcon kind={active.icon} size={28}/></i><div><small>{active.level} · EXECUTION BOUNDARY</small><h4>{active.title}</h4><p>{active.note}</p></div></header>
        <div className="attachment-fabric-meta"><div><span>WORK HERE</span><b>{active.where}</b></div><div><span>INSTALL</span><b>{active.install}</b></div><div><span>PATH</span><b>{active.path}</b></div></div>
        <pre><code>{active.command}</code></pre>
        <div className="attachment-fabric-detail-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(active.command)}>Copy commands</button><a href="https://control.scaniom.com/console/attachments" target="_blank" rel="noreferrer">Open Scaniom Attachments ↗</a><button type="button" onClick={() => setActiveId(null)}>Close detail</button></div>
      </aside> : null}
    </div>
  </section>;
}
