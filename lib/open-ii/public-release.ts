export const PINNED_PUBLIC_RELEASE = Object.freeze({
  version: "0.4.2",
  release: "R18",
  tag: "v0.4.2",
  repository: "faradeen-ja/scaniom-releases",
  publishedAt: "2026-11-10T04:18:40Z",
});

export type PublicReleaseStatus = {
  version: string;
  release: string;
  tag: string;
  repository: string;
  publishedAt: string;
  source: "github" | "pinned";
  verifiedAssets: {
    checksums: boolean;
    sigstore: boolean;
    publicationReceipt: boolean;
    provenance: boolean;
    sbom: boolean;
    standaloneTargets: number;
  };
};
