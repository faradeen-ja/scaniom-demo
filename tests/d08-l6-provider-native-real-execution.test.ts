import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("D08 runner uses released L6 bridge and a real custom adapter consequence", () => {
  const run = read("demos/d08-l6-provider-native/run.sh");
  for (const token of [
    "SCANIOM_NODE_URL",
    "--node-url",
    "--attachments l6",
    "reference-adapter.mjs",
    "provider_native",
    "custom_action",
    "pre + post",
    "proof correlated verify",
    "OPEN IMMUNE · D08 L6 PROVIDER NATIVE REAL EXECUTION PASS",
  ]) assert.ok(run.includes(token), `missing D08 runner token: ${token}`);
  assert.doesNotMatch(run, /\$BIN|HOME=\$DEMO_HOME|SCANIOM_STANDALONE_BIN/);
});

test("D08 reference adapter gates before exactly one consequence and observes afterward", () => {
  const adapter = read("demos/d08-l6-provider-native/reference-adapter.mjs");
  const guard = adapter.indexOf('bridge("/v1/guard"');
  const consequence = adapter.indexOf("appendFileSync(ledgerPath");
  const observe = adapter.indexOf('bridge("/v1/observe"');
  assert.ok(guard >= 0 && consequence > guard && observe > consequence);
  assert.match(adapter, /preBehaviorEventId: guard\.behaviorEventId/);
  assert.match(adapter, /outcome: consequenceError \? "error" : "success"/);
  assert.match(adapter, /contextDigest/);
  assert.match(adapter, /contentStored: false/);
  assert.doesNotMatch(adapter, /providerFetch|OPENAI_API_KEY|ANTHROPIC_API_KEY|NVIDIA_API_KEY/);
});

test("D08 public guide distinguishes guard-only CLI test from real adapter completion", () => {
  const readme = read("demos/d08-l6-provider-native/README.md");
  assert.match(readme, /synthetic guard only/i);
  assert.match(readme, /cannot close D08/i);
  assert.match(readme, /pre \+ post/);
  assert.match(readme, /VALID L6 correlated proof/);
  assert.match(readme, /Vendor-specific privileged adapters remain separate integrations/);
});

test("shared scope setup is convergent instead of publishing an identical policy every Lab run", () => {
  const scope = read("scripts/ensure-scope.sh");
  assert.match(scope, /scaniom policy list/);
  assert.match(scope, /policy already matches enforce \/ general/);
  assert.match(scope, /scaniom policy set --env "\$ENV_NAME" --mode enforce --profile general/);
});
