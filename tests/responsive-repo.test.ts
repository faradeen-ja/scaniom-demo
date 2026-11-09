import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const globalCss = readFileSync("app/globals.css", "utf8");
const workbenchCss = readFileSync("components/workbench/OpenImmuneWorkbench.module.css", "utf8");
const immuneCss = readFileSync("components/ImmunityField.module.css", "utf8");

function block(source: string, start: string, end: string): string {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing responsive block ${start}`);
  return source.slice(a, b + end.length);
}

test("repo-wide public surfaces share one responsive system", () => {
  const css = block(globalCss, "OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4 START", "OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4 END");
  for (const token of [".app-header nav", ".home-immersive", ".docs-provider-grid", ".profile-layout", ".scope-layout", ".ois-auth-v2-grid", ".attachment-fabric-guide"]) assert.ok(css.includes(token), `missing responsive surface ${token}`);
  assert.match(css, /@media\(max-width:1180px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.doesNotMatch(globalCss, /OPEN-II RESPONSIVE REPO · FINAL V3|OPEN-II D04 EXEC4 · responsive shell repair/);
});

test("both Lab states stack without overlays on compact screens", () => {
  const css = block(workbenchCss, "OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 START", "OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 END");
  assert.match(css, /@media\(max-width:1500px\), \(hover:none\) and \(pointer:coarse\)/);
  assert.match(css, /container-name:openii-workbench/);
  assert.match(css, /@container openii-workbench \(max-width:1500px\)/);
  assert.match(css, /\.treePane,\.inspectorPane\{position:static!important[\s\S]*?z-index:auto!important/);
  assert.match(css, /\.libraryLayout\{display:block!important/);
  assert.match(css, /\.shell\{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important/);
  assert.match(css, /\.workspace,\.workspace\.intelCollapsed\{display:flex!important;flex-direction:column!important;grid-template:none!important/);
  assert.match(css, /\.treePane,\.matrixPane,\.inspectorPane,\.intelligencePane\{[\s\S]*?position:static!important[\s\S]*?grid-area:auto!important/);
  assert.match(css, /\.treePane\{order:1\}\.matrixPane\{order:2\}\.inspectorPane\{order:3\}\.intelligencePane\{order:4\}/);
  assert.match(css, /\.matrixPane\{[\s\S]*?overflow:hidden!important/);
  assert.doesNotMatch(css, /position:absolute!important[\s\S]*\.treePane|position:absolute!important[\s\S]*\.inspectorPane/);
  assert.doesNotMatch(workbenchCss, /Small screens use side drawers|panelRevealButton|treeHidden|inspectorHidden|OPEN-II D04 · clean two-pane controls/);
});

test("small phones keep technical canvases inside their own surfaces without page widening", () => {
  const css = block(workbenchCss, "OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 START", "OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 END");
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /\.architecturePreview\{min-height:390px!important/);
  assert.match(css, /\.matrixCanvas\{height:390px!important;min-height:390px!important/);
  assert.doesNotMatch(css, /width:560px|min-width:560px/);
});

test("responsive rebuild preserves canonical Matrix and provider Inspector styling", () => {
  assert.match(workbenchCss, /\.matrixResetButton\{/);
  assert.match(workbenchCss, /\.providerInspectorBlock\{/);
  assert.match(workbenchCss, /\.providerValuePanel\{/);
  assert.match(workbenchCss, /\.providerCardsGrid\{/);
});

test("home immunity visualization has one phone-safe responsive system", () => {
  const css = block(immuneCss, "OPEN-II IMMUNITY FIELD RESPONSIVE · SOURCE REBUILD V4 START", "OPEN-II IMMUNITY FIELD RESPONSIVE · SOURCE REBUILD V4 END");
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /\.motionStage\{inset:78px 0 58px;grid-template-columns:1fr 88px 1fr\}/);
  assert.match(css, /\.systemCaption>b\{font-size:8px;padding-inline:8px\}/);
  assert.doesNotMatch(immuneCss, /OPEN-II IMMUNITY FIELD RESPONSIVE · FINAL V3/);
});
