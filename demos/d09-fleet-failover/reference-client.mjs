#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Scaniom, SCANIOM_SDK_VERSION } from "@scaniom/sdk";

function required(name) {
  const value=String(process.env[name]||"").trim();
  if(!value)throw new Error(`${name} is required`);
  return value;
}
if(SCANIOM_SDK_VERSION!=="0.4.2")throw new Error(`Unexpected @scaniom/sdk version ${SCANIOM_SDK_VERSION}`);

const workloadId=required("SCANIOM_WORKLOAD_ID");
const runtimeToken=required("SCANIOM_RUNTIME_TOKEN");
const session=required("SCANIOM_D09_SESSION");
const phase=required("SCANIOM_D09_PHASE");
const ledger=required("SCANIOM_D09_LEDGER");
const expectedPreferred=required("SCANIOM_D09_EXPECTED_PREFERRED");
const targets=JSON.parse(required("SCANIOM_D09_NODE_TARGETS"));
if(!Array.isArray(targets)||targets.length<2)throw new Error("D09 requires at least two Node targets");

function hash(value){let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0}
function score(key,url,weight){const u=(hash(`${key}\0${url}`)+1)/4294967297;return -Math.log(u)/Math.max(1,Math.min(1000,Number(weight)||100))}
const routeKey=`${workloadId}:${session}`;
const ordered=[...targets].sort((a,b)=>score(routeKey,a.url,a.weight)-score(routeKey,b.url,b.weight)||String(a.url).localeCompare(String(b.url)));
const preferredUrl=String(ordered[0]?.url||"");
if(preferredUrl!==expectedPreferred)throw new Error(`D09 SDK route key no longer prefers expected secondary Node: ${preferredUrl}`);

const scaniom=new Scaniom({
  workloadId,
  runtimeToken,
  autoRenewRuntimeIdentity:false,
  nodeTargets:targets,
  routingHealthTtlMs:500,
  timeoutMs:10_000,
});

const consequenceId=`oii_d09_${randomUUID()}`;
const {decision,result}=await scaniom.guardAction({
  session,
  action:"agent_action",
  text:`Record harmless Open Immune D09 ${phase} heartbeat`,
  target:"file://open-immune/d09/failover-ledger",
  capabilities:["file_access"],
  production:false,
  metadata:{
    openImmuneLab:"D09",
    phase,
    safeConsequence:true,
    preferredRuntimeUrl:preferredUrl,
  },
  execute:()=>{
    mkdirSync(dirname(ledger),{recursive:true,mode:0o700});
    const row={
      version:1,
      consequenceId,
      phase,
      occurredAt:new Date().toISOString(),
      preferredRuntimeUrl:preferredUrl,
      contentStored:false,
    };
    appendFileSync(ledger,`${JSON.stringify(row)}\n`,{encoding:"utf8",mode:0o600});
    return{consequenceId,phase};
  },
});

if(!decision.permitted)throw new Error(`D09 action unexpectedly blocked: ${decision.machineAction}`);
process.stdout.write(JSON.stringify({
  ok:true,
  phase,
  sdkVersion:SCANIOM_SDK_VERSION,
  preferredUrl,
  consequenceId:result.consequenceId,
  behaviorEventId:decision.behaviorEventId,
  correlationId:decision.correlationId,
  machineAction:decision.machineAction,
  riskScore:decision.riskScore,
},null,2));
