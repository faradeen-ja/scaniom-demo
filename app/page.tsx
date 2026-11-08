import Link from "next/link";
import { HomeAuthorityTerminal } from "@/components/HomeAuthorityTerminal";
import { ImmunityField } from "@/components/ImmunityField";

export default function HomePage() {
  return <div className="open-ii-home home-full">
    <section className="home-immersive">
      <div className="home-immersive-copy">
        <span className="eyebrow">OPEN IMMUNE INTELLIGENCE · POWERED BY SCANIOM</span>
        <h1>Build real AI immune fabrics.</h1>
        <p>Public engineering Labs for learning how real AI systems connect to Scaniom—from authorization and workload identity to runtime boundaries, Gate decisions, recovery and proof.</p>
        <div className="button-row"><Link className="button" href="/workbench">Open Labs</Link><Link className="button secondary" href="/workspace">OIS Auth</Link><Link className="button ghost" href="/docs">Start A–Z</Link></div>
      </div>
      <ImmunityField/>
      <HomeAuthorityTerminal/>
    </section>
  </div>;
}
