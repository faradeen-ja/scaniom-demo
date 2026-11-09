import "server-only";
import { randomBytes } from "node:crypto";

export type CliParityChallenge = {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "approved";
  approvedAt?: string;
  profileName?: string;
  profileType?: string;
  controlUrl?: string;
  organizationId?: string;
  organizationName?: string;
};

type GlobalWithCliParity = typeof globalThis & {
  __openIiCliParityChallenges?: Map<string, CliParityChallenge>;
};

const globalState = globalThis as GlobalWithCliParity;
const challenges = globalState.__openIiCliParityChallenges ?? new Map<string, CliParityChallenge>();
globalState.__openIiCliParityChallenges = challenges;

const TTL_MS = 2 * 60 * 1000;
const MAX_CHALLENGES = 128;

function sweep(): void {
  const now = Date.now();
  for (const [id, challenge] of challenges) {
    if (Date.parse(challenge.expiresAt) <= now) challenges.delete(id);
  }
  if (challenges.size <= MAX_CHALLENGES) return;
  const ordered = [...challenges.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const item of ordered.slice(0, challenges.size - MAX_CHALLENGES)) challenges.delete(item.id);
}

export function createCliParityChallenge(): CliParityChallenge {
  sweep();
  const now = Date.now();
  const challenge: CliParityChallenge = {
    id: randomBytes(24).toString("base64url"),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
    status: "pending",
  };
  challenges.set(challenge.id, challenge);
  return challenge;
}

export function readCliParityChallenge(id: string): CliParityChallenge | null {
  sweep();
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) return null;
  return challenges.get(id) ?? null;
}

export function approveCliParityChallenge(input: {
  id: string;
  profileName: string;
  profileType: string;
  controlUrl: string;
  organizationId: string;
  organizationName: string;
}): CliParityChallenge {
  const current = readCliParityChallenge(input.id);
  if (!current) throw new Error("CLI parity challenge is missing or expired.");
  const next: CliParityChallenge = {
    ...current,
    status: "approved",
    approvedAt: new Date().toISOString(),
    profileName: input.profileName,
    profileType: input.profileType,
    controlUrl: input.controlUrl,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
  };
  challenges.set(input.id, next);
  return next;
}

export function cliParityPublicState(challenge: CliParityChallenge) {
  return {
    status: challenge.status,
    expiresAt: challenge.expiresAt,
    approvedAt: challenge.approvedAt ?? null,
    profile: challenge.status === "approved" ? {
      name: challenge.profileName,
      type: challenge.profileType,
      controlUrl: challenge.controlUrl,
    } : null,
    organization: challenge.status === "approved" ? {
      id: challenge.organizationId,
      name: challenge.organizationName,
    } : null,
  };
}
