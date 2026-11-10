import { readFile } from "node:fs/promises";
import path from "node:path";

export type D01PublicInstallReceipt = {
  version: 1;
  labId: "d01-public-install";
  status: "pass";
  release: "R18";
  scaniomVersion: "0.4.2";
  verifiedAt: string;
  checks: {
    publicRelease: true;
    standaloneCli: true;
    npmSdk: true;
    pypiSdk: true;
  };
};

export type LocalExecutionState = {
  d01PublicInstall: D01PublicInstallReceipt | null;
};

function validD01(value: unknown): value is D01PublicInstallReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<D01PublicInstallReceipt>;
  const checks = receipt.checks as Partial<D01PublicInstallReceipt["checks"]> | undefined;
  return receipt.version === 1
    && receipt.labId === "d01-public-install"
    && receipt.status === "pass"
    && receipt.release === "R18"
    && receipt.scaniomVersion === "0.4.2"
    && typeof receipt.verifiedAt === "string"
    && Number.isFinite(Date.parse(receipt.verifiedAt))
    && checks?.publicRelease === true
    && checks?.standaloneCli === true
    && checks?.npmSdk === true
    && checks?.pypiSdk === true;
}

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

export async function readLocalExecutionState(): Promise<LocalExecutionState> {
  const receipt = await readJson(path.join(process.cwd(), ".demo", "receipts", "d01-public-install.json"));
  return { d01PublicInstall: validD01(receipt) ? receipt : null };
}
