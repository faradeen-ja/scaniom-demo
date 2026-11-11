#!/usr/bin/env node
import http from "node:http";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const host=String(process.env.SCANIOM_D10_CONSEQUENCE_HOST||"127.0.0.1");
const port=Number(process.env.SCANIOM_D10_CONSEQUENCE_PORT||18880);
const ledger=String(process.env.SCANIOM_D10_LEDGER||"").trim();
if(!ledger)throw new Error("SCANIOM_D10_LEDGER is required");
if(!Number.isInteger(port)||port<1||port>65535)throw new Error("SCANIOM_D10_CONSEQUENCE_PORT must be 1..65535");
if(!["127.0.0.1","localhost","::1"].includes(host))throw new Error("D10 consequence service is loopback-only");

function json(res,status,value){const body=Buffer.from(JSON.stringify(value));res.writeHead(status,{"content-type":"application/json; charset=utf-8","content-length":String(body.length),"cache-control":"no-store"});res.end(body);}
async function readJson(req){const chunks=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>2*1024*1024)throw Object.assign(new Error("request too large"),{status:413});chunks.push(b);}const raw=Buffer.concat(chunks);try{return raw.length?JSON.parse(raw.toString("utf8")):{};}catch{throw Object.assign(new Error("JSON body required"),{status:400});}}
function contextFrom(body){
  const direct=body?.metadata?.openImmuneD10;
  if(direct&&typeof direct==="object")return direct;
  const args=body?.params?.arguments;
  if(args?.openImmuneD10&&typeof args.openImmuneD10==="object")return args.openImmuneD10;
  if(args&&typeof args==="object")return args;
  return null;
}
function record(kind,ctx){
  const consequenceId=String(ctx?.consequenceId||"").trim();
  const boundary=String(ctx?.boundary||"").trim().toLowerCase();
  const phase=String(ctx?.phase||"").trim().toLowerCase();
  const session=String(ctx?.session||"").trim();
  if(!/^oii_d10_[A-Za-z0-9._-]+$/.test(consequenceId))throw Object.assign(new Error("valid D10 consequenceId required"),{status:400});
  if(!new Set(["l1","l3","l4","mcp"]).has(boundary))throw Object.assign(new Error("unsupported D10 upstream boundary"),{status:400});
  if(!new Set(["online-baseline","offline-protected"]).has(phase))throw Object.assign(new Error("unsupported D10 phase"),{status:400});
  if(!session)throw Object.assign(new Error("D10 session required"),{status:400});
  mkdirSync(dirname(ledger),{recursive:true,mode:0o700});
  appendFileSync(ledger,`${JSON.stringify({version:2,kind,consequenceId,boundary,phase,session,occurredAt:new Date().toISOString(),contentStored:false})}\n`,{encoding:"utf8",mode:0o600});
  return {consequenceId,boundary,phase,session};
}

const server=http.createServer((req,res)=>{void(async()=>{
  const url=new URL(req.url||"/",`http://${req.headers.host||`${host}:${port}`}`);
  if(req.method==="GET"&&url.pathname==="/health")return json(res,200,{ok:true,service:"open-immune-d10-consequence",version:2});
  if(req.method!=="POST")return json(res,404,{error:"not found"});
  const body=await readJson(req);
  if(url.pathname==="/v1/responses"){
    const c=record("model",contextFrom(body));
    return json(res,200,{id:`resp_${randomUUID()}`,object:"response",created_at:Math.floor(Date.now()/1000),status:"completed",model:String(body?.model||"open-immune-d10-model"),output:[{id:`msg_${randomUUID()}`,type:"message",status:"completed",role:"assistant",content:[{type:"output_text",text:`D10 ${c.boundary} ${c.phase} consequence executed`,annotations:[]}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2},openImmuneD10:{consequenceId:c.consequenceId}});
  }
  if(url.pathname==="/mcp"){
    const c=record("mcp-tool",contextFrom(body));
    return json(res,200,{jsonrpc:"2.0",id:body?.id??null,result:{content:[{type:"text",text:`D10 MCP ${c.phase} consequence executed`}],structuredContent:{consequenceId:c.consequenceId}}});
  }
  return json(res,404,{error:"not found"});
})().catch(error=>json(res,Number(error?.status)||500,{error:error instanceof Error?error.message:String(error)}));});
server.listen(port,host,()=>console.log(`OPEN IMMUNE D10 CONSEQUENCE READY · http://${host}:${port}`));
const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
