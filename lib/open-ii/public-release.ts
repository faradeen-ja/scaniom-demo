export const PINNED_PUBLIC_RELEASE = Object.freeze({
  version: "0.4.1",
  release: "R18",
  tag: "v0.4.1",
  repository: "faradeen-ja/scaniom-releases",
  publishedAt: "2026-11-01T22:05:59Z",
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
