import type { OpenIiContextResponse } from "@/lib/open-ii/types";

export type LabKind = "lab" | "system";
export type LabStepStatus = "verified" | "ready" | "locked";
export type LabCompletion =
  | "profile" | "identity" | "organization" | "environment" | "workload"
  | "address" | "node" | "policy" | "provider" | "attachment" | "behavior" | "proof" | "external";
export type LabStepGroup = "authority" | "fabric" | "runtime" | "evidence";

export type LabGuideOption = {
  id: string;
  label: string;
  icon: string;
  kicker: string;
  description: string;
  surface: string;
  flow: string[];
  install?: string[];
  commands: string[];
  code?: string;
  notes?: string[];
};

export type LabStep = {
  id: string;
  label: string;
  eyebrow: string;
  group: LabStepGroup;
  depth: 0 | 1 | 2;
  completion: LabCompletion;
  dependsOn?: string[];
  detail: string;
  why: string;
  surface?: string;
  artifacts?: string[];
  commands?: string[];
  code?: string;
  notes?: string[];
  guideOptions?: LabGuideOption[];
};

export type LabTopologyNode = {
  id: string;
  label: string;
  eyebrow: string;
  x: number;
  y: number;
  stepId?: string;
  tone?: "control" | "environment" | "workload" | "node" | "attachment" | "provider" | "policy" | "evidence" | "neutral";
};

export type LabTopologyEdge = { from: string; to: string; label?: string };

export type LabManifest = {
  id: string;
  code: string;
  kind: LabKind;
  title: string;
  subtitle: string;
  summary: string;
  goal: string;
  difficulty: "Foundation" | "Intermediate" | "Advanced";
  attachments: string[];
  platforms: string[];
  providers: string[];
  stacks: string[];
  suggestedEnvironment: string;
  suggestedWorkload: string;
  steps: LabStep[];
  topology: { nodes: LabTopologyNode[]; edges: LabTopologyEdge[] };
};

export type LabRuntimeStep = LabStep & { status: LabStepStatus };
export type LabRuntime = LabManifest & { runtimeSteps: LabRuntimeStep[] };

const authoritySteps = (): LabStep[] => [
  { id: "profile", label: "Control profile", eyebrow: "OIS AUTH · CONTROL", group: "authority", depth: 0, completion: "profile", detail: "Select and verify the Scaniom Control authority used by this lab.", why: "Every lab must know which Scaniom Control owns operator authorization and fabric state.", surface: "Open Immune Web + Terminal", commands: ["scaniom profile show", "scaniom profile test cloud"] },
  { id: "identity", label: "OIS authorization", eyebrow: "OII ↔ SCANIOM", group: "authority", depth: 1, completion: "identity", dependsOn: ["profile"], detail: "Authorize Open Immune and the CLI against the same Scaniom Control.", why: "Open Immune does not create a second account database. Scaniom remains the identity authority.", surface: "Browser approval + Terminal", commands: ["scaniom login", "scaniom auth status", "scaniom whoami"] },
  { id: "organization", label: "Organization", eyebrow: "AUTHORITY SCOPE", group: "authority", depth: 1, completion: "organization", dependsOn: ["identity"], detail: "Use the organization returned by Scaniom authorization.", why: "Environment, workload, policy and proof belong to a real organization.", surface: "Scaniom Control" },
];

const scopeSteps = (): LabStep[] => [
  { id: "environment", label: "Environment", eyebrow: "FABRIC SCOPE", group: "fabric", depth: 0, completion: "environment", dependsOn: ["organization"], detail: "Select an existing environment or create the real protected trust boundary for this lab.", why: "The environment is the policy and deployment scope.", surface: "Open Immune Web / Scaniom Control / CLI", commands: ["scaniom env list", "scaniom env create {{environment}} --type production"] },
  { id: "workload", label: "Workload", eyebrow: "PROTECTED SYSTEM", group: "fabric", depth: 1, completion: "workload", dependsOn: ["environment"], detail: "Select an existing workload or register the application, agent, model or service this lab protects.", why: "Scaniom attributes identity, behavior, trajectory and proof to a workload.", surface: "Open Immune Web / Scaniom Control / CLI", commands: ["scaniom workload list", "scaniom workload create {{workload}} --env {{environment}} --kind application", "scaniom workload use {{workload}}"] },
];

function externalStep(input: Omit<LabStep, "completion">): LabStep { return { ...input, completion: "external" }; }
function liveStep(completion: Exclude<LabCompletion, "profile" | "identity" | "organization" | "environment" | "workload" | "external">, input: Omit<LabStep, "completion">): LabStep {
  return { ...input, completion };
}

function topologyFor(options: { attachments?: string[]; multiNode?: boolean; multiProvider?: boolean; includePolicy?: boolean; includeEvidence?: boolean }): LabManifest["topology"] {
  const attachments = options.attachments || [];
  const nodes: LabTopologyNode[] = [
    { id: "control", label: "Scaniom Control", eyebrow: "AUTHORITY", x: 50, y: 8, stepId: "profile", tone: "control" },
    { id: "environment", label: "Environment", eyebrow: "SCOPE", x: 50, y: 23, stepId: "environment", tone: "environment" },
    { id: "workload", label: "Workload", eyebrow: "IDENTITY", x: 50, y: 38, stepId: "workload", tone: "workload" },
  ];
  const edges: LabTopologyEdge[] = [{ from: "control", to: "environment" }, { from: "environment", to: "workload" }];
  if (options.includePolicy !== false) {
    nodes.push({ id: "policy", label: "Policy", eyebrow: "GATE RULES", x: 18, y: 56, stepId: "policy", tone: "policy" });
    edges.push({ from: "workload", to: "policy" });
  }
  const nodeCount = options.multiNode ? 3 : 1;
  for (let i = 0; i < nodeCount; i += 1) {
    const id = `node-${i + 1}`;
    nodes.push({ id, label: nodeCount > 1 ? `Node ${i + 1}` : "Scaniom Node", eyebrow: "MACHINE AUTHORITY", x: nodeCount > 1 ? 36 + i * 14 : 50, y: 56, stepId: "node", tone: "node" });
    edges.push({ from: "workload", to: id });
  }
  if (attachments.length) {
    const width = Math.min(72, Math.max(24, attachments.length * 10));
    attachments.forEach((attachment, index) => {
      const x = attachments.length === 1 ? 50 : 50 - width / 2 + (width / Math.max(1, attachments.length - 1)) * index;
      const id = `attachment-${attachment.toLowerCase()}`;
      nodes.push({ id, label: attachment, eyebrow: "BOUNDARY", x, y: 73, stepId: `attach-${attachment.toLowerCase()}`, tone: "attachment" });
      edges.push({ from: "node-1", to: id });
    });
  }
  if (options.multiProvider) {
    ["OpenAI", "Anthropic", "Gemini", "Bedrock", "Custom"].forEach((provider, index) => {
      const id = `provider-${provider.toLowerCase()}`;
      nodes.push({ id, label: provider, eyebrow: "PROVIDER", x: 14 + index * 18, y: 88, stepId: "provider", tone: "provider" });
      edges.push({ from: attachments[0] ? `attachment-${attachments[0].toLowerCase()}` : "node-1", to: id });
    });
  } else if (attachments.length) {
    nodes.push({ id: "provider", label: "Provider / runtime target", eyebrow: "UPSTREAM", x: 50, y: 88, stepId: "provider", tone: "provider" });
    edges.push({ from: `attachment-${attachments[0].toLowerCase()}`, to: "provider" });
  }
  if (options.includeEvidence !== false) {
    nodes.push({ id: "evidence", label: "Gate · Trajectory · Proof", eyebrow: "EVIDENCE", x: 82, y: 56, stepId: "behavior", tone: "evidence" });
    edges.push({ from: "workload", to: "evidence" });
  }
  return { nodes, edges };
}

function providerCommands(providers: string[], multiProvider: boolean): string[] {
  const normalized = providers.map((value) => value.toLowerCase());
  const commands = ["scaniom provider catalog"];
  const add = (name: string, env: string) => {
    commands.push(`scaniom provider add ${name} --node {{node}} --workload {{workload}} --model {{model}}`);
    commands.push(`scaniom secret configure ${env} --node {{node}}`);
  };
  if (multiProvider || normalized.some((value) => value.includes("openai"))) add("openai", "OPENAI_API_KEY");
  if (multiProvider || normalized.some((value) => value.includes("anthropic"))) add("anthropic", "ANTHROPIC_API_KEY");
  if (multiProvider || normalized.some((value) => value.includes("gemini"))) add("gemini", "GEMINI_API_KEY");
  if (multiProvider || normalized.some((value) => value.includes("bedrock"))) {
    commands.push("scaniom provider add bedrock --node {{node}} --workload {{workload}} --model {{model}} --region {{region}}");
    commands.push("scaniom secret configure AWS_ACCESS_KEY_ID --node {{node}}");
    commands.push("scaniom secret configure AWS_SECRET_ACCESS_KEY --node {{node}}");
  }
  if (multiProvider || normalized.some((value) => value.includes("custom") || value.includes("local") || value.includes("private"))) {
    commands.push("scaniom provider add custom --node {{node}} --workload {{workload}} --endpoint <provider-endpoint> --model {{model}} --secret-env CUSTOM_MODEL_TOKEN");
    commands.push("scaniom secret configure CUSTOM_MODEL_TOKEN --node {{node}}");
  }
  if (commands.length === 1) commands.push("scaniom provider list");
  commands.push("scaniom node restart", "scaniom providers", "scaniom provider list");
  return commands;
}

function providerGuideOptions(_providers: string[], _multiProvider: boolean): LabGuideOption[] {
  const include = (_needle: string) => true;
  const options: LabGuideOption[] = [];
  if (include("openai")) options.push({
    id: "openai", label: "OpenAI", icon: "openai", kicker: "NODE-LOCAL BYOK",
    description: "Bind an OpenAI Responses route to the selected workload. The OpenAI key is entered by the Scaniom CLI on the Node host; it is not typed into Open Immune or Scaniom Control.",
    surface: "Terminal on the Scaniom Node host / enterprise secret materialization",
    flow: ["Application", "Scaniom Node", "Gate", "OpenAI"],
    commands: ["scaniom provider add openai --node {{node}} --workload {{workload}} --model {{model}}", "scaniom secret configure OPENAI_API_KEY --node {{node}}", "scaniom node restart", "scaniom providers", "scaniom provider list"],
    notes: ["The CLI prompts for the secret on the Node host. Control receives only the env reference and route metadata."]
  });
  if (include("anthropic")) options.push({
    id: "anthropic", label: "Anthropic", icon: "anthropic", kicker: "NODE-LOCAL BYOK",
    description: "Bind an Anthropic Messages route while keeping ANTHROPIC_API_KEY on the Node or enterprise secret store.",
    surface: "Terminal on the Scaniom Node host / enterprise secret materialization",
    flow: ["Application", "Scaniom Node", "Gate", "Anthropic"],
    commands: ["scaniom provider add anthropic --node {{node}} --workload {{workload}} --model {{model}}", "scaniom secret configure ANTHROPIC_API_KEY --node {{node}}", "scaniom node restart", "scaniom providers"],
  });
  if (include("gemini")) options.push({
    id: "gemini", label: "Gemini", icon: "gemini", kicker: "NODE-LOCAL BYOK",
    description: "Bind a Gemini generateContent route. GEMINI_API_KEY remains Node-local and is applied by the Scaniom provider adapter.",
    surface: "Terminal on the Scaniom Node host / enterprise secret materialization",
    flow: ["Application", "Scaniom Node", "Gate", "Gemini"],
    commands: ["scaniom provider add gemini --node {{node}} --workload {{workload}} --model {{model}}", "scaniom secret configure GEMINI_API_KEY --node {{node}}", "scaniom node restart", "scaniom providers"],
  });
  if (include("bedrock")) options.push({
    id: "bedrock", label: "Bedrock", icon: "aws", kicker: "AWS SIGV4",
    description: "Bind Bedrock Converse using the Node-local AWS credential chain and an explicit region.",
    surface: "Scaniom Node host / AWS workload identity / enterprise secret integration",
    flow: ["Application", "Scaniom Node", "Gate", "AWS Bedrock"],
    commands: ["scaniom provider add bedrock --node {{node}} --workload {{workload}} --model {{model}} --region {{region}}", "scaniom secret configure AWS_ACCESS_KEY_ID --node {{node}}", "scaniom secret configure AWS_SECRET_ACCESS_KEY --node {{node}}", "scaniom node restart", "scaniom providers"],
    notes: ["On AWS, prefer the platform credential chain/role instead of copied long-lived keys when available."]
  });
  if (include("custom")) options.push({
    id: "custom", label: "Custom / private", icon: "server", kicker: "EXPLICIT HTTP ROUTE",
    description: "Wire another AI provider or private HTTP JSON model endpoint with an explicit endpoint and secret reference. For vLLM/NIM/Triton inference runtimes, prefer L3 instead.",
    surface: "Node host + private provider/model endpoint",
    flow: ["Application", "Scaniom Node", "Gate", "Custom/private endpoint"],
    commands: ["scaniom provider add custom --node {{node}} --workload {{workload}} --endpoint <provider-endpoint> --model {{model}} --secret-env CUSTOM_MODEL_TOKEN", "scaniom secret configure CUSTOM_MODEL_TOKEN --node {{node}}", "scaniom node restart", "scaniom provider list"],
    notes: ["If the private/local model is an inference runtime such as vLLM, NVIDIA NIM or Triton, use the L3 Model Runtime boundary instead of forcing it through an L1 provider route."]
  });
  return options;
}

function attachmentStep(attachment: string): LabStep {
  const lower = attachment.toLowerCase();
  const base = { id: `attach-${lower}`, label: `${attachment} · ${attachmentName(attachment)}`, eyebrow: "EXECUTION BOUNDARY", group: "runtime" as const, depth: 1 as const, dependsOn: ["workload"], why: "This boundary is part of the selected Lab manifest. Pick the placement that matches the real system you are protecting; the Scaniom Node/Gate remains the authority." };
  if (lower === "l1") return liveStep("attachment", { ...base,
    detail: "Route normal provider/model API traffic through Scaniom before it reaches the provider. L1 is the API boundary; it does not require the L2 SDK.",
    surface: "Application/API client + Scaniom Node",
    artifacts: ["Scaniom Node URL", "L1 provider route", "scn_ri_v1 runtime identity", "Node-local provider credential"],
    commands: [
      "scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}",
      "scaniom runtime identity bootstrap --workload {{workload}} --attachments l1",
      "scaniom runtime identity status --workload {{workload}}",
      "scaniom attach test l1 --workload {{workload}} --model {{model}} -- \"Say hello in one sentence\"",
      "scaniom attach status --workload {{workload}}",
    ],
    notes: ["Provider API keys stay on the Node or enterprise secret store. The application gets Scaniom runtime authority, not the provider key."],
    guideOptions: [
      { id: "api", label: "Direct API", icon: "api", kicker: "ANY HTTP CLIENT", description: "Use the Scaniom Responses-compatible endpoint from any application or service.", surface: "Application code / IDE", flow: ["App", "Scaniom /v1/responses", "Node + Gate", "Provider"], commands: ["scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l1", "scaniom attach test l1 --workload {{workload}} --model {{model}} -- \"Say hello\""], code: `export SCANIOM_NODE_URL={{nodeUrl}}\nexport SCANIOM_RUNTIME_TOKEN=<deployment-secret: scn_ri_v1...>\n\ncurl \"$SCANIOM_NODE_URL/v1/responses\" \\\n  -H \"Authorization: Bearer $SCANIOM_RUNTIME_TOKEN\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"model\":\"{{model}}\",\"input\":\"Say hello\"}'` },
      { id: "nodejs", label: "Node.js / TS", icon: "node", kicker: "APPLICATION CLIENT", description: "Point the application model base URL at the Scaniom Node and use the runtime token as bearer authority.", surface: "Node.js / TypeScript app", flow: ["Node app", "Scaniom Node", "Gate", "Provider"], commands: ["scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l1"], code: `const response = await fetch(process.env.SCANIOM_NODE_URL + \"/v1/responses\", {\n  method: \"POST\",\n  headers: {\n    \"content-type\": \"application/json\",\n    authorization: \`Bearer \${process.env.SCANIOM_RUNTIME_TOKEN}\`,\n  },\n  body: JSON.stringify({ model: process.env.AI_MODEL, input: \"Say hello\" }),\n});` },
      { id: "python", label: "Python API", icon: "python", kicker: "APPLICATION CLIENT", description: "Use normal HTTP from Python; the Scaniom Python package is not required for L1.", surface: "Python service / notebook / backend", flow: ["Python", "Scaniom Node", "Gate", "Provider"], commands: ["scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l1"], code: `import os, requests\n\nr = requests.post(\n    os.environ[\"SCANIOM_NODE_URL\"] + \"/v1/responses\",\n    headers={\"Authorization\": f\"Bearer {os.environ['SCANIOM_RUNTIME_TOKEN']}\"},\n    json={\"model\": os.environ[\"AI_MODEL\"], \"input\": \"Say hello\"},\n    timeout=120,\n)\nr.raise_for_status()` },
      { id: "runtime", label: "Docker / K8s", icon: "kubernetes", kicker: "PRIVATE RUNTIME", description: "Expose the Node by private service/DNS and inject Scaniom runtime identity from the deployment secret or native identity path.", surface: "Docker network / Kubernetes Service / private VM", flow: ["Workload", "Private Node service", "Gate", "Provider"], commands: ["scaniom attach l1 --workload {{workload}} --node {{node}} --preset {{provider}} --model {{model}}", "scaniom runtime identity status --workload {{workload}}", "scaniom node health"], code: `# workload runtime configuration\nSCANIOM_NODE_URL={{nodeUrl}}\nSCANIOM_RUNTIME_TOKEN=<deployment-secret from bootstrap/native identity>`, notes: ["Do not put provider keys in the application container. Provider credentials belong to the Node or its enterprise secret integration."] },
    ]
  });
  if (lower === "l2") return liveStep("attachment", { ...base,
    detail: "Instrument application/agent semantics with the released TypeScript or Python Scaniom SDK. L2 adds semantic action context while the Node/Gate stays authoritative.",
    surface: "Application repository · VS Code/IDE",
    artifacts: ["@scaniom/sdk@0.4.1 or scaniom==0.4.1", "workload identity", "Node URL"],
    commands: ["scaniom attach l2 --workload {{workload}} --lang typescript", "scaniom attach l2 --workload {{workload}} --lang python", "scaniom runtime identity status --workload {{workload}}", "scaniom attach test l2 --workload {{workload}} --lang typescript --model {{model}} -- \"Say hello\"", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "typescript", label: "TypeScript", icon: "typescript", kicker: "@SCANIOM/SDK", description: "Install the released TypeScript SDK into the real application or agent repository.", surface: "VS Code / Node.js / TypeScript repo", flow: ["Agent/app", "@scaniom/sdk", "Scaniom Node", "Gate"], install: ["npm install @scaniom/sdk@0.4.1"], commands: ["scaniom attach l2 --workload {{workload}} --lang typescript", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l2", "scaniom attach test l2 --workload {{workload}} --lang typescript --model {{model}} -- \"Say hello\""], code: `import { Scaniom } from \"@scaniom/sdk\";\n\nconst scaniom = new Scaniom({\n  nodeUrl: process.env.SCANIOM_NODE_URL!,\n  workloadId: process.env.SCANIOM_WORKLOAD_ID!,\n  runtimeToken: process.env.SCANIOM_RUNTIME_TOKEN,\n});\n\nconst { decision, result } = await scaniom.guardAction({\n  action: \"tool_call\",\n  text: JSON.stringify({ customerId: \"cust_123\" }),\n  target: \"crm://customers/cust_123\",\n  tools: [\"crm.updateCustomer\"],\n  capabilities: [\"tool_use\", \"write\"],\n  production: true,\n  execute: () => crm.updateCustomer(\"cust_123\", { status: \"active\" }),\n});\n\nconsole.log(decision.machineAction, result);` },
      { id: "python", label: "Python", icon: "python", kicker: "SCANIOM PYPI", description: "Install the released Python SDK in the Python application/agent environment.", surface: "Python app / agent / worker", flow: ["Python agent", "scaniom SDK", "Scaniom Node", "Gate"], install: ["python3 -m pip install scaniom==0.4.1"], commands: ["scaniom attach l2 --workload {{workload}} --lang python", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l2", "scaniom attach test l2 --workload {{workload}} --lang python --model {{model}} -- \"Say hello\""], code: `from scaniom import Scaniom\nimport os\n\nscaniom = Scaniom(\n    node_url=os.environ[\"SCANIOM_NODE_URL\"],\n    workload_id=os.environ[\"SCANIOM_WORKLOAD_ID\"],\n    runtime_token=os.environ.get(\"SCANIOM_RUNTIME_TOKEN\"),\n)\n\nresult = scaniom.guard_tool(\n    tool=\"crm.update_customer\",\n    input={\"customer_id\": \"cust_123\"},\n    target=\"crm://customers/cust_123\",\n    capabilities=[\"write\"],\n    production=True,\n    execute=lambda: crm.update_customer(\"cust_123\", status=\"active\"),\n)\n\nprint(result.decision[\"machineAction\"], result.result)` },
      { id: "container", label: "Docker", icon: "docker", kicker: "CONTAINERIZED APP", description: "Keep the SDK inside the application image; inject only Scaniom runtime identity and the private Node URL at runtime.", surface: "Docker Compose / container runtime", flow: ["App container", "SDK", "Node service", "Gate"], commands: ["scaniom attach l2 --workload {{workload}} --lang typescript", "scaniom runtime identity status --workload {{workload}}"], code: `environment:\n  SCANIOM_NODE_URL: http://scaniom-node:8787\n  SCANIOM_WORKLOAD_ID: {{workload}}\n  SCANIOM_RUNTIME_TOKEN: \${SCANIOM_RUNTIME_TOKEN}` },
      { id: "kubernetes", label: "Kubernetes", icon: "kubernetes", kicker: "NATIVE IDENTITY READY", description: "Use SDK instrumentation in the workload Pod and exchange native ServiceAccount/SPIFFE/cloud identity into Scaniom runtime identity when configured.", surface: "Kubernetes workload Pod", flow: ["Pod", "SDK", "Node Service", "Gate"], commands: ["scaniom attach l2 --workload {{workload}} --lang typescript", "scaniom runtime identity native status --workload {{workload}}", "scaniom runtime identity status --workload {{workload}}"], code: `env:\n  - name: SCANIOM_NODE_URL\n    value: http://scaniom-node.scaniom.svc:8787\n  - name: SCANIOM_WORKLOAD_ID\n    value: {{workload}}\n# Native identity can replace copied steady-state runtime tokens.` },
    ]
  });
  if (lower === "l3") return liveStep("attachment", { ...base,
    detail: "Place the Scaniom runtime adapter beside vLLM, NVIDIA NIM, Triton or an OpenAI-compatible inference runtime so Gate executes before inference.",
    surface: "GPU/model host · VM/Docker/Kubernetes",
    artifacts: ["model runtime endpoint", "L3-scoped runtime identity", "Scaniom runtime adapter"],
    commands: ["scaniom attach l3 --workload {{workload}} --kind <vllm|nvidia_nim|triton|openai_compatible> --endpoint <runtime-url> --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l3", "scaniom attach test l3 --workload {{workload}} --model {{model}} -- \"Say hello\"", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "vllm", label: "vLLM", icon: "gpu", kicker: "OPENAI-COMPATIBLE RUNTIME", description: "Put the L3 adapter in front of a vLLM HTTP runtime.", surface: "GPU VM / Docker / K8s", flow: ["App", "L3 adapter", "Node/Gate", "vLLM"], commands: ["scaniom attach l3 --workload {{workload}} --kind vllm --endpoint http://<vllm>:8000 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l3", "scaniom attach test l3 --workload {{workload}} --model {{model}} -- \"Say hello\""], code: `# inference target\nVLLM_ENDPOINT=http://vllm:8000\n# application calls the Scaniom L3 adapter, not vLLM directly.` },
      { id: "nim", label: "NVIDIA NIM", icon: "nvidia", kicker: "NVIDIA RUNTIME", description: "Gate NIM requests before model execution with the same workload identity and policy.", surface: "GPU host / NVIDIA NIM deployment", flow: ["App", "L3 adapter", "Node/Gate", "NIM"], commands: ["scaniom attach l3 --workload {{workload}} --kind nvidia_nim --endpoint http://<nim>:8000 --run", "scaniom runtime identity status --workload {{workload}}"] },
      { id: "triton", label: "Triton", icon: "nvidia", kicker: "HTTP V2 JSON", description: "Protect NVIDIA Triton-compatible inference at the model-runtime boundary.", surface: "Triton server / GPU cluster", flow: ["App", "L3 adapter", "Node/Gate", "Triton"], commands: ["scaniom attach l3 --workload {{workload}} --kind triton --endpoint http://<triton>:8000 --run", "scaniom runtime identity status --workload {{workload}}"] },
      { id: "compatible", label: "Compatible", icon: "api", kicker: "CUSTOM RUNTIME", description: "Use an OpenAI-compatible/custom runtime endpoint where Scaniom should gate before inference.", surface: "VM / private model service", flow: ["App", "L3 adapter", "Node/Gate", "Runtime"], commands: ["scaniom attach l3 --workload {{workload}} --kind openai_compatible --endpoint http://<runtime>:8000 --run", "scaniom runtime identity status --workload {{workload}}"] },
    ]
  });
  if (lower === "l4") return liveStep("attachment", { ...base,
    detail: "Run the Scaniom sidecar beside an existing workload and route that workload through the local boundary without rewriting every provider call.",
    surface: "Workload host · Docker/Kubernetes/VM",
    artifacts: ["sidecar :8790", "L4 runtime identity", "existing application"],
    commands: ["scaniom attach l4 --workload {{workload}} --port 8790", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l4", "scaniom attach test l4 --workload {{workload}} --model {{model}} -- \"Say hello\"", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "local", label: "Local / VM", icon: "server", kicker: "WORKLOAD-LOCAL", description: "Run the sidecar beside the service and point application model traffic to localhost/private sidecar address.", surface: "VM or host process", flow: ["Workload", "L4 sidecar", "Node", "Provider"], commands: ["scaniom attach l4 --workload {{workload}} --port 8790", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l4", "scaniom attach test l4 --workload {{workload}} --model {{model}} -- \"Say hello\""] },
      { id: "docker", label: "Docker", icon: "docker", kicker: "SAME APP NETWORK", description: "Run the Scaniom sidecar on the workload network and route the application to the sidecar service.", surface: "Docker Compose / container network", flow: ["App container", "L4 sidecar", "Node", "Provider"], commands: ["scaniom attach l4 --workload {{workload}} --port 8790", "scaniom runtime identity status --workload {{workload}}"], code: `# application\nAI_BASE_URL=http://scaniom-sidecar:8790/v1\n\n# sidecar forwards to the private Scaniom Node service.` },
      { id: "kubernetes", label: "Kubernetes", icon: "kubernetes", kicker: "POD SIDECAR", description: "Place the sidecar in the same Pod so workload traffic crosses Scaniom before leaving the Pod.", surface: "Kubernetes Pod", flow: ["App container", "Sidecar container", "Node Service", "Provider"], commands: ["scaniom attach l4 --workload {{workload}} --port 8790", "scaniom runtime identity native status --workload {{workload}}"], code: `# application container\nenv:\n  - name: AI_BASE_URL\n    value: http://127.0.0.1:8790/v1\n# sidecar container shares the Pod network namespace.` },
    ]
  });
  if (lower === "l5") return liveStep("attachment", { ...base,
    detail: "Deploy an explicit environment gateway for many workloads while preserving the identity of the originating workload on every request.",
    surface: "Cluster / VPC / private environment ingress",
    artifacts: ["Environment Gateway :8791", "explicit workload identity", "L5-scoped runtime identity"],
    commands: ["scaniom attach l5 --environment {{environment}} --port 8791 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l5", "scaniom attach test l5 --workload {{workload}} --model {{model}} -- \"Say hello\"", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "cluster", label: "Kubernetes", icon: "kubernetes", kicker: "ENVIRONMENT INGRESS", description: "Expose the L5 gateway as explicit cluster ingress; every request must retain workload identity.", surface: "Kubernetes namespace / cluster", flow: ["Workloads", "L5 gateway", "Node pool", "Targets"], commands: ["scaniom attach l5 --environment {{environment}} --port 8791 --run", "scaniom runtime identity status --workload {{workload}}"] },
      { id: "vpc", label: "VPC / VM", icon: "cloud", kicker: "PRIVATE NETWORK", description: "Run the gateway at a private VPC/service boundary where multiple workloads share one ingress surface.", surface: "Private VM / VPC subnet", flow: ["Services", "L5 gateway", "Node fabric", "Targets"], commands: ["scaniom attach l5 --environment {{environment}} --port 8791 --run", "scaniom node health"] },
      { id: "private", label: "Private enterprise", icon: "shield", kicker: "ENTERPRISE INGRESS", description: "Use private Control, enterprise CA/secret stores and a private Node fabric while keeping workload attribution fail-closed.", surface: "Private enterprise network", flow: ["Private workloads", "L5 gateway", "Private Node fabric", "Targets"], commands: ["scaniom profile show", "scaniom attach l5 --environment {{environment}} --port 8791 --run", "scaniom attach status --workload {{workload}}"] },
    ]
  });
  if (lower === "mcp") return liveStep("attachment", { ...base,
    detail: "Place the Streamable HTTP MCP Gateway between a client/agent and the real MCP server so Gate executes before tools/call dispatch.",
    surface: "MCP client/server deployment",
    artifacts: ["MCP server ID", "MCP endpoint", "MCP-scoped runtime identity"],
    commands: ["scaniom attach mcp --workload {{workload}} --server-id <server-id> --endpoint <mcp-server-url> --port 8793 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments mcp", "SCANIOM_RUNTIME_TOKEN=<mcp-token> scaniom attach test mcp --workload {{workload}} --gateway-url http://127.0.0.1:8793 --tool <tool> --args '{}'", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "local", label: "Local MCP", icon: "mcp", kicker: "CLIENT → SERVER", description: "Put the gateway between a local MCP client/agent and Streamable HTTP server.", surface: "Developer machine / VM", flow: ["MCP client", "Scaniom MCP gateway", "Node/Gate", "MCP server/tool"], commands: ["scaniom attach mcp --workload {{workload}} --server-id <server-id> --endpoint <mcp-server-url> --port 8793 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments mcp", "SCANIOM_RUNTIME_TOKEN=<mcp-token> scaniom attach test mcp --workload {{workload}} --gateway-url http://127.0.0.1:8793 --tool <tool> --args '{}'"] },
      { id: "docker", label: "Docker", icon: "docker", kicker: "MCP SERVICE NETWORK", description: "Run the gateway as a service between containerized MCP clients and servers.", surface: "Docker / service network", flow: ["Agent", "MCP gateway", "Node", "Tool server"], commands: ["scaniom attach mcp --workload {{workload}} --server-id <server-id> --endpoint http://mcp-server:3000/mcp --port 8793 --run", "scaniom attach status --workload {{workload}}"] },
      { id: "kubernetes", label: "Kubernetes", icon: "kubernetes", kicker: "TOOL INGRESS", description: "Expose the gateway as the MCP endpoint and keep the upstream server private behind it.", surface: "Kubernetes service path", flow: ["MCP client", "Gateway Service", "Node/Gate", "Private MCP server"], commands: ["scaniom attach mcp --workload {{workload}} --server-id <server-id> --endpoint http://mcp-server/mcp --port 8793 --run", "scaniom runtime identity native status --workload {{workload}}"] },
    ]
  });
  return liveStep("attachment", { ...base,
    detail: "Use the L6 provider-native framework so an adapter asks Scaniom before a privileged provider/runtime consequence and observes the outcome afterward.",
    surface: "Provider/runtime adapter integration",
    artifacts: ["provider-native adapter", "L6-scoped runtime identity", "metadata-minimized guard context"],
    commands: ["scaniom attach l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --hook <family> --port 8794 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l6", "SCANIOM_RUNTIME_TOKEN=<l6-token> scaniom attach test l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --event <event>", "scaniom attach status --workload {{workload}}"],
    guideOptions: [
      { id: "custom", label: "Custom adapter", icon: "code", kicker: "GUARD / OBSERVE", description: "Call the L6 bridge before the provider/runtime-native consequence and report outcome afterward.", surface: "Provider/runtime integration code", flow: ["Adapter", "L6 guard", "Node/Gate", "Consequence", "Observe"], commands: ["scaniom attach l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --hook custom --port 8794 --run", "scaniom runtime identity bootstrap --workload {{workload}} --attachments l6", "SCANIOM_RUNTIME_TOKEN=<l6-token> scaniom attach test l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --event <event>"] },
      { id: "provider", label: "Provider bridge", icon: "api", kicker: "PROVIDER-NATIVE", description: "Use a provider-specific adapter that honors Scaniom's metadata-only guard-before/observe-after contract.", surface: "Provider integration / internal framework", flow: ["Provider hook", "L6 bridge", "Gate", "Provider consequence"], commands: ["scaniom attach l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --hook <family> --port 8794 --run", "scaniom runtime identity status --workload {{workload}}"] },
      { id: "physical", label: "Physical / device", icon: "robot", kicker: "CONSEQUENCE EDGE", description: "Use L6 when provider/runtime-native output can trigger a physical or privileged downstream consequence.", surface: "Robot/device/runtime adapter", flow: ["Runtime", "L6 guard", "Gate", "Physical consequence", "Observe"], commands: ["scaniom attach l6 --workload {{workload}} --provider {{provider}} --adapter <adapter> --hook custom --port 8794 --run", "scaniom trajectory list --limit 100", "scaniom proof correlated list --limit 50"] },
    ]
  });
}
function attachmentName(id: string): string {
  return ({ L1: "API Route", L2: "SDK", L3: "Model Runtime", L4: "Sidecar", L5: "Environment Gateway", MCP: "MCP Gateway", L6: "Provider Native" } as Record<string, string>)[id] || id;
}

function runtimeSteps(attachments: string[], providers: string[], options: { multiNode?: boolean; multiProvider?: boolean; continuity?: boolean; immunex?: boolean } = {}): LabStep[] {
  const steps: LabStep[] = [
    liveStep("address", { id: "address", label: "Scaniom Address", eyebrow: "WORKLOAD IDENTITY", group: "fabric", depth: 1, dependsOn: ["workload"], detail: "Issue the signed Scaniom Address that binds behavior and runtime authority to this workload.", why: "Evidence must remain attributable to a real workload before any runtime boundary is attached.", surface: "Scaniom Control / CLI", commands: ["scaniom address issue --workload {{workload}} --ttl 24", "scaniom runtime identity status --workload {{workload}}"] }),
    liveStep("node", { id: "node", label: options.multiNode ? "Node pool" : "Scaniom Node", eyebrow: "MACHINE AUTHORITY", group: "fabric", depth: 1, dependsOn: ["address"], detail: options.multiNode ? "Enroll multiple Nodes, start them in the real runtime environment, then bind the workload to a pool." : "Enroll and run the Scaniom Node beside the protected runtime.", why: "The Node owns machine-speed identity, trajectory, risk, policy and Gate decisions.", surface: options.multiNode ? "VM/Docker/Kubernetes/managed K8s" : "Local/VM/Docker/Kubernetes/private runtime", commands: options.multiNode ? ["scaniom fabric add nodes --env {{environment}} --prefix open-immune-node --count 3", "scaniom node list", "scaniom node health", "scaniom fabric"] : ["scaniom node enroll open-immune-node --env {{environment}} --background", "scaniom node health", "scaniom node doctor"] }),
    liveStep("policy", { id: "policy", label: "Environment policy", eyebrow: "GATE POLICY", group: "fabric", depth: 1, dependsOn: ["node"], detail: "Publish the policy the Node will apply before consequential execution.", why: "Attachment code never owns policy; the environment policy remains authoritative.", surface: "Scaniom Control / CLI", commands: ["scaniom policy set --env {{environment}} --mode enforce", "scaniom policy list"] }),
  ];

  const needsProvider = attachments.some((value) => ["L1", "L4"].includes(value)) || options.multiProvider || options.immunex;
  if (needsProvider) {
    steps.push(liveStep("provider", { id: "provider", label: options.multiProvider ? "Provider routes + BYOK" : "Provider route + BYOK", eyebrow: "NODE-LOCAL CREDENTIALS", group: "runtime", depth: 0, dependsOn: ["policy"], detail: options.multiProvider ? "Configure multiple real provider routes and Node-local credentials while preserving one Scaniom workload identity, policy, Gate and trajectory." : "Configure the provider route and provider credential on the Scaniom Node or enterprise secret store.", why: "Open Immune never asks for raw AI provider keys. Control stores route metadata and secret references; the Node or enterprise secret system owns the value.", surface: "Node host / Kubernetes Secret / enterprise secret store", artifacts: ["OpenAI / Anthropic / Gemini keys", "AWS credential chain for Bedrock", "CUSTOM_MODEL_TOKEN for custom routes"], commands: providerCommands(providers, Boolean(options.multiProvider)), notes: ["Enter provider keys through `scaniom secret configure ...` on the Node host or materialize them from the enterprise secret system.", "Do not paste raw provider keys into Open Immune or Scaniom Control.", "Multi-provider routes share one workload identity and can contribute to one correlated trajectory."], guideOptions: providerGuideOptions(providers, Boolean(options.multiProvider)) }));
  } else {
    steps.push(externalStep({ id: "provider", label: "Runtime target", eyebrow: "UPSTREAM TARGET", group: "runtime", depth: 0, dependsOn: ["workload"], detail: "Provide the real model runtime, MCP server or provider-native target required by this lab.", why: "The lab exercises a real execution target; Open Immune never fabricates upstream success.", surface: "Target runtime environment", commands: ["scaniom attach architecture"] }));
  }

  for (const attachment of attachments) {
    const step = attachmentStep(attachment);
    step.dependsOn = needsProvider && ["L1", "L4"].includes(attachment) ? ["provider"] : ["policy"];
    steps.push(step);
  }

  if (options.continuity) steps.push(externalStep({ id: "continuity", label: "Offline continuity", eyebrow: "FAILURE + RECOVERY", group: "runtime", depth: 1, dependsOn: ["workload"], detail: "Take Control reachability away while the Node continues last-known-good protected traffic, then recover and replay.", why: "A real immune fabric must survive Control/network failure without pretending that disconnected authority is fresh.", surface: "Node host + network boundary", commands: ["scaniom runtime continuity", "scaniom node health", "scaniom attach test l1 --workload {{workload}} --model {{model}} -- \"Say hello during continuity\"", "scaniom live --env {{environment}} --limit 20"] }));
  if (options.immunex) steps.push(externalStep({ id: "immunex", label: "Immunex campaign", eyebrow: "BEHAVIOR CAMPAIGN", group: "runtime", depth: 1, dependsOn: ["workload"], detail: "Run repeatable normal/adversarial scenarios against the real workload and provider route.", why: "Behavioral immunity should be exercised with reproducible real traffic while destructive consequences stay sandboxed.", surface: "Terminal + real Scaniom Runtime", commands: ["scaniom immunex library", "scaniom immunex preflight --workload {{workload}} --model {{model}}", "scaniom immunex templates", "scaniom immunex blueprint list"] }));

  steps.push(liveStep("behavior", { id: "behavior", label: "Gate + trajectory", eyebrow: "LIVE INTELLIGENCE", group: "evidence", depth: 0, dependsOn: attachments.map((value) => `attach-${value.toLowerCase()}`), detail: "Generate real actions through the selected boundary and inspect Gate decisions, behavior and trajectory.", why: "Open Immune shows what Scaniom actually observed, not synthetic completion state.", surface: "Open Immune Intelligence + Scaniom CLI", commands: ["scaniom live --env {{environment}} --limit 20", "scaniom trajectory list --limit 100"] }));
  steps.push(liveStep("proof", { id: "proof", label: "Signed proof", eyebrow: "VERIFIABLE EVIDENCE", group: "evidence", depth: 1, dependsOn: ["behavior"], detail: "Inspect and verify the signed/correlated proof produced by the real run.", why: "The lab ends with independently verifiable evidence, not a UI-only success message.", surface: "Scaniom Control / CLI", commands: ["scaniom proof --window 24h --limit 10", "scaniom proof correlated list --limit 50"] }));
  return steps;
}

function manifest(input: Omit<LabManifest, "steps" | "topology"> & { steps?: LabStep[]; topology?: LabManifest["topology"]; runtime?: { attachments?: string[]; multiNode?: boolean; multiProvider?: boolean; continuity?: boolean; immunex?: boolean } }): LabManifest {
  const { runtime, steps: providedSteps, topology: providedTopology, ...base } = input;
  const attachments = base.attachments;
  const steps = providedSteps || [...authoritySteps(), ...scopeSteps(), ...runtimeSteps(runtime?.attachments || attachments, base.providers, runtime)];
  const topology = providedTopology || topologyFor({ attachments, multiNode: runtime?.multiNode, multiProvider: runtime?.multiProvider });
  return { ...base, steps, topology };
}

const labs: LabManifest[] = [
  manifest({ id: "d00-account-auth", code: "D00", kind: "lab", title: "OIS Auth", subtitle: "Authorize Open Immune against a real Scaniom Control and prove Web/CLI identity parity.", summary: "Start with public Scaniom, select Control authority, approve the device flow and verify the same operator/organization in browser and CLI.", goal: "Finish with one real Scaniom identity and organization available to Open Immune and the CLI.", difficulty: "Foundation", attachments: [], platforms: ["Browser", "CLI"], providers: [], stacks: ["Scaniom Control", "Scaniom CLI"], suggestedEnvironment: "open-immune-production", suggestedWorkload: "open-immune-agent", steps: [...authoritySteps()], topology: { nodes: [
    { id: "control", label: "Scaniom Control", eyebrow: "AUTHORITY", x: 30, y: 28, stepId: "profile", tone: "control" },
    { id: "identity", label: "OIS authorization", eyebrow: "DEVICE AUTH", x: 62, y: 28, stepId: "identity", tone: "workload" },
    { id: "organization", label: "Organization", eyebrow: "SCOPE", x: 46, y: 64, stepId: "organization", tone: "environment" },
  ], edges: [{ from: "control", to: "identity" }, { from: "identity", to: "organization" }] } }),
  manifest({ id: "d01-public-install", code: "D01", kind: "lab", title: "Public Install", subtitle: "Verify the accepted CLI, npm SDK and PyPI package without private source.", summary: "Prove that Open Immune can be built entirely from public Scaniom distribution surfaces.", goal: "Finish with the CLI installed/verified, registry SDKs verified and the cloud profile reachable.", difficulty: "Foundation", attachments: [], platforms: ["macOS", "Linux", "Windows", "npm", "PyPI"], providers: [], stacks: ["CLI", "npm", "PyPI"], suggestedEnvironment: "open-immune-production", suggestedWorkload: "open-immune-agent", steps: [
    ...authoritySteps(),
    externalStep({ id: "sdk-distributions", label: "SDK distributions", eyebrow: "NPM + PYPI", group: "runtime", depth: 0, dependsOn: ["profile"], detail: "Verify the released SDK packages. They are needed for L2 labs, not for every Open Immune lab.", why: "Registry packages must match the same accepted Scaniom release.", surface: "Terminal / clean temporary environment", commands: ["scaniom version", "scaniom profile test cloud"] }),
  ], topology: { nodes: [
    { id: "control", label: "Scaniom Control", eyebrow: "PROFILE", x: 32, y: 28, stepId: "profile", tone: "control" },
    { id: "identity", label: "CLI + Web", eyebrow: "OIS AUTH", x: 68, y: 28, stepId: "identity", tone: "evidence" },
    { id: "sdk", label: "Public SDKs", eyebrow: "L2 DISTRIBUTION", x: 50, y: 64, stepId: "sdk-distributions", tone: "attachment" },
  ], edges: [{ from: "control", to: "identity" }, { from: "identity", to: "sdk" }] } }),
  manifest({ id: "d02-l1-full-cycle", code: "D02", kind: "lab", title: "L1 Full Cycle", subtitle: "Application API traffic → Scaniom Node → real AI provider.", summary: "Build the API-route boundary from public install and OIS Auth through scope, identity, Node, policy, BYOK provider route, application routing, real traffic and proof.", goal: "Complete one real provider-backed request through L1 and inspect Gate/trajectory/proof.", difficulty: "Foundation", attachments: ["L1"], platforms: ["IDE", "Local", "VM", "Docker", "Kubernetes"], providers: ["OpenAI"], stacks: ["Scaniom Node", "Application API client"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L1"] } }),
  manifest({ id: "d03-l2-agent-sdk", code: "D03", kind: "lab", title: "L2 Agent SDK", subtitle: "Instrument application/agent semantics with the released Scaniom SDK.", summary: "Install the real TypeScript or Python SDK in an application repository and send semantic actions through the same workload identity and Node/Gate.", goal: "Execute a guarded application/agent action and verify L2 attachment evidence.", difficulty: "Intermediate", attachments: ["L2"], platforms: ["VS Code/IDE", "Node.js", "Python", "Docker"], providers: ["Any configured provider"], stacks: ["@scaniom/sdk", "Python scaniom SDK"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L2"] } }),
  manifest({ id: "d04-l4-sidecar", code: "D04", kind: "lab", title: "L4 Sidecar", subtitle: "Protect an existing workload without rewriting every provider call.", summary: "Deploy a Scaniom sidecar beside the workload in local, VM, Docker or Kubernetes runtime placement and route traffic through it.", goal: "Run real workload traffic through the L4 sidecar and inspect evidence.", difficulty: "Intermediate", attachments: ["L4"], platforms: ["Docker", "Kubernetes", "VM"], providers: ["OpenAI-compatible"], stacks: ["Sidecar", "Existing app"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L4"] } }),
  manifest({ id: "d05-l3-model-runtime", code: "D05", kind: "lab", title: "L3 Model Runtime", subtitle: "Gate vLLM, NVIDIA NIM, Triton or compatible inference before execution.", summary: "Place the released runtime adapter beside the real model runtime on GPU Linux, Docker or Kubernetes.", goal: "Run a real inference target through the L3 boundary.", difficulty: "Advanced", attachments: ["L3"], platforms: ["GPU Linux", "Docker", "Kubernetes"], providers: ["vLLM", "NIM", "Triton", "OpenAI-compatible runtime"], stacks: ["Model runtime", "L3 adapter"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-model-runtime", runtime: { attachments: ["L3"] } }),
  manifest({ id: "d06-l5-environment-gateway", code: "D06", kind: "lab", title: "L5 Environment Gateway", subtitle: "Protect explicit environment ingress while preserving per-workload identity.", summary: "Deploy the Environment Gateway at a cluster/VPC/private boundary and require workload attribution on every request.", goal: "Exercise real multi-workload environment ingress through L5.", difficulty: "Advanced", attachments: ["L5"], platforms: ["Kubernetes", "VM", "VPC/private network"], providers: ["Any configured provider"], stacks: ["Environment Gateway"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L5"] } }),
  manifest({ id: "d07-mcp-gateway", code: "D07", kind: "lab", title: "MCP Gateway", subtitle: "Gate Streamable HTTP MCP tool calls before server/tool consequence.", summary: "Place the Scaniom MCP Gateway between a real MCP client/agent and MCP server while preserving server, session and tool lineage.", goal: "Run a real tools/call through the MCP boundary and inspect proof.", difficulty: "Advanced", attachments: ["MCP"], platforms: ["Node.js", "Docker", "Kubernetes"], providers: ["MCP server"], stacks: ["MCP", "Tools"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["MCP"] } }),
  manifest({ id: "d08-l6-provider-native", code: "D08", kind: "lab", title: "L6 Provider Native", subtitle: "Guard immediately before a provider/runtime-native consequence.", summary: "Integrate the executable L6 bridge/framework into a real provider/runtime adapter using metadata-minimized guard-before/observe-after semantics.", goal: "Exercise a provider-native hook and verify its decision trail.", difficulty: "Advanced", attachments: ["L6"], platforms: ["Provider/runtime adapter", "Custom framework"], providers: ["Custom adapter"], stacks: ["L6 bridge"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L6"] } }),
  manifest({ id: "d09-fleet-failover", code: "D09", kind: "lab", title: "Fleet + Failover", subtitle: "Multiple Nodes, one workload pool, deterministic routing and failover.", summary: "Build a small real Scaniom fabric across VM/Docker/Kubernetes Nodes and observe health-aware routing.", goal: "Bind the workload to a pool and verify routing/failover authority.", difficulty: "Advanced", attachments: ["L1", "L2", "L4"], platforms: ["VM", "Docker", "Kubernetes"], providers: ["Any configured provider"], stacks: ["Node pool", "Routing"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L1", "L2", "L4"], multiNode: true } }),
  manifest({ id: "d10-offline-continuity", code: "D10", kind: "lab", title: "Offline Continuity", subtitle: "Remove Control reachability while Node protection continues from bounded last-known-good authority.", summary: "Exercise protected offline traffic, spool/replay and recovery rather than only the happy path.", goal: "Reach OFFLINE-PROTECTED, run real traffic, reconnect and confirm recovery.", difficulty: "Advanced", attachments: ["L1"], platforms: ["VM", "Docker", "Kubernetes", "Private"], providers: ["OpenAI-compatible"], stacks: ["Offline continuity", "Spool/replay"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L1"], continuity: true } }),
  manifest({ id: "d11-multi-provider", code: "D11", kind: "lab", title: "Multi-provider", subtitle: "One workload identity across OpenAI, Anthropic, Gemini, Bedrock and custom/private routes.", summary: "Configure multiple Node-local BYOK provider credentials/routes while preserving one workload identity, Gate and trajectory.", goal: "Exercise multiple real provider routes and inspect one correlated trajectory.", difficulty: "Advanced", attachments: ["L1"], platforms: ["Node host", "Docker", "Kubernetes"], providers: ["OpenAI", "Anthropic", "Gemini", "Bedrock", "Custom / private"], stacks: ["Provider routing", "BYOK"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L1"], multiProvider: true } }),
  manifest({ id: "d12-immunex", code: "D12", kind: "lab", title: "Immunex", subtitle: "Run repeatable normal/adversarial behavior against the real Scaniom Runtime.", summary: "Use a real provider connection and released attachments while destructive consequences remain sandboxed.", goal: "Finish an Immunex scenario set and inspect Gate/trajectory/proof.", difficulty: "Advanced", attachments: ["L1", "L2", "L4"], platforms: ["Local", "Docker", "Kubernetes"], providers: ["Real provider connection"], stacks: ["Immunex"], suggestedEnvironment: "scaniom-demo-production", suggestedWorkload: "scaniom-demo-agent", runtime: { attachments: ["L1", "L2", "L4"], immunex: true } }),
  manifest({ id: "flagship-full-fabric", code: "FLAGSHIP", kind: "lab", title: "Full Immune Fabric", subtitle: "All seven boundaries, multi-Node, multi-provider, continuity and proof.", summary: "The complete public Open Immune engineering experience from public Scaniom install to all-boundary evidence.", goal: "Build and verify a complete multi-boundary Scaniom Immune Fabric.", difficulty: "Advanced", attachments: ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"], platforms: ["VM", "Docker", "Kubernetes", "Managed K8s", "Private"], providers: ["OpenAI", "Anthropic", "Gemini", "Bedrock"], stacks: ["Node pool", "All attachments", "Continuity", "Proof"], suggestedEnvironment: "oi-fabric-production", suggestedWorkload: "oi-fabric-agent", runtime: { attachments: ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"], multiNode: true, multiProvider: true, continuity: true } }),
];

const systems: LabManifest[] = [
  manifest({ id: "system-saas", code: "SYSTEM", kind: "system", title: "AI SaaS Operations Center", subtitle: "Provider requests, semantic agent actions and MCP tools in one application fabric.", summary: "Build a realistic SaaS system with API routing, SDK semantics and tool gating.", goal: "Protect customer-facing model traffic, agent actions and MCP tools under one workload story.", difficulty: "Intermediate", attachments: ["L1", "L2", "MCP"], platforms: ["Next.js", "Node.js", "Docker", "Kubernetes"], providers: ["OpenAI", "Anthropic"], stacks: ["Web app", "Agent", "MCP"], suggestedEnvironment: "oi-saas-production", suggestedWorkload: "oi-saas", runtime: { attachments: ["L1", "L2", "MCP"] } }),
  manifest({ id: "system-robots", code: "SYSTEM", kind: "system", title: "Robot Fleet", subtitle: "Controller/worker identities with local workload, environment and tool boundaries.", summary: "Build a fleet-style controller fabric using SDK semantics, sidecars, environment ingress and MCP tools.", goal: "Learn workload identity and multiple Scaniom boundaries for an edge/fleet system.", difficulty: "Advanced", attachments: ["L2", "L4", "L5", "MCP"], platforms: ["Edge Linux", "Docker", "Kubernetes"], providers: ["Local/remote model"], stacks: ["Robot controller", "Sidecar", "MCP"], suggestedEnvironment: "oi-robots-production", suggestedWorkload: "oi-robot-controller", runtime: { attachments: ["L2", "L4", "L5", "MCP"], multiNode: true } }),
  manifest({ id: "system-lanes", code: "SYSTEM", kind: "system", title: "Autonomous Lanes", subtitle: "A physical-world style path with provider-native consequence gating.", summary: "Build a lane-control fabric with API traffic, semantic actions, environment ingress and an L6 consequence boundary.", goal: "Learn how Scaniom places Gate immediately before a consequential provider/runtime-native action.", difficulty: "Advanced", attachments: ["L1", "L2", "L5", "L6"], platforms: ["Edge", "Private network", "Kubernetes"], providers: ["Provider-native", "Custom"], stacks: ["Control service", "Environment gateway", "L6 adapter"], suggestedEnvironment: "oi-lanes-production", suggestedWorkload: "oi-lane-controller", runtime: { attachments: ["L1", "L2", "L5", "L6"], multiNode: true } }),
  manifest({ id: "system-factory", code: "SYSTEM", kind: "system", title: "AI Inference Factory", subtitle: "Self-hosted model runtimes behind multi-Node infrastructure.", summary: "Build an inference fabric with model-runtime, sidecar and environment boundaries around vLLM/NIM/Triton infrastructure.", goal: "Learn how L3/L4/L5 compose around real GPU/model runtime placement.", difficulty: "Advanced", attachments: ["L3", "L4", "L5"], platforms: ["GPU Linux", "Docker", "Kubernetes"], providers: ["vLLM", "NIM", "Triton"], stacks: ["GPU runtime", "Sidecar", "Gateway"], suggestedEnvironment: "oi-factory-production", suggestedWorkload: "oi-model-runtime", runtime: { attachments: ["L3", "L4", "L5"], multiNode: true } }),
  manifest({ id: "system-ifoc", code: "SYSTEM", kind: "system", title: "IFOC — Full Immune Fabric Operations Center", subtitle: "All seven Scaniom boundaries in one system lab.", summary: "Build the largest public Open Immune system with every attachment, multiple Nodes/providers, continuity and proof.", goal: "See how the complete Scaniom fabric composes as one verifiable system.", difficulty: "Advanced", attachments: ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"], platforms: ["VM", "Docker", "Kubernetes", "Managed K8s", "Private"], providers: ["OpenAI", "Anthropic", "Gemini", "Bedrock"], stacks: ["All boundaries", "Multi-node", "Multi-provider", "Continuity"], suggestedEnvironment: "oi-fabric-production", suggestedWorkload: "oi-fabric-agent", runtime: { attachments: ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"], multiNode: true, multiProvider: true, continuity: true } }),
];

export const LAB_CATALOG: readonly LabManifest[] = Object.freeze([...labs, ...systems]);

export function labById(id: string | null | undefined): LabManifest | null {
  const needle = String(id || "").trim();
  return LAB_CATALOG.find((lab) => lab.id === needle) || null;
}

export function selectedLabNode(context: OpenIiContextResponse) {
  const environmentId = context.workspace?.environmentId;
  const workloadId = context.workspace?.workloadId;
  const workloadRoutes = (context.connections || []).filter((item) => item.workload_id === workloadId && item.status !== "paused");
  const routeNodeId = workloadRoutes.find((item) => item.node_id)?.node_id;
  return (context.nodes || []).find((item) => item.id === routeNodeId)
    || (context.nodes || []).find((item) => (item.environment_id || item.environmentId) === environmentId && item.operational_state === "online")
    || (context.nodes || []).find((item) => (item.environment_id || item.environmentId) === environmentId)
    || null;
}

export function selectedLabConnection(context: OpenIiContextResponse, lab: LabManifest) {
  const workloadId = context.workspace?.workloadId;
  const routes = (context.connections || []).filter((item) => item.workload_id === workloadId && item.status !== "paused");
  if (!routes.length) return null;
  const wanted = lab.providers.map((item) => item.toLowerCase());
  return routes.find((route) => wanted.some((provider) => provider.includes(String(route.provider || "").toLowerCase()))) || routes[0];
}

function attachmentVerified(step: LabStep, context: OpenIiContextResponse): boolean {
  const level = step.label.split("·")[0]?.trim().toLowerCase();
  return Boolean(context.attachments?.levels?.some((item) => {
    const id = String(item.id || item.level || "").toLowerCase();
    return id === level && (item.configured === true || Number(item.evidence?.total || 0) > 0);
  }));
}

export function completionVerified(step: LabStep, context: OpenIiContextResponse, lab: LabManifest): boolean {
  const environmentId = context.workspace?.environmentId;
  const workloadId = context.workspace?.workloadId;
  const workload = context.workloads.find((item) => item.id === workloadId);
  switch (step.completion) {
    case "profile": return Boolean(context.profile.name && context.profile.controlUrl);
    case "identity": return Boolean(context.whoami.user.id && context.whoami.user.email);
    case "organization": return Boolean(context.whoami.organization.id);
    case "environment": return Boolean(environmentId && context.environments.some((item) => item.id === environmentId));
    case "workload": return Boolean(workloadId && workload);
    case "address": return Boolean(workload && (workload.active_address || workload.activeAddress));
    case "node": {
      const online = (context.nodes || []).filter((item) => (item.environment_id || item.environmentId) === environmentId && item.operational_state === "online");
      return step.label === "Node pool" ? online.length >= 3 : Boolean(selectedLabNode(context)?.operational_state === "online");
    }
    case "policy": return Boolean(environmentId && (context.policies || []).some((item) => item.environment_id === environmentId));
    case "provider": {
      const routes = (context.connections || []).filter((item) => item.workload_id === workloadId && item.status !== "paused");
      const readyRoutes = Number(context.attachments?.counts?.readyRoutes || 0);
      if (!routes.length || readyRoutes < 1) return false;
      if (lab.id === "d11-multi-provider" || lab.id === "flagship-full-fabric" || lab.id === "system-ifoc") {
        return readyRoutes >= 2 && new Set(routes.map((item) => String(item.provider || "").toLowerCase())).size >= 2;
      }
      return true;
    }
    case "attachment": return attachmentVerified(step, context);
    case "behavior": return Boolean(context.attachments?.levels?.some((item) => Number(item.evidence?.total || 0) > 0));
    case "proof": return false;
    case "external": return false;
  }
}

export function buildLabRuntime(lab: LabManifest, context: OpenIiContextResponse): LabRuntime {
  const statusById = new Map<string, LabStepStatus>();
  const runtimeSteps = lab.steps.map((step): LabRuntimeStep => {
    const dependencies = step.dependsOn || [];
    const depsVerified = dependencies.every((id) => statusById.get(id) === "verified");
    const verified = completionVerified(step, context, lab);
    const status: LabStepStatus = verified ? "verified" : depsVerified || dependencies.length === 0 ? "ready" : "locked";
    statusById.set(step.id, status);
    return { ...step, status };
  });
  return { ...lab, runtimeSteps };
}

export type LabResolvedValues = {
  environment: string;
  workload: string;
  node: string;
  provider: string;
  model: string;
  connection: string;
  region: string;
  nodeUrl: string;
};

export function labResolvedValues(context: OpenIiContextResponse, lab: LabManifest): LabResolvedValues {
  const environmentId = context.workspace?.environmentId;
  const workloadId = context.workspace?.workloadId;
  const environment = context.environments.find((item) => item.id === environmentId);
  const workload = context.workloads.find((item) => item.id === workloadId);
  const connection = selectedLabConnection(context, lab);
  const node = selectedLabNode(context);
  const settings = connection?.settings || {};
  const region = typeof settings.awsRegion === "string" && settings.awsRegion ? settings.awsRegion : "<aws-region>";
  return {
    environment: String(environment?.slug || environment?.name || environment?.id || lab.suggestedEnvironment),
    workload: String(workload?.slug || workload?.name || workload?.id || lab.suggestedWorkload),
    node: String(node?.slug || node?.name || node?.id || "<node>"),
    provider: String(connection?.provider || (lab.providers.length === 1 ? lab.providers[0].toLowerCase().split(/[ /]/)[0] : "<provider>")),
    model: String(connection?.model_hint || workload?.model || "<model>"),
    connection: String(connection?.name || connection?.id || "<connection>"),
    region,
    nodeUrl: "<private Scaniom Node service URL from your deployment>",
  };
}

export function resolveLabCommand(command: string, context: OpenIiContextResponse, lab: LabManifest): string {
  const values = labResolvedValues(context, lab);
  return command
    .replaceAll("{{environment}}", values.environment)
    .replaceAll("{{workload}}", values.workload)
    .replaceAll("{{node}}", values.node)
    .replaceAll("{{provider}}", values.provider)
    .replaceAll("{{model}}", values.model)
    .replaceAll("{{connection}}", values.connection)
    .replaceAll("{{region}}", values.region)
    .replaceAll("{{nodeUrl}}", values.nodeUrl);
}

export function nextLabStep(runtime: LabRuntime): LabRuntimeStep | null {
  const operational = runtime.runtimeSteps.find((step) => step.status === "ready" && step.completion !== "external");
  return operational || runtime.runtimeSteps.find((step) => step.status === "ready") || null;
}

