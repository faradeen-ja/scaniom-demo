#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const slugRaw = String(process.argv[2] || "").trim();
const slug = slugRaw.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
const note = process.argv.slice(3).join(" ").trim();
const branch = `open-ii/${slug}`;

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function run(command, args = [], { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
  });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    if (capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    fail(`${command} ${args.join(" ")} exited ${result.status}`);
  }
  return result;
}

function capture(command, args = [], options = {}) {
  return String(run(command, args, { ...options, capture: true }).stdout || "").trim();
}

function requireCommand(name) {
  const probe = run("bash", ["-lc", `command -v ${name}`], { capture: true, allowFailure: true });
  if (probe.status !== 0) fail(`required command missing: ${name}`);
}

function repoSlug(origin) {
  const match = origin.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match?.[1] || "";
}

if (!slug) fail("slice name required. Example: npm run ship -- a0-profile-auth");
if (!existsSync(path.join(root, "package.json"))) fail("run this command from the Open Immune repository root");

for (const command of ["git", "gh", "npm"]) requireCommand(command);
run("git", ["rev-parse", "--is-inside-work-tree"]);
run("gh", ["auth", "status", "--hostname", "github.com"]);

const origin = capture("git", ["remote", "get-url", "origin"]);
const repo = repoSlug(origin);
if (repo !== "faradeen-ja/scaniom-demo") fail(`wrong repository origin: ${origin}`);

const currentBranch = capture("git", ["branch", "--show-current"]);
if (currentBranch !== "main" && currentBranch !== branch) {
  fail(`start ship from main or resume ${branch}; current branch is ${currentBranch || "detached"}`);
}

console.log("==============================================================");
console.log("OPEN IMMUNE · FAST SHIP");
console.log("==============================================================");
console.log(`Slice: ${slug}`);
console.log(`Repo:  ${repo}`);
console.log();

console.log("==> Verify main baseline");
run("git", ["fetch", "origin", "main"]);
const localHead = capture("git", ["rev-parse", "HEAD"]);
const remoteMain = capture("git", ["rev-parse", "origin/main"]);
if (localHead !== remoteMain) fail("local main is not exactly origin/main. Commit/preserve your work elsewhere, then update main with: git pull --ff-only origin main");

console.log("==> Local acceptance");
run("npm", ["run", "accept:local"]);

const changed = capture("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
if (!changed) fail("nothing to ship; working tree has no source changes");

const remoteProbe = run("git", ["ls-remote", "--exit-code", "--heads", "origin", branch], { capture: true, allowFailure: true });
const localProbe = run("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { capture: true, allowFailure: true });

if (currentBranch === "main") {
  if (remoteProbe.status === 0) fail(`remote branch already exists: ${branch}`);
  if (localProbe.status === 0) fail(`local branch already exists: ${branch}`);
  console.log(`==> Create ${branch}`);
  run("git", ["switch", "-c", branch]);
} else {
  const branchHead = capture("git", ["rev-parse", "HEAD"]);
  if (branchHead !== remoteMain) {
    fail(`cannot auto-resume ${branch}: it already contains commits. Finish or inspect that branch manually before rerunning ship.`);
  }
  if (remoteProbe.status === 0) fail(`cannot auto-resume ${branch}: a remote branch already exists.`);
  console.log(`==> Resume existing ${branch}`);
}

console.log("==> Stage accepted source");
run("git", ["add", "-A"]);
const stagedFiles = capture("git", ["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
if (!stagedFiles.length) fail("nothing staged after git add -A");

const forbidden = stagedFiles.filter((file) => {
  const base = path.posix.basename(file);
  const secretEnv = base === ".env" || (base.startsWith(".env.") && base !== ".env.example");
  return secretEnv ||
  file.startsWith("node_modules/") ||
  file.startsWith(".open-ii-backups/") ||
  file.startsWith(".open-ii-acceptance/") ||
  file.startsWith("up-patches/SCANIOM-UP-PATCH-") ||
  file.endsWith(".zip");
});
if (forbidden.length) {
  run("git", ["reset"]);
  fail(`refusing to commit local/secrets/patch artifacts:\n${forbidden.map((file) => `  - ${file}`).join("\n")}`);
}

const commitMessage = `open-ii: ${slug}`;
run("git", ["commit", "-m", commitMessage]);
const headSha = capture("git", ["rev-parse", "HEAD"]);

console.log("==> Push candidate");
run("git", ["push", "-u", "origin", branch]);

const tempDir = mkdtempSync(path.join(os.tmpdir(), "open-ii-ship-"));
const bodyFile = path.join(tempDir, "pr.md");
const diffStat = capture("git", ["diff", "--stat", "origin/main...HEAD"]);
const body = `## Open Immune accepted local change\n\n**Slice:** \`${slug}\`\n\nLocal patch/build workflow completed first.\n\n### Local acceptance\n\n- source audit PASS\n- typecheck PASS\n- tests PASS\n- ESLint zero warnings PASS\n- production build PASS\n- localhost-first Open Immune model preserved\n- real Scaniom Control/runtime contracts preserved\n\n### GitHub integration\n\nThis PR contains the locally accepted source and is the remote verification/engineering-history step. It does not use Vercel.\n\n### Change summary\n\n\`\`\`text\n${diffStat}\n\`\`\`\n${note ? `\n### Note\n\n${note}\n` : ""}\n### Source\n\nCandidate head: \`${headSha}\`\n`;
writeFileSync(bodyFile, body);

console.log("==> Open pull request");
const prUrl = capture("gh", [
  "pr", "create",
  "--repo", repo,
  "--base", "main",
  "--head", branch,
  "--title", `Open Immune · ${slug}`,
  "--body-file", bodyFile,
]);
const prNumber = capture("gh", ["pr", "view", prUrl, "--repo", repo, "--json", "number", "--jq", ".number"]);
console.log(`PR #${prNumber}: ${prUrl}`);

console.log("==> GitHub checks");
run("gh", ["pr", "checks", prNumber, "--repo", repo, "--watch"]);

const currentHead = capture("gh", ["pr", "view", prNumber, "--repo", repo, "--json", "headRefOid", "--jq", ".headRefOid"]);
if (currentHead !== headSha) fail(`PR head changed during checks. Expected ${headSha}, found ${currentHead}. Nothing was merged.`);

run("gh", ["pr", "comment", prNumber, "--repo", repo, "--body", `LOCAL ACCEPTANCE PASS ✅\n\nGitHub PR checks PASS ✅\n\nAccepted local source: \`${headSha}\`\n\nProceeding with green-only squash merge.`]);

console.log("==> Merge green PR");
run("gh", [
  "pr", "merge", prNumber,
  "--repo", repo,
  "--squash",
  "--delete-branch",
  "--match-head-commit", headSha,
]);

console.log("==> Sync local main");
run("git", ["switch", "main"]);
run("git", ["pull", "--ff-only", "origin", "main"]);

const mergeSha = capture("git", ["rev-parse", "HEAD"]);
run("gh", ["pr", "comment", prNumber, "--repo", repo, "--body", `OPEN IMMUNE SHIP PASS ✅\n\nMerged to \`main\`: \`${mergeSha}\`\n\nLocal acceptance + GitHub checks are recorded in this PR conversation.`], { allowFailure: true });

rmSync(tempDir, { recursive: true, force: true });
console.log();
console.log("==============================================================");
console.log("OPEN IMMUNE SHIP PASS");
console.log("==============================================================");
console.log(`PR:    #${prNumber}`);
console.log(`Merge: ${mergeSha}`);
console.log("Next: build the next slice locally through up-patches/.");
