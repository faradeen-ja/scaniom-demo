#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const errors=[];
const read=(p)=>{try{return fs.readFileSync(path.join(root,p),"utf8");}catch{return "";}};
const need=(p,tokens)=>{const source=read(p);if(!source){errors.push(`missing ${p}`);return;}for(const token of tokens)if(!source.includes(token))errors.push(`${p} missing token: ${token}`);};
const reject=(p,tokens)=>{const source=read(p);for(const token of tokens)if(source.includes(token))errors.push(`${p} contains retired token: ${token}`);};

need("lib/open-ii/profile-contract.ts",[
  'controlUrl: "https://control.scaniom.com"',
  "Remote Control profiles require HTTPS",
]);
need("lib/open-ii/types.ts",['"local"','"cloud"','"self-hosted"','"private-enterprise"','"staging"']);
need("next.config.ts",["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options"]);
need("lib/open-ii/control-client.ts",[
  "OPEN_II_CONTROL_HOST_ALLOWLIST", "allowPrivateNetwork", "hostname: target.address", "rejectUnauthorized: true",
  "verifyScaniomControl", "scaniom-control-v1", "scaniom-cli-device-v1", "Control reports a different canonical origin",
  "remoteAddressAllowed", "ControlHttpError",
]);
need("lib/open-ii/network-policy.ts",["BlockList", "169.254.0.0", "fc00::", "remoteAddressAllowed", "cloud-metadata"]);
need("lib/open-ii/profile-store.ts",["visibleServerProfiles", "hostProfileMap()[host.toLowerCase()]", "listResolvedProfiles(host)", "selectProfile"]);
need("app/api/profiles/test/route.ts",["verifyScaniomControl", "sameOriginRequest", "profileByName"]);
reject("app/api/profiles/active/route.ts",["useProfile"]);
need("app/api/auth/scaniom/start/route.ts",["/api/v1/cli/device/start", "Open Immune Intelligence", "verifyScaniomControl(profile)", "requestClientIp(request)", "cross-origin verification URL", "controlDeploymentId"]);
need("app/api/auth/scaniom/poll/route.ts",["/api/v1/cli/device/token", "scn_cli_", "/api/v1/operator/whoami", "requestClientIp(request)", "different Control deployment"]);
need("app/api/auth/scaniom/logout/route.ts",["/api/v1/cli/session/revoke","sameOriginRequest"]);
need("lib/open-ii/http.ts",["requestClientIp", "x-forwarded-for", "isIP(candidate)"]);
need("app/api/scaniom/context/route.ts",["/api/v1/control/deployment", "loadWorkspaceResources", "profileCliCommands"]);
need("lib/open-ii/auth.ts",["ControlHttpError", "error.status === 401", "temporary Control/network outage"]);
need("scripts/lib/common.sh",['SCANIOM_PROFILE="${SCANIOM_PROFILE:-cloud}"','SCANIOM_CONTROL_URL="${SCANIOM_CONTROL_URL:-https://control.scaniom.com}"']);
need("docs/open-ii-authentication.md",["host-only", "device authorization", "password", "control.scaniom.com"]);
need("docs/open-ii-profiles.md",["private-enterprise", "self-hosted", "Runtime placement"]);
reject("scripts/lib/common.sh",["SCANIOM_CONTROL_URL=\"${SCANIOM_CONTROL_URL:-https://scaniom.com}\""]);
reject("docs/authentication.md",["https://scaniom.com/signup", "https://scaniom.com/login"]);

const privateDependency=/\.\.\/scaniom|\/scaniom\/scripts\/scaniom-cli\.mjs/;
for(const p of ["app","components","lib","scripts"]){
  const dir=path.join(root,p);if(!fs.existsSync(dir))continue;
  const stack=[dir];while(stack.length){const current=stack.pop();for(const entry of fs.readdirSync(current,{withFileTypes:true})){const full=path.join(current,entry.name);if(entry.isDirectory()){if(entry.name!=="node_modules"&&entry.name!==".next")stack.push(full);}else if(/\.(?:ts|tsx|mjs|sh)$/.test(entry.name)){const source=fs.readFileSync(full,"utf8");if(privateDependency.test(source))errors.push(`${path.relative(root,full)} depends on private Scaniom source`);}}}
}

need("package.json",['"ship": "node scripts/open-ii-ship.mjs"']);
need("scripts/open-ii-ship.mjs",["OPEN IMMUNE · FAST SHIP","npm", "accept:local","pr", "checks","--watch","--match-head-commit","OPEN IMMUNE SHIP PASS","base !== \".env.example\"","Resume existing"]);

if(errors.length){console.error("OPEN IMMUNE INTELLIGENCE A0 SOURCE AUDIT FAIL");for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log("OPEN IMMUNE INTELLIGENCE A0 SOURCE AUDIT PASS");
console.log("✓ canonical cloud Control authority");
console.log("✓ Web/CLI Control verification parity");
console.log("✓ multi-profile contract + cross-Control credential boundary");
console.log("✓ original Scaniom device authorization + whoami context");
console.log("✓ SSRF/TLS boundary for configurable Control origins");
console.log("✓ public repo remains independent from private Scaniom source");
