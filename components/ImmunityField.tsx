"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ScaniomMark } from "@/components/ScaniomMark";
import styles from "./ImmunityField.module.css";

type GlyphProps = { className?: string };
type SystemVisual = {
  id: string;
  label: string;
  detail: string;
  Icon: (props: GlyphProps) => ReactNode;
};

function RobotIcon({ className }: GlyphProps) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="17" width="32" height="29" rx="8"/><path d="M32 17V9m-5 0h10M21 29h.01M43 29h.01M24 38h16M11 27v11m42-11v11M22 46v9m20-9v9"/><circle cx="32" cy="9" r="2" fill="currentColor" stroke="none"/></svg>;
}

function CarIcon({ className }: GlyphProps) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 39h40l-4-13a8 8 0 0 0-8-6H24a8 8 0 0 0-8 6l-4 13Z"/><path d="M8 39v8h6m42-8v8h-6M20 39h24M19 25h26"/><circle cx="19" cy="47" r="5"/><circle cx="45" cy="47" r="5"/></svg>;
}

function AppIcon({ className }: GlyphProps) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="11" y="13" width="42" height="38" rx="6"/><path d="M11 22h42M19 18h.01M25 18h.01M31 18h.01M19 31h12v12H19zm18 0h8m-8 6h8m-8 6h6"/></svg>;
}

function AgentIcon({ className }: GlyphProps) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M32 9 47 18v18L32 55 17 46V28L32 9Z"/><circle cx="32" cy="31" r="8"/><path d="m24 15 8 8 8-8M20 46l7-8m17 8-7-8"/></svg>;
}

function FactoryIcon({ className }: GlyphProps) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 53h46V31L42 38V27l-14 8V23L9 34v19Z"/><path d="M43 27V11h8v20M18 43h7m7 0h7m7 0h4"/></svg>;
}

const SYSTEMS: readonly SystemVisual[] = [
  { id: "agent", label: "AI agent", detail: "identity · tools · consequential actions", Icon: AgentIcon },
  { id: "robot", label: "Robot fleet", detail: "edge workloads · sidecars · tool control", Icon: RobotIcon },
  { id: "car", label: "Autonomous lanes", detail: "physical-world path · provider-native consequence", Icon: CarIcon },
  { id: "app", label: "AI application", detail: "API route · SDK · MCP tools", Icon: AppIcon },
  { id: "factory", label: "Inference factory", detail: "model runtime · gateways · multi-node", Icon: FactoryIcon },
] as const;

export function ImmunityField({ compact = false }: { compact?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = globalThis.setInterval(() => setIndex((value) => (value + 1) % SYSTEMS.length), 7600);
    return () => globalThis.clearInterval(timer);
  }, []);

  const system = SYSTEMS[index];
  const Icon = system.Icon;
  const select = (next: number) => setIndex(next);

  return <div className={`${styles.field} ${compact ? styles.compact : ""}`} aria-label={`Open Immune Intelligence visualization: ${system.label}`}>
    <div className={styles.depthGlow}/>
    <div className={styles.dangerWash}/>
    <div className={styles.immuneWash}/>
    <div className={styles.boundaryLine}/>

    {!compact ? <>
      <div className={`${styles.copy} ${styles.copyLeft}`}><span>UNVERIFIED AI</span><b>Identity · behavior · consequence unknown.</b><p>Real systems enter before runtime trust is established.</p></div>
      <div className={`${styles.copy} ${styles.copyRight}`}><span>IMMUNE PATH</span><b>Identity · Gate · history verified.</b><p>Scaniom decides what may continue and preserves evidence.</p></div>
    </> : null}

    <div className={styles.motionStage} key={system.id}>
      <div className={`${styles.systemSide} ${styles.systemUnsafe}`}>
        <span className={styles.systemAura}/>
        <Icon className={styles.systemGlyph}/>
        <small>{system.label}</small>
      </div>

      <div className={styles.centerField}>
        <div className={styles.energyRing}/>
        <div className={`${styles.energyRing} ${styles.energyRingTwo}`}/>
        <div className={`${styles.energyRing} ${styles.energyRingThree}`}/>
        <div className={styles.motionParticles} aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>
        <ScaniomMark size={compact ? 78 : 104} className={styles.heroMark}/>
        <strong>OPEN IMMUNE</strong>
        <small>powered by Scaniom authority</small>
      </div>

      <div className={`${styles.systemSide} ${styles.systemImmune}`}>
        <span className={styles.systemAura}/>
        <Icon className={styles.systemGlyph}/>
        <small>{system.label}</small>
      </div>
    </div>

    <div className={styles.systemCaption}>
      <span>{system.label.toUpperCase()}</span>
      <b>{system.detail}</b>
      <div>{SYSTEMS.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Show ${item.label}`} className={itemIndex === index ? styles.activeDot : ""} onClick={() => select(itemIndex)}/>)}</div>
    </div>
  </div>;
}
