import assert from "node:assert/strict";
import test from "node:test";
import { LAB_CATALOG, labById, labResolvedValues, resolveLabCommand } from "../lib/open-ii/labs";
import { isReleasedScaniomCliCommand } from "../lib/open-ii/scaniom-cli-contract";
import fs from "node:fs";

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
    for (const command of step.commands || []) assert.doesNotMatch(command, /^(?:\.\/|bash\s+scripts\/)|\/scripts\/|\/demos\/|\.\/bin\/scaniom|\.demo\/runtime\/bin\/scaniom/, `${lab.id}:${step.id}`);
    for (const option of step.guideOptions || []) for (const command of option.commands) assert.doesNotMatch(command, /^(?:\.\/|bash\s+scripts\/)|\/scripts\/|\/demos\/|\.\/bin\/scaniom|\.demo\/runtime\/bin\/scaniom/, `${lab.id}:${step.id}:${option.id}`);
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
  const serialized = JSON.stringify(step);
  assert.match(serialized, /runtimeBootstrapToken|runtime_bootstrap_token/);
  assert.match(serialized, /--attachments l1,l2,l4/);
  assert.doesNotMatch(serialized, /--attachments l2(?:["'\s]|$)/);
  assert.doesNotMatch(serialized, /"write"/);
  assert.ok(step.commands?.every((command) => command.startsWith("scaniom ")));
});

test("D03 is provider-independent and preserves the shared B1 L1/L2/L4 runtime identity", () => {
  const lab = labById("d03-l2-agent-sdk")!;
  assert.deepEqual(lab.providers, []);
  assert.ok(lab.steps.some((step) => step.id === "runtime-identity" && step.completion === "runtimeIdentity"));
  assert.equal(lab.steps.some((step) => step.id === "provider"), false);
  const identity = lab.steps.find((step) => step.id === "runtime-identity")!;
  assert.ok(identity.commands?.some((command) => command.includes("--attachments l1,l2,l4")));
  assert.deepEqual(lab.topology.nodes.some((node) => node.id === "runtime-identity"), true);
  assert.deepEqual(lab.topology.nodes.some((node) => node.id === "provider"), false);
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


test("every surfaced Scaniom command matches the released R18/0.4.1 CLI contract", () => {
  for (const lab of LAB_CATALOG) for (const step of lab.steps) {
    for (const command of step.commands || []) if (command.includes("scaniom ")) assert.equal(isReleasedScaniomCliCommand(command), true, `${lab.id}:${step.id}: ${command}`);
    for (const option of step.guideOptions || []) for (const command of option.commands) if (command.includes("scaniom ")) assert.equal(isReleasedScaniomCliCommand(command), true, `${lab.id}:${step.id}:${option.id}: ${command}`);
  }
});

test("customer-real demos use installed CLI authority and never an Open Immune CLI home or repo binary", () => {
  const common = fs.readFileSync("scripts/lib/common.sh", "utf8");
  assert.match(common, /type -P scaniom/);
  assert.match(common, /require_open_immune_authority/);
  assert.match(common, /require_open_ii_web_auth/);
  assert.match(common, /require_scaniom_cli_auth/);
  assert.doesNotMatch(common, /BIN="\$ROOT\/bin\/scaniom"|HOME="\$DEMO_HOME"|SCANIOM_STANDALONE_BIN/);
  const ensureScope = fs.readFileSync("scripts/ensure-scope.sh", "utf8");
  assert.match(ensureScope, /require_open_immune_authority/);
  for (const rel of ["d02-l1-full-cycle","d03-l2-agent-sdk","d04-l4-sidecar","d05-l3-model-runtime","d06-l5-environment-gateway","d07-mcp-gateway","d08-l6-provider-native","d09-fleet-failover","d11-multi-provider","d12-immunex"]) {
    const run = fs.readFileSync(`demos/${rel}/run.sh`, "utf8");
    assert.match(run, /ensure-scope\.sh/);
    assert.doesNotMatch(run, /\$BIN|\.\/bin\/scaniom|\.demo\/runtime\/bin\/scaniom|HOME=\$DEMO_HOME/);
  }
  for (const rel of ["d10-offline-continuity","flagship-full-fabric"]) {
    const run = fs.readFileSync(`demos/${rel}/run.sh`, "utf8");
    assert.match(run, /require_open_immune_authority/);
  }
});


test("public Open Immune docs only advertise released Scaniom CLI command families", () => {
  const files = ["README.md", "docs/start-here.md", "docs/authentication.md", "app/docs/page.tsx", "components/OisAuthConsole.tsx"];
  const top = /^(?:version|artifacts|profile|login|auth|whoami|logout|open|env|workload|address|node|provider|providers|connect|secret|runtime|configure|attach|fabric|fleet|live|top|explain|trajectory|proof|verify|policy|authority|immunex|demo|ask|scenario|status|setup|next|guide|doctor|docs|immune|deploy|cli)$/;
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/scaniom\s+([a-z][a-z0-9-]*)/g)) {
      const command = match[1];
      if (["sdk", "import"].includes(command)) continue;
      assert.match(command, top, `${file}: unsupported Scaniom command family ${command}`);
    }
  }
});


test("D04 is a Workbench-first L4 flow with shared B1 identity and no user-facing shell prerequisite", () => {
  const lab = labById("d04-l4-sidecar")!;
  const identity = lab.steps.find((step) => step.id === "runtime-identity")!;
  const l4 = lab.steps.find((step) => step.id === "attach-l4")!;
  assert.equal(identity.completion, "runtimeIdentity");
  assert.ok(identity.commands?.some((command) => command.includes("--attachments l1,l2,l4")));
  assert.ok(l4.commands?.some((command) => command.startsWith("scaniom attach l4")));
  assert.ok(l4.guideOptions?.every((option) => option.commands.every((command) => !command.includes("demos/") && !command.endsWith("run.sh"))));
  assert.match(fs.readFileSync("demos/d04-l4-sidecar/README.md", "utf8"), /Normal users do not run/);
});


test("D05 is a Workbench-first L3 flow with live runtime inventory and explicit least-privilege identity", () => {
  const lab = labById("d05-l3-model-runtime")!;
  const target = lab.steps.find((step) => step.id === "provider")!;
  const identity = lab.steps.find((step) => step.id === "runtime-identity")!;
  const l3 = lab.steps.find((step) => step.id === "attach-l3")!;
  assert.equal(target.completion, "runtimeTarget");
  assert.equal(identity.completion, "runtimeIdentity");
  assert.ok(identity.commands?.some((command) => command.includes("--attachments l3")));
  assert.ok(identity.commands?.every((command) => !command.includes("--attachments l1,l2,l4")));
  assert.deepEqual(l3.dependsOn, ["provider", "runtime-identity"]);
  assert.deepEqual(l3.guideOptions?.map((option) => option.id), ["vllm", "nim", "triton", "compatible"]);
  assert.ok(l3.commands?.some((command) => command.startsWith("scaniom attach l3")));
  assert.ok(l3.commands?.some((command) => command.startsWith("scaniom attach test l3")));
  const serialized = JSON.stringify(lab);
  for (const kind of ["vllm", "nvidia_nim", "triton", "openai_compatible"]) assert.match(serialized, new RegExp(kind));
  assert.match(fs.readFileSync("demos/d05-l3-model-runtime/README.md", "utf8"), /Normal users do not run/);
  assert.match(fs.readFileSync("demos/d05-l3-model-runtime/README.md", "utf8"), /runtime_hook/);
});
