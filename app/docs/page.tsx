import Link from "next/link";
import { PublicReleaseBadge } from "@/components/PublicReleaseBadge";
import { StackIcon } from "@/components/StackIcon";
import { AttachmentFabricGuide } from "@/components/AttachmentFabricGuide";
import { LAB_CATALOG } from "@/lib/open-ii/labs";

function Code({ children }: { children: string }) {
  return <pre className="docs-code"><code>{children}</code></pre>;
}

function Flow({ items }: { items: Array<{ icon: string; label: string; detail?: string }> }) {
  return <div className="docs-flow" aria-label="architecture flow">
    {items.map((item, index) => <div className="docs-flow-step" key={`${item.label}-${index}`}>
      <span><StackIcon kind={item.icon} size={21}/></span>
      <div><b>{item.label}</b>{item.detail ? <small>{item.detail}</small> : null}</div>
      {index < items.length - 1 ? <i>→</i> : null}
    </div>)}
  </div>;
}

const providers = [
  { id: "openai", icon: "openai", title: "OpenAI", env: "OPENAI_API_KEY", command: "scaniom provider add openai --node $YOUR_NODE_NAME --workload $YOUR_WORKLOAD --model $YOUR_MODEL" },
  { id: "anthropic", icon: "anthropic", title: "Anthropic", env: "ANTHROPIC_API_KEY", command: "scaniom provider add anthropic --node $YOUR_NODE_NAME --workload $YOUR_WORKLOAD --model $YOUR_MODEL" },
  { id: "gemini", icon: "gemini", title: "Gemini", env: "GEMINI_API_KEY", command: "scaniom provider add gemini --node $YOUR_NODE_NAME --workload $YOUR_WORKLOAD --model $YOUR_MODEL" },
  { id: "bedrock", icon: "aws", title: "Bedrock", env: "AWS credential chain", command: "scaniom provider add bedrock --node $YOUR_NODE_NAME --workload $YOUR_WORKLOAD --model $YOUR_MODEL --region $YOUR_AWS_REGION" },
  { id: "custom", icon: "server", title: "Custom / private", env: "CUSTOM_MODEL_TOKEN", command: "scaniom provider add custom --node $YOUR_NODE_NAME --workload $YOUR_WORKLOAD --endpoint $YOUR_PROVIDER_ENDPOINT --model $YOUR_MODEL --secret-env CUSTOM_MODEL_TOKEN" },
];

const publicLabRunbooks = LAB_CATALOG.filter((lab) => lab.kind === "lab");
const systemBlueprints = LAB_CATALOG.filter((lab) => lab.kind === "system");

export default function DocsPage() {
  return <div className="docs-page">
    <header className="docs-hero">
      <div><span className="eyebrow">OPEN IMMUNE · START A–Z</span><h1>Build a real Scaniom Immune Fabric.</h1><p>Follow the actual operator path from public Scaniom release and OIS Auth to workload identity, Node authority, provider BYOK, attachment placement, live behavior and signed proof.</p><div className="button-row"><Link className="button" href="/workbench">Open Labs</Link><Link className="button secondary" href="/workspace">OIS Auth</Link></div></div>
      <PublicReleaseBadge/>
    </header>

    <nav className="docs-toc" aria-label="Start A-Z sections"><a href="#install">01 Release</a><a href="#auth">02 OIS Auth</a><a href="#scope">03 Scope</a><a href="#node">04 Node + policy</a><a href="#providers">05 BYOK</a><a href="#attachments">06 Boundaries</a><a href="#labs">07 Labs A-Z</a><a href="#deploy">08 Placement</a><a href="#proof">09 Evidence</a></nav>

    <section id="install" className="docs-section docs-visual-section"><span>01 · PUBLIC RELEASE</span><h2>Release status is a prerequisite fact, not a Lab step.</h2><p>The live release badge above independently reports the public Scaniom release. Labs do not block on a fake “verify release” step and never show repository maintenance scripts as CLI commands.</p>
      <Flow items={[{ icon: "terminal", label: "Installed CLI", detail: "user terminal" }, { icon: "scaniom", label: "Scaniom 0.4.2", detail: "released public runtime" }, { icon: "cloud", label: "Control", detail: "control.scaniom.com" }]}/>
      <Code>{`scaniom version
scaniom artifacts supply-chain
scaniom profile test cloud`}</Code>
      <details className="docs-install-details"><summary>Install Scaniom CLI · macOS / Linux</summary><Code>{`SCANIOM_VERSION="0.4.2"
# Detect darwin-arm64 / darwin-x64 / linux-amd64 / linux-arm64
# then download r18-standalone-$SCANIOM_TARGET.tar.gz + SHA256SUMS
SCANIOM_INSTALL_ROOT="$HOME/.local/lib/scaniom/$SCANIOM_VERSION"
# Verify SHA-256 before extraction, extract to $SCANIOM_INSTALL_ROOT,
# then expose the installed binary through ~/.local/bin.
scaniom version --json
scaniom artifacts supply-chain`}</Code><p>The full copy/paste installer is in the repository root README. Windows x64 PowerShell is documented there too.</p></details>
      <div className="docs-note"><b>L2 package installs only when the Lab uses L2</b><code>npm install @scaniom/sdk@0.4.2</code><code>python3 -m pip install scaniom==0.4.2</code></div>
    </section>

    <section id="auth" className="docs-section docs-visual-section"><span>02 · OIS AUTH</span><h2>Authorize Open Immune and the CLI against the same Scaniom Control.</h2><p>Open Immune never receives the Scaniom password. Browser approval produces the operator authority; the CLI and web surface resolve the same organization.</p>
      <Flow items={[{ icon: "terminal", label: "Scaniom CLI" }, { icon: "scaniom", label: "OIS Auth", detail: "browser-approved" }, { icon: "cloud", label: "Scaniom Control" }, { icon: "shield", label: "Organization" }]}/>
      <Code>{`scaniom profile use cloud
scaniom profile test cloud
scaniom login
scaniom whoami
scaniom auth status`}</Code>
      <p>Create an account at <a href="https://control.scaniom.com/signup" target="_blank" rel="noreferrer">control.scaniom.com/signup ↗</a>. Self-hosted/private profiles use the same Scaniom CLI with their explicit HTTPS Control origin.</p>
    </section>

    <section className="docs-section docs-visual-section"><span>YOUR VALUES</span><h2>Example names are not pre-created names.</h2><p>Pick your own environment, workload, Node and model, or use existing names from <code>scaniom env list</code>, <code>scaniom workload list</code> and <code>scaniom node list</code>.</p><Code>{`export YOUR_ENVIRONMENT="production"
export YOUR_WORKLOAD="customer-agent"
export YOUR_NODE_NAME="prod-ai-01"
export YOUR_MODEL="gpt-5-mini"`}</Code><p><code>prod-ai-01</code> is only an example value for <code>$YOUR_NODE_NAME</code>. Use the Node you enrolled.</p></section>

    <section id="scope" className="docs-section docs-visual-section"><span>03 · PROTECTED SCOPE</span><h2>Create the trust boundary and identify the real workload.</h2>
      <Flow items={[{ icon: "cloud", label: "Environment" }, { icon: "server", label: "Workload" }, { icon: "scaniom", label: "Scaniom Address" }, { icon: "shield", label: "Runtime identity" }]}/>
      <Code>{`scaniom env create "$YOUR_ENVIRONMENT" --type production
scaniom workload create $YOUR_WORKLOAD --env "$YOUR_ENVIRONMENT" --kind application
scaniom workload use $YOUR_WORKLOAD
scaniom address issue --workload $YOUR_WORKLOAD --ttl 24
scaniom runtime identity status --workload $YOUR_WORKLOAD`}</Code>
      <p>The Scaniom Address identifies the protected workload. It is separate from the human CLI session and separate from provider API keys.</p>
    </section>

    <section id="node" className="docs-section docs-visual-section"><span>04 · MACHINE AUTHORITY</span><h2>Bring the Node online and publish the environment policy.</h2>
      <Flow items={[{ icon: "server", label: "Workload" }, { icon: "scaniom", label: "Scaniom Node" }, { icon: "shield", label: "Policy + Gate" }, { icon: "cloud", label: "Target" }]}/>
      <Code>{`scaniom node enroll $YOUR_NODE_NAME --env "$YOUR_ENVIRONMENT" --background
scaniom node list
scaniom node health
scaniom node doctor
scaniom policy set --env "$YOUR_ENVIRONMENT" --mode enforce
scaniom policy list`}</Code>
      <p>The Node is the machine-speed authority for identity, trajectory, risk, policy and Gate decisions. Multi-Node Labs use the Scaniom Fabric/Node-pool commands rather than pretending one localhost process is the architecture.</p>
    </section>

    <section id="providers" className="docs-section docs-wide docs-visual-section"><span>05 · PROVIDER BYOK</span><h2>The provider key lives at the Node/runtime boundary.</h2><p>Open Immune does not ask for provider keys. Scaniom Control stores route metadata and secret references; the Node or enterprise secret store owns the value.</p>
      <Flow items={[{ icon: "server", label: "Application", detail: "no provider key" }, { icon: "scaniom", label: "Scaniom Node", detail: "Gate + secret boundary" }, { icon: "openai", label: "Provider", detail: "real upstream" }]}/>
      <div className="docs-provider-grid">{providers.map((provider) => <article key={provider.id} className="docs-provider-card"><header><i><StackIcon kind={provider.icon} size={25}/></i><div><small>NODE-LOCAL BYOK</small><b>{provider.title}</b></div></header><Code>{provider.command}</Code>{provider.id === "bedrock" ? <Code>{`scaniom secret configure AWS_ACCESS_KEY_ID --node $YOUR_NODE_NAME
scaniom secret configure AWS_SECRET_ACCESS_KEY --node $YOUR_NODE_NAME`}</Code> : <Code>{`scaniom secret configure ${provider.env} --node $YOUR_NODE_NAME`}</Code>}</article>)}</div>
      <div className="docs-multiprovider-card"><header><div><small>MULTI-PROVIDER IMMUNE FABRIC</small><h3>One workload can cross many providers without creating many policy engines.</h3></div><StackIcon kind="scaniom" size={34}/></header><div className="docs-multiprovider-flow"><span><StackIcon kind="server" size={20}/>One workload identity</span><i>→</i><span><StackIcon kind="scaniom" size={20}/>Node · policy · Gate</span><i>→</i><div>{providers.map((provider) => <span key={provider.id}><StackIcon kind={provider.icon} size={18}/>{provider.title}</span>)}</div><i>→</i><span><StackIcon kind="shield" size={20}/>One trajectory + proof</span></div><p>Use D11 to add two or more real routes to the same workload. Each route owns its own Node-local credential reference, while identity, policy, Gate, behavior history and proof stay provider-neutral.</p></div>
      <div className="docs-secret-location"><div><StackIcon kind="code" size={20}/><b>Open Immune</b><span>Never receives raw provider keys.</span></div><i>→</i><div><StackIcon kind="cloud" size={20}/><b>Scaniom Control</b><span>Stores route metadata + secret references.</span></div><i>→</i><div><StackIcon kind="scaniom" size={20}/><b>Node / secret store</b><span>Raw key or cloud credential chain lives here.</span></div></div>
      <Code>{`scaniom node restart
scaniom providers
scaniom provider list`}</Code>
      <p>For a personal/local inference runtime such as vLLM, NVIDIA NIM or Triton, use <b>L3 Model Runtime</b>. Use the custom L1 provider route when you have an explicit HTTP JSON upstream endpoint that should behave like a provider route.</p>
    </section>

    <section id="attachments" className="docs-section docs-wide docs-visual-section"><span>06 · ATTACHMENT BOUNDARIES</span><h2>Seven execution boundaries. One Scaniom Immune Fabric.</h2><p>The Fabric is the connected protected graph: Control authority → environment → workload identity → Node/Gate/policy → execution boundary → provider/runtime → behavior, trajectory and proof. The seven attachment boundaries are the places where that same fabric can enter a real AI system.</p>
      <AttachmentFabricGuide/>
      <div className="docs-placeholder-guide"><header><StackIcon kind="terminal" size={24}/><div><small>PLACEHOLDERS → REAL VALUES</small><h3>Open Immune resolves what Control can prove; deployment secrets stay outside the browser.</h3></div></header><div className="docs-choice-grid"><article><b>AUTO-RESOLVED</b><p>Environment, workload, Node name, provider, model and connection are replaced from the connected Scaniom organization when those objects exist.</p></article><article><b>DEPLOYMENT-ONLY</b><p>Private Node service URL, runtime token and raw provider keys stay in the runtime/secret boundary and are never exposed to Open Immune.</p></article></div><Code>{`scaniom workload show
scaniom node list
scaniom provider list
scaniom configure show $YOUR_WORKLOAD
scaniom configure bootstrap $YOUR_WORKLOAD`}</Code></div>
    </section>

    <section id="labs" className="docs-section docs-wide docs-visual-section"><span>07 · PUBLIC NATIVE LAB RUNBOOKS</span><h2>D00-D12 + Flagship are real Scaniom workflows, not shell-script demos.</h2><p>No repository shell harness is a public Lab prerequisite. Start a Lab in Workbench, then execute these manifest-owned commands at the real Scaniom surface shown by Inspector. DONE remains evidence-driven.</p>
      <div className="docs-lab-runbook-grid">{publicLabRunbooks.map((lab) => <details className="docs-lab-runbook" key={lab.id}><summary><div><small>{lab.code} · {lab.difficulty}</small><b>{lab.title}</b><span>{lab.attachments.length ? lab.attachments.join(" · ") : "AUTHORITY / DISTRIBUTION"}</span></div><i>+</i></summary><div className="docs-lab-runbook-body"><p>{lab.goal}</p>{lab.steps.map((step, index) => <article className="docs-lab-step" key={step.id}><header><em>{String(index + 1).padStart(2, "0")}</em><div><small>{step.eyebrow} · {step.surface}</small><h3>{step.label}</h3></div></header><p>{step.detail}</p>{step.why ? <p className="docs-lab-why"><b>Why:</b> {step.why}</p> : null}{step.commands?.length ? <Code>{step.commands.join("\n")}</Code> : null}</article>)}</div></details>)}</div>
      <div className="docs-system-blueprints"><header><small>SYSTEM BLUEPRINT RUNBOOKS</small><h3>Compose the same native Scaniom boundaries into realistic systems.</h3><p>Each blueprint below is manifest-owned, uses real Scaniom steps, and closes only from the same live authority/evidence model as focused Labs.</p></header><div className="docs-system-blueprint-grid">{systemBlueprints.map((lab) => <details className="docs-system-blueprint" key={lab.id}><summary><div><b>{lab.title}</b><span>{lab.attachments.join(" · ")}</span></div><i>+</i></summary><div className="docs-system-blueprint-body"><p>{lab.summary}</p><p><b>Goal:</b> {lab.goal}</p>{lab.steps.map((step, index) => <article className="docs-lab-step" key={step.id}><header><em>{String(index + 1).padStart(2, "0")}</em><div><small>{step.eyebrow} · {step.surface}</small><h3>{step.label}</h3></div></header><p>{step.detail}</p>{step.why ? <p className="docs-lab-why"><b>Why:</b> {step.why}</p> : null}{step.commands?.length ? <Code>{step.commands.join("\n")}</Code> : null}</article>)}</div></details>)}</div></div>
    </section>

    <section id="deploy" className="docs-section docs-visual-section"><span>08 · RUNTIME PLACEMENT</span><h2>Localhost is a learning placement, not the architecture.</h2><div className="docs-placement docs-placement-icons"><div><StackIcon kind="server" size={22}/><b>LOCAL / VM</b><span>Node beside the protected service. Use private runtime URL outside localhost.</span></div><div><StackIcon kind="docker" size={22}/><b>DOCKER</b><span>Use the app network; L4 sidecar sits beside the workload.</span></div><div><StackIcon kind="kubernetes" size={22}/><b>KUBERNETES</b><span>Node pools + L3/L4/L5/MCP; native workload identity can replace copied steady-state tokens.</span></div><div><StackIcon kind="cloud" size={22}/><b>CLOUD / PRIVATE</b><span>Private service/DNS, enterprise CA/secret stores and the same Scaniom Control/runtime contract.</span></div></div></section>

    <section id="proof" className="docs-section docs-visual-section"><span>09 · LIVE INTELLIGENCE + PROOF</span><h2>End with real runtime evidence.</h2>
      <Flow items={[{ icon: "api", label: "Real action" }, { icon: "scaniom", label: "Gate decision" }, { icon: "shield", label: "Trajectory" }, { icon: "terminal", label: "Signed proof" }]}/>
      <Code>{`scaniom attach status --workload $YOUR_WORKLOAD
scaniom live --env "$YOUR_ENVIRONMENT" --limit 20
scaniom trajectory list --limit 100
scaniom proof --window 24h --limit 10
scaniom proof correlated list --limit 50
scaniom explain <behavior-id>
scaniom verify <receipt-or-behavior-id>`}</Code>
      <p>Open Immune progressively visualizes this evidence. Until the real stream is connected, the UI does not generate synthetic Gate, trajectory or proof events.</p>
    </section>

    <footer className="docs-footer"><span>Repository guide</span><code>README.md · docs/start-here.md</code><Link href="/workbench">Continue to Labs →</Link></footer>
  </div>;
}
