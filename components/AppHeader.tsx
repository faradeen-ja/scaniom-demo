import Link from "next/link";

export function AppHeader() {
  return <header className="app-header">
    <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"/>Open Immune <strong>Intelligence</strong></Link>
    <nav aria-label="Open Immune navigation">
      <Link href="/workspace">Workbench</Link>
      <Link href="/profiles">Profiles</Link>
      <a href="https://scaniom.com" target="_blank" rel="noreferrer">Scaniom</a>
    </nav>
  </header>;
}
