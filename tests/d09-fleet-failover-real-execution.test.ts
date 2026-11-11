import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLabRuntime, labById } from "../lib/open-ii/labs";
import type { OpenIiContextResponse } from "../lib/open-ii/types";

const read=(path:string)=>readFileSync(path,"utf8");

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
      {id:"node-a",name:"Node A",environment_id:"env1",operational_state:"online",status:"active"},
      {id:"node-b",name:"Node B",environment_id:"env1",operational_state:"online",status:"active"},
    ],
    policies:[{environment_id:"env1",mode:"enforce",profile:"general",version:7}],
    runtimeIdentity:{identity:{identityId:"ri1",workloadId:"work1",status:"active",generation:8,attachments:["l1","l2","l4"],lease:{status:"active"}}},
    cli:[],
    ...overrides,
  };
}

const fabric={
  selectedEnvironmentId:"env1",
  nodePools:[{
    id:"pool1",environmentId:"env1",name:"Open Immune D09",slug:"open-immune-d09-pool",status:"active",
    memberCount:2,onlineCount:2,eligibleCount:2,capacityState:"ready",
    members:[
      {nodeId:"node-a",name:"Node A",state:"online",eligible:true,routingState:"active",routingWeight:100,runtimeEndpoint:"http://127.0.0.1:8787"},
      {nodeId:"node-b",name:"Node B",state:"online",eligible:true,routingState:"active",routingWeight:100,runtimeEndpoint:"http://127.0.0.1:8788"},
    ],
  }],
  workloads:[{
    id:"work1",environmentId:"env1",name:"Agent",slug:"agent",
    poolBindings:[{workloadId:"work1",poolId:"pool1",poolName:"Open Immune D09",poolSlug:"open-immune-d09-pool",memberCount:2,onlineCount:2,eligibleCount:2,workloadEligibleCount:2,availability:"redundant"}],
    routing:{
      version:"scaniom-r18-d3-health-routing-failover-v1",workloadId:"work1",workloadName:"Agent",environmentId:"env1",routeKey:"fabric:work1",
      strategy:"weighted_rendezvous",ready:true,failClosed:false,redundant:true,selectedNodeId:"node-b",selectedEndpoint:"http://127.0.0.1:8788",readyCandidates:2,
      retryPolicy:"pre_dispatch_health_failover_no_ambiguous_replay",
      candidates:[
        {nodeId:"node-b",nodeName:"Node B",endpoint:"http://127.0.0.1:8788",state:"ready",rank:1},
        {nodeId:"node-a",nodeName:"Node A",endpoint:"http://127.0.0.1:8787",state:"ready",rank:2},
      ],
    },
  }],
};

const receipt={
  version:1 as const,labId:"d09-fleet-failover" as const,status:"pass" as const,release:"R18" as const,scaniomVersion:"0.4.2" as const,
  verifiedAt:"2026-11-10T23:00:00.000Z",environmentId:"env1",workloadId:"work1",poolId:"pool1",
  controlRouteKey:"open-immune-d09-control-1",sdkSession:"open-ii-d09-runtime-1",
  failedNodeId:"node-b",failoverNodeId:"node-a",correlationId:"scn_corr_test",proofId:"scn_cproof_test",
  checks:{twoRealNodes:true as const,poolBound:true as const,deterministicRouting:true as const,healthFailover:true as const,protectedBefore:true as const,protectedAfter:true as const,validProof:true as const,noReplay:true as const,restored:true as const},
};

test("D09 runner is real D1/D2/D3 failover execution and restores the failed member",()=>{
  const run=read("demos/d09-fleet-failover/run.sh");
  for(const token of [
    "fabric pool create","fabric workload pools","fabric routing node","fabric routing preview",
    "--attachments l1,l2,l4","reference-client.mjs","node stop","no ambiguous consequence replay",
    "trajectory show","proof correlated verify","restore_secondary",
    "OPEN IMMUNE · D09 FLEET + FAILOVER REAL EXECUTION PASS",
  ])assert.ok(run.includes(token),`missing D09 token: ${token}`);
  assert.doesNotMatch(run,/node enroll.*scaniom-demo-node/);
});

test("D09 reference client uses released SDK guardAction and a real harmless consequence",()=>{
  const client=read("demos/d09-fleet-failover/reference-client.mjs");
  assert.match(client,/from "@scaniom\/sdk"/);
  assert.match(client,/nodeTargets:targets/);
  assert.match(client,/routingHealthTtlMs:500/);
  assert.match(client,/guardAction/);
  assert.match(client,/appendFileSync/);
  assert.match(client,/autoRenewRuntimeIdentity:false/);
});

test("D09 Workbench does not confuse two online Nodes with persisted pool/routing/failover authority",()=>{
  const lab=labById("d09-fleet-failover")!;
  const nodesOnly=buildLabRuntime(lab,baseContext());
  assert.notEqual(nodesOnly.runtimeSteps.find(s=>s.id==="node-pool")?.status,"verified");

  const routed=buildLabRuntime(lab,baseContext({fabric}));
  assert.equal(routed.runtimeSteps.find(s=>s.id==="node-pool")?.status,"verified");
  assert.equal(routed.runtimeSteps.find(s=>s.id==="routing")?.status,"verified");
  assert.equal(routed.runtimeSteps.find(s=>s.id==="failover")?.status,"ready");

  const completed=buildLabRuntime(lab,baseContext({
    fabric,
    execution:{d09FleetFailover:receipt},
    attachments:{levels:[{id:"l2",level:"L2",configured:true,ready:true,evidence:{total:4}}]},
    correlatedProofs:[{proofId:"scn_cproof_test",correlationId:"scn_corr_test",workloadId:"work1",workloadName:"Agent",environmentId:"env1",verification:"valid",eventCount:4}],
  }));
  for(const id of ["node-pool","runtime-identity","routing","failover","behavior","proof"]){
    assert.equal(completed.runtimeSteps.find(s=>s.id===id)?.status,"verified",id);
  }
});

test("D09 failover receipt is scope-bound and cannot close another workload",()=>{
  const lab=labById("d09-fleet-failover")!;
  const wrong=buildLabRuntime(lab,baseContext({
    fabric,
    execution:{d09FleetFailover:{...receipt,workloadId:"other-workload"}},
    attachments:{levels:[{id:"l2",level:"L2",configured:true,ready:true,evidence:{total:4}}]},
    correlatedProofs:[{proofId:"scn_cproof_test",correlationId:"scn_corr_test",workloadId:"work1",verification:"valid",eventCount:4}],
  }));
  assert.equal(wrong.runtimeSteps.find(s=>s.id==="failover")?.status,"ready");
  assert.notEqual(wrong.runtimeSteps.find(s=>s.id==="proof")?.status,"verified");
});


test("D09 requires Control durability before stopping the evidence-owning secondary",()=>{
  const run=read("demos/d09-fleet-failover/run.sh");
  const action=run.indexOf('run_reference_client "before-failure"');
  const barrier=run.indexOf("pre-failure evidence durability barrier PASS");
  const stop=run.indexOf("scaniom node stop",action);
  assert.ok(action>=0,"before-failure action missing");
  assert.ok(barrier>action,"durability barrier must follow the before-failure protected action");
  assert.ok(stop>barrier,"secondary Node must not stop until the durability barrier passes");
  assert.match(run,/beforeBarrierPre/);
  assert.match(run,/beforeBarrierPost/);
  assert.match(run,/refusing to stop evidence-owning Node/);
  assert.match(run,/scaniom_at "\$SECONDARY_URL" node health/);
});
