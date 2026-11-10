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
        scaniomVersion: "0.4.2",
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

  const wrongAttachment = buildLabRuntime(lab, { ...live, proof: { evidence: [{ ...live.proof!.evidence![0], attachment_source: "sdk", attachment_label: "L2" }] } });
  assert.equal(wrongAttachment.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});

test("D03 closes only from live L2 runtime identity, SDK evidence and L2 signed proof", () => {
  const lab = labById("d03-l2-agent-sdk")!;
  const live = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", environment_id: "env1", operational_state: "online" }],
    policies: [{ environment_id: "env1", mode: "enforce", version: 2 }],
    runtimeIdentity: { ok: true, identity: { identityId: "scn_rid_1", workloadId: "work1", workloadName: "Agent", environmentId: "env1", status: "active", generation: 2, attachments: ["l1", "l2", "l4"], lease: { leaseId: "lease1", status: "active" } } },
    attachments: { levels: [{ id: "l2", level: "L2", configured: true, ready: true, evidence: { total: 4 } }] },
    proof: { evidence: [{ id: "receipt-l2", kind: "receipt", occurred_at: "2026-11-08T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Agent", node_name: "prod-ai-01", provider: "", attachment_source: "sdk", attachment_label: "L2", policy_version: 2, policy_digest: "sha256:test", machine_action: "pass", count: 1, behavior_event_id: "beh-l2", merkle_root: null, key_fingerprint: "key1", verification: "valid" }] },
  });
  const runtime = buildLabRuntime(lab, live);
  for (const id of ["runtime-identity", "attach-l2", "behavior", "proof"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);

  const noL2Scope = buildLabRuntime(lab, { ...live, runtimeIdentity: { ok: true, identity: { ...live.runtimeIdentity!.identity!, attachments: ["l1", "l4"] } } });
  assert.equal(noL2Scope.runtimeSteps.find((step) => step.id === "runtime-identity")?.status, "ready");
  assert.equal(noL2Scope.runtimeSteps.find((step) => step.id === "attach-l2")?.status, "locked");

  const l1OnlyProof = buildLabRuntime(lab, { ...live, proof: { evidence: [{ ...live.proof!.evidence![0], attachment_source: "provider_proxy", attachment_label: "L1" }] } });
  assert.equal(l1OnlyProof.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});


test("D04 verifies only from shared B1 identity plus selected-workload L4 sidecar evidence and proof", () => {
  const lab = labById("d04-l4-sidecar")!;
  const base = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Agent", slug: "agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", environment_id: "env1", operational_state: "online" }],
    policies: [{ environment_id: "env1", mode: "enforce", version: 2 }],
    connections: [{ id: "route1", provider: "openai", status: "active", node_id: "node1", workload_id: "work1" }],
    runtimeIdentity: { identity: { identityId: "ri1", workloadId: "work1", status: "active", generation: 1, attachments: ["l1", "l2", "l4"], lease: { status: "active" } } },
    attachments: { counts: { readyRoutes: 1 }, levels: [{ id: "l4", level: "L4", configured: true, evidence: { total: 2 } }] },
    proof: { evidence: [{ id: "receipt-l4", kind: "receipt", occurred_at: "2026-11-08T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Agent", node_name: "prod-ai-01", provider: "openai", attachment_source: "sidecar", attachment_label: "L4", policy_version: 2, policy_digest: "sha256:test", machine_action: "pass", count: 1, behavior_event_id: "beh-l4", merkle_root: null, key_fingerprint: "key1", verification: "valid" }] },
  });
  const runtime = buildLabRuntime(lab, base);
  for (const id of ["runtime-identity", "attach-l4", "behavior", "proof"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);

  const l1Only = buildLabRuntime(lab, { ...base, attachments: { counts: { readyRoutes: 1 }, levels: [{ id: "l1", level: "L1", configured: true, evidence: { total: 9 } }, { id: "l4", level: "L4", configured: false, evidence: { total: 0 } }] }, proof: { evidence: [{ ...base.proof!.evidence![0], attachment_source: "provider_proxy", attachment_label: "L1" }] } });
  assert.notEqual(l1Only.runtimeSteps.find((step) => step.id === "attach-l4")?.status, "verified");
  assert.notEqual(l1Only.runtimeSteps.find((step) => step.id === "proof")?.status, "verified");
});


test("D05 verifies only from a real model runtime, explicit L3 identity, runtime_hook evidence and L3 proof", () => {
  const lab = labById("d05-l3-model-runtime")!;
  const live = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Model Runtime", slug: "model-runtime", kind: "service", status: "active", environment_id: "env1", active_address: "scn://example/model-runtime" }],
    nodes: [{ id: "node1", name: "gpu-node-01", environment_id: "env1", operational_state: "online" }],
    policies: [{ environment_id: "env1", mode: "enforce", version: 4 }],
    modelRuntimes: [{ id: "rt1", environmentId: "env1", workloadId: "work1", name: "primary-vllm", kind: "vllm", endpoint: "http://vllm:8000", modelHint: "model-a", authSecretRef: null, status: "active" }],
    runtimeIdentity: { identity: { identityId: "ri-l3", workloadId: "work1", status: "active", generation: 1, attachments: ["l3"], lease: null } },
    attachments: { levels: [{ id: "l3", level: "L3", configured: true, ready: true, evidence: { total: 3 } }] },
    proof: { evidence: [{ id: "receipt-l3", kind: "receipt", occurred_at: "2026-11-09T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Model Runtime", node_name: "gpu-node-01", provider: "runtime:vllm", attachment_source: "runtime_hook", attachment_label: "L3", policy_version: 4, policy_digest: "sha256:l3", machine_action: "pass", count: 1, behavior_event_id: "beh-l3", merkle_root: null, key_fingerprint: "key-l3", verification: "valid" }] },
  });
  const runtime = buildLabRuntime(lab, live);
  for (const id of ["provider", "runtime-identity", "attach-l3", "behavior", "proof"]) assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);

  const noTarget = buildLabRuntime(lab, { ...live, modelRuntimes: [] });
  assert.equal(noTarget.runtimeSteps.find((step) => step.id === "provider")?.status, "ready");
  assert.equal(noTarget.runtimeSteps.find((step) => step.id === "attach-l3")?.status, "locked");

  const defaultB1Only = buildLabRuntime(lab, { ...live, runtimeIdentity: { identity: { ...live.runtimeIdentity!.identity!, attachments: ["l1", "l2", "l4"] } } });
  assert.equal(defaultB1Only.runtimeSteps.find((step) => step.id === "runtime-identity")?.status, "ready");
  assert.equal(defaultB1Only.runtimeSteps.find((step) => step.id === "attach-l3")?.status, "locked");

  const sidecarProof = buildLabRuntime(lab, { ...live, proof: { evidence: [{ ...live.proof!.evidence![0], attachment_source: "sidecar", attachment_label: "L4" }] } });
  assert.equal(sidecarProof.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});

test("D06 verifies only from explicit L5 identity, gateway evidence and selected-workload L5 proof", () => {
  const lab = labById("d06-l5-environment-gateway")!;
  const live = context({
    workspace: { version: 1, profileName: "cloud", organizationId: "org1", environmentId: "env1", workloadId: "work1" },
    workloads: [{ id: "work1", name: "Gateway Agent", slug: "gateway-agent", kind: "agent", status: "active", environment_id: "env1", active_address: "scn://example/gateway-agent" }],
    nodes: [{ id: "node1", name: "prod-ai-01", slug: "prod-ai-01", environment_id: "env1", operational_state: "online", status: "active" }],
    policies: [{ environment_id: "env1", environment_name: "Production", mode: "enforce", version: 5 }],
    runtimeIdentity: { ok: true, identity: { identityId: "ri-l5", workloadId: "work1", workloadName: "Gateway Agent", environmentId: "env1", status: "active", generation: 1, attachments: ["l5"], lease: { leaseId: "lease-l5", status: "active" } } },
    attachments: { levels: [{ id: "l5", level: "L5", configured: true, ready: true, evidence: { total: 2 } }] },
    proof: { evidence: [{ id: "receipt-l5", kind: "receipt", occurred_at: "2026-11-09T00:00:00.000Z", environment_id: "env1", environment_name: "Production", workload_name: "Gateway Agent", node_name: "prod-ai-01", provider: "openai", attachment_source: "gateway", attachment_label: "L5", policy_version: 5, policy_digest: "sha256:l5", machine_action: "pass", count: 1, behavior_event_id: "beh-l5", merkle_root: null, key_fingerprint: "key-l5", verification: "valid" }] },
  });

  const runtime = buildLabRuntime(lab, live);
  for (const id of ["runtime-identity", "attach-l5", "behavior", "proof"]) {
    assert.equal(runtime.runtimeSteps.find((step) => step.id === id)?.status, "verified", id);
  }

  const noL5Identity = buildLabRuntime(lab, { ...live, runtimeIdentity: { identity: { ...live.runtimeIdentity!.identity!, attachments: ["l1", "l2", "l4"] } } });
  assert.equal(noL5Identity.runtimeSteps.find((step) => step.id === "runtime-identity")?.status, "ready");
  assert.equal(noL5Identity.runtimeSteps.find((step) => step.id === "attach-l5")?.status, "locked");

  const noGatewayEvidence = buildLabRuntime(lab, { ...live, attachments: { levels: [{ id: "l5", level: "L5", configured: true, ready: true, evidence: { total: 0 } }] } });
  assert.notEqual(noGatewayEvidence.runtimeSteps.find((step) => step.id === "behavior")?.status, "verified");

  const wrongAttachmentProof = buildLabRuntime(lab, { ...live, proof: { evidence: [{ ...live.proof!.evidence![0], attachment_source: "sidecar", attachment_label: "L4" }] } });
  assert.equal(wrongAttachmentProof.runtimeSteps.find((step) => step.id === "proof")?.status, "ready");
});
