import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { LAB_CATALOG } from "../lib/open-ii/labs";

const read = (path: string) => fs.readFileSync(path, "utf8");
const LABS = [
  "d00-account-auth", "d01-public-install", "d02-l1-full-cycle", "d03-l2-agent-sdk",
  "d04-l4-sidecar", "d05-l3-model-runtime", "d06-l5-environment-gateway", "d07-mcp-gateway",
  "d08-l6-provider-native", "d09-fleet-failover", "d10-offline-continuity", "d11-multi-provider",
  "d12-immunex", "flagship-full-fabric",
];

const README_PATHS = Object.fromEntries(LABS.map((id) => [id, `demos/${id}/README.md`]));

test("public Open Immune surfaces teach native Scaniom, never repository shell harnesses", () => {
  for (const path of ["README.md", "docs/start-here.md", "docs/PUBLIC-EXPERIENCE-RUNBOOK.md", "docs/LAB-COMMAND-MATRIX.md", "app/docs/page.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /(?:bash|\.\/)\s+demos\/d\d\d-[^\s`]+\/run\.sh/, `${path} advertises an internal Lab harness as a public action`);
  }
  const web = read("app/docs/page.tsx");
  assert.match(web, /LAB_CATALOG/);
  assert.match(web, /PUBLIC NATIVE LAB RUNBOOKS/);
  assert.match(web, /lab\.steps\.map/);
  assert.match(web, /No repository shell harness is a public Lab prerequisite/);
  assert.doesNotMatch(web, /demos\//);
});

test("every D00-D12 and Flagship README separates public native flow from internal acceptance", () => {
  for (const id of LABS) {
    const source = read(README_PATHS[id]);
    assert.match(source, /Public \/ native Scaniom flow/);
    assert.match(source, /Internal \/ engineering acceptance/);
    assert.match(source, /Normal (?:Open Immune )?users do not run|Normal users do not run/i);
    if (!["d00-account-auth", "d01-public-install"].includes(id)) assert.match(source, /scaniom /);
  }
});

test("canonical public packet covers every Lab and every frozen attachment boundary", () => {
  const matrix = read("docs/LAB-COMMAND-MATRIX.md");
  const packet = read("docs/OPEN-IMMUNE-END-TO-END-PACKET.md");
  const boundary = read("docs/BOUNDARY-REFERENCE.md");
  for (const code of ["D00","D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","Flagship"]) {
    assert.ok(matrix.includes(code), `command matrix missing ${code}`);
    assert.ok(packet.includes(code), `packet missing ${code}`);
  }
  for (const level of ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"]) {
    assert.ok(matrix.includes(level), `matrix missing ${level}`);
    assert.ok(boundary.includes(level), `boundary reference missing ${level}`);
    assert.ok(packet.includes(level), `packet missing ${level}`);
  }
});

test("Lab manifests remain the public command source and contain no internal run.sh prerequisite", () => {
  for (const lab of LAB_CATALOG) {
    for (const step of lab.steps) {
      for (const command of step.commands || []) assert.doesNotMatch(command, /demos\/|run\.sh/, `${lab.id}:${step.id}`);
      for (const option of step.guideOptions || []) for (const command of option.commands || []) assert.doesNotMatch(command, /demos\/|run\.sh/, `${lab.id}:${step.id}:${option.id}`);
    }
  }
});

test("internal engineering guide freezes acceptance, receipt, GitHub authorization, and D10 full matrix rules", () => {
  const guide = read("docs/INTERNAL-ENGINEERING-RUNBOOK.md");
  for (const token of [
    "npm run accept:local", "A1 LOCAL_ACCEPTED", "explicit authorization", "gh pr create", "gh pr checks --watch",
    "demos/d10-offline-continuity/run.sh", "14 unique consequences", "seven E1 trajectories", "7 VALID E2 correlated proofs",
    ".demo/", ".open-ii-backups/", "up-patches/",
  ]) assert.ok(guide.includes(token), `internal guide missing ${token}`);
});

test("repo architecture language calls demos internal acceptance harnesses, not public user scripts", () => {
  const architecture = read("docs/architecture.md");
  const start = read("docs/start-here.md");
  assert.doesNotMatch(architecture, /executable public Lab scripts under demos/);
  assert.doesNotMatch(start, /Executable public run scripts remain under `demos\/`/);
  assert.match(architecture, /internal engineering\/CI acceptance harnesses/);
  assert.match(start, /internal engineering\/CI acceptance harnesses/);
});


test("root onboarding includes verified standalone CLI install and user-owned naming conventions", () => {
  const root = read("README.md");
  const start = read("docs/start-here.md");
  for (const source of [root, start]) {
    assert.match(source, /Install the released Scaniom CLI/);
    assert.match(source, /r18-standalone-\$SCANIOM_TARGET\.tar\.gz/);
    assert.match(source, /SHA256SUMS/);
    assert.match(source, /YOUR_NODE_NAME/);
    assert.match(source, /scaniom node list/);
    assert.doesNotMatch(source, /--node prod-ai-01/);
    assert.doesNotMatch(source, /--workload customer-agent/);
  }
});

test("public README books have branded visual architecture and keep scripts internal", () => {
  assert.match(read("README.md"), /```mermaid/);
  for (const id of LABS) {
    const source = read(README_PATHS[id]);
    assert.match(source, /```mermaid/);
    assert.match(source, /PUBLIC \/ NATIVE SCANIOM/);
    assert.match(source, /INTERNAL \/ ACCEPTANCE/);
  }
});

test("native command matrix uses shell variables instead of copy-dangerous common placeholders", () => {
  const source = read("docs/LAB-COMMAND-MATRIX.md");
  for (const token of ["YOUR_ENVIRONMENT", "YOUR_WORKLOAD", "YOUR_NODE_NAME", "YOUR_MODEL"]) assert.ok(source.includes(token));
  assert.match(source, /Never copy angle-bracket placeholders/);
});
