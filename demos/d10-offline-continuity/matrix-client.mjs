#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { Scaniom, SCANIOM_SDK_VERSION } from "@scaniom/sdk";

function required(name){const value=String(process.env[name]||"").trim();if(!value)throw new Error(`${name} is required`);return value;}
function arg(name){const i=process.argv.indexOf(name);return i>=0?String(process.argv[i+1]||"").trim():"";}
const boundary=arg("--boundary").toLowerCase();
if(!new Set(["l1","l2","l3","l4","l5","mcp","l6"]).has(boundary))throw new Error("--boundary must be l1|l2|l3|l4|l5|mcp|l6");
const phase=required("SCANIOM_D10_PHASE");
if(!new Set(["online-baseline","offline-protected"]).has(phase))throw new Error(`unsupported D10 phase ${phase}`);
const runId=required("SCANIOM_D10_RUN_ID");
const workloadId=required("SCANIOM_WORKLOAD_ID");
const runtimeToken=required("SCANIOM_RUNTIME_TOKEN");
const nodeUrl=required("SCANIOM_D10_NODE_URL").replace(/\/$/,"");
const ledger=required("SCANIOM_D10_LEDGER");
const connectionId=String(process.env.SCANIOM_D10_CONNECTION_ID||"").trim();
const model=String(process.env.SCANIOM_D10_MODEL||"open-immune-d10-model").trim();
const urls={
  l1:nodeUrl,
  l3:required("SCANIOM_D10_L3_URL").replace(/\/$/,""),
  l4:required("SCANIOM_D10_L4_URL").replace(/\/$/,""),
  l5:required("SCANIOM_D10_L5_URL").replace(/\/$/,""),
  mcp:required("SCANIOM_D10_MCP_URL").replace(/\/$/,""),
  l6:required("SCANIOM_D10_L6_URL").replace(/\/$/,""),
};
if(!runtimeToken.startsWith("scn_ri_v1."))throw new Error("D10 matrix requires scn_ri_v1 runtime identity");
const session=`open-ii-d10-${runId}-${boundary}`;
const consequenceId=`oii_d10_${runId.replace(/[^A-Za-z0-9._-]/g,"_")}_${boundary}_${phase.replace(/[^A-Za-z0-9._-]/g,"_")}`;
const evidenceSessionId=`sha256:${createHash("sha256").update(session).digest("hex")}`;
const expectedCorrelationId=`scn_corr_${createHash("sha256").update(`scaniom-correlation-v1\0${workloadId}\0${evidenceSessionId}`).digest("hex")}`;

function appendLocal(kind){mkdirSync(dirname(ledger),{recursive:true,mode:0o700});appendFileSync(ledger,`${JSON.stringify({version:2,kind,consequenceId,boundary,phase,session,occurredAt:new Date().toISOString(),contentStored:false})}\n`,{encoding:"utf8",mode:0o600});}
async function fetchJson(url,init){const r=await fetch(url,{...init,signal:AbortSignal.timeout(15000)});const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text.slice(0,1000)};}if(!r.ok)throw new Error(data?.error?.message||data?.error||`${boundary} HTTP ${r.status}`);return {response:r,data};}
function commonHeaders(extra={}){return {"content-type":"application/json","authorization":`Bearer ${runtimeToken}`,"x-scaniom-workload-id":workloadId,"x-scaniom-session-id":session,...extra};}
function modelBody(){return {model,input:`Open Immune D10 ${boundary} ${phase} bounded continuity probe`,metadata:{openImmuneD10:{consequenceId,boundary,phase,session}}};}
async function modelAction(base,source){
  const extra={};if((boundary==="l1"||boundary==="l4")&&connectionId)extra["x-scaniom-connection-id"]=connectionId;
  const {response}=await fetchJson(`${base}/v1/responses`,{method:"POST",headers:commonHeaders(extra),body:JSON.stringify(modelBody())});
  const actual=String(response.headers.get("x-scaniom-attachment-source")||source).toLowerCase();
  if(actual!==source)throw new Error(`${boundary} returned attachment source ${actual}, expected ${source}`);
  const returnedCorrelationId=response.headers.get("x-scaniom-correlation-id");
  if(returnedCorrelationId&&returnedCorrelationId!==expectedCorrelationId)throw new Error(`${boundary} correlation mismatch: ${returnedCorrelationId} != ${expectedCorrelationId}`);
  return {behaviorEventId:response.headers.get("x-scaniom-behavior-id"),correlationId:returnedCorrelationId||expectedCorrelationId};
}
async function guardObserve(base,source,actionType,target,provider,extraBody={}){
  const guardBody={version:"scaniom-guard-request-0.3.1",workloadId,sessionId:session,provider,model:null,actionType,text:`D10 ${boundary} ${phase}`,target,production:false,source,metadata:{openImmuneLab:"D10",phase,safeConsequence:true,contentStored:false,...extraBody}};
  const guard=await fetchJson(`${base}/v1/guard`,{method:"POST",headers:commonHeaders(),body:JSON.stringify(guardBody)});
  if(guard.data?.permitted!==true)throw new Error(`${boundary} guard blocked ${guard.data?.machineAction||"unknown"}`);
  appendLocal(`${boundary}-consequence`);
  const observeBody={...guardBody,text:"",parentBehaviorEventId:guard.data.behaviorEventId,metadata:{...guardBody.metadata,outcome:"success",preBehaviorEventId:guard.data.behaviorEventId}};
  await fetchJson(`${base}/v1/observe`,{method:"POST",headers:commonHeaders({"x-scaniom-parent-behavior-id":String(guard.data.behaviorEventId||"")}),body:JSON.stringify(observeBody)});
  return {behaviorEventId:guard.data.behaviorEventId,correlationId:guard.data.correlationId};
}
async function l2(){
  const scaniom=new Scaniom({workloadId,runtimeToken,nodeUrl,autoRenewRuntimeIdentity:false,timeoutMs:10000});
  const {decision,result}=await scaniom.guardAction({session,action:"agent_action",text:`D10 L2 ${phase}`,target:"file://open-immune/d10/matrix-ledger",capabilities:["file_access"],production:false,metadata:{openImmuneLab:"D10",phase,safeConsequence:true,contentStored:false},execute:()=>{appendLocal("l2-consequence");return {consequenceId};}});
  if(!decision.permitted)throw new Error(`L2 blocked ${decision.machineAction}`);
  if(decision.correlationId&&decision.correlationId!==expectedCorrelationId)throw new Error(`L2 correlation mismatch: ${decision.correlationId} != ${expectedCorrelationId}`);
  return {behaviorEventId:decision.behaviorEventId,correlationId:decision.correlationId||expectedCorrelationId,sdkVersion:SCANIOM_SDK_VERSION,result};
}
async function mcp(){
  const body={jsonrpc:"2.0",id:`${runId}-${phase}`,method:"tools/call",params:{name:"open_immune_d10_tool",arguments:{openImmuneD10:{consequenceId,boundary,phase,session}}}};
  await fetchJson(`${urls.mcp}/mcp`,{method:"POST",headers:{...commonHeaders(),accept:"application/json, text/event-stream","mcp-protocol-version":"2025-06-18"},body:JSON.stringify(body)});
  return {correlationId:expectedCorrelationId};
}
async function l6(){
  const digest=`sha256:${createHash("sha256").update(`${consequenceId}:${session}`).digest("hex")}`;
  const headers=commonHeaders({"x-scaniom-provider-adapter":"open-immune-d10-native","x-scaniom-provider-event-kind":"continuity"});
  const base={sessionId:session,provider:"custom",actionType:"custom_action",target:"provider-native://open-immune/d10",capabilities:["external_network"],toolNames:[],contextDigest:digest,production:false,metadata:{openImmuneLab:"D10",phase,safeConsequence:true,contentStored:false}};
  const guard=await fetchJson(`${urls.l6}/v1/guard`,{method:"POST",headers,body:JSON.stringify(base)});
  if(guard.data?.permitted!==true)throw new Error(`L6 guard blocked ${guard.data?.machineAction||"unknown"}`);
  appendLocal("l6-consequence");
  await fetchJson(`${urls.l6}/v1/observe`,{method:"POST",headers,body:JSON.stringify({...base,preBehaviorEventId:guard.data.behaviorEventId,outcome:"success",metadata:{...base.metadata,preBehaviorEventId:guard.data.behaviorEventId,outcome:"success"}})});
  if(guard.data?.correlationId&&guard.data.correlationId!==expectedCorrelationId)throw new Error(`L6 correlation mismatch: ${guard.data.correlationId} != ${expectedCorrelationId}`);
  return {behaviorEventId:guard.data.behaviorEventId,correlationId:guard.data.correlationId||expectedCorrelationId};
}

let evidence={};
if(boundary==="l1")evidence=await modelAction(urls.l1,"provider_proxy");
else if(boundary==="l2")evidence=await l2();
else if(boundary==="l3")evidence=await modelAction(urls.l3,"runtime_hook");
else if(boundary==="l4")evidence=await modelAction(urls.l4,"sidecar");
else if(boundary==="l5")evidence=await guardObserve(urls.l5,"gateway","agent_action","environment://open-immune/d10","custom");
else if(boundary==="mcp")evidence=await mcp();
else if(boundary==="l6")evidence=await l6();

process.stdout.write(JSON.stringify({ok:true,version:2,boundary,phase,session,evidenceSessionId,correlationId:evidence.correlationId||expectedCorrelationId,consequenceId,...evidence},null,2));
