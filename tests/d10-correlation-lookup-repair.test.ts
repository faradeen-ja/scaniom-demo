import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const read=(p:string)=>fs.readFileSync(p,"utf8");

test("D10 derives Scaniom correlation IDs from privacy-minimized evidence session IDs",()=>{
  const source=read("demos/d10-offline-continuity/matrix-client.mjs");
  assert.match(source,/evidenceSessionId=`sha256:\$\{createHash\("sha256"\)\.update\(session\)/);
  assert.match(source,/scaniom-correlation-v1\\0\$\{workloadId\}\\0\$\{evidenceSessionId\}/);
  assert.match(source,/expectedCorrelationId/);
  const session="open-ii-d10-test-l1",workload="237b2641-6208-4cab-99bd-1f63ec323e83";
  const evidence=`sha256:${crypto.createHash("sha256").update(session).digest("hex")}`;
  const corr=`scn_corr_${crypto.createHash("sha256").update(`scaniom-correlation-v1\0${workload}\0${evidence}`).digest("hex")}`;
  assert.match(corr,/^scn_corr_[a-f0-9]{64}$/);
});

test("D10 Control trajectory and proof lookups never use the raw session id",()=>{
  const source=read("demos/d10-offline-continuity/run.sh");
  assert.match(source,/correlation_for\(\)/);
  assert.match(source,/scaniom trajectory show "\$ref"/);
  assert.match(source,/scaniom proof correlated verify "\$ref"/);
  assert.doesNotMatch(source,/scaniom trajectory show "\$session"/);
  assert.doesNotMatch(source,/scaniom proof correlated verify "\$session"/);
});

test("D10 correlation lookup remains diagnostic per boundary",()=>{
  const source=read("demos/d10-offline-continuity/run.sh");
  assert.match(source,/trajectory lookup failed for \$\{ref\}/);
  assert.match(source,/trajectory present but does not yet satisfy \$\{stage\} semantics/);
});
