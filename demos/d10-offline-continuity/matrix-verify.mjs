#!/usr/bin/env node
import fs from "node:fs";

function arg(name){const i=process.argv.indexOf(name);return i>=0?String(process.argv[i+1]||"").trim():"";}
const command=String(process.argv[2]||"");
const file=arg("--file"),boundary=arg("--boundary").toLowerCase(),workload=arg("--workload"),stage=arg("--stage")||"full";
if(!file||!boundary)throw new Error("--file and --boundary are required");
const spec={
  l1:{source:"provider_proxy",level:"l1",action:"model_request",perExecution:1,phase:"runtime"},
  l2:{source:"sdk",level:"l2",action:"agent_action",perExecution:2,phase:"pair"},
  l3:{source:"runtime_hook",level:"l3",action:"model_request",perExecution:2,phase:"pair"},
  l4:{source:"sidecar",level:"l4",action:"model_request",perExecution:1,phase:"runtime"},
  l5:{source:"gateway",level:"l5",action:"agent_action",perExecution:2,phase:"pair"},
  mcp:{source:"mcp_gateway",level:"mcp",action:"tool_call",perExecution:2,phase:"pair"},
  l6:{source:"provider_native",level:"l6",action:"custom_action",perExecution:2,phase:"pair"},
}[boundary];
if(!spec)throw new Error(`unsupported boundary ${boundary}`);
const x=JSON.parse(fs.readFileSync(file,"utf8"));
if(command==="trajectory"){
  const executions=stage==="online"?1:stage==="full"?2:0;if(!executions)throw new Error("--stage must be online|full");
  const events=(x.events||[]).filter(e=>(!workload||e.workloadId===workload)&&String(e.attachmentSource||"").toLowerCase()===spec.source&&String(e.actionType||"").toLowerCase()===spec.action);
  const need=executions*spec.perExecution;
  if(events.length<need)process.exit(2);
  if(spec.phase==="runtime"){
    const runtime=events.filter(e=>String(e.executionPhase||"").toLowerCase()==="runtime");
    if(runtime.length<need||new Set(runtime.map(e=>e.behaviorEventId)).size<need)process.exit(3);
  }else{
    const pres=events.filter(e=>String(e.executionPhase||"").toLowerCase()==="pre");
    const posts=events.filter(e=>String(e.executionPhase||"").toLowerCase()==="post");
    if(pres.length<executions||posts.length<executions)process.exit(4);
    const paired=pres.filter(pre=>posts.some(post=>post.parentBehaviorEventId===pre.behaviorEventId));
    if(paired.length<executions)process.exit(5);
  }
  const corr=String(events[0]?.correlationId||x.correlationId||"");if(!corr.startsWith("scn_corr_"))process.exit(6);
  process.stdout.write(JSON.stringify({ok:true,boundary,source:spec.source,level:spec.level,eventCount:events.length,correlationId:corr}));
  process.exit(0);
}
if(command==="proof"){
  const p=x.verification?.payload||{},item=x.item||{};
  const levels=(p.attachmentLevels||[]).map(v=>String(v).toLowerCase()),sources=(p.attachmentSources||[]).map(v=>String(v).toLowerCase());
  const min=2*spec.perExecution;
  const corr=String(item.correlationId||p.correlationId||"");const proofId=String(item.proofId||"");
  const ok=x.verification?.valid===true&&corr.startsWith("scn_corr_")&&proofId.startsWith("scn_cproof_")&&(!workload||p.workloadId===workload)&&Number(p.eventCount||item.eventCount||0)>=min&&levels.includes(spec.level)&&sources.includes(spec.source);
  if(!ok)process.exit(7);
  process.stdout.write(JSON.stringify({ok:true,boundary,source:spec.source,level:spec.level,eventCount:Number(p.eventCount||item.eventCount||0),correlationId:corr,proofId}));
  process.exit(0);
}
throw new Error("command must be trajectory|proof");
