import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function sessionKey(): Buffer {
  const configured = String(process.env.OPEN_II_SESSION_SECRET || "").trim();
  if (process.env.NODE_ENV === "production" && configured.length < 32) {
    throw new Error("OPEN_II_SESSION_SECRET must be at least 32 characters in production.");
  }
  const material = configured || "open-immune-intelligence-development-only-secret";
  return createHash("sha256").update(material).digest();
}

export function sealJson<T>(purpose: string, value: T): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  cipher.setAAD(Buffer.from(`open-ii:${purpose}:${VERSION}`, "utf8"));
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function unsealJson<T>(purpose: string, sealed: string | undefined | null): T | null {
  if (!sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAAD(Buffer.from(`open-ii:${purpose}:${VERSION}`, "utf8"));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}
