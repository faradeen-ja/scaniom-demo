import fs from "node:fs";
import {Scaniom} from "@scaniom/sdk";
for (const k of ["SCANIOM_NODE_URL","SCANIOM_WORKLOAD_ID","SCANIOM_RUNTIME_TOKEN"]) if(!process.env[k]) throw new Error(`${k} is required`);
const scaniom=new Scaniom({nodeUrl:process.env.SCANIOM_NODE_URL,workloadId:process.env.SCANIOM_WORKLOAD_ID,runtimeToken:process.env.SCANIOM_RUNTIME_TOKEN});
const result=await scaniom.guardAction({actionType:"file_write",text:"Write harmless demo heartbeat",target:"file://.demo/l2-heartbeat.txt",capabilities:["file_write"],production:true});
console.log(JSON.stringify(result,null,2));
if(result.permitted){fs.mkdirSync(".demo",{recursive:true});fs.writeFileSync(".demo/l2-heartbeat.txt",new Date().toISOString()+"\n");}
