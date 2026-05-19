import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const runDir = path.join(root, "tmp", "product-smoke");
const archive = path.join(root, "tmp", "product-smoke.loopthing");
const oneCommandArchive = path.join(root, "tmp", "one-command.loopthing");
const qualityRunDir = path.join(root, "tmp", "quality-smoke-run");
const codexRunDir = path.join(root, "tmp", "codex-chat-smoke-run");
const selfRunDir = path.join(root, "tmp", "self-run-smoke");
const selfArchive = path.join(root, "tmp", "self-run-smoke.loopthing");
const futureAlliedRunDir = path.join(root, "tmp", "future-allied-smoke-run");

fs.rmSync(runDir, { recursive: true, force: true });
fs.rmSync(qualityRunDir, { recursive: true, force: true });
fs.rmSync(codexRunDir, { recursive: true, force: true });
fs.rmSync(selfRunDir, { recursive: true, force: true });
fs.rmSync(futureAlliedRunDir, { recursive: true, force: true });
fs.rmSync(archive, { force: true });
fs.rmSync(oneCommandArchive, { force: true });
fs.rmSync(selfArchive, { force: true });

function run(args) {
  const result = spawnSync("node", ["bin/loopthing.mjs", ...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
  return result.stdout.trim();
}

run(["compress", "test/fixtures/founder-chat.md", "--out", runDir, "--title", "Founder Wedge Stress Test"]);
run(["score", runDir]);
run(["compare", path.join(runDir, "reasoning.md"), path.join(runDir, "variants", "generic.md")]);
run(["seal", runDir, "--out", archive]);
run(["create", "test/fixtures/founder-chat.md", "--out", oneCommandArchive, "--title", "One Command Smoke Test"]);
run(["compress", "test/fixtures/project-docs.md", "--out", qualityRunDir, "--title", "Project Docs Quality Test"]);
run(["compress", "test/fixtures/codex-project-chat.md", "--out", codexRunDir, "--title", "Codex Project Chat Test"]);
run(["create", ".", "--out", selfArchive, "--run-dir", selfRunDir, "--title", "LoopThing Clean Project Handoff"]);
run(["create", ".", "--out", selfArchive, "--run-dir", selfRunDir, "--title", "LoopThing Clean Project Handoff"]);
run(["compress", "test/fixtures/future-allied-chat.md", "--out", futureAlliedRunDir, "--title", "Future Allied Handoff"]);

const required = [
  path.join(runDir, "START_HERE.md"),
  path.join(runDir, "reasoning.md"),
  path.join(runDir, "agent-handoff.md"),
  path.join(runDir, "source-metadata.json"),
  path.join(runDir, "compression-score.md"),
  path.join(runDir, "scores.jsonl"),
  archive,
  oneCommandArchive,
  path.join(selfRunDir, "START_HERE.md"),
  path.join(selfRunDir, "reasoning.md"),
  path.join(selfRunDir, "agent-handoff.md"),
  path.join(selfRunDir, "compression-score.md"),
  selfArchive,
  path.join(futureAlliedRunDir, "reasoning.md")
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const reasoning = fs.readFileSync(path.join(runDir, "reasoning.md"), "utf8");
for (const section of ["## Intent", "## Critical messages", "## Framing diffs", "## Discarded branches"]) {
  if (!reasoning.includes(section)) throw new Error(`Missing section ${section}`);
}

const handoff = fs.readFileSync(path.join(runDir, "agent-handoff.md"), "utf8");
for (const expected of ["Agent Handoff", "Do Not Reopen These Branches", "Operating Instruction"]) {
  if (!handoff.includes(expected)) throw new Error(`Missing handoff content ${expected}`);
}

const startHere = fs.readFileSync(path.join(runDir, "START_HERE.md"), "utf8");
for (const expected of ["START HERE", "Read In This Order", "agent-handoff.md"]) {
  if (!startHere.includes(expected)) throw new Error(`Missing start content ${expected}`);
}

const qualityReasoning = fs.readFileSync(path.join(qualityRunDir, "reasoning.md"), "utf8");
for (const expected of [
  "Memory But Better",
  "Viewer-First Product",
  "Compression quality might fail on real messy chats.",
  "Run the compression test on 20 real chats before building more UI.",
  "Does handoff resonate as the wedge?"
]) {
  if (!qualityReasoning.includes(expected)) throw new Error(`Quality fixture missing ${expected}`);
}

const codexReasoning = fs.readFileSync(path.join(codexRunDir, "reasoning.md"), "utf8");
for (const expected of [
  "chat-transcript",
  "Have you built the loopthing actual product?",
  "Can you use ralph loop to build the loopthing product?",
  "Actually run the loopthing you built on this folder",
  "real ChatGPT / Codex project"
]) {
  if (!codexReasoning.includes(expected)) throw new Error(`Codex chat fixture missing ${expected}`);
}

const selfReasoning = fs.readFileSync(path.join(selfRunDir, "reasoning.md"), "utf8");
const selfHandoff = fs.readFileSync(path.join(selfRunDir, "agent-handoff.md"), "utf8");
const selfMetadata = JSON.parse(fs.readFileSync(path.join(selfRunDir, "source-metadata.json"), "utf8"));
for (const expected of [
  "LoopThing compresses messy AI work into a handoff artifact",
  "Raw archive as product",
  "Run the compression test on 20 real chats"
]) {
  if (!selfReasoning.includes(expected) && !selfHandoff.includes(expected)) {
    throw new Error(`Self-run output missing LoopThing content ${expected}`);
  }
}
for (const unexpected of [
  "Future Allied supplies and manages",
  "NDIS-heavy allied-health providers",
  "Run 5 provider discovery calls"
]) {
  if (selfReasoning.includes(unexpected) || selfHandoff.includes(unexpected)) {
    throw new Error(`Self-run output leaked Future Allied adapter content: ${unexpected}`);
  }
}
if (selfMetadata.source_kind_counts.generated) {
  throw new Error("Root self-run should not classify root START_HERE.md as generated output");
}

const selfScore = fs.readFileSync(path.join(selfRunDir, "compression-score.md"), "utf8");
if (!selfScore.includes("13/13 checks passed")) throw new Error("Self-run score did not pass 13/13 checks");
const selfScoreRecords = fs.readFileSync(path.join(selfRunDir, "scores.jsonl"), "utf8").trim().split(/\n/).filter(Boolean);
if (selfScoreRecords.length !== 1) throw new Error("Self-run should replace stale score records on repeated create");

const futureAlliedReasoning = fs.readFileSync(path.join(futureAlliedRunDir, "reasoning.md"), "utf8");
for (const expected of [
  "Future Allied supplies and manages",
  "NDIS-heavy allied-health providers",
  "Run 5 provider discovery calls"
]) {
  if (!futureAlliedReasoning.includes(expected)) {
    throw new Error(`Future Allied adapter missing expected content ${expected}`);
  }
}

console.log("product smoke ok");
