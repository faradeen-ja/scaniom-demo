import assert from "node:assert/strict";
import test from "node:test";
import { LAB_CATALOG, buildLabRuntime, labById, nextLabStep } from "../lib/open-ii/labs";
import type { OpenIiContextResponse } from "../lib/open-ii/types";

function context(overrides: Partial<OpenIiContextResponse> = {}): OpenIiContextResponse {
  return {
    profile: { name: "cloud", label: "Scaniom Cloud", type: "cloud", controlUrl: "https://control.scaniom.com" },
    identity: { userId: "u1", email: "dev@example.com", displayName: "Dev", organizationId: "org1", organizationName: "Example", organizationSlug: "example", role: "owner" },
    whoami: { user: { id: "u1", email: "dev@example.com", name: "Dev" }, organization: { id: "org1", name: "Example", slug: "example" }, role: "owner", credential: { kind: "cli_session", name: "Open Immune" } },
    deployment: { id: "control-1", label: "Scaniom Cloud", type: "cloud" },
    workspace: null,
    environments: [{ id: "env1", name: "Production", slug: "production", kind: "production", status: "active" }],
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1" }],
    cli: ["scaniom profile use cloud", "scaniom whoami"],
    ...overrides,
  };
}

test("catalog contains D00-D12, flagship and five system blueprints", () => {
  for (const id of ["d00-account-auth", "d01-public-install", "d02-l1-full-cycle", "d12-immunex", "flagship-full-fabric", "system-saas", "system-robots", "system-lanes", "system-factory", "system-ifoc"]) assert.ok(labById(id), `missing ${id}`);
  assert.equal(LAB_CATALOG.filter((lab) => lab.kind === "system").length, 5);
});

test("selected Lab controls the tree boundary set", () => {
  assert.deepEqual(labById("d02-l1-full-cycle")?.attachments, ["L1"]);
  assert.deepEqual(labById("system-robots")?.attachments, ["L2", "L4", "L5", "MCP"]);
  assert.deepEqual(labById("system-factory")?.attachments, ["L3", "L4", "L5"]);
  assert.deepEqual(labById("system-ifoc")?.attachments, ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"]);
});

test("OIS authority verifies identity/scope but never fabric execution that was not observed", () => {
  const runtime = buildLabRuntime(labById("d02-l1-full-cycle")!, context({ workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" } }));
  for (const id of ["profile", "identity", "organization", "environment", "workload"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);
  for (const id of ["address", "node", "policy", "provider", "attach-l1", "behavior", "proof"]) assert.notEqual(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);
  assert.equal(runtime.runtimeSteps.some((step) => step.id === "public-release"), false);
});

test("next operational step follows real authority requirements", () => {
  const lab = labById("d02-l1-full-cycle")!;
  assert.equal(nextLabStep(buildLabRuntime(lab, context()))?.id, "environment");
  assert.equal(nextLabStep(buildLabRuntime(lab, context({ workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: null } })))?.id, "workload");
  const full = buildLabRuntime(lab, context({ workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" } }));
  assert.equal(nextLabStep(full)?.id, "address");
});

test("live Scaniom fabric state verifies address, Node, policy, provider, attachment and behavior without click-completion", () => {
  const lab = labById("d02-l1-full-cycle")!;
  const live = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", slug: "prod-ai-01", environment_id: "env1", operational_state: "online", status: "active" }],
    policies: [{ environment_id: "env1", environment_name: "Production", mode: "enforce", version: 2 }],
    connections: [{ id: "route1", name: "openai-agent", provider: "openai", model_hint: "gpt-test", secret_ref: "env:OPENAI_API_KEY", status: "active", node_id: "node1", node_name: "prod-ai-01", workload_id: "work1" }],
    attachments: { counts: { readyRoutes: 1 }, levels: [{ id: "l1", level: "L1", configured: true, ready: true, evidence: { total: 3 } }] },
  });
  const runtime = buildLabRuntime(lab, live);
  for (const id of ["address", "node", "policy", "provider", "attach-l1", "behavior"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);
  assert.equal(runtime.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});


test("D00 remains entirely live Control authority and does not depend on local execution receipts", () => {
  const runtime = buildLabRuntime(labById("d00-account-auth")!, context());
  for (const id of ["profile", "identity", "organization"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);
});

test("D01 becomes verified only after the real public install receipt exists", () => {
  const lab = labById("d01-public-install")!;
  const before = buildLabRuntime(lab, context());
  assert.equal(before.runtimeSteps.find((step) => step.id === "sdk-distributions")?.status, "ready");
  const after = buildLabRuntime(lab, context({
    execution: {
      d01PublicInstall: {
        version: 1,
        labId: "d01-public-install",
        status: "pass",
        release: "R18",
        scaniomVersion: "0.4.1",
        verifiedAt: "2026-11-08T00:00:00.000Z",
        checks: { publicRelease: true, standaloneCli: true, npmSdk: true, pypiSdk: true },
      },
    },
  }));
  assert.equal(after.runtimeSteps.find((step) => step.id === "sdk-distributions")?.status, "verified");
});

test("D02 proof verification comes from selected-workload Scaniom signed evidence", () => {
  const lab = labById("d02-l1-full-cycle")!;
  const live = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", environment_id: "env1", operational_state: "online" }],
    policies: [{ environment_id: "env1", mode: "enforce", version: 2 }],
    connections: [{ id: "route1", provider: "openai", status: "active", node_id: "node1", workload_id: "work1" }],
    attachments: { counts: { readyRoutes: 1 }, levels: [{ id: "l1", configured: true, evidence: { total: 3 } }] },
    proof: { evidence: [{ id: "receipt1", kind: "receipt", occurred_at: "2026-11-08T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Agent", node_name: "prod-ai-01", provider: "openai", attachment_source: "provider_proxy", attachment_label: "L1", policy_version: 2, policy_digest: "sha256:test", machine_action: "pass", count: 1, behavior_event_id: "beh1", merkle_root: null, key_fingerprint: "key1", verification: "valid" }] },
  });
  const runtime = buildLabRuntime(lab, live);
  assert.equal(runtime.runtimeSteps.find((step) => step.id === "proof")?.status, "verified");

  const wrongWorkload = buildLabRuntime(lab, { ...live, proof: { evidence: [{ ...live.proof!.evidence![0], workload_name: "Other workload" }] } });
  assert.equal(wrongWorkload.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});
