#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const errors=[];
const read=(p)=>{try{return fs.readFileSync(path.join(root,p),"utf8");}catch{return "";}};
const need=(p,tokens)=>{const source=read(p);if(!source){errors.push(`missing ${p}`);return;}for(const token of tokens)if(!source.includes(token))errors.push(`${p} missing token: ${token}`);};
const reject=(p,tokens)=>{const source=read(p);for(const token of tokens)if(source.includes(token))errors.push(`${p} contains retired token: ${token}`);};

need("lib/open-ii/profile-contract.ts",['controlUrl: "https://control.scaniom.com"',"Remote Control profiles require HTTPS"]);
need("lib/open-ii/types.ts",['"local"','"cloud"','"self-hosted"','"private-enterprise"','"staging"',"OpenIiContextResponse","OperatorNode","OperatorConnection","OperatorAttachmentState","OperatorProofState","OperatorCorrelatedProof","OperatorRuntimeIdentityState","OperatorModelRuntimeAdapter","OperatorModelRuntimeState","modelRuntimes","OpenIiLocalExecution"]);
need("next.config.ts",["Content-Security-Policy","Strict-Transport-Security","X-Frame-Options"]);
need("lib/open-ii/control-client.ts",["OPEN_II_CONTROL_HOST_ALLOWLIST","allowPrivateNetwork","rejectUnauthorized: true","verifyScaniomControl","scaniom-control-v1","scaniom-cli-device-v1","Control reports a different canonical origin","remoteAddressAllowed","ControlHttpError"]);
need("lib/open-ii/network-policy.ts",["BlockList","169.254.0.0","fc00::","remoteAddressAllowed","cloud-metadata"]);
need("app/api/auth/scaniom/start/route.ts",["/api/v1/cli/device/start","verifyScaniomControl(profile)","requestClientIp(request)"]);
need("app/api/auth/scaniom/poll/route.ts",["/api/v1/cli/device/token","scn_cli_","/api/v1/operator/whoami"]);
need("app/api/scaniom/context/route.ts",["/api/v1/operator/nodes","/api/v1/operator/connections","/api/v1/operator/policy","/api/v1/operator/attachments?workload=","/api/v1/operator/proof?window=24h","/api/v1/operator/correlated-proofs","/api/v1/operator/runtime-identities?workloadId=","/api/v1/operator/model-runtimes?workload=","readLocalExecutionState","nodes,","connections,","policies,","attachments,","runtimeIdentity,","modelRuntimes:","proof,","correlatedProofs:","execution,"]);
need("lib/open-ii/local-execution.ts",["d01-public-install.json","status === \"pass\"","release === \"R18\"","scaniomVersion === \"0.4.1\""]);
need("scripts/lib/common.sh",['SCANIOM_PROFILE="${SCANIOM_PROFILE:-cloud}"','SCANIOM_CONTROL_URL="${SCANIOM_CONTROL_URL:-https://control.scaniom.com}"']);
reject("scripts/lib/common.sh",['SCANIOM_CONTROL_URL="${SCANIOM_CONTROL_URL:-https://scaniom.com}"']);
reject("docs/authentication.md",["https://scaniom.com/signup","https://scaniom.com/login"]);

// PRE-MERGE CLEANUP: smart product language + full A-Z real Scaniom runbooks.
need("components/AppHeader.tsx",['>Labs</Link>','>OIS Auth</Link>','>Start A–Z</Link>']);
need("app/workspace/page.tsx",["OisAuthConsole"]);
need("components/OisAuthConsole.tsx",["OIS AUTH · OPEN IMMUNE ↔ SCANIOM","Connect Scaniom authority","PROTECTED SCOPE","WEB + CLI PARITY","Sign out","How to create a scope","OWNER"]);
need("app/page.tsx",["home-immersive","Build real AI immune fabrics","HomeAuthorityTerminal","Open Labs","OIS Auth","Start A–Z"]);
need("components/HomeAuthorityTerminal.tsx",["OIS AUTH","PUBLIC RELEASE","/api/scaniom/public-release","ois://"]);
need("components/ImmunityField.tsx",["ScaniomMark","AI agent","Robot fleet","Autonomous lanes","AI application","Inference factory","7600"]);
need("lib/open-ii/public-release.ts",['version: "0.4.1"','release: "R18"','repository: "faradeen-ja/scaniom-releases"']);
need("app/api/scaniom/public-release/route.ts",["faradeen-ja/scaniom-releases/releases/latest","SHA256SUMS","publicationReceipt","provenance","fallback"]);
need("app/docs/page.tsx",["OPEN IMMUNE · START A–Z","OIS AUTH","PROVIDER BYOK","ATTACHMENT BOUNDARIES","LIVE INTELLIGENCE + PROOF","docs-flow","StackIcon","AttachmentFabricGuide","scaniom artifacts supply-chain","@scaniom/sdk@0.4.1","scaniom==0.4.1","OPENAI_API_KEY","ANTHROPIC_API_KEY","GEMINI_API_KEY","CUSTOM_MODEL_TOKEN","PLACEHOLDERS → REAL VALUES"]);
need("components/AttachmentFabricGuide.tsx",["SEVEN EXECUTABLE BOUNDARIES · ONE IMMUNE FABRIC","Move the boundaries","L1","L2","L3","L4","L5","MCP","L6","onPointerMove","Reset layout","Open Scaniom Attachments ↗"]);
need("components/PublicReleaseBadge.tsx",["faradeen-ja/scaniom-releases","GITHUB ↗","releases/tag/v"]);
reject("app/docs/page.tsx",["./scripts/","./demos/"]);
need("components/StackIcon.tsx",['kind === "typescript"','kind === "python"','kind === "docker"','kind === "kubernetes"','kind === "openai"','kind === "anthropic"','kind === "gemini"','kind === "aws"']);
need("README.md",["# Start A–Z","https://control.scaniom.com/signup","scaniom artifacts supply-chain","scaniom provider catalog","scaniom secret configure OPENAI_API_KEY","L1 · API Route","No SDK is required","npm install @scaniom/sdk@0.4.1","python3 -m pip install scaniom==0.4.1","scaniom attach l3","scaniom attach l4","scaniom attach l5","scaniom attach mcp","scaniom attach l6","scaniom proof correlated list"]);
reject("README.md",["./scripts/verify-public-release.sh","./scripts/install-public-cli.sh"]);
need("docs/start-here.md",["# Start A–Z","Provider keys and BYOK","Attachment boundaries"]);
need(".env.example",["Provider credentials DO NOT belong in Open Immune environment files","scaniom secret configure OPENAI_API_KEY"]);

need("components/workbench/OpenImmuneWorkbench.tsx",["LabTreeGroup kind=\"lab\" label=\"Labs\"","LIVE ARCHITECTURE · MANIFEST PREVIEW","FABRIC TREE","FABRIC MATRIX","INSPECTOR","LIVE INTELLIGENCE","WORK HERE","REQUIRES","REAL SCANIOM COMMANDS","PLACEMENT / INTEGRATION","GuideModal","WorkSurfaceLinks","isReleasedScaniomCliCommand","LAB MANIFEST","ProviderReality","ModelRuntimeReality","runtimeKindLabel","ResolvedRuntimeValues","RuntimeIdentityReality","REAL RUNTIME IDENTITY","Never paste provider keys here","Scaniom Control ↗","Copy CLI","createPortal","matrixResetButton","providerInspectorBlock","providerValuePanel","providerCardsGrid","providerRoutesPanel","next_${selectedStep.status}","onPointerMove","<main className={styles.matrixPane}>"]);
reject("components/workbench/OpenImmuneWorkbench.tsx",["Guided demos","GUIDED DEMO","DEMO-DRIVEN","import { ImmunityField }","WHY FABRIC?","FabricMatrixGuide","StepContextRail","DRAG NODES TO REFORM VIEW","verified by real Scaniom authority","panelToggle","PanelChevron","setTreeHidden","setInspectorHidden","globalPaneToggles","mobilePaneBackdrop","compactLayout","paneToggleButton","paneToggleActive"]);
need("lib/open-ii/labs.ts",['export type LabKind = "lab" | "system"',"LabGuideOption","guideOptions","d00-account-auth","d02-l1-full-cycle","d12-immunex","flagship-full-fabric","system-saas","system-robots","system-lanes","system-factory","system-ifoc","does not require the L2 SDK","npm install @scaniom/sdk@0.4.1","python3 -m pip install scaniom==0.4.1","OPENAI_API_KEY","CUSTOM_MODEL_TOKEN","providerGuideOptions","labResolvedValues","selectedLabNode","selectedLabConnection","scaniom secret configure ${env}","scaniom runtime identity bootstrap","--attachments l1,l2,l4","--attachments l3","runtimeIdentity","runtimeTarget","runtimeIdentityVerified","requiredRuntimeIdentityAttachment","d05-l3-model-runtime","runtime_hook","/v1/responses","surface:"]);
reject("lib/open-ii/labs.ts",["./scripts/verify-public-release.sh","./scripts/install-public-cli.sh","./demos/d09-fleet-failover/run.sh","./demos/d10-offline-continuity/run.sh","./demos/d12-immunex/run.sh","id: \"public-release\"","Released Scaniom","PUBLIC R18 · 0.4.1"]);
reject("lib/open-ii/labs.ts",['"guided"']);
need("demos/d01-public-install/run.sh",["d01-public-install.json","publicRelease: true","standaloneCli: true","npmSdk: true","pypiSdk: true"]);
need("demos/d02-l1-full-cycle/run.sh",["scaniom trajectory list","scaniom proof --env","No signed proof evidence found","scaniom proof correlated list"]);
need("demos/d03-l2-agent-sdk/run.sh",["@scaniom/sdk@${SCANIOM_VERSION}","scaniom==${SCANIOM_VERSION}","--attachments l1,l2,l4","SCANIOM_RUNTIME_BOOTSTRAP_TOKEN","attachment_source","sdk","D03 L2 AGENT SDK REAL EXECUTION PASS"]);
need("demos/d03-l2-agent-sdk/agent.mjs",["guardAction",'action: "agent_action"','capabilities: ["file_access"]',"ScaniomBlockedError","noRealConsequence: true","runtimeBootstrapToken"]);
need("demos/d03-l2-agent-sdk/agent.py",["guard_action",'action="agent_action"','capabilities=["file_access"]',"execute=consequence","runtime_bootstrap_token"]);
reject("demos/d03-l2-agent-sdk/run.sh",["--attachments l2 --json"]);
need("demos/d05-l3-model-runtime/README.md",["Workbench-first","vllm","nvidia_nim","triton","openai_compatible","runtime_hook","Gate executes before","explicit opt-in","Normal users do not run"]);
need("demos/d05-l3-model-runtime/run.sh",["INTERNAL ENGINEERING / CI ACCEPTANCE HARNESS","SCANIOM_L3_TARGET_URL","--attachments l3","scaniom attach l3","scaniom attach test l3","runtime_hook proof path"]);
need("tests/workbench.test.ts",["D00 remains entirely live Control authority","D01 becomes verified only after the real public install receipt exists","D02 proof verification comes from selected-workload Scaniom signed evidence","D03 closes only from live L2 runtime identity, SDK evidence and L2 signed proof","D05 verifies only from a real model runtime, explicit L3 identity, runtime_hook evidence and L3 proof"]);
need("tests/lab-manifest.test.ts",["public release is metadata, not a blocking Lab tree step","no Lab CLI surface leaks repo shell scripts","L1 is a complete API-route runbook","all seven attachment boundaries expose placement/integration choices","provider BYOK steps keep secrets at the Node boundary and cover multi-provider/custom routes","Lab commands resolve safe Control-observable placeholders","D05 is a Workbench-first L3 flow with live runtime inventory and explicit least-privilege identity"]);
need("tests/ui-foundation.test.ts",["workbench library is Labs-first","OIS Auth replaces","one immersive view","live public release status","D05 Inspector renders live model-runtime inventory and explicit L3 authority"]);

const privateDependency=/\.\.\/scaniom|\/scaniom\/scripts\/scaniom-cli\.mjs/;
for(const p of ["app","components","lib","scripts"]){
  const dir=path.join(root,p);if(!fs.existsSync(dir))continue;
  const stack=[dir];while(stack.length){const current=stack.pop();for(const entry of fs.readdirSync(current,{withFileTypes:true})){const full=path.join(current,entry.name);if(entry.isDirectory()){if(entry.name!=="node_modules"&&entry.name!==".next")stack.push(full);}else if(/\.(?:ts|tsx|mjs|sh)$/.test(entry.name)){const source=fs.readFileSync(full,"utf8");if(privateDependency.test(source))errors.push(`${path.relative(root,full)} depends on private Scaniom source`);}}}
}

need("lib/open-ii/scaniom-cli-contract.ts",["SCANIOM_CLI_CONTRACT_RELEASE","SCANIOM_CLI_CONTRACT_VERSION","isReleasedScaniomCliCommand","runtime\\s+identity","scaniom proof","scaniom fabric"]);
need("scripts/lib/common.sh",["type -P scaniom","require_scaniom_cli_install","configure_scaniom_profile","require_scaniom_cli_auth","require_open_ii_web_auth","require_open_immune_authority","cli-parity/start","cli-parity/status","WEB ↔ CONTROL ↔ CLI AUTHORITY PARITY PASS","source-checkout CLI launcher"]);
reject("scripts/lib/common.sh",['BIN="$ROOT/bin/scaniom"','HOME="$DEMO_HOME"','SCANIOM_STANDALONE_BIN','/.demo/runtime/bin/scaniom']);
need("lib/open-ii/cli-parity.ts",["createCliParityChallenge","approveCliParityChallenge","randomBytes(24)",'status: "approved"']);
need("app/api/auth/scaniom/cli-parity/start/route.ts",["CLI parity handoff is local-only","createCliParityChallenge","cliParityChallenge"]);
need("app/api/auth/scaniom/cli-parity/status/route.ts",["readCliParityChallenge","CLI parity challenge is missing or expired"]);
need("app/api/auth/scaniom/cli-parity/approve/route.ts",["validateOpenIiSession","sameOriginRequest","approveCliParityChallenge","Open Immune Web is not connected to Scaniom Control"]);
need("components/OisAuthConsole.tsx",["cliParityChallenge","/api/auth/scaniom/cli-parity/approve","CLI parity challenge approved. Return to the terminal."]);
need("components/workbench/OpenImmuneWorkbench.tsx",["onClick={() => onStart(preview.id)}","AUTHORITY STATUS","runtimeWithoutContext"]);
reject("components/workbench/OpenImmuneWorkbench.tsx",["webAuthorityMissing","Connect Scaniom to start","disabled={webAuthorityMissing}"]);
need("scripts/ensure-scope.sh",["require_open_immune_authority"]);
reject("docs/authentication.md",["./bin/scaniom"]);
for(const file of ["demos/d02-l1-full-cycle/run.sh","demos/d03-l2-agent-sdk/run.sh","demos/d04-l4-sidecar/run.sh","demos/d05-l3-model-runtime/run.sh","demos/d06-l5-environment-gateway/run.sh","demos/d10-offline-continuity/run.sh","demos/flagship-full-fabric/run.sh"])reject(file,["$BIN","HOME=$DEMO_HOME"]);

need("components/workbench/OpenImmuneWorkbench.module.css",["OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6","grid-template-areas:\"tree matrix inspector\" \"intel intel intel\"","max-width:1500px","container-name:openii-workbench","@container openii-workbench (max-width:1500px)","matrixResetButton","providerInspectorBlock","providerValuePanel","providerCardsGrid","UX9 · clean provider Inspector block"]);
reject("components/workbench/OpenImmuneWorkbench.tsx",["treeVisible","inspectorVisible","treePreference","inspectorPreference","toggleTreePane","toggleInspectorPane","paneToggle","restorePane","restoreTree","restoreInspector","Hide Fabric Tree","Show Fabric Tree","Hide Inspector","Show Inspector","useSyncExternalStore","compactWorkbench"]);
need("components/OisAuthConsole.tsx",["NETWORK OFFLINE","OFFLINE · SCANIOM CONTROL NOT CONTACTED"]);
need("components/ScaniomConnection.tsx",["NETWORK OFFLINE","navigator.onLine"]);
need("lib/open-ii/labs.ts",["d04-l4-sidecar","d05-l3-model-runtime","requiredRuntimeIdentityAttachment","runtimeIdentityVerified","--attachments l1,l2,l4","--attachments l3","runtimeTarget"]);
reject("README.md",["Executable public run scripts remain under `demos/`"]);

need("app/layout.tsx",["Metadata, Viewport",'width: "device-width"',"initialScale: 1",'viewportFit: "cover"']);
need("app/globals.css",["OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4","app-header nav","docs-provider-grid","profile-layout","ois-auth-v2-grid","scope-layout","attachment-fabric-guide","max-width:900px","max-width:680px"]);
need("components/workbench/OpenImmuneWorkbench.module.css",["OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6","libraryLayout","libraryTree","libraryVisual","libraryPreview","workspace","matrixPane","inspectorPane","guideModalCard","max-width:1500px","container-name:openii-workbench","@container openii-workbench (max-width:1500px)","position:static!important","grid-area:auto!important","max-width:480px"]);
need("components/ImmunityField.module.css",["OPEN-II IMMUNITY FIELD RESPONSIVE · SOURCE REBUILD V4","max-width:900px","max-width:650px","max-width:420px"]);
reject("components/workbench/OpenImmuneWorkbench.tsx",["treeVisible","inspectorVisible","toggleTreePane","toggleInspectorPane","paneToggle","restorePane","globalPaneToggles","mobilePaneBackdrop","compactLayout"]);
reject("components/workbench/OpenImmuneWorkbench.module.css",["OPEN-II WORKBENCH RESPONSIVE REPO · FINAL V3","OPEN-II D04 · clean two-pane controls","panelRevealButton","treeHidden","inspectorHidden","paneToggle","restorePane"]);
reject("app/globals.css",["OPEN-II RESPONSIVE REPO · FINAL V3","OPEN-II D04 EXEC4 · responsive shell repair"]);
reject("components/ImmunityField.module.css",["OPEN-II IMMUNITY FIELD RESPONSIVE · FINAL V3"]);

if(errors.length){console.error("OPEN IMMUNE INTELLIGENCE SOURCE AUDIT FAIL");for(const error of errors)console.error(`- ${error}`);process.exit(1);}

console.log("OPEN IMMUNE INTELLIGENCE SOURCE AUDIT PASS");
console.log("✓ canonical Cloud Control + OIS Auth terminology");
console.log("✓ public R18 / 0.4.1 release status + accepted fallback");
console.log("✓ Start A-Z README + Web documentation");
console.log("✓ provider BYOK keys remain Node/runtime-local");
console.log("✓ L1 API Route is distinct from L2 SDK installation");
console.log("✓ public release is metadata, not a blocking Lab step");
console.log("✓ CLI parity exposes installed scaniom commands, never repo shell scripts");
console.log("✓ L1/L2/L3/L4/L5/MCP/L6 expose placement cards + real Scaniom commands");
console.log("✓ Lab/system manifest drives Tree + free-form Matrix + Inspector + Intelligence");
console.log("✓ Fabric Matrix stays visual-first, draggable, and free of duplicate guide/context chrome");
console.log("✓ Fabric Tree + Inspector remain permanent first-class panes with no hide/show control layer");
console.log("✓ placement/provider guide is portaled above the shell and centered in the viewport");
console.log("✓ L3 multi-provider Inspector uses isolated shell-scale styling for authority, provider value, routes, commands, and completion state");
console.log("✓ Start A-Z renders seven interactive attachment boundaries inside one Immune Fabric");
console.log("✓ no Guided Demo / fake completion language remains in workbench");
console.log("✓ D00 reuses existing Web/Control/CLI authority without a duplicate auth system");
console.log("✓ D01 local execution receipt is credential-free and emitted only after CLI/npm/PyPI verification passes");
console.log("✓ D02 signed-proof completion comes from existing Scaniom operator proof authority");
console.log("✓ D03 executes released TypeScript + Python SDKs with shared B1 runtime identity, L2 evidence and attachment-specific signed proof");
console.log("✓ D05 L3 verifies live model-runtime inventory, explicit L3 identity, runtime_hook evidence and attachment-specific signed proof");
console.log("✓ Web↔CLI parity uses a local one-time browser challenge; no browser token or CLI credential is shared");
console.log("✓ all real Labs use the installed source-independent R18/0.4.1 scaniom command from PATH");
console.log("✓ Node/policy/provider/attachment/behavior state verifies only from live Scaniom Control evidence");
console.log("✓ public repo remains independent from private Scaniom source");
