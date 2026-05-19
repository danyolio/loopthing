import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const runDir = path.join(root, "tmp", "product-smoke");
const archive = path.join(root, "tmp", "product-smoke.loopthing");
const oneCommandArchive = path.join(root, "tmp", "one-command.loopthing");
const qualityRunDir = path.join(root, "tmp", "quality-smoke-run");
const codexRunDir = path.join(root, "tmp", "codex-chat-smoke-run");

fs.rmSync(runDir, { recursive: true, force: true });
fs.rmSync(qualityRunDir, { recursive: true, force: true });
fs.rmSync(codexRunDir, { recursive: true, force: true });
fs.rmSync(archive, { force: true });
fs.rmSync(oneCommandArchive, { force: true });

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

const required = [
  path.join(runDir, "reasoning.md"),
  path.join(runDir, "agent-handoff.md"),
  path.join(runDir, "source-metadata.json"),
  path.join(runDir, "compression-score.md"),
  path.join(runDir, "scores.jsonl"),
  archive,
  oneCommandArchive
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

console.log("product smoke ok");
