import { cliParityPublicState, createCliParityChallenge } from "@/lib/open-ii/cli-parity";
import { noStore } from "@/lib/open-ii/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loopback(request: Request): boolean {
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export async function POST(request: Request) {
  if (!loopback(request)) return noStore({ error: "CLI parity handoff is local-only." }, { status: 403 });
  const challenge = createCliParityChallenge();
  const approveUrl = new URL("/workspace", request.url);
  approveUrl.searchParams.set("cliParityChallenge", challenge.id);
  return noStore({
    challengeId: challenge.id,
    approveUrl: approveUrl.toString(),
    ...cliParityPublicState(challenge),
  }, { status: 201 });
}
