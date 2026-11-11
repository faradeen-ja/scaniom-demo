import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLabRuntime, labById } from "../lib/open-ii/labs";
import type { OpenIiContextResponse } from "../lib/open-ii/types";

const read=(path:string)=>readFileSync(path,"utf8");
const boundaries=["l1","l2","l3","l4","l5","mcp","l6"] as const;
const sources={l1:"provider_proxy",l2:"sdk",l3:"runtime_hook",l4:"sidecar",l5:"gateway",mcp:"mcp_gateway",l6:"provider_native"} as const;
const eventCounts={l1:2,l2:4,l3:4,l4:2,l5:4,mcp:4,l6:4} as const;

function baseContext(overrides:Partial<OpenIiContextResponse>={}):OpenIiContextResponse {
  return {
    profile:{name:"cloud",label:"Scaniom Cloud",type:"cloud",controlUrl:"https://control.scaniom.com"},
    identity:{userId:"u1",email:"dev@example.com",displayName:"Dev",organizationId:"org1",organizationName:"Example",organizationSlug:"example",role:"owner"},
    whoami:{user:{id:"u1",email:"dev@example.com",name:"Dev"},organization:{id:"org1",name:"Example",slug:"example"},role:"owner",credential:{kind:"cli_session",name:"Open Immune"}},
    deployment:{id:"control-1",label:"Scaniom Cloud",type:"cloud"},
    workspace:{version:1,profileName:"cloud",organizationId:"org1",environmentId:"env1",workloadId:"work1"},
    environments:[{id:"env1",name:"Production",slug:"production",kind:"production",status:"active"}],
    workloads:[{id:"work1",name:"Agent",slug:"agent",kind:"agent",status:"active",environment_id:"env1",active_address:"scn://example/agent"}],
    nodes:[
      {id:"node-primary",name:"scaniom-demo-node",environment_id:"env1",operational_state:"online",status:"active"},
      {id:"node-d10",name:"open-immune-d10-continuity-node",environment_id:"env1",operational_state:"offline",status:"active"},
    ],
    policies:[{environment_id:"env1",mode:"enforce",profile:"general",version:9}],
    runtimeIdentity:{identity:{identityId:"ri-seven",workloadId:"work1",status:"active",generation:12,attachments:[...boundaries],lease:{status:"active"}}},
    attachments:{levels:boundaries.map((id)=>({id,level:id.toUpperCase(),configured:true,ready:true,evidence:{total:eventCounts[id]}}))},
    cli:[],
    ...overrides,
  };
}

const boundaryReceipts=Object.fromEntries(boundaries.map((id)=>[id,{
  level:id,
  source:sources[id],
  session:`open-ii-d10-run-${id}`,
  correlationId:`scn_corr_d10_${id}`,
  proofId:`scn_cproof_d10_${id}`,
  eventCount:eventCounts[id],
  onlineConsequenceId:`oii_d10_online_${id}`,
  offlineConsequenceId:`oii_d10_offline_${id}`,
}])) as Record<(typeof boundaries)[number],{
  level:string;source:string;session:string;correlationId:string;proofId:string;eventCount:number;onlineConsequenceId:string;offlineConsequenceId:string;
}>;

const receipt={
  version:2 as const,labId:"d10-offline-continuity" as const,status:"pass" as const,release:"R18" as const,scaniomVersion:"0.4.2" as const,
  verifiedAt:"2026-11-11T03:30:00.000Z",environmentId:"env1",workloadId:"work1",nodeId:"node-d10",nodeName:"open-immune-d10-continuity-node",
  routeId:"route-d10",runId:"run-1",continuityUntil:"2026-11-11T07:30:00.000Z",maxOfflineSeconds:14400 as const,maxCredentialStaleSeconds:1800 as const,maxSpoolBytes:268435456 as const,
  spoolPeakBytes:16384,replayedEnvelopes:14,identity:{identityId:"ri-seven",generation:12,attachments:[...boundaries]},boundaries:boundaryReceipts,
  checks:{signedContinuity:true as const,allSevenIdentityScopes:true as const,onlineBaselineAllSeven:true as const,offlineProtected:true as const,bootstrapDenied:true as const,protectedOfflineAllSeven:true as const,evidenceBuffered:true as const,controlAbsentWhileOffline:true as const,evidenceReplayed:true as const,allSevenTrajectories:true as const,allSevenProofs:true as const,noReplay:true as const,cleanShutdown:true as const},
};

const continuity={
  ok:true,
  contract:{mode:"last-known-good",maxOfflineSeconds:14400,maxCredentialStaleSeconds:1800,maxSpoolBytes:268435456,unknownAuthority:"deny",bootstrapWhileOffline:false,evidenceReplayRequired:true},
  items:[{nodeId:"node-d10",nodeName:"open-immune-d10-continuity-node",environmentId:"env1",environmentName:"Production",operationalState:"offline",lastHeartbeatAt:"2026-11-11T03:30:00.000Z",controlView:"continuity-window",continuityUntil:"2026-11-11T07:30:00.000Z",note:"last signed continuity window",reported:{state:"online",spoolBytes:0,lastEvidenceReplayCount:14,lastEvidenceReplayAt:"2026-11-11T03:29:59.000Z"}}],
};

const proofs=boundaries.map((id)=>({proofId:`scn_cproof_d10_${id}`,correlationId:`scn_corr_d10_${id}`,workloadId:"work1",workloadName:"Agent",environmentId:"env1",verification:"valid",eventCount:eventCounts[id]}));

test("D10 runner is a real seven-boundary B2 matrix, not an L2 representative probe",()=>{
  const run=read("demos/d10-offline-continuity/run.sh");
  for(const token of [
    "l1 l2 l3 l4 l5 mcp l6","scaniom-runtime-adapter.mjs","scaniom-gateway.mjs","scaniom-environment-gateway.mjs","scaniom-mcp-gateway.mjs","scaniom-provider-native-bridge.mjs",
    "--attachments l1,l2,l3,l4,l5,mcp,l6","OFFLINE-PROTECTED","bootstrap denied offline","matrix-verify.mjs","14 unique consequences","D10 FULL SEVEN-BOUNDARY OFFLINE CONTINUITY PASS",
  ])assert.ok(run.includes(token),`missing seven-boundary D10 token: ${token}`);
  assert.doesNotMatch(run,/sudo\s|pfctl|iptables|nft\s/);
  assert.doesNotMatch(run,/sleep\s+14400|date.*\+.*14400/);
  assert.doesNotMatch(run,/writeFileSync\([^\n]*state\.json|sed[^\n]*state\.json/);
  assert.doesNotMatch(run,/local boundary="\$1" phase="\$2" out=/, "macOS Bash nounset-unsafe local declaration must not return");
  assert.match(run,/local boundary="\$1"\s*\n\s*local phase="\$2"\s*\n\s*local out="\$TMP_DIR\/\$\{phase\}-\$\{boundary\}\.json"/);
  assert.doesNotMatch(read("lib/open-ii/labs.ts"),/Released Scaniom/);
});

test("D10 uses real attachment-specific execution paths and truthful evidence-source semantics",()=>{
  const client=read("demos/d10-offline-continuity/matrix-client.mjs");
  for(const token of ["from \"@scaniom/sdk\"","guardAction","/v1/responses","/v1/guard","/v1/observe","/mcp","tools/call","provider-native://open-immune/d10","x-scaniom-connection-id"])assert.ok(client.includes(token),token);
  const verify=read("demos/d10-offline-continuity/matrix-verify.mjs");
  for(const [id,source] of Object.entries(sources)){
    assert.match(verify,new RegExp(`${id}:\\{source:\"${source}\"`));
  }
  assert.match(verify,/l1:\{source:"provider_proxy",level:"l1",action:"model_request",perExecution:1/);
  assert.match(verify,/l4:\{source:"sidecar",level:"l4",action:"model_request",perExecution:1/);
  assert.match(verify,/l3:\{source:"runtime_hook",level:"l3",action:"model_request",perExecution:2/);
});

test("D10 loopback consequence service executes provider/tool consequences but cannot mint Scaniom authority",()=>{
  const service=read("demos/d10-offline-continuity/consequence-service.mjs");
  assert.match(service,/127\.0\.0\.1/);
  assert.match(service,/\/v1\/responses/);
  assert.match(service,/\/mcp/);
  assert.match(service,/appendFileSync/);
  assert.doesNotMatch(service,/scn_ri_v1|scn_rib_|SCANIOM_CONTROL_URL|authorization.*Bearer/);
});

test("D10 v2 Workbench completion requires all seven receipt boundaries and seven valid proofs",()=>{
  const lab=labById("d10-offline-continuity")!;
  assert.deepEqual(lab.attachments,["L1","L2","L3","L4","L5","MCP","L6"]);
  const contractOnly=buildLabRuntime(lab,baseContext({offlineContinuity:continuity}));
  assert.equal(contractOnly.runtimeSteps.find(s=>s.id==="continuity")?.status,"verified");
  assert.notEqual(contractOnly.runtimeSteps.find(s=>s.id==="offline-protected")?.status,"verified");

  const completed=buildLabRuntime(lab,baseContext({offlineContinuity:continuity,execution:{d10OfflineContinuity:receipt},correlatedProofs:proofs}));
  for(const id of ["continuity","runtime-identity","offline-protected","replay","behavior","proof"])assert.equal(completed.runtimeSteps.find(s=>s.id===id)?.status,"verified",id);

  const missingL6=buildLabRuntime(lab,baseContext({offlineContinuity:continuity,execution:{d10OfflineContinuity:{...receipt,boundaries:{...receipt.boundaries,l6:undefined as never}}},correlatedProofs:proofs}));
  assert.notEqual(missingL6.runtimeSteps.find(s=>s.id==="offline-protected")?.status,"verified");

  const sixProofs=buildLabRuntime(lab,baseContext({offlineContinuity:continuity,execution:{d10OfflineContinuity:receipt},correlatedProofs:proofs.filter(p=>!p.proofId.endsWith("_mcp"))}));
  assert.notEqual(sixProofs.runtimeSteps.find(s=>s.id==="proof")?.status,"verified");
});

test("D10 v1 core receipt no longer closes full D10",()=>{
  const local=read("lib/open-ii/local-execution.ts");
  assert.match(local,/export type D10OfflineContinuityReceipt = \{\n  version: 2;/);
  assert.match(local,/allSevenIdentityScopes/);
  assert.match(local,/allSevenTrajectories/);
  assert.match(local,/allSevenProofs/);
  assert.match(local,/noReplay/);
  assert.doesNotMatch(local,/version === 1[\s\S]{0,500}labId === "d10-offline-continuity"/);
});

test("D10 documentation is explicit about real semantics and no simulated four-hour expiry",()=>{
  const guide=read("demos/d10-offline-continuity/README.md");
  for(const level of ["L1","L2","L3","L4","L5","MCP","L6"])assert.match(guide,new RegExp(`\\b${level}\\b`));
  assert.match(guide,/L1 and L4 use the real provider-proxy runtime semantics/);
  assert.match(guide,/does \*\*not\*\* wait four hours/);
  assert.match(guide,/does not fast-forward, edit Node state, or simulate lease-expiry exhaustion/);
});
