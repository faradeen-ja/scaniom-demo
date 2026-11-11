# Open Immune Intelligence

**Public engineering Labs for building real Scaniom Immune Fabric from zero to verifiable runtime evidence.**

Open Immune Intelligence (OII) is not a simulation of Scaniom and is not a second security product. It is the public engineering experience around released Scaniom artifacts. You choose a Lab or system, connect a real Scaniom account, build the required runtime boundaries in the real place they belong, run real traffic, and inspect the resulting Gate decisions, trajectory and proof.

> **Current public Scaniom release:** R18 / 0.4.2 · `faradeen-ja/scaniom-releases` · public Control `https://control.scaniom.com`

## What is real

```text
Open Immune Intelligence (localhost UI + public lab repo)
        │
        ├─ OIS Auth ───────────────→ real Scaniom Control
        │                              https://control.scaniom.com
        │
        ├─ Labs / system manifests
        │      ↓
        ├─ real CLI / SDK / runtime placement
        │      ↓
        └─ real Scaniom Immune Fabric
               environment
               workload + Scaniom Address
               Node / Node pool
               policy / Gate
               L1 · L2 · L3 · L4 · L5 · MCP · L6
               provider/runtime targets
               behavior · trajectory · proof
```

Open Immune never marks Node, policy, attachment, provider, Gate, trajectory or proof as completed merely because the UI rendered them. Those states require real Scaniom evidence.

---

# Start A–Z

## A. Clone Open Immune and confirm the public Scaniom release

```bash
git clone https://github.com/faradeen-ja/scaniom-demo.git OPEN-IMMUNE-INTELLIGENCE
cd OPEN-IMMUNE-INTELLIGENCE
npm install
npm run dev
```

Open `http://localhost:3000`. The web release badge reads the latest public `faradeen-ja/scaniom-releases` release and falls back to the accepted R18 / 0.4.2 baseline if GitHub is unavailable. **Release status is informational/readiness metadata; it is not a blocking Lab step.**

The public release includes standalone CLI/runtime archives, SHA256SUMS, Sigstore evidence, publication receipt, provenance and SBOM assets.

## B. Install or verify the released Scaniom CLI

Use the public release artifact for your platform. After the native CLI is on `PATH`, all Lab operator flows use the installed `scaniom` command — not repo-local shell scripts.

```bash
scaniom version
scaniom artifacts supply-chain
scaniom profile test cloud
```

If the CLI is not installed yet, use the current public release link from the Open Immune release badge or the `faradeen-ja/scaniom-releases` release page and install the standalone archive for `darwin-arm64`, `darwin-x64`, `linux-amd64`, `linux-arm64`, or Windows x64. Verify the published SHA256SUMS/Sigstore material before exposing the command on `PATH`.

The TypeScript/Python SDKs are **L2 application dependencies**, not the CLI and not L1 prerequisites. Install only the language used by the real L2 workload:

```bash
npm install @scaniom/sdk@0.4.2
# OR
python3 -m pip install scaniom==0.4.2
```

## C. OIS Auth — Open Immune ↔ Scaniom authorization

The public Cloud Control is the default:

```bash
scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom whoami
scaniom auth status
```

Open Immune uses the same Scaniom account through browser-approved device authorization. It does not receive your Scaniom password and does not create a second account database.

Browser routes:

```text
Create account:  https://control.scaniom.com/signup
Control:         https://control.scaniom.com/console
Open Immune:     http://localhost:3000
OIS Auth:        http://localhost:3000/workspace
Labs:            http://localhost:3000/workbench
Start A–Z:       http://localhost:3000/docs
```

For another Control deployment:

```bash
# Self-hosted
scaniom profile add company \
  --control https://control.company.example \
  --type self-hosted
scaniom profile use company
scaniom profile test company
scaniom login

# Private enterprise
scaniom profile add private \
  --control https://control.internal.example \
  --type private-enterprise \
  --ca-file /path/to/company-ca.pem
scaniom profile use private
scaniom profile test private
scaniom login
```

Remote profiles require HTTPS. Local profiles are loopback-only.

## D. Create the protected Scaniom scope

You can create these in Scaniom Control or CLI. The Lab consumes the same objects either way.

```bash
scaniom env create production --type production

scaniom workload create customer-agent \
  --env production \
  --kind application

scaniom workload use customer-agent
scaniom address issue --workload customer-agent --ttl 24
```

The **Scaniom Address** is signed workload identity. It is different from the human CLI session and different from the provider API key.

## E. Bring the machine authority online

For a simple Node:

```bash
scaniom node enroll prod-ai-01 --env production --background
scaniom node health
scaniom node doctor
```

For a real multi-Node Lab, use the fleet/pool workflow shown by D09 instead of pretending one localhost process represents the deployment.

Then publish policy:

```bash
scaniom policy set --env production --mode enforce
scaniom policy list
```

The Node remains the machine-speed authority for identity, trajectory, risk, policy and Gate decisions.

---

# Provider keys and BYOK

Provider credentials belong at the **Scaniom Node/runtime secret boundary**, never in the Open Immune web app and never in Scaniom Control secret values.

Inspect the released provider catalog:

```bash
scaniom provider catalog
```

## OpenAI

```bash
scaniom provider add openai \
  --node prod-ai-01 \
  --workload customer-agent \
  --model <model>

scaniom secret configure OPENAI_API_KEY --node prod-ai-01
scaniom node restart
scaniom providers
```

## Anthropic

```bash
scaniom provider add anthropic \
  --node prod-ai-01 \
  --workload customer-agent \
  --model <model>

scaniom secret configure ANTHROPIC_API_KEY --node prod-ai-01
scaniom node restart
```

## Gemini

```bash
scaniom provider add gemini \
  --node prod-ai-01 \
  --workload customer-agent \
  --model <model>

scaniom secret configure GEMINI_API_KEY --node prod-ai-01
scaniom node restart
```

## Amazon Bedrock

Bedrock uses the Node-local AWS credential chain plus region. In production, prefer the platform/enterprise secret mechanism already used by the Node (for example workload identity, Kubernetes Secret/External Secrets, Vault, AWS Secrets Manager, Azure Key Vault or GCP Secret Manager). Where explicit environment secrets are appropriate:

```bash
scaniom provider add bedrock \
  --node prod-ai-01 \
  --workload customer-agent \
  --model <model> \
  --region <aws-region>

scaniom secret configure AWS_ACCESS_KEY_ID --node prod-ai-01
scaniom secret configure AWS_SECRET_ACCESS_KEY --node prod-ai-01
# Configure AWS_SESSION_TOKEN on the Node as well when the AWS credential is temporary.

scaniom node restart
scaniom providers
```

The Bedrock provider adapter uses AWS SigV4. Platform-managed AWS identity can replace copied long-lived credentials in production.

## Custom / private / other AI providers

Use the explicit custom provider route when the upstream is an HTTP JSON provider/model endpoint that should behave like an L1 route:

```bash
scaniom provider add custom \
  --node prod-ai-01 \
  --workload customer-agent \
  --endpoint https://provider.example/v1/generate \
  --model <model> \
  --secret-env CUSTOM_MODEL_TOKEN

scaniom secret configure CUSTOM_MODEL_TOKEN --node prod-ai-01
scaniom node restart
scaniom provider list
```

For **personal/local inference runtimes** such as vLLM, NVIDIA NIM or Triton, prefer **L3 Model Runtime**. L3 places Gate before inference without pretending the runtime is a hosted provider API.

## Multiple providers

A workload can have OpenAI, Anthropic, Gemini, Bedrock and custom/private routes at the same time while keeping the same Scaniom identity, environment policy, Node/Gate and behavioral trajectory. Each route has its own Node-local credential reference.

```bash
scaniom provider list
scaniom providers
scaniom trajectory list --limit 100
scaniom proof correlated list --limit 50
```

Use D11 to add two or more real routes and exercise the correlated paths.

---

# Why Scaniom calls this an Immune Fabric

The Fabric is the connected protection graph around a real AI system. It is not just one proxy, one SDK, or seven unrelated adapters.

```text
SCANIOM CONTROL / OPERATOR AUTHORITY
              │
              ▼
        PROTECTED ENVIRONMENT
              │
              ▼
         WORKLOAD IDENTITY
              │
              ▼
     NODE / GATE / POLICY AUTHORITY
              │
      ┌───────┼──────────────────────────────┐
      ▼       ▼                              ▼
 L1 / L2 / L3 / L4 / L5 / MCP / L6   provider/runtime target
      │                                      │
      └──────────────────┬───────────────────┘
                         ▼
              BEHAVIOR → TRAJECTORY → PROOF
```

There are **seven executable attachment boundaries** inside that one Fabric: L1 API Route, L2 SDK, L3 Model Runtime, L4 Sidecar, L5 Environment Gateway, MCP Gateway and L6 Provider Native. A workload may use one boundary or several at the same time while keeping one workload identity, environment policy, Node/Gate authority and evidence history.

The Start A–Z Web guide renders this as an interactive map. Nodes can be dragged to reform the diagram for the architecture you are learning; moving a diagram element never changes real Scaniom state.

# Attachment boundaries — what to install and where to work

## L1 · API Route

**Use when:** normal model/provider API traffic should cross Scaniom before forwarding upstream.

**Where you work:** application code/IDE + Scaniom Node deployment. **No SDK is required.**

```text
BEFORE
Application ─────────────→ Provider
                           ↑ provider API key in app/runtime

AFTER
Application ─→ Scaniom Node / L1 ─→ Provider
                  │                    ↑
                  │                    provider key stays Node-local
                  └─ identity / policy / Gate / trajectory / proof
```

Configure the route:

```bash
scaniom attach l1 \
  --workload customer-agent \
  --node prod-ai-01 \
  --preset openai \
  --model <model>

scaniom runtime identity bootstrap \
  --workload customer-agent \
  --attachments l1
```

The current R18 runtime identity is `scn_ri_v1`, short-lived and renewable. The one-time bootstrap is deployment material; it is not a provider key. The older `scn_rt_v1` L1 credential remains an advanced compatibility surface.

Validate real provider traffic from the CLI:

```bash
scaniom attach test l1 \
  --workload customer-agent \
  --model <model> \
  -- "Say hello in one sentence"
```

Application routing uses the Scaniom Node `/v1/responses` boundary:

```bash
export SCANIOM_NODE_URL=https://scaniom-node.prod.internal
export SCANIOM_RUNTIME_TOKEN=scn_ri_v1...

curl "$SCANIOM_NODE_URL/v1/responses" \
  -H "Authorization: Bearer $SCANIOM_RUNTIME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"<model>","input":"Say hello"}'
```

Local development may use `127.0.0.1:8787`. Docker, VM, Kubernetes and private deployments should use the real private runtime DNS/service address.

### How placeholders become real values

Open Immune can safely resolve values that Scaniom Control already knows: the selected environment, workload, enrolled Node, provider route, model hint and connection ID/name. Those values are substituted into Lab commands after OIS Auth and scope selection.

Deployment secrets are intentionally different. Open Immune does **not** pull raw provider keys, `SCANIOM_RUNTIME_TOKEN`, or a private Node service URL into the browser. Use the installed CLI to inspect/print the runtime contract:

```bash
scaniom workload show
scaniom node list
scaniom provider list
scaniom configure show customer-agent
scaniom configure bootstrap customer-agent
```

`scaniom configure bootstrap` prints the deployment-facing Scaniom values that belong in the real application/container/Pod. Secret values remain in the Node, workload secret store, native identity path or enterprise secret manager.

## L2 · SDK

**Use when:** Scaniom needs semantic application/agent context such as tools, delegation, memory, files, code, network or computer actions.

**Where you work:** the real application repository in VS Code/IDE.

TypeScript:

```bash
npm install @scaniom/sdk@0.4.2
scaniom attach l2 \
  --workload customer-agent \
  --lang typescript
```

Python:

```bash
python3 -m pip install scaniom==0.4.2
scaniom attach l2 \
  --workload customer-agent \
  --lang python
```

The SDK carries context into the same Scaniom Node/Gate. It does not create another policy engine.

## L3 · Model Runtime

**Use when:** the protected boundary is vLLM, NVIDIA NIM, NVIDIA Triton or another compatible inference runtime.

**Where you work:** GPU/model host, VM, Docker or Kubernetes.

```bash
scaniom attach l3 \
  --workload customer-agent \
  --kind vllm \
  --endpoint http://<runtime>:8000 \
  --run

scaniom runtime identity bootstrap \
  --workload customer-agent \
  --attachments l3
```

## L4 · Sidecar

**Use when:** you control workload deployment but do not want to rewrite every application/provider call site.

**Where you work:** beside the workload in a VM, Docker container network or Kubernetes pod.

```bash
scaniom attach l4 --workload customer-agent --port 8790
scaniom runtime identity bootstrap --workload customer-agent --attachments l4
```

The application points its protected traffic at the sidecar; the sidecar forwards through Scaniom Node authority.

## L5 · Environment Gateway

**Use when:** many workloads cross an explicit environment/cluster/VPC boundary.

**Where you work:** environment ingress in Kubernetes, VM/VPC or private infrastructure.

```bash
scaniom attach l5 --environment production --port 8791 --run
scaniom runtime identity bootstrap --workload customer-agent --attachments l5
```

Every request must preserve/declare the actual workload identity. L5 is not one global identity for the environment.

## MCP · Gateway

**Use when:** an agent/MCP client should cross Scaniom before an MCP server/tool consequence.

```bash
scaniom attach mcp \
  --workload customer-agent \
  --server-id internal-tools \
  --endpoint https://mcp.internal.example/mcp \
  --port 8793 \
  --run

scaniom runtime identity bootstrap \
  --workload customer-agent \
  --attachments mcp
```

## L6 · Provider Native Framework

**Use when:** a provider/runtime-native adapter can call Scaniom immediately before a privileged consequence and observe after it.

```bash
scaniom attach l6 \
  --workload customer-agent \
  --provider <provider> \
  --adapter <adapter> \
  --hook <family> \
  --port 8794 \
  --run

scaniom runtime identity bootstrap \
  --workload customer-agent \
  --attachments l6
```

L6 is the executable framework. Vendor-specific adapters remain separate integrations.

`scaniom attach test l6` verifies the released guard contract only. It intentionally does **not** execute a provider consequence or invent post-observe evidence. To complete D08, the real provider/runtime adapter must call guard, execute its legitimate consequence only when permitted, then call observe with the pre-behavior parent. Completion comes from `provider_native` pre/post trajectory plus signed correlated proof.

---

# Local, VM, Docker, Kubernetes and private environments

Open Immune does not claim that localhost is the production architecture. The Lab tells you **where the selected Scaniom boundary belongs**:

| Runtime place | Typical Scaniom placement |
| --- | --- |
| Local developer machine | local Node for learning/testing; OII web at localhost |
| VM/systemd | Node beside protected services; private Node URL |
| Docker/Compose | Node and/or L4 sidecar in the application network |
| Kubernetes / managed K8s | Node pool + L3/L4/L5/MCP boundaries; platform-native identity can replace copy-once bootstrap |
| Private enterprise | explicit private Control profile + enterprise CA/secret stores + private Node fabric |
| MCP system | MCP Gateway between client/agent and upstream MCP server |
| Provider/runtime-native system | L6 adapter/bridge immediately before provider consequence |

For Kubernetes/native environments, Scaniom also supports Kubernetes ServiceAccount, SPIFFE JWT-SVID and cloud/OIDC workload attestation into the same runtime identity instead of requiring long-lived copied bearer secrets.

---

# Run traffic, inspect intelligence, prove the result

After the selected Lab boundary is actually deployed/configured:

```bash
scaniom attach status --workload customer-agent
scaniom live --workload customer-agent --limit 20
scaniom trajectory list --limit 100
scaniom proof --window 24h --limit 10
scaniom proof correlated list --limit 50
```

When you have a behavior ID:

```bash
scaniom explain <behavior-id>
scaniom verify <receipt-or-behavior-id>
```

Open Immune will progressively surface this live intelligence in the bottom workbench panel; until real evidence is connected, it must not fabricate events.

---

# Labs

The Lab Library contains D00–D12, Flagship, and system blueprints such as AI SaaS Operations Center, Robot Fleet, Autonomous Lanes, AI Inference Factory and IFOC.

A selected Lab manifest controls:

```text
which attachment boundaries exist
where the user works
which public Scaniom artifact is required
which provider/runtime key or target is required
which exact CLI/code action comes next
what architecture should exist
what evidence would prove it
```

Reference execution / acceptance harnesses remain under `demos/`. Normal users learn and build through the Workbench, Start A–Z, released Scaniom CLI commands, deployment/code guidance and live evidence. The harnesses independently prove that those public instructions are executable; they are not the primary Lab UX.

---

# Run Open Immune locally

```bash
bash scripts/open-ii-bootstrap.sh
npm run accept:local
npm run dev
```

Open `http://localhost:3000`.

Open Immune is intentionally localhost-first right now. GitHub is the canonical public source/distribution point; Vercel is not a release gate.

# Repository boundary

- Never copy private Scaniom implementation into this repo.
- Never commit provider API keys, runtime tokens, browser sessions, `.scaniom` state or `.env.local`.
- Provider secret values remain Node-local or in the customer's secret system.
- Open Immune browser profiles cannot opt themselves into private-network/custom-CA power.
- A Lab is complete only when the relevant real Scaniom state/evidence exists.

> **CLI authority:** Open Immune never runs a repo-local `bin/scaniom` or private source launcher. Customer-real Labs use the installed accepted `scaniom` command from PATH. Web and CLI use separate approved sessions against the same Control and both must be active before runtime/fabric mutations.
