import { noStore } from "@/lib/open-ii/http";
import { PINNED_PUBLIC_RELEASE, type PublicReleaseStatus } from "@/lib/open-ii/public-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GitHubRelease = {
  tag_name?: string;
  name?: string;
  published_at?: string;
  assets?: Array<{ name?: string }>;
};

function fallback(): PublicReleaseStatus {
  return {
    ...PINNED_PUBLIC_RELEASE,
    source: "pinned",
    verifiedAssets: {
      checksums: true,
      sigstore: true,
      publicationReceipt: true,
      provenance: true,
      sbom: true,
      standaloneTargets: 5,
    },
  };
}

export async function GET() {
  try {
    const response = await fetch("https://api.github.com/repos/faradeen-ja/scaniom-releases/releases/latest", {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "open-immune-intelligence/0.1",
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return noStore(fallback());
    const release = await response.json() as GitHubRelease;
    const tag = String(release.tag_name || PINNED_PUBLIC_RELEASE.tag);
    const version = tag.replace(/^v/, "") || PINNED_PUBLIC_RELEASE.version;
    const assets = (release.assets || []).map((item) => String(item.name || ""));
    const status: PublicReleaseStatus = {
      version,
      release: /R18/i.test(String(release.name || "")) ? "R18" : PINNED_PUBLIC_RELEASE.release,
      tag,
      repository: PINNED_PUBLIC_RELEASE.repository,
      publishedAt: String(release.published_at || PINNED_PUBLIC_RELEASE.publishedAt),
      source: "github",
      verifiedAssets: {
        checksums: assets.some((name) => name === "SHA256SUMS"),
        sigstore: assets.some((name) => /sigstore/i.test(name)),
        publicationReceipt: assets.some((name) => /publication.*receipt/i.test(name)),
        provenance: assets.some((name) => /provenance|intoto/i.test(name)),
        sbom: assets.some((name) => /sbom/i.test(name)),
        standaloneTargets: assets.filter((name) => /^r18-standalone-.*\.(?:tar\.gz|zip)$/i.test(name)).length,
      },
    };
    return noStore(status);
  } catch {
    return noStore(fallback());
  }
}
