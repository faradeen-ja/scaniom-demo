import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const run = fs.readFileSync("demos/d06-l5-environment-gateway/run.sh", "utf8");
const readme = fs.readFileSync("demos/d06-l5-environment-gateway/README.md", "utf8");

test("D06 core acceptance is authenticated provider-neutral L5 guard execution", () => {
  assert.match(run, /\/v1\/runtime\/identity\/exchange/);
  assert.match(run, /credential\?\.token/);
  assert.match(run, /\/v1\/guard/);
  assert.match(run, /x-scaniom-workload-id/);
  assert.match(run, /SCANIOM_RUNTIME_TOKEN/);
  assert.match(run, /scn_ri_v1/);
  assert.match(run, /explicit least-privilege L5/i);
});

test("D06 waits for generation convergence instead of minting repeatedly", () => {
  assert.match(run, /control_generation/);
  assert.match(run, /token_generation/);
  assert.match(run, /scaniom_runtime_generation_stale/);
  assert.match(run, /health\?sync=1/);
  assert.match(run, /refusing to mint or rotate again blindly/);
});

test("D06 pins gateway listen and Node fabric ports independently", () => {
  assert.match(run, /SCANIOM_NODE_URL/);
  assert.match(run, /--node-url "\$NODE_URL"/);
  assert.match(run, /SCANIOM_L5_PORT:-8791/);
  assert.match(run, /127\.0\.0\.1:8787/);
  assert.match(run, /gateway targets/);
});

test("D06 closes only after gateway forwarding, exact L5 trajectory, and valid correlated proof", () => {
  assert.match(run, /forwarded counter did not advance/);
  assert.match(run, /trajectory show "\$correlation_id"/);
  assert.match(run, /attachmentSource/);
  assert.match(run, /"gateway"/);
  assert.match(run, /proof correlated verify "\$correlation_id"/);
  assert.match(run, /verification\?\.valid===true/);
  assert.match(run, /levels\.includes\("l5"\)/);
  assert.match(run, /D06 L5 ENVIRONMENT GATEWAY REAL EXECUTION PASS/);
});

test("D06 provider responses are additional proof, not a core L5 prerequisite", () => {
  assert.match(run, /SCANIOM_D06_PROVIDER_PROBE/);
  assert.match(run, /scaniom attach test l5/);
  assert.match(readme, /zero provider routes/i);
  assert.match(readme, /Provider-backed `\/v1\/responses` remains an additional proof/);
  assert.match(readme, /attachment_source=gateway/);
});
