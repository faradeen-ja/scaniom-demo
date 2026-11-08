import assert from "node:assert/strict";
import test from "node:test";
import { LAB_CATALOG, labById, labResolvedValues, resolveLabCommand } from "../lib/open-ii/labs";

test("every Lab manifest has unique steps with valid dependencies and topology refs", () => {
  const labIds = new Set<string>();
  for (const lab of LAB_CATALOG) {
    assert.equal(labIds.has(lab.id), false, `duplicate lab ${lab.id}`);
    labIds.add(lab.id);
    const stepIds = new Set(lab.steps.map((step) => step.id));
    assert.equal(stepIds.size, lab.steps.length, `duplicate step in ${lab.id}`);
    for (const step of lab.steps) for (const dependency of step.dependsOn || []) assert.ok(stepIds.has(dependency), `${lab.id}:${step.id} missing dependency ${dependency}`);
    const nodeIds = new Set(lab.topology.nodes.map((node) => node.id));
    for (const edge of lab.topology.edges) {
      assert.ok(nodeIds.has(edge.from), `${lab.id} missing topology source ${edge.from}`);
      assert.ok(nodeIds.has(edge.to), `${lab.id} missing topology target ${edge.to}`);
    }
    for (const node of lab.topology.nodes) if (node.stepId) assert.ok(stepIds.has(node.stepId), `${lab.id}:${node.id} points to missing step ${node.stepId}`);
  }
});

test("catalog uses Lab/system terminology and preserves five system blueprints", () => {
  assert.equal(LAB_CATALOG.filter((lab) => lab.kind === "lab").length, 14);
  assert.deepEqual(LAB_CATALOG.filter((lab) => lab.kind === "system").map((lab) => lab.title), [
    "AI SaaS Operations Center",
    "Robot Fleet",
    "Autonomous Lanes",
    "AI Inference Factory",
    "IFOC — Full Immune Fabric Operations Center",
  ]);
});

test("public release is metadata, not a blocking Lab tree step", () => {
  for (const lab of LAB_CATALOG) assert.equal(lab.steps.some((step) => step.id === "public-release"), false, lab.id);
});

test("no Lab CLI surface leaks repo shell scripts", () => {
  for (const lab of LAB_CATALOG) for (const step of lab.steps) {
    for (const command of step.commands || []) assert.doesNotMatch(command, /^\.\/|\/scripts\/|\/demos\//, `${lab.id}:${step.id}`);
    for (const option of step.guideOptions || []) for (const command of option.commands) assert.doesNotMatch(command, /^\.\/|\/scripts\/|\/demos\//, `${lab.id}:${step.id}:${option.id}`);
  }
});

test("L1 is a complete API-route runbook and never requires the SDK", () => {
  const step = labById("d02-l1-full-cycle")!.steps.find((item) => item.id === "attach-l1")!;
  assert.match(step.detail, /does not require the L2 SDK|does not require the SDK/);
  assert.ok(step.commands?.some((command) => command.includes("scaniom attach l1")));
  assert.ok(step.commands?.some((command) => command.includes("runtime identity bootstrap")));
  assert.deepEqual(step.guideOptions?.map((option) => option.id), ["api", "nodejs", "python", "runtime"]);
  assert.match(step.guideOptions?.find((option) => option.id === "api")?.code || "", /\/v1\/responses/);
  assert.doesNotMatch(JSON.stringify(step), /npm install @scaniom\/sdk/);
});

test("L2 offers TypeScript, Python, Docker and Kubernetes placements", () => {
  const step = labById("d03-l2-agent-sdk")!.steps.find((item) => item.id === "attach-l2")!;
  assert.deepEqual(step.guideOptions?.map((option) => option.id), ["typescript", "python", "container", "kubernetes"]);
  assert.ok(step.guideOptions?.find((option) => option.id === "typescript")?.install?.includes("npm install @scaniom/sdk@0.4.1"));
  assert.ok(step.guideOptions?.find((option) => option.id === "python")?.install?.includes("python3 -m pip install scaniom==0.4.1"));
  assert.ok(step.commands?.every((command) => command.startsWith("scaniom ")));
});

test("all seven attachment boundaries expose placement/integration choices", () => {
  const flagship = labById("flagship-full-fabric")!;
  for (const id of ["l1", "l2", "l3", "l4", "l5", "mcp", "l6"]) {
    const step = flagship.steps.find((item) => item.id === `attach-${id}`)!;
    assert.ok(step.guideOptions && step.guideOptions.length >= 2, id);
    assert.ok(step.guideOptions.every((option) => option.flow.length >= 4), id);
    assert.ok(step.guideOptions.every((option) => option.commands.some((command) => command.includes("scaniom "))), id);
  }
});

test("provider BYOK steps keep secrets at the Node boundary and cover multi-provider/custom routes", () => {
  const step = labById("d11-multi-provider")!.steps.find((item) => item.id === "provider")!;
  const commands = (step.commands || []).join("\n");
  for (const token of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "AWS_ACCESS_KEY_ID", "CUSTOM_MODEL_TOKEN", "scaniom secret configure"]) assert.match(commands, new RegExp(token));
  assert.match(step.why, /never asks for raw AI provider keys/i);
  const options = step.guideOptions || [];
  assert.deepEqual(options.map((option) => option.id), ["openai", "anthropic", "gemini", "bedrock", "custom"]);
});

test("Lab commands resolve safe Control-observable placeholders but keep deployment secrets explicit", () => {
  const lab = labById("d02-l1-full-cycle")!;
  const context = {
    profile: { name: "cloud", label: "Scaniom Cloud", type: "cloud" as const, controlUrl: "https://control.scaniom.com" },
    identity: { userId: "u", email: "dev@example.com", displayName: "Dev", organizationId: "o", organizationName: "Org", organizationSlug: "org", role: "owner" },
    whoami: { user: { id: "u", email: "dev@example.com", name: "Dev" }, organization: { id: "o", name: "Org", slug: "org" }, role: "owner", credential: { kind: "cli_session", name: "OII" } },
    deployment: { id: "cloud" },
    workspace: { version: 1 as const, profileName: "cloud", organizationId: "o", environmentId: "e", workloadId: "w" },
    environments: [{ id: "e", slug: "production", name: "Production" }],
    workloads: [{ id: "w", slug: "agent", name: "Agent", environment_id: "e", model: "gpt-real" }],
    nodes: [{ id: "n", slug: "prod-ai-01", name: "Prod AI", environment_id: "e", operational_state: "online" }],
    connections: [{ id: "c", name: "openai-agent", provider: "openai", model_hint: "gpt-real", node_id: "n", workload_id: "w", status: "active", secret_ref: "env:OPENAI_API_KEY" }],
    policies: [], attachments: null, cli: [],
  };
  const values = labResolvedValues(context, lab);
  assert.equal(values.node, "prod-ai-01");
  assert.equal(values.provider, "openai");
  assert.equal(values.model, "gpt-real");
  assert.equal(values.connection, "openai-agent");
  const command = resolveLabCommand("scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}", context, lab);
  assert.equal(command, "scaniom attach l1 --workload agent --node prod-ai-01 --preset openai --model gpt-real");
  assert.match(values.nodeUrl, /^<private Scaniom Node service URL/);
});
