"use client";

import { useEffect, useState } from "react";
import type { PublicReleaseStatus } from "@/lib/open-ii/public-release";

const RELEASE_REPOSITORY = "https://github.com/faradeen-ja/scaniom-releases";

export function PublicReleaseBadge() {
  const [release, setRelease] = useState<PublicReleaseStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/scaniom/public-release", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as PublicReleaseStatus;
      if (!cancelled) setRelease(body);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const current = release || { release: "R18", version: "0.4.2", source: "pinned" as const, verifiedAssets: { checksums: true, sigstore: true, publicationReceipt: true, provenance: true, sbom: true, standaloneTargets: 5 } };
  const releaseHref = `${RELEASE_REPOSITORY}/releases/tag/v${encodeURIComponent(current.version)}`;
  return <a className="public-release-badge" href={releaseHref} target="_blank" rel="noreferrer" title="Open the public Scaniom release on GitHub">
    <i/>
    <span><small>PUBLIC SCANIOM</small><b>{current.release} · {current.version}</b></span>
    <em>{current.source === "github" ? "LIVE RELEASE" : "ACCEPTED BASELINE"}</em>
    <u>GITHUB ↗</u>
  </a>;
}
