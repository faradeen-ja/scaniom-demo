import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read=(p:string)=>fs.readFileSync(p,"utf8");

const labs=[
  "d00-account-auth","d01-public-install","d02-l1-full-cycle","d03-l2-agent-sdk",
  "d04-l4-sidecar","d05-l3-model-runtime","d06-l5-environment-gateway","d07-mcp-gateway",
  "d08-l6-provider-native","d09-fleet-failover","d10-offline-continuity","d11-multi-provider",
  "d12-immunex","flagship-full-fabric",
];
const systems=["system-saas","system-robots","system-lanes","system-factory","system-ifoc"];

test("every focused Lab/Flagship README remains visual and separates native public flow from acceptance harness",()=>{
  for(const id of labs){
    const s=read(`demos/${id}/README.md`);
    assert.match(s,/```mermaid/);
    assert.match(s,/PUBLIC \/ NATIVE SCANIOM/);
    assert.match(s,/Public \/ native Scaniom flow/);
    assert.match(s,/Internal \/ engineering acceptance/);
  }
});

test("D07/D08/D09 preserve accepted execution semantics after visual documentation changes",()=>{
  const d07=read("demos/d07-mcp-gateway/README.md");
  for(const token of ["real Streamable HTTP MCP","Gate executes **before** `tools/call`","pre + post"]) assert.ok(d07.includes(token),`D07 missing ${token}`);
  const d08=read("demos/d08-l6-provider-native/README.md");
  for(const token of ["synthetic guard only","cannot close D08","pre + post","VALID L6 correlated proof"]) assert.ok(d08.includes(token),`D08 missing ${token}`);
  const d09=read("demos/d09-fleet-failover/README.md");
  for(const token of ["two real Scaniom Nodes","pre_dispatch_health_failover_no_ambiguous_replay","Control D3","runtime URLs"]) assert.ok(d09.includes(token),`D09 missing ${token}`);
});

test("all five Web System Blueprints have first-class repo guidebooks",()=>{
  const index=read("docs/SYSTEM-BLUEPRINTS.md");
  for(const title of ["AI SaaS Operations Center","Robot Fleet","Autonomous Lanes","AI Inference Factory","IFOC — Full Immune Fabric Operations Center"]) assert.match(index,new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  for(const id of systems){
    const s=read(`docs/system-blueprints/${id}.md`);
    assert.match(s,/SYSTEM BLUEPRINT · PUBLIC \/ NATIVE SCANIOM/);
    assert.match(s,/```mermaid/);
    assert.match(s,/## Build sequence/);
    assert.doesNotMatch(s,/demos\/system-[^`\s/]+\/run\.sh/);
  }
});

test("root and Web Start A-Z expose Labs plus System Blueprints rather than a partial catalog",()=>{
  const root=read("README.md");
  for(const token of ["D00","D12","FLAGSHIP","AI SaaS Operations Center","Robot Fleet","Autonomous Lanes","AI Inference Factory","IFOC — Full Immune Fabric Operations Center","docs/SYSTEM-BLUEPRINTS.md"]) assert.ok(root.includes(token),`README missing ${token}`);
  const web=read("app/docs/page.tsx");
  assert.match(web,/systemBlueprints\.map/);
  assert.match(web,/SYSTEM BLUEPRINT RUNBOOKS/);
  assert.match(web,/lab\.steps\.map/);
  assert.doesNotMatch(web,/demos\//);
});
