import Link from "next/link";
import { ScaniomMark } from "@/components/ScaniomMark";

export function AppHeader() {
  return <header className="app-header">
    <Link className="brand" href="/"><ScaniomMark size={20}/><span>Open Immune</span><strong>Intelligence</strong></Link>
    <nav aria-label="Open Immune navigation">
      <Link href="/workbench">Labs</Link>
      <Link href="/workspace">OIS Auth</Link>
      <Link href="/profiles">Profiles</Link>
      <Link href="/docs">Start A–Z</Link>
      <a href="https://scaniom.com" target="_blank" rel="noreferrer">Scaniom</a>
    </nav>
  </header>;
}
