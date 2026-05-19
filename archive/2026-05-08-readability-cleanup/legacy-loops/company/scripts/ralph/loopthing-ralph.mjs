#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDir, "..", "..");
const areasDir = path.join(workspace, "areas");
const promptTemplate = path.join(workspace, "scripts", "ralph", "prompt.md");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function areaPath(area, file = "") {
  return path.join(areasDir, area, file);
}

function loadArea(area) {
  const prdFile = areaPath(area, "prd.json");
  if (!fs.existsSync(prdFile)) {
    const areas = fs.readdirSync(areasDir).filter((name) => fs.existsSync(areaPath(name, "prd.json")));
    throw new Error(`Unknown area "${area}". Available: ${areas.join(", ")}`);
  }
  return { prdFile, prd: readJson(prdFile), progressFile: areaPath(area, "progress.txt") };
}

function unfinishedStories(prd) {
  return [...prd.userStories]
    .filter((story) => !story.passes)
    .sort((a, b) => Number(a.priority) - Number(b.priority));
}

function nextStory(prd) {
  return unfinishedStories(prd)[0] || null;
}

function listAreas() {
  const areas = fs.readdirSync(areasDir).filter((name) => fs.existsSync(areaPath(name, "prd.json"))).sort();
  for (const area of areas) {
    const { prd } = loadArea(area);
    const total = prd.userStories.length;
    const done = prd.userStories.filter((story) => story.passes).length;
    const next = nextStory(prd);
    console.log(`${area.padEnd(12)} ${done}/${total} passed${next ? ` next: ${next.id} ${next.title}` : " COMPLETE"}`);
  }
}

function buildPrompt(area) {
  const { prd, progressFile } = loadArea(area);
  const story = nextStory(prd);
  if (!story) return `All stories complete for ${area}.\n`;
  const progress = fs.existsSync(progressFile) ? fs.readFileSync(progressFile, "utf8") : "";
  const basePrompt = fs.readFileSync(promptTemplate, "utf8");
  const agents = fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8");
  return `${basePrompt}

---

# Selected Area

${area}

# Company Memory

${agents}

# Area PRD

\`\`\`json
${JSON.stringify(prd, null, 2)}
\`\`\`

# Area Progress

${progress || "No progress yet."}

# Pick This Story

${story.id}: ${story.title}

${story.description}

## Acceptance Criteria

${story.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")}
`;
}

function writeNext(area) {
  const prompt = buildPrompt(area);
  const out = areaPath(area, "next-prompt.md");
  fs.writeFileSync(out, prompt);
  console.log(`Wrote ${path.relative(root, out)}`);
}

function runArea(area, iterationsArg = "1") {
  const iterations = Number(iterationsArg);
  if (!Number.isFinite(iterations) || iterations < 1) throw new Error("iterations must be a positive number");
  for (let i = 0; i < iterations; i += 1) {
    const prompt = buildPrompt(area);
    if (prompt.startsWith("All stories complete")) {
      console.log(prompt.trim());
      return;
    }
    const command = process.env.LOOPTHING_AGENT_CMD;
    if (!command) {
      writeNext(area);
      console.log("Set LOOPTHING_AGENT_CMD to invoke an agent, or paste next-prompt.md into your agent.");
      return;
    }
    console.log(`Running loop ${i + 1}/${iterations} for ${area}`);
    const result = spawnSync(command, { input: prompt, shell: true, stdio: ["pipe", "inherit", "inherit"] });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

function updateStory(area, id, passes, note) {
  const { prdFile, prd, progressFile } = loadArea(area);
  const story = prd.userStories.find((item) => item.id === id);
  if (!story) throw new Error(`Story ${id} not found in ${area}`);
  story.passes = passes;
  story.notes = note || story.notes || "";
  writeJson(prdFile, prd);
  const stamp = new Date().toISOString();
  fs.appendFileSync(progressFile, `\n## ${stamp} - ${id}\n\n- Status: ${passes ? "pass" : "fail"}\n- Note: ${note || "No note"}\n---\n`);
  console.log(`${passes ? "Passed" : "Failed"} ${area}/${id}`);
}

function usage() {
  console.log(`Usage:
  node loops/company/scripts/ralph/loopthing-ralph.mjs list
  node loops/company/scripts/ralph/loopthing-ralph.mjs next <area>
  node loops/company/scripts/ralph/loopthing-ralph.mjs run <area> [iterations]
  node loops/company/scripts/ralph/loopthing-ralph.mjs pass <area> <story-id> [note]
  node loops/company/scripts/ralph/loopthing-ralph.mjs fail <area> <story-id> [note]`);
}

try {
  const [command, area, idOrIterations, ...rest] = process.argv.slice(2);
  if (!command || command === "help") usage();
  else if (command === "list") listAreas();
  else if (command === "next") writeNext(area);
  else if (command === "run") runArea(area, idOrIterations || "1");
  else if (command === "pass") updateStory(area, idOrIterations, true, rest.join(" "));
  else if (command === "fail") updateStory(area, idOrIterations, false, rest.join(" "));
  else usage();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
