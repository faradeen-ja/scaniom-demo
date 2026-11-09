import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workbench = fs.readFileSync("components/workbench/OpenImmuneWorkbench.module.css", "utf8");
const globals = fs.readFileSync("app/globals.css", "utf8");
const component = fs.readFileSync("components/workbench/OpenImmuneWorkbench.tsx", "utf8");

function between(source: string, start: string, end: string): string {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing responsive block ${start}`);
  return source.slice(a, b + end.length);
}

test("compact started Workbench uses normal vertical document flow and permanent panes", () => {
  const block = between(workbench,
    "/* OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 START */",
    "/* OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 END */");
  assert.match(block, /@media\(max-width:1500px\), \(hover:none\) and \(pointer:coarse\)/);
  assert.match(block, /container-name:openii-workbench/);
  assert.match(block, /@container openii-workbench \(max-width:1500px\)/);
  assert.match(block, /\.treePane,\.inspectorPane\{position:static!important[\s\S]*?z-index:auto!important[\s\S]*?transform:none!important/);
  assert.match(block, /\.workspace,\.workspace\.intelCollapsed\{display:flex!important;flex-direction:column!important;grid-template:none!important/);
  assert.match(block, /\.treePane,\.matrixPane,\.inspectorPane,\.intelligencePane\{[\s\S]*?position:static!important[\s\S]*?z-index:auto!important[\s\S]*?grid-area:auto!important[\s\S]*?width:100%!important/);
  assert.match(block, /\.treePane\{order:1\}\.matrixPane\{order:2\}\.inspectorPane\{order:3\}\.intelligencePane\{order:4\}/);
  assert.match(block, /\.treePane\{[\s\S]*?border-right:0!important/);
  assert.match(block, /\.inspectorPane\{[\s\S]*?border-left:0!important/);
  assert.doesNotMatch(component, /treeVisible|inspectorVisible|toggleTreePane|toggleInspectorPane|mobilePaneBackdrop|paneEdgeControls|restorePane|compactLayout/);
  assert.doesNotMatch(workbench, /panelRevealButton|treeHidden|inspectorHidden|paneToggle|restoreTree|restoreInspector/);
});

test("pre-Lab library uses the same compact single-column ownership", () => {
  const block = between(workbench,
    "/* OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 START */",
    "/* OPEN-II WORKBENCH RESPONSIVE SYSTEM · SOURCE REBUILD V6 END */");
  assert.match(block, /\.libraryLayout\{display:block!important/);
  assert.match(block, /\.libraryTree,\.libraryVisual,\.libraryPreview\{[\s\S]*?width:100%!important/);
  assert.match(block, /\.libraryTree\{[\s\S]*?border-bottom:1px solid var\(--line\)!important/);
  assert.match(block, /\.libraryVisual\{[\s\S]*?min-height:540px/);
  assert.match(block, /\.libraryPreview\{[\s\S]*?overflow:visible!important/);
});

test("global compact shell is viewport-contained with scrollable navigation", () => {
  const block = between(globals,
    "/* OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4 START */",
    "/* OPEN-II RESPONSIVE SYSTEM · SOURCE REBUILD V4 END */");
  assert.match(block, /html,body\{width:100%;max-width:100%;min-width:0;overflow-x:hidden\}/);
  assert.match(block, /@media\(max-width:900px\)/);
  assert.match(block, /\.app-header nav\{[\s\S]*?overflow-x:auto/);
  assert.match(block, /\.app-header nav a\{flex:0 0 auto/);
  assert.match(block, /\.docs-provider-grid,\.docs-choice-grid,\.docs-placement,\.docs-placement-icons\{grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(block, /\.ois-auth-v2-grid,\.ois-auth-parity-grid,\.ois-auth-current-v2,\.ois-auth-modal-grid\{grid-template-columns:minmax\(0,1fr\)!important/);
});


test("mobile viewport metadata is explicit so device-width breakpoints actually fire", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /Metadata, Viewport/);
  assert.match(layout, /width: "device-width"/);
  assert.match(layout, /initialScale: 1/);
  assert.match(layout, /viewportFit: "cover"/);
});
