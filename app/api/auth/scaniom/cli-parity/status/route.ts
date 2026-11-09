import { cliParityPublicState, readCliParityChallenge } from "@/lib/open-ii/cli-parity";
import { noStore } from "@/lib/open-ii/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loopback(request: Request): boolean {
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export async function GET(request: Request) {
  if (!loopback(request)) return noStore({ error: "CLI parity handoff is local-only." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("challenge")?.trim() ?? "";
  const challenge = readCliParityChallenge(id);
  if (!challenge) return noStore({ status: "missing", error: "CLI parity challenge is missing or expired." }, { status: 404 });
  return noStore(cliParityPublicState(challenge));
}
