import Link from "next/link";
import { ScaniomConnection } from "@/components/ScaniomConnection";

export default function HomePage() {
  return <div className="page-stack">
    <section className="hero">
      <div><span className="eyebrow">OPEN IMMUNE · INTELLIGENCE</span><h1>Build the fabric.<br/>See what Scaniom sees.</h1><p>A public engineering workbench for learning and exercising real Scaniom without importing private product source.</p><div className="button-row"><Link className="button" href="/workspace">Open workbench</Link><Link className="button secondary" href="/profiles">Control profiles</Link></div></div>
      <div className="hero-map" aria-label="Open Immune architecture preview"><span>ENVIRONMENT</span><div><b>NODE</b><b>WORKLOAD</b><b>POLICY</b></div><div><i>L1</i><i>L2</i><i>L3</i><i>L4</i><i>L5</i><i>MCP</i><i>L6</i></div><small>The Fabric Matrix arrives after identity + profile authority are accepted.</small></div>
    </section>
    <ScaniomConnection/>
    <section className="three-up">
      <article><small>01 · PROFILE</small><h2>Take Scaniom anywhere.</h2><p>Cloud is the default. Self-hosted, private-enterprise, staging, and local development use the same Control profile contract.</p></article>
      <article><small>02 · IDENTITY</small><h2>One real Scaniom identity.</h2><p>Open Immune delegates authorization to the selected Scaniom Control. It does not create a parallel password database.</p></article>
      <article><small>03 · PARITY</small><h2>Web and CLI share authority.</h2><p>The browser workbench and CLI target the same profile, organization, environment, and workload contracts.</p></article>
    </section>
    <section className="preserve-panel"><div><small>PUBLIC REPOSITORY CONTRACT</small><h2>D00–D12 stay executable truth.</h2><p>The existing public demos, public artifact verification, and private-source rejection rules remain intact. This web layer becomes their visual front door, not a replacement for real Scaniom execution.</p></div><Link href="/workspace">Continue →</Link></section>
  </div>;
}
