import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const runDir = path.join(root, "tmp", "product-smoke");
const archive = path.join(root, "tmp", "product-smoke.loopthing");
const oneCommandArchive = path.join(root, "tmp", "one-command.loopthing");
const qualityRunDir = path.join(root, "tmp", "quality-smoke-run");
const codexRunDir = path.join(root, "tmp", "codex-chat-smoke-run");
const claudeRunDir = path.join(root, "tmp", "claude-code-smoke-run");
const staleThesisRunDir = path.join(root, "tmp", "stale-thesis-smoke-run");
const dictatedProblemRunDir = path.join(root, "tmp", "dictated-problem-smoke-run");
const timestampRunDir = path.join(root, "tmp", "timestamp-chat-smoke-run");
const codexSessionRunDir = path.join(root, "tmp", "codex-session-smoke-run");
const codexSessionArchive = path.join(root, "tmp", "codex-session-smoke.loopthing");
const codexSessionCreateRunDir = path.join(root, "tmp", "codex-session-create-run");
const normalizedSessionFile = path.join(root, "tmp", "codex-session-normalized.jsonl");
const normalizedSessionRunDir = path.join(root, "tmp", "codex-normalized-smoke-run");
const fakeCodexHome = path.join(root, "tmp", "fake-codex-home");
const fakeClaudeHome = path.join(root, "tmp", "fake-claude-home");
const selfRunDir = path.join(root, "tmp", "self-run-smoke");
const selfArchive = path.join(root, "tmp", "self-run-smoke.loopthing");

fs.rmSync(runDir, { recursive: true, force: true });
fs.rmSync(qualityRunDir, { recursive: true, force: true });
fs.rmSync(codexRunDir, { recursive: true, force: true });
fs.rmSync(claudeRunDir, { recursive: true, force: true });
fs.rmSync(staleThesisRunDir, { recursive: true, force: true });
fs.rmSync(dictatedProblemRunDir, { recursive: true, force: true });
fs.rmSync(timestampRunDir, { recursive: true, force: true });
fs.rmSync(codexSessionRunDir, { recursive: true, force: true });
fs.rmSync(codexSessionCreateRunDir, { recursive: true, force: true });
fs.rmSync(normalizedSessionRunDir, { recursive: true, force: true });
fs.rmSync(fakeCodexHome, { recursive: true, force: true });
fs.rmSync(fakeClaudeHome, { recursive: true, force: true });
fs.rmSync(selfRunDir, { recursive: true, force: true });
fs.rmSync(archive, { force: true });
fs.rmSync(oneCommandArchive, { force: true });
fs.rmSync(codexSessionArchive, { force: true });
fs.rmSync(normalizedSessionFile, { force: true });
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
run(["compress", "test/fixtures/claude-code.jsonl", "--out", claudeRunDir, "--title", "Claude Code Chat Test"]);
run(["compress", "test/fixtures/old-thesis-source.md", "test/fixtures/claude-code.jsonl", "--out", staleThesisRunDir, "--title", "Stale Thesis Test"]);
run(["compress", "test/fixtures/dictated-problem-chat.md", "--out", dictatedProblemRunDir, "--title", "Dictated Problem Test"]);
run(["compress", "test/fixtures/timestamp-chat.md", "--out", timestampRunDir, "--title", "Timestamp Chat Test"]);
const fakeSessionDir = path.join(fakeCodexHome, "sessions", "2026", "05", "20");
fs.mkdirSync(fakeSessionDir, { recursive: true });
fs.copyFileSync(path.join(root, "test/fixtures/codex-rollout.jsonl"), path.join(fakeSessionDir, "rollout-2026-05-20T00-00-00-11111111-2222-3333-4444-555555555555.jsonl"));
fs.writeFileSync(path.join(fakeCodexHome, "session_index.jsonl"), `${JSON.stringify({ id: "11111111-2222-3333-4444-555555555555", thread_name: "Fixture Codex Session", updated_at: "2026-05-20T00:00:07.000Z" })}\n`);
const sessionInspect = run(["sessions", "inspect", "test/fixtures/codex-rollout.jsonl"]);
const sessionScan = run(["sessions", "scan", "--codex-home", fakeCodexHome, "--all"]);
const fakeClaudeProjectDir = path.join(fakeClaudeHome, "projects", "fixture-project");
fs.mkdirSync(fakeClaudeProjectDir, { recursive: true });
fs.copyFileSync(path.join(root, "test/fixtures/claude-code.jsonl"), path.join(fakeClaudeProjectDir, "matching.jsonl"));
fs.writeFileSync(path.join(fakeClaudeProjectDir, "unrelated.jsonl"), [
  { type: "user", sessionId: "unrelated", timestamp: "2026-05-20T00:00:00.000Z", message: { role: "user", content: "Please draft a short note about a birthday lunch." } },
  { type: "assistant", sessionId: "unrelated", timestamp: "2026-05-20T00:00:01.000Z", message: { role: "assistant", content: "Here is a warm and simple note." } }
].map((row) => JSON.stringify(row)).join("\n") + "\n");
const claudeScan = run(["claude", "scan", "NDIS", "recovery", "coach", "--claude-home", fakeClaudeHome]);
const claudeScanLike = run(["claude", "scan", "--like", "test/fixtures/dictated-problem-chat.md", "--claude-home", fakeClaudeHome]);
const claudeInspect = run(["claude", "inspect", path.join(fakeClaudeProjectDir, "matching.jsonl")]);
run(["sessions", "normalize", "test/fixtures/codex-rollout.jsonl", "--out", normalizedSessionFile]);
run(["compress-session", "test/fixtures/codex-rollout.jsonl", "--out", codexSessionRunDir, "--title", "Structured Codex Session Test"]);
run(["compress", normalizedSessionFile, "--out", normalizedSessionRunDir, "--title", "Normalized Codex Session Test"]);
run(["create-session", "11111111", "--codex-home", fakeCodexHome, "--out", codexSessionArchive, "--run-dir", codexSessionCreateRunDir]);
run(["create", ".", "--out", selfArchive, "--run-dir", selfRunDir, "--title", "LoopThing Clean Project Handoff"]);
run(["create", ".", "--out", selfArchive, "--run-dir", selfRunDir, "--title", "LoopThing Clean Project Handoff"]);

const required = [
  path.join(runDir, "START_HERE.md"),
  path.join(runDir, "brief.md"),
  path.join(runDir, "reasoning.md"),
  path.join(runDir, "agent-guide.md"),
  path.join(runDir, "agent-handoff.md"),
  path.join(runDir, "source-audit.md"),
  path.join(runDir, "source-metadata.json"),
  path.join(runDir, "compression-score.md"),
  path.join(runDir, "scores.jsonl"),
  archive,
  oneCommandArchive,
  codexSessionArchive,
  normalizedSessionFile,
  path.join(codexSessionRunDir, "reasoning.md"),
  path.join(claudeRunDir, "reasoning.md"),
  path.join(staleThesisRunDir, "reasoning.md"),
  path.join(dictatedProblemRunDir, "reasoning.md"),
  path.join(normalizedSessionRunDir, "reasoning.md"),
  path.join(selfRunDir, "START_HERE.md"),
  path.join(selfRunDir, "brief.md"),
  path.join(selfRunDir, "reasoning.md"),
  path.join(selfRunDir, "agent-guide.md"),
  path.join(selfRunDir, "agent-handoff.md"),
  path.join(selfRunDir, "source-audit.md"),
  path.join(selfRunDir, "compression-score.md"),
  selfArchive
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const reasoning = fs.readFileSync(path.join(runDir, "reasoning.md"), "utf8");
for (const section of ["## Intent", "## Key user messages", "## Decision shifts", "## Discarded branches"]) {
  if (!reasoning.includes(section)) throw new Error(`Missing section ${section}`);
}

const brief = fs.readFileSync(path.join(runDir, "brief.md"), "utf8");
for (const expected of ["One-line read", "Sharp takeaway", "Next move"]) {
  if (!brief.includes(expected)) throw new Error(`Missing brief content ${expected}`);
}

const agentGuide = fs.readFileSync(path.join(runDir, "agent-guide.md"), "utf8");
for (const expected of ["Agent Guide", "Read order", "Source handling"]) {
  if (!agentGuide.includes(expected)) throw new Error(`Missing agent guide content ${expected}`);
}

const handoff = fs.readFileSync(path.join(runDir, "agent-handoff.md"), "utf8");
for (const expected of ["Agent Handoff", "Do Not Reopen These Branches", "Operating Instruction"]) {
  if (!handoff.includes(expected)) throw new Error(`Missing handoff content ${expected}`);
}

const startHere = fs.readFileSync(path.join(runDir, "START_HERE.md"), "utf8");
for (const expected of ["START HERE", "Read In This Order", "brief.md", "agent-guide.md", "agent-handoff.md", "source-audit.md", "Token Estimate"]) {
  if (!startHere.includes(expected)) throw new Error(`Missing start content ${expected}`);
}
const metadata = JSON.parse(fs.readFileSync(path.join(runDir, "source-metadata.json"), "utf8"));
if (!metadata.token_counts?.input_estimate || !metadata.token_counts?.output_estimate) {
  throw new Error("Metadata should include input and output token estimates");
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

const claudeMetadata = JSON.parse(fs.readFileSync(path.join(claudeRunDir, "source-metadata.json"), "utf8"));
const claudeReasoning = fs.readFileSync(path.join(claudeRunDir, "reasoning.md"), "utf8");
const claudeIntent = claudeReasoning.match(/## Intent\n\n([\s\S]*?)\n\n## Problem/)?.[1] || "";
if (claudeMetadata.role_counts.user !== 2 || claudeMetadata.role_counts.assistant !== 1) {
  throw new Error("Claude Code import should preserve exact user/assistant role counts and skip local-command noise");
}
if (claudeMetadata.provider_counts["claude-code"] !== 3 || claudeMetadata.role_quality.exact !== 3) {
  throw new Error("Claude Code import should mark structured roles as exact");
}
for (const expected of [
  "recovery coaching",
  "graduate-level NDIS mental health roles",
  "not first-year students doing therapy"
]) {
  if (!claudeReasoning.includes(expected)) throw new Error(`Claude Code fixture missing ${expected}`);
}
if (claudeReasoning.includes("private chain of thought should be ignored") || claudeReasoning.includes("local-command-caveat")) {
  throw new Error("Claude Code fixture should omit thinking/tool/local-command noise");
}
if (/handoff|someone else|rereading the whole strategy thread/i.test(claudeIntent)) {
  throw new Error("Subject intent should not leak LoopThing's handoff purpose into project output");
}

const staleThesisReasoning = fs.readFileSync(path.join(staleThesisRunDir, "reasoning.md"), "utf8");
const staleThesisMatch = staleThesisReasoning.match(/## Current thesis\n\n([\s\S]*?)\n\n## Current wedge/);
if (!staleThesisMatch) throw new Error("Stale thesis fixture should include current thesis section");
if (!staleThesisMatch[1].includes("graduate-to-NDIS-workforce bridge")) {
  throw new Error("Recent chat thesis should beat stale source-doc one-line summary");
}
if (staleThesisMatch[1].includes("automated claims processing")) {
  throw new Error("Stale source-doc thesis should not override recent chat thesis");
}

const dictatedProblemReasoning = fs.readFileSync(path.join(dictatedProblemRunDir, "reasoning.md"), "utf8");
const dictatedProblemMatch = dictatedProblemReasoning.match(/## Problem\n\n([\s\S]*?)\n\n## Current thesis/);
if (!dictatedProblemMatch) throw new Error("Dictated problem fixture should include problem section");
if (!dictatedProblemMatch[1].includes("Decide the legitimate fit for psych students and psychology graduates within NDIS roles")) {
  throw new Error("Dictated problem should synthesize the decision rather than paste the voice transcript");
}
if (/to to to|like, which role|thirty of your students/i.test(dictatedProblemMatch[1])) {
  throw new Error("Dictated problem should not preserve disfluent transcript text");
}

const timestampReasoning = fs.readFileSync(path.join(timestampRunDir, "reasoning.md"), "utf8");
const timestampMetadata = JSON.parse(fs.readFileSync(path.join(timestampRunDir, "source-metadata.json"), "utf8"));
if (timestampMetadata.message_count < 5) {
  throw new Error("Timestamp fixture should be parsed into multiple chat messages");
}
for (const expected of [
  "The strongest direction is the handoff CLI.",
  "Do not build the dashboard first",
  "commit to a CLI",
  "run the CLI on ten real timestamped chat exports"
]) {
  if (!timestampReasoning.includes(expected)) throw new Error(`Timestamp fixture missing ${expected}`);
}
if (timestampReasoning.includes("Preserve the current thesis, boundaries, killed branches, risks, and next evidence gate")) {
  throw new Error("Timestamp fixture should not use generic outcome boilerplate");
}

if (!sessionInspect.includes("Role quality: exact structured roles")) {
  throw new Error("Codex session inspect should report exact structured roles");
}
if (!sessionInspect.includes("this isn't working so great")) {
  throw new Error("Codex session inspect should show the first user message");
}
if (!sessionScan.includes("Fixture Codex Session")) {
  throw new Error("Codex session scan should use session index titles");
}
if (!claudeScan.includes("matching.jsonl") || claudeScan.includes("unrelated.jsonl")) {
  throw new Error("Claude scan should find matching local Claude conversations and omit unrelated ones");
}
if (!claudeScanLike.includes("matching.jsonl") || !claudeScanLike.includes("psych") || claudeScanLike.includes("unrelated.jsonl")) {
  throw new Error("Claude scan --like should use source text to find similar local Claude conversations");
}
if (!claudeInspect.includes("Provider: Claude Code") || !claudeInspect.includes("Role quality: exact structured roles")) {
  throw new Error("Claude inspect should summarize structured Claude JSONL");
}

const codexSessionReasoning = fs.readFileSync(path.join(codexSessionRunDir, "reasoning.md"), "utf8");
const codexSessionMetadata = JSON.parse(fs.readFileSync(path.join(codexSessionRunDir, "source-metadata.json"), "utf8"));
if (codexSessionMetadata.role_counts.user !== 2 || codexSessionMetadata.role_counts.assistant !== 2) {
  throw new Error("Codex session import should preserve exact user/assistant role counts without event duplicates");
}
if (codexSessionMetadata.role_quality.exact !== 4) {
  throw new Error("Codex session import should mark roles as exact");
}
for (const expected of [
  "separate finding conversations from compressing conversations",
  "exact session matching"
]) {
  if (!codexSessionReasoning.includes(expected)) throw new Error(`Codex session reasoning missing ${expected}`);
}

const normalizedRows = fs.readFileSync(normalizedSessionFile, "utf8").trim().split(/\n/).map((line) => JSON.parse(line));
if (normalizedRows.length !== 4 || normalizedRows.some((row) => row.role_confidence !== "exact")) {
  throw new Error("Normalized Codex session should preserve exact role confidence");
}
const normalizedMetadata = JSON.parse(fs.readFileSync(path.join(normalizedSessionRunDir, "source-metadata.json"), "utf8"));
if (normalizedMetadata.role_quality.exact !== 4) {
  throw new Error("Compression from normalized messages should preserve exact role quality");
}

const selfReasoning = fs.readFileSync(path.join(selfRunDir, "reasoning.md"), "utf8");
const selfHandoff = fs.readFileSync(path.join(selfRunDir, "agent-handoff.md"), "utf8");
const selfMetadata = JSON.parse(fs.readFileSync(path.join(selfRunDir, "source-metadata.json"), "utf8"));
for (const expected of [
  "LoopThing turns local Codex and Claude Code history into a handoff artifact",
  "Raw archive as product",
  "Run the compression test on 20 real chats",
  "Show-your-work format for recipients is weak",
  "Memory but better is probably wrong",
  "Viewer-first polish"
]) {
  if (!selfReasoning.includes(expected) && !selfHandoff.includes(expected)) {
    throw new Error(`Self-run output missing LoopThing content ${expected}`);
  }
}
if (selfMetadata.source_kind_counts.generated) {
  throw new Error("Root self-run should not classify root START_HERE.md as generated output");
}

const selfScore = fs.readFileSync(path.join(selfRunDir, "compression-score.md"), "utf8");
if (!selfScore.includes("14/14 checks passed")) throw new Error("Self-run score did not pass 14/14 checks");
const selfScoreRecords = fs.readFileSync(path.join(selfRunDir, "scores.jsonl"), "utf8").trim().split(/\n/).filter(Boolean);
if (selfScoreRecords.length !== 1) throw new Error("Self-run should replace stale score records on repeated create");

console.log("product smoke ok");
