import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("D06 keeps provider-neutral L5 completion explicit", () => {
  const source = read("demos/d06-l5-environment-gateway/README.md");
  assert.match(source, /zero provider routes/i);
  assert.match(source, /Provider-backed `\/v1\/responses` remains an additional proof/);
  assert.match(source, /attachment_source=gateway/);
});

test("D07 keeps the canonical public-vs-harness wording", () => {
  const source = read("demos/d07-mcp-gateway/README.md");
  assert.match(source, /Normal (?:Open Immune )?users do not run/i);
  assert.match(source, /real Streamable HTTP MCP/);
  assert.match(source, /Gate executes \*\*before\*\* `tools\/call`/);
});

test("D08 preserves generic-framework versus vendor-privileged adapter boundary", () => {
  const source = read("demos/d08-l6-provider-native/README.md");
  assert.match(source, /Vendor-specific privileged adapters remain separate integrations/);
  assert.match(source, /synthetic guard only/i);
  assert.match(source, /cannot close D08/i);
  assert.match(source, /VALID L6 correlated proof/);
  assert.match(source, /Normal Open Immune users do not run this harness/);
});

test("D09 keeps the canonical public-vs-harness wording", () => {
  const source = read("demos/d09-fleet-failover/README.md");
  assert.match(source, /Normal Open Immune users do not run this harness/);
  assert.match(source, /pre_dispatch_health_failover_no_ambiguous_replay/);
});

test("D10 preserves all accepted real-time and boundary semantics", () => {
  const source = read("demos/d10-offline-continuity/README.md");
  assert.match(source, /L1 and L4 use the real provider-proxy runtime semantics/);
  assert.match(source, /does \*\*not\*\* wait four hours/);
  assert.match(source, /does not fast-forward, edit Node state, or simulate lease-expiry exhaustion/);
  for (const level of ["L1", "L2", "L3", "L4", "L5", "MCP", "L6"]) assert.match(source, new RegExp(`\\b${level}\\b`));
});

test("Web Start A-Z prose cannot be parsed as an invented scaniom-through command", () => {
  const source = read("app/docs/page.tsx");
  assert.doesNotMatch(source, /scaniom\s+through\b/i);
  assert.match(source, /expose the installed binary through ~\/\.local\/bin/);
});
