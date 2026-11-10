import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("workbench library is Labs-first and renders selected manifest architecture", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(source, /LabTreeGroup kind="lab" label="Labs"/);
  assert.match(source, /LIVE ARCHITECTURE · MANIFEST PREVIEW/);
  assert.match(source, /ArchitecturePreview/);
  assert.match(source, /lab\.topology\.nodes/);
  assert.doesNotMatch(source, /Guided demos|GUIDED DEMO/);
  assert.doesNotMatch(source, /import \{ ImmunityField \}/);
});

test("library preview does not start a Lab until the explicit Start action", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(source, /CLICK TO INSPECT/);
  assert.match(source, /onStart\(preview\.id\)/);
  assert.match(source, /Selection redraws the center architecture/);
});

test("inspector exposes where to work, real commands and runtime integration code", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  for (const token of ["WORK HERE", "REQUIRES", "REAL SCANIOM COMMANDS", "PLACEMENT / INTEGRATION", "GuideModal", "WorkSurfaceLinks", "Scaniom Control ↗", "Copy CLI"]) assert.match(source, new RegExp(token));
  assert.match(source, /isReleasedScaniomCliCommand/);
  assert.match(source, /guideOptions/);
  assert.match(source, /ProviderReality/);
  assert.match(source, /ResolvedRuntimeValues/);
  assert.match(source, /Never paste provider keys here/);
});

test("D03 Inspector shows real runtime identity authority without exposing bootstrap material", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(source, /RuntimeIdentityReality/);
  assert.match(source, /REAL RUNTIME IDENTITY/);
  assert.match(source, /\/console\/settings\/runtime-access/);
  assert.match(source, /--attachments l1,l2,l4/);
  assert.match(source, /never receives the copy-once bootstrap/i);
});

test("OIS Auth replaces the card-stack context page", () => {
  const page = read("app/workspace/page.tsx");
  const auth = read("components/OisAuthConsole.tsx");
  assert.match(page, /OisAuthConsole/);
  for (const token of ["OIS AUTH", "Connect Scaniom authority", "PROTECTED SCOPE", "WEB + CLI PARITY", "Sign out", "How to create a scope", "OWNER"]) assert.ok(auth.includes(token), `missing OIS Auth token: ${token}`);
  assert.doesNotMatch(page, /ContextActivation|WorkspaceContext/);
});

test("home is one immersive view with one technical authority terminal", () => {
  const page = read("app/page.tsx");
  assert.match(page, /home-immersive/);
  assert.match(page, /HomeAuthorityTerminal/);
  assert.match(page, /Open Labs/);
  assert.match(page, /OIS Auth/);
  assert.doesNotMatch(page, /home-flow|home-connect|ScaniomConnection/);
});

test("home immune field uses the Scaniom mark and slower system transitions", () => {
  const source = read("components/ImmunityField.tsx");
  assert.match(source, /ScaniomMark/);
  assert.match(source, /7600/);
  for (const token of ["AI agent", "Robot fleet", "Autonomous lanes", "AI application", "Inference factory"]) assert.match(source, new RegExp(token));
  assert.doesNotMatch(source, /2,450,364|938,633|15,724/);
});

test("Start A-Z docs and live public release status are first-class surfaces", () => {
  const docs = read("app/docs/page.tsx");
  const release = read("app/api/scaniom/public-release/route.ts");
  const header = read("components/AppHeader.tsx");
  assert.match(header, /Start A–Z/);
  for (const token of ["OIS AUTH", "PROVIDER BYOK", "ATTACHMENT BOUNDARIES", "LIVE INTELLIGENCE + PROOF", "docs-flow", "StackIcon", "scaniom artifacts supply-chain"]) assert.ok(docs.includes(token), `missing docs token: ${token}`);
  assert.match(release, /faradeen-ja\/scaniom-releases\/releases\/latest/);
  assert.match(release, /fallback/);
});


test("placement guides portal to the viewport instead of being clipped by the workbench shell", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  const css = read("components/workbench/OpenImmuneWorkbench.module.css");
  assert.match(source, /GuideModal/);
  assert.match(source, /setGuideModalOpen\(true\)/);
  assert.match(source, /createPortal/);
  assert.match(source, /document\.body/);
  assert.match(css, /\.guideModal\{/);
  assert.match(css, /z-index:10000/);
  assert.match(css, /inset:0/);
});

test("provider selection exposes all released provider paths even when a lab has one default", () => {
  const labs = read("lib/open-ii/labs.ts");
  for (const token of ["OpenAI", "Anthropic", "Gemini", "Bedrock", "Custom / private"]) assert.match(labs, new RegExp(token));
  assert.match(labs, /function providerGuideOptions\(\): LabGuideOption\[\]/);
  for (const id of ["openai", "anthropic", "gemini", "bedrock", "custom"]) assert.match(labs, new RegExp(`id: "${id}"`));
  assert.doesNotMatch(labs, /const include = \(_needle: string\) => true/);
});


test("Fabric Matrix keeps permanent Fabric Tree and Inspector with no hide/show control layer", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  const css = read("components/workbench/OpenImmuneWorkbench.module.css");
  for (const retired of ["PanelChevron", "setTreeHidden", "setInspectorHidden", "FabricMatrixGuide", "StepContextRail", "DRAG NODES TO REFORM VIEW", "WHY FABRIC?", "treeVisible", "inspectorVisible", "toggleTreePane", "toggleInspectorPane", "paneToggle", "restorePane", "Hide Fabric Tree", "Show Fabric Tree", "Hide Inspector", "Show Inspector"]) assert.doesNotMatch(source, new RegExp(retired.replace(/[?]/g, "\\?")));
  assert.match(source, /<aside className=\{styles\.treePane\}>/);
  assert.match(source, /<aside className=\{styles\.inspectorPane\}>/);
  assert.match(source, /onPointerMove/);
  assert.match(source, /className=\{styles\.matrixResetButton\}/);
  assert.match(css, /OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6/);
  assert.match(css, /grid-template-areas:"tree matrix inspector" "intel intel intel"/);
  assert.match(css, /\.matrixResetButton\{/);
  assert.match(css, /\.providerInspectorBlock\{/);
});

test("L3 multi-provider value card owns its rows and never uses the legacy horizontal flow", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  const css = read("components/workbench/OpenImmuneWorkbench.module.css");
  for (const token of ["providerInspectorBlock", "providerAuthorityStack", "providerValuePanel", "providerValueHeading", "providerValuePath", "providerValueStageCard", "providerCardsGrid", "providerRouteCard", "providerRoutesPanel"]) assert.match(source, new RegExp(token));
  assert.match(source, /MULTI-PROVIDER VALUE/);
  assert.match(source, /One workload identity\. Many upstreams\. One Gate \+ trajectory\./);
  assert.match(css, /\.providerInspectorBlock\{/);
  assert.match(css, /\.providerValuePanel\{/);
  assert.match(css, /\.providerCardsGrid\{/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});


test("provider Inspector uses one authoritative styled shell and status-aware completion cards", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  const css = read("components/workbench/OpenImmuneWorkbench.module.css");
  assert.match(source, /next_\$\{selectedStep\.status\}/);
  for (const token of ["providerInspectorBlock", "providerAuthorityCard", "providerValuePanel", "providerRoutesPanel", "providerRoutesAction", "commandList", "inspectorNext"]) assert.match(css, new RegExp(`\\.${token}\\{`));
  for (const token of ["next_verified", "next_ready", "next_locked"]) assert.match(css, new RegExp(`\\.${token}\\{`));
  assert.match(css, /UX9 · clean provider Inspector block/);
});

test("Start A-Z exposes the interactive seven-boundary Immune Fabric and GitHub release destination", () => {
  const docs = read("app/docs/page.tsx");
  const fabric = read("components/AttachmentFabricGuide.tsx");
  const release = read("components/PublicReleaseBadge.tsx");
  assert.match(docs, /AttachmentFabricGuide/);
  assert.match(fabric, /SEVEN EXECUTABLE BOUNDARIES · ONE IMMUNE FABRIC/);
  assert.match(fabric, /onPointerMove/);
  for (const level of ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"]) assert.ok(fabric.includes(level), `missing ${level}`);
  assert.match(release, /faradeen-ja\/scaniom-releases/);
  assert.match(release, /GITHUB ↗/);
});


test("Workbench exposes only commands accepted by the released CLI contract", () => {
  const workbench = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(workbench, /isReleasedScaniomCliCommand/);
  assert.doesNotMatch(workbench, /function isScaniomCliCommand/);
});

test("Lab selector always enters the real Fabric-building workspace while authority gates steps inside the Lab", () => {
  const workbench = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(workbench, /onClick=\{\(\) => onStart\(preview\.id\)\}/);
  assert.match(workbench, /Go to \{preview\.kind === "lab" \? "Lab" : "System Lab"\}/);
  assert.match(workbench, /runtimeWithoutContext/);
  assert.doesNotMatch(workbench, /webAuthorityMissing/);
  assert.doesNotMatch(workbench, /Connect Scaniom to start/);
  assert.doesNotMatch(workbench, /disabled=\{webAuthorityMissing\}/);
});

test("CLI parity challenge proves live Web authorization without sharing the browser token", () => {
  const parity = read("lib/open-ii/cli-parity.ts");
  const approve = read("app/api/auth/scaniom/cli-parity/approve/route.ts");
  const consoleSource = read("components/OisAuthConsole.tsx");
  const common = read("scripts/lib/common.sh");
  assert.match(parity, /randomBytes\(24\)/);
  assert.match(approve, /validateOpenIiSession/);
  assert.match(approve, /sameOriginRequest/);
  assert.doesNotMatch(approve, /session\.token/);
  assert.match(consoleSource, /cliParityChallenge/);
  assert.match(consoleSource, /cli-parity\/approve/);
  assert.match(common, /cli-parity\/start/);
  assert.match(common, /cli-parity\/status/);
  assert.match(common, /no browser token is shared with the CLI/);
});


test("Workbench responsive flow keeps Tree and Inspector visible without toggle state or blackout layers", () => {
  const workbench = read("components/workbench/OpenImmuneWorkbench.tsx");
  const css = read("components/workbench/OpenImmuneWorkbench.module.css");
  assert.match(workbench, /FABRIC TREE/);
  assert.match(workbench, /INSPECTOR/);
  for (const retired of ["treeVisible", "inspectorVisible", "toggleTreePane", "toggleInspectorPane", "paneToggle", "restorePane", "globalPaneToggles", "mobilePaneBackdrop", "compactLayout", "useSyncExternalStore"]) assert.doesNotMatch(workbench, new RegExp(retired));
  assert.match(css, /OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6/);
  assert.match(css, /max-width:1500px/);
  assert.match(css, /\.workspace,\.workspace\.intelCollapsed\{display:flex!important;flex-direction:column!important;grid-template:none!important/);
  assert.match(css, /\.providerInspectorBlock\{/);
});

test("OIS Auth and Scaniom connection expose explicit offline state without launching Control", () => {
  const auth = read("components/OisAuthConsole.tsx");
  const connection = read("components/ScaniomConnection.tsx");
  assert.match(auth, /NETWORK OFFLINE/);
  assert.match(auth, /OFFLINE · SCANIOM CONTROL NOT CONTACTED/);
  assert.match(connection, /NETWORK OFFLINE/);
  assert.match(connection, /navigator\.onLine/);
});


test("repo-wide responsive foundation covers both Lab states and every public surface", () => {
  const globalCss = read("app/globals.css");
  const workbenchCss = read("components/workbench/OpenImmuneWorkbench.module.css");
  const immuneCss = read("components/ImmunityField.module.css");
  for (const token of ["OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4", ".app-header nav", ".docs-provider-grid", ".profile-layout", ".ois-auth-v2-grid", ".scope-layout", ".attachment-fabric-guide"]) assert.ok(globalCss.includes(token), `missing V4 global responsive token: ${token}`);
  for (const token of ["OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6", ".libraryLayout", ".libraryTree", ".libraryVisual", ".libraryPreview", ".workspace", ".matrixPane", ".inspectorPane", ".guideModalCard"]) assert.ok(workbenchCss.includes(token), `missing V5 Workbench responsive token: ${token}`);
  assert.match(workbenchCss, /@media\(max-width:1500px\), \(hover:none\) and \(pointer:coarse\)/);
  assert.match(workbenchCss, /\.libraryLayout\{display:block!important/);
  assert.match(workbenchCss, /\.workspace,\.workspace\.intelCollapsed\{display:flex!important;flex-direction:column!important;grid-template:none!important/);
  assert.match(workbenchCss, /\.treePane,\.matrixPane,\.inspectorPane,\.intelligencePane\{[\s\S]*position:static!important[\s\S]*grid-area:auto!important[\s\S]*width:100%!important/);
  assert.match(workbenchCss, /\.treePane\{order:1\}\.matrixPane\{order:2\}\.inspectorPane\{order:3\}\.intelligencePane\{order:4\}/);
  assert.match(workbenchCss, /@media\(max-width:480px\)/);
  assert.match(immuneCss, /OPEN-II IMMUNITY FIELD RESPONSIVE · SOURCE REBUILD V4/);
  assert.match(immuneCss, /@media\(max-width:420px\)/);
  assert.match(globalCss, /overflow-x:hidden/);
});


test("D05 Inspector renders live model-runtime inventory and explicit L3 authority", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(source, /function ModelRuntimeReality/);
  assert.match(source, /REAL MODEL RUNTIMES FROM SCANIOM CONTROL/);
  assert.match(source, /Gate before inference/);
  assert.match(source, /--attachments l3/);
  assert.match(source, /lab\.id === "d05-l3-model-runtime"/);
});

test("D06 Inspector renders live L5 gateway state and explicit L5 authority", () => {
  const source = read("components/workbench/OpenImmuneWorkbench.tsx");
  assert.match(source, /function EnvironmentGatewayReality/);
  assert.match(source, /REAL L5 GATEWAY STATE FROM SCANIOM CONTROL/);
  assert.match(source, /L5 is shared environment ingress, not shared identity/);
  assert.match(source, /--attachments l5/);
  assert.match(source, /\["runtime-identity", "attach-l2", "attach-l3", "attach-l5", "attach-mcp"\]/);
});
