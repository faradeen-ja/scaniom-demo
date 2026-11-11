import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildLabRuntime, labById } from "../lib/open-ii/labs";
import type { OpenIiContextResponse } from "../lib/open-ii/types";

const run = fs.readFileSync("demos/d07-mcp-gateway/run.sh", "utf8");
const readme = fs.readFileSync("demos/d07-mcp-gateway/README.md", "utf8");
const reference = fs.readFileSync("demos/d07-mcp-gateway/reference-server.mjs", "utf8");

function context(overrides: Partial<OpenIiContextResponse> = {}): OpenIiContextResponse {
  return {
    profile: { name: "cloud", label: "Scaniom Cloud", type: "cloud", controlUrl: "https://control.scaniom.com" },
    identity: { userId: "u1", email: "dev@example.com", displayName: "Dev", organizationId: "org1", organizationName: "Example", organizationSlug: "example", role: "owner" },
    whoami: { user: { id: "u1", email: "dev@example.com", name: "Dev" }, organization: { id: "org1", name: "Example", slug: "example" }, role: "owner", credential: { kind: "cli_session", name: "Open Immune" } },
    deployment: { id: "control-1", label: "Scaniom Cloud", type: "cloud" },
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    environments: [{ id: "env1", name: "Production", slug: "production", kind: "production", status: "active" }],
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", slug: "prod-ai-01", environment_id: "env1", operational_state: "online", status: "active" }],
    policies: [{ environment_id: "env1", environment_name: "Production", mode: "enforce", version: 7 }],
    runtimeIdentity: { ok: true, identity: { identityId: "ri-mcp", workloadId: "work1", workloadName: "Agent", environmentId: "env1", status: "active", generation: 4, attachments: ["mcp"], lease: { leaseId: "lease-mcp", status: "active" } } },
    attachments: { levels: [{ id: "mcp", level: "MCP", configured: true, ready: true, evidence: { total: 2 } }] },
    proof: { evidence: [{ id: "receipt-mcp", kind: "receipt", occurred_at: "2026-11-10T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Agent", node_name: "prod-ai-01", provider: "mcp", attachment_source: "mcp_gateway", attachment_label: "MCP", policy_version: 7, policy_digest: "sha256:mcp", machine_action: "pass", count: 1, behavior_event_id: "beh-mcp", merkle_root: null, key_fingerprint: "key-mcp", verification: "valid" }] },
    cli: ["scaniom profile use cloud"],
    ...overrides,
  } as OpenIiContextResponse;
}

test("D07 manifest requires explicit MCP runtime identity before the attachment can close", () => {
  const lab = labById("d07-mcp-gateway")!;
  const identity = lab.steps.find((step) => step.id === "runtime-identity")!;
  const mcp = lab.steps.find((step) => step.id === "attach-mcp")!;
  assert.ok(identity);
  assert.match(JSON.stringify(identity), /--attachments mcp/);
  assert.deepEqual(mcp.dependsOn, ["runtime-identity"]);
  assert.match(JSON.stringify(mcp), /tools\/call/);
});

test("D07 Workbench verifies only from MCP identity, mcp_gateway evidence and MCP proof", () => {
  const lab = labById("d07-mcp-gateway")!;
  const live = context();
  const runtime = buildLabRuntime(lab, live);
  for (const id of ["runtime-identity", "attach-mcp", "behavior", "proof"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);

  const wrongScope = buildLabRuntime(lab, context({ runtimeIdentity: { ok: true, identity: { ...live.runtimeIdentity!.identity!, attachments: ["l5"] } } }));
  assert.equal(wrongScope.runtimeSteps.find((step) => step.id === "runtime-identity")?.status, "ready");
  assert.equal(wrongScope.runtimeSteps.find((step) => step.id === "attach-mcp")?.status, "locked");

  const wrongProof = buildLabRuntime(lab, context({ proof: { evidence: [{ ...live.proof!.evidence![0], attachment_source: "gateway", attachment_label: "L5" }] } }));
  assert.equal(wrongProof.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});

test("D07 runner pins MCP service port away from Node port and executes real tools/call", () => {
  assert.match(run, /SCANIOM_NODE_URL:-http:\/\/127\.0\.0\.1:8787/);
  assert.match(run, /SCANIOM_MCP_PORT:-8793/);
  assert.match(run, /--node-url "\$NODE_URL"/);
  assert.match(run, /--attachments mcp/);
  assert.match(run, /Existing SCANIOM_RUNTIME_TOKEN is not MCP-scoped/);
  assert.match(run, /\/v1\/runtime\/identity\/exchange/);
  assert.match(run, /method:"tools\/call"/);
  assert.match(run, /mcp-protocol-version":"2026-07-28"/);
  assert.match(run, /forwarded.*observed/);
});

test("D07 closes on MCP pre/post trajectory plus valid correlated proof", () => {
  assert.match(run, /attachmentSource/);
  assert.match(run, /mcp_gateway/);
  assert.match(run, /actionType/);
  assert.match(run, /tool_call/);
  assert.match(run, /phases\.has\("pre"\).*phases\.has\("post"\)/s);
  assert.match(run, /proof correlated verify "\$correlation_id"/);
  assert.match(run, /scaniom-correlation-v1/);
  assert.match(run, /evidence_session_id/);
  assert.match(run, /correlation_id/);
  assert.match(run, /p\.sessionId===evidenceSessionId/);
  assert.match(run, /verification\?\.valid===true/);
  assert.match(run, /levels\.includes\("mcp"\)/);
  assert.match(run, /eventCount\|\|0\)>=2/);
});

test("D07 reference MCP performs a real privacy-minimized safe tool consequence", () => {
  assert.match(reference, /open_immune_record/);
  assert.match(reference, /fs\.appendFileSync/);
  assert.match(reference, /messageDigest/);
  assert.match(reference, /contentStored: false/);
  assert.match(reference, /server\/discover/);
  assert.match(reference, /tools\/list/);
  assert.match(reference, /tools\/call/);
  assert.match(reference, /2026-07-28/);
  assert.match(readme, /real Streamable HTTP MCP/i);
  assert.match(readme, /Gate executes \*\*before\*\* `tools\/call`/);
});
