#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.1.0";
const MIME = "application/vnd.loopthing+zip";
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json"]);

function usage() {
  console.log(`loopthing ${VERSION}

Usage:
  loopthing create <file-or-dir...> --out <name.loopthing> [--title <title>] [--run-dir <run-dir>]
  loopthing compress <file-or-dir...> --out <run-dir> [--title <title>] [--mode handoff]
  loopthing score <run-dir>
  loopthing compare <file-a> <file-b> [...file-c]
  loopthing seal <run-dir> --out <name.loopthing>

Examples:
  loopthing create ./transcripts --out pricing-decision.loopthing --title "Pricing decision"
  loopthing compress ./transcripts --out ./runs/run-001 --title "Pricing decision"
  loopthing score ./runs/run-001
  loopthing seal ./runs/run-001 --out pricing-decision.loopthing`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value.startsWith("--")) {
      const key = value.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        i += 1;
      }
    } else positional.push(value);
  }
  return { positional, flags };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
}

function walkInputs(inputs) {
  const files = [];
  for (const input of inputs) {
    const full = path.resolve(input);
    if (!fs.existsSync(full)) throw new Error(`Input not found: ${input}`);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(full)) {
        files.push(...walkInputs([path.join(full, child)]));
      }
    } else if (TEXT_EXTENSIONS.has(path.extname(full).toLowerCase())) {
      files.push(full);
    }
  }
  return files.sort();
}

function textOfContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(textOfContent).join("\n");
  if (content && typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (typeof content.value === "string") return content.value;
    if (Array.isArray(content.parts)) return content.parts.map(textOfContent).join("\n");
    return Object.values(content).map(textOfContent).filter(Boolean).join("\n");
  }
  return "";
}

function classifySource(file) {
  const relative = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const basename = path.basename(relative);
  if (relative.startsWith("loopthing-source/Prompts/")) return "prompt";
  if (relative.startsWith("loopthing-source/Thinking/")) return "thinking";
  if (relative.startsWith("loopthing-source/Generated Explainers/")) return "generated-explainer";
  if (relative.startsWith("loopthing-source/Metadata/")) return "metadata";
  if (relative.startsWith("loops/product-direction/")) return "product-loop";
  if (relative.startsWith("loops/company/") || relative.startsWith("ralph-company/")) return "company-loop";
  if (relative.startsWith("docs/")) return "docs";
  if (/(chat|transcript|conversation|session).*\.(md|txt|json)$/i.test(basename)) return "chat-transcript";
  if (relative.startsWith("test/fixtures/")) return "fixture";
  if (/README|PROMPT|AGENTS|DESIGN/i.test(relative)) return "orientation";
  return "source";
}

function collectJsonMessages(value, source, messages = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonMessages(item, source, messages);
    return messages;
  }
  if (!value || typeof value !== "object") return messages;

  const roleValue = value.role || value.author?.role || value.sender || value.from;
  const contentValue = value.content || value.text || value.message;
  const content = textOfContent(contentValue).trim();
  if (roleValue && content) {
    messages.push({
      role: normalizeRole(String(roleValue)),
      content,
      source,
      source_kind: "chat-transcript"
    });
    return messages;
  }

  for (const child of Object.values(value)) collectJsonMessages(child, source, messages);
  return messages;
}

function normalizeRole(role) {
  const lowered = role.toLowerCase();
  if (["human", "user", "participant", "me"].includes(lowered)) return "user";
  if (["assistant", "ai", "chatgpt", "codex", "claude", "system"].includes(lowered)) return lowered === "system" ? "system" : "assistant";
  return lowered;
}

function parseTextMessages(raw, source, sourceKind = "source") {
  const lines = raw.split(/\r?\n/);
  const chunks = [];
  let current = { role: "user", content: [] };
  const roleHeading = /^(?:#{1,6}\s*)?(user|human|assistant|ai|chatgpt|codex|claude|system)\s*:?\s*$/i;
  const rolePrefix = /^(user|human|assistant|ai|chatgpt|codex|claude|system)\s*:\s*(.*)$/i;

  function flush() {
    const content = current.content.join("\n").trim();
    if (content) chunks.push({ role: normalizeRole(current.role), content, source, source_kind: sourceKind });
  }

  for (const line of lines) {
    const heading = line.trim().match(roleHeading);
    const prefix = line.match(rolePrefix);
    if (heading) {
      flush();
      current = { role: heading[1], content: [] };
    } else if (prefix) {
      flush();
      current = { role: prefix[1], content: [prefix[2]] };
    } else {
      current.content.push(line);
    }
  }
  flush();
  return chunks.length ? chunks : [{ role: "user", content: raw.trim(), source, source_kind: sourceKind }];
}

function parseFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const source = path.relative(process.cwd(), file);
  const sourceKind = classifySource(file);
  if (path.extname(file).toLowerCase() === ".json") {
    try {
      const parsed = JSON.parse(raw);
      const jsonMessages = collectJsonMessages(parsed, source);
      if (jsonMessages.length) return jsonMessages;
    } catch {
      // Fall through to text parsing. Some chat exports are json-ish snippets.
    }
  }
  return parseTextMessages(raw, source, sourceKind);
}

function excerpt(text, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}...`;
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function markdownSections(text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match) headings.push({ index, level: match[1].length, heading: cleanMarkdown(match[2]) });
  }
  return headings.map((heading, headingIndex) => {
    const next = headings
      .slice(headingIndex + 1)
      .find((candidate) => candidate.level <= heading.level);
    const end = next ? next.index : lines.length;
    return {
      heading: heading.heading,
      level: heading.level,
      body: lines.slice(heading.index + 1, end).join("\n").trim()
    };
  });
}

function matchingSections(messages, regexes) {
  const matches = [];
  for (const message of messages) {
    for (const section of markdownSections(message.content)) {
      const lowered = section.heading.toLowerCase();
      if (regexes.some((regex) => regex.test(lowered))) {
        matches.push({ ...section, source: message.source, role: message.role });
      }
    }
  }
  return matches;
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/^\s*-\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function meaningfulLines(markdown) {
  const lines = [];
  let inCode = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const cleaned = cleanMarkdown(line);
    if (!cleaned) continue;
    if (/^#+\s/.test(line.trim())) continue;
    if (/^(from|to|trigger|why it mattered|---|\|)/i.test(cleaned)) continue;
    lines.push(cleaned);
  }
  return lines;
}

function firstParagraph(markdown) {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) => cleanMarkdown(paragraph.replace(/\n/g, " ")))
    .find((paragraph) => paragraph && !paragraph.startsWith("|")) || "";
}

function sectionSummary(section, max = 260) {
  const paragraph = firstParagraph(section.body);
  if (paragraph) return excerpt(paragraph, max);
  const line = meaningfulLines(section.body)[0];
  return line ? excerpt(line, max) : "";
}

function normalizeReason(value) {
  return cleanMarkdown(value)
    .replace(/^(reason|because|killed because|rejected because)\s*:?\s*/i, "")
    .replace(/^rejected because\s+/i, "")
    .trim();
}

function subsectionsFromBody(markdown) {
  const lines = markdown.split(/\r?\n/);
  const items = [];
  let current = null;
  function flush() {
    if (!current) return;
    const detail = meaningfulLines(current.body.join("\n")).find((line) => !line.toLowerCase().startsWith(current.title.toLowerCase()));
    items.push({ title: current.title, detail: detail || "" });
  }
  for (const line of lines) {
    const heading = line.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) {
      flush();
      current = { title: cleanMarkdown(heading[1]), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  flush();
  return items;
}

function scoreMessage(message, index, total) {
  const text = message.content.toLowerCase();
  let score = Math.min(message.content.length / 90, 8);
  const terms = [
    "feedback", "actually", "however", "but", "not", "instead", "decided",
    "kill", "killed", "discard", "rejected", "wrong", "problem", "gold",
    "wedge", "trust", "handoff", "business", "mrr", "pricing", "risk",
    "next", "build", "ship", "commit", "plan", "strategy", "why"
  ];
  for (const term of terms) if (text.includes(term)) score += 2;
  const directionTerms = [
    "ralph loop", "feedback", "make", "build", "run it", "actual product",
    "whole chat", "real chatgpt", "codex project", "push", "commit",
    "change", "instead", "not", "do i really need"
  ];
  for (const term of directionTerms) if (text.includes(term)) score += 3;
  const sourceWeights = {
    "chat-transcript": 7,
    prompt: 5,
    thinking: 4,
    "product-loop": 3,
    "company-loop": 2,
    "generated-explainer": 1,
    orientation: 1
  };
  score += sourceWeights[message.source_kind] || 0;
  if (message.role === "user") score += 2;
  if (message.role === "assistant") score -= 1;
  if (text.includes("?")) score += 2;
  score += index / Math.max(total, 1);
  return score;
}

function topMessages(messages, count = 5) {
  const userMessages = messages.filter((message) => message.role === "user" || message.role === "human");
  const candidates = userMessages.length ? userMessages : messages;
  const ranked = candidates
    .map((message, index) => ({ ...message, globalIndex: messages.indexOf(message), score: scoreMessage(message, index, candidates.length) }))
    .sort((a, b) => b.score - a.score)
  const chatDirections = ranked
    .filter((message) => message.source_kind === "chat-transcript" && message.role === "user")
    .slice(0, Math.min(3, count));
  const selected = [];
  for (const message of [...chatDirections, ...ranked]) {
    if (selected.some((existing) => existing.globalIndex === message.globalIndex)) continue;
    selected.push(message);
    if (selected.length >= count) break;
  }
  return selected
    .sort((a, b) => a.globalIndex - b.globalIndex);
}

function findSentences(messages, regexes, limit = 4) {
  const found = [];
  for (const message of messages) {
    for (const sentence of splitSentences(message.content)) {
      const lowered = sentence.toLowerCase();
      if (regexes.some((regex) => regex.test(lowered))) found.push({ sentence, source: message.source, role: message.role });
      if (found.length >= limit) return found;
    }
  }
  return found;
}

function topicTags(messages) {
  const text = messages.map((message) => message.content).join("\n").toLowerCase();
  const topics = [
    ["handoff", /handoff|share|send|recipient|cofounder|teammate/],
    ["compression", /compress|summary|summarize|gold|signal|noise/],
    ["brand", /brand|trust|design|refero|website|visual/],
    ["business", /business|market|pricing|mrr|revenue|customer/],
    ["product", /product|cli|build|viewer|feature|workflow/],
    ["life-design", /solo|surf|life|support|contractor|team/],
    ["format", /file|container|loopthing|artifact|zip|mime/],
    ["discarded-ideas", /kill|killed|discard|rejected|wrong direction/]
  ];
  return topics.filter(([, regex]) => regex.test(text)).map(([topic]) => topic);
}

function sourceMetadata(messages, files) {
  const roleCounts = messages.reduce((acc, message) => {
    acc[message.role] = (acc[message.role] || 0) + 1;
    return acc;
  }, {});
  const sourceKindCounts = messages.reduce((acc, message) => {
    const kind = message.source_kind || "source";
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  return {
    format: "loopthing/source-metadata-v0.1",
    created: new Date().toISOString(),
    message_count: messages.length,
    role_counts: roleCounts,
    source_kind_counts: sourceKindCounts,
    topic_tags: topicTags(messages),
    source_files: files.map((file) => ({
      path: path.relative(process.cwd(), file),
      kind: classifySource(file),
      bytes: fs.statSync(file).size,
      sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
    }))
  };
}

function inferIntent(messages, critical) {
  const section = matchingSections(messages, [/^intent$/, /underlying goal/])[0];
  if (section) {
    const summary = sectionSummary(section, 320);
    if (summary) return summary;
  }
  const firstUser = messages.find((message) => message.role === "user");
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!firstUser && !lastUser) return "The conversation is trying to preserve a reasoning path from source material.";
  return `The participant starts from "${excerpt(firstUser?.content || "", 140)}" and ends near "${excerpt(lastUser?.content || "", 140)}". The underlying intent is to compress messy exploration into a handoff artifact another person can use without reading the transcript.`;
}

function inferProblem(messages) {
  const section = matchingSections(messages, [/^problem$/, /problem statement/])[0];
  if (section) {
    const summary = sectionSummary(section, 320);
    if (summary) return summary;
  }
  const problem = findSentences(messages, [/problem/, /gold/, /messy/, /chaos/, /noisy/, /copy/, /handoff/, /trust/, /share/], 1)[0];
  if (problem) return `The problem surfaced in the source language: "${excerpt(problem.sentence, 260)}"`;
  return "The problem is that useful AI reasoning is buried in long sessions; the final output loses context, while the raw transcript is too noisy to hand off.";
}

function framingDiffs(critical) {
  const rows = [];
  for (let i = 1; i < critical.length && rows.length < 5; i += 1) {
    const previous = critical[i - 1];
    const current = critical[i];
    rows.push({
      from: excerpt(previous.content, 72),
      to: excerpt(current.content, 72),
      trigger: excerpt(current.content, 90),
      why: "This changed the shape of the work and should keep future readers from replaying the older framing."
    });
  }
  return rows;
}

function sourceShape(metadata) {
  const rows = Object.entries(metadata.source_kind_counts || {})
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return "No source-shape metadata detected.";
  return rows.map(([kind, count]) => `- ${kind}: ${count}`).join("\n");
}

function recentUserDirections(messages, limit = 5) {
  return [...messages]
    .filter((message) => message.role === "user")
    .slice(-limit)
    .map((message) => excerpt(message.content, 220));
}

function discardedBranches(messages) {
  const sections = matchingSections(messages, [/discarded/, /killed? paths?/, /killed? branches?/, /what not to build/, /^not yet$/, /^killed paths$/]);
  const extracted = [];
  for (const section of sections) {
    const titledDiscard = section.heading.match(/^(?:discarded|killed|rejected):\s*(.+)$/i);
    if (titledDiscard) {
      const reasonLine = meaningfulLines(section.body)
        .find((line) => /^(reason|because|killed because|rejected because)\b/i.test(line)) || meaningfulLines(section.body)[0];
      const reason = normalizeReason(reasonLine || "This path was explicitly listed as discarded.");
      extracted.push({
        branch: excerpt(titledDiscard[1], 160),
        reason: excerpt(reason, 220)
      });
      continue;
    }
    const subheaded = subsectionsFromBody(section.body)
      .map((item) => ({ ...item, title: item.title.replace(/^(?:discarded|killed|rejected):\s*/i, "") }))
      .filter((item) => !/^(discarded ideas|discarded branches|killed paths?|killed branches?|what not to build)$/i.test(item.title));
    for (const item of subheaded) {
      const reason = normalizeReason(item.detail);
      extracted.push({
        branch: excerpt(item.title, 160),
        reason: reason ? excerpt(reason, 220) : "This path was explicitly placed under discarded or killed branches."
      });
    }
    if (!subheaded.length) {
      const lines = meaningfulLines(section.body)
        .filter((line) => /kill|killed|reject|rejected|not yet|do not|avoid|wrong|premature|instead/i.test(line));
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const reasonMatch = line.match(/^(.*?)(?:\s+-\s+|:\s+|\s+because\s+)(.*)$/i);
        const branch = reasonMatch?.[1] || line;
        const genericBranch = /^(reason|why|because|killed because|rejected because)$/i.test(branch.trim());
        const reason = normalizeReason(reasonMatch?.[2] || lines[index + 1] || "This path was explicitly listed as discarded or not for now.");
        extracted.push({
          branch: excerpt(genericBranch ? section.heading : branch, 160),
          reason: excerpt(reason, 220)
        });
      }
    }
  }
  if (extracted.length) return dedupeItems(extracted, "branch").slice(0, 8);
  const killed = findSentences(messages, [/killed?/, /discard/, /rejected/, /wrong direction/, /doesn.?t make sense/, /not the direction/, /not .* product/, /not .* transcript/], 8);
  if (killed.length) {
    return killed.map((item) => ({
      branch: excerpt(item.sentence, 160),
      reason: "The conversation explicitly moved away from this branch; preserve it so the recipient does not re-propose it."
    }));
  }
  return [{
    branch: "Treat the transcript as the deliverable.",
    reason: "The source material points toward compression and handoff, not raw logging."
  }];
}

function risks(messages) {
  const sections = matchingSections(messages, [/risk/, /where .*wrong/, /open questions?/, /current limits?/, /known limits?/, /kill criteria/, /core risk/]);
  const extracted = [];
  for (const section of sections) {
    const subheaded = subsectionsFromBody(section.body);
    for (const item of subheaded) {
      extracted.push(item.detail ? `${item.title}: ${item.detail}` : item.title);
    }
    if (!subheaded.length) extracted.push(...meaningfulLines(section.body));
  }
  const cleaned = extracted
    .filter((line) => !/^(none identified|future versions could|committed to|not committed to)$/i.test(line))
    .filter((line) => !line.trim().endsWith(":"))
    .filter((line) => !/^(custom services|low-margin services|support burden|sales-led enterprise work|enterprise procurement|always-on support)\b/i.test(line))
    .map((line) => excerpt(line, 240));
  if (cleaned.length) return [...new Set(cleaned)].slice(0, 4);
  const found = findSentences(messages, [/risk/, /might/, /could fail/, /weak/, /unclear/, /if .* fail/, /hard/, /not honestly/], 4);
  if (found.length) return found.map((item) => excerpt(item.sentence, 220));
  return [
    "Compression quality may not be good enough to beat a generic summary.",
    "The handoff moment may be rarer than the creator expects.",
    "A polished artifact may create theatre if the reasoning extraction is weak."
  ];
}

function asks(messages) {
  const sections = matchingSections(messages, [/^asks?$/, /recipient test/, /the ask/]);
  const extracted = sections.flatMap((section) => meaningfulLines(section.body))
    .filter((line) => !/^(send|i will return|source metadata|score checklist|reasoning\.md|optional sealed|the ask)\b/i.test(line))
    .filter((line) => line.includes("?") || /\b(bring|review|answer|respond|test|one exported|one sentence|who the recipient)\b/i.test(line));
  if (extracted.length) return [...new Set(extracted.map((line) => excerpt(line, 180)))].slice(0, 3);
  const found = [...messages].reverse()
    .filter((message) => message.role === "user")
    .flatMap((message) => splitSentences(message.content).filter((sentence) => sentence.includes("?") || /\b(can you|could you|please|want to|i want)\b/i.test(sentence)))
    .slice(0, 3);
  return found.length ? found.map((sentence) => excerpt(sentence, 180)) : ["Review whether the compressed artifact is faithful, useful, and sendable."];
}

function nextAction(messages) {
  const sections = matchingSections(messages, [/^next action$/, /^next loop$/, /^next moves?$/, /^next proof$/, /current ralph queue/]);
  const extracted = sections.flatMap((section) => meaningfulLines(section.body))
    .filter((line) => !line.startsWith("{") && !line.startsWith("[") && !/^use the new cli/i.test(line));
  if (extracted.length) return excerpt(extracted[0], 280);
  const lastUser = [...messages].reverse().find((message) => message.role === "user" && !message.content.trim().startsWith("{"));
  return lastUser ? excerpt(lastUser.content, 260) : "Run a recipient comprehension test against this artifact.";
}

function dedupeItems(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[key].toLowerCase();
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function renderReasoning({ title, messages, metadata }) {
  const critical = topMessages(messages, 5);
  const diffs = framingDiffs(critical);
  const discarded = discardedBranches(messages);
  const riskLines = risks(messages);
  const askLines = asks(messages);

  return `# ${title}
*A LoopThing reasoning artifact compressed from ${metadata.message_count} messages across ${metadata.source_files.length} source file${metadata.source_files.length === 1 ? "" : "s"}.*

## Intent

${inferIntent(messages, critical)}

## Problem

${inferProblem(messages)}

## Source shape

${sourceShape(metadata)}

## Recent user directions

${recentUserDirections(messages).map((line) => `- ${line}`).join("\n") || "- None identified."}

## Critical messages

${critical.map((message) => `- "${excerpt(message.content, 240)}"\n  - Why it mattered: this message carried high intent, correction, critique, or decision pressure in the conversation.`).join("\n\n")}

## Framing diffs

| From | To | Trigger | Why it mattered |
| --- | --- | --- | --- |
${diffs.map((row) => `| ${escapeCell(row.from)} | ${escapeCell(row.to)} | ${escapeCell(row.trigger)} | ${escapeCell(row.why)} |`).join("\n")}

## Discarded branches

${discarded.map((item) => `- ${item.branch}\n  - Rejected because: ${item.reason}`).join("\n\n")}

## What survives criticism

The narrowest claim still standing is that the work should become a compressed reasoning handoff: a concise artifact that preserves the load-bearing moves without forcing the recipient to read the transcript.

This survives because the source repeatedly values compression, judgment, discarded branches, and handoff over raw storage or final-output-only presentation.

## Where the explanation might be wrong

${riskLines.map((line) => `- ${line}`).join("\n")}

## Outcome

Committed to:

- Preserve exact critical messages and the reasoning structure around them.
- Treat discarded branches as useful evidence, not trash.
- Produce a portable artifact that can be read quickly by someone outside the original conversation.

Not committed to:

- Treating raw transcript storage as the product.
- Treating visual polish as proof of reasoning quality.
- Hiding uncertainty or inferred structure.

## Next action

${nextAction(messages)}

## Asks

${askLines.map((line) => `- ${line}`).join("\n")}

## Meta

Compressed from ${metadata.message_count} messages. Topic tags: ${metadata.topic_tags.length ? metadata.topic_tags.join(", ") : "none detected"}. Caveat: this v0 compression is deterministic and local; it should be reviewed by the creator before sending.
`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function genericSummary(messages, metadata) {
  const critical = topMessages(messages, 3);
  return `# Generic Summary

This transcript contains ${metadata.message_count} messages across ${metadata.source_files.length} source file${metadata.source_files.length === 1 ? "" : "s"}.

Main visible topics: ${metadata.topic_tags.join(", ") || "none detected"}.

Potentially important excerpts:

${critical.map((message) => `- ${excerpt(message.content, 220)}`).join("\n")}
`;
}

function compressionPrompt() {
  return `You are compressing a conversation into a LoopThing reasoning artifact.

Do not summarize the transcript. Extract the load-bearing structure:

- Intent
- Problem
- Critical messages
- Framing diffs
- Discarded branches
- What survives criticism
- Where the explanation might be wrong
- Outcome
- Next action
- Asks
- Meta

Preserve exact user language where possible. Mark uncertainty. Keep killed branches useful.`;
}

function manifestForRun(title, metadata) {
  return `format: loopthing/run-v0.1
title: ${title}
kind: reasoning-handoff-run
created: ${metadata.created}
mimetype: ${MIME}

files:
  - reasoning.md
  - agent-handoff.md
  - source-metadata.json
  - prompts/compression-prompt.md
  - variants/generic.md
`;
}

function renderAgentHandoff({ title, messages, metadata }) {
  const critical = topMessages(messages, 5);
  const discarded = discardedBranches(messages).slice(0, 6);
  const riskLines = risks(messages).slice(0, 4);
  const askLines = asks(messages).slice(0, 3);

  return `# Agent Handoff: ${title}

Paste this into a new AI chat, Codex session, project kickoff, or collaborator handoff.

## Mission

Continue from the compressed reasoning, not from scratch. The useful work is the direction, decisions, killed branches, risks, and next action below.

## Product Spine

LoopThing compresses decisions, direction, and thinking into a handoff artifact.

It is not a raw transcript and not a generic summary. It preserves the load-bearing moves so a new session can inherit the work.

## Source Shape

${sourceShape(metadata)}

## Recent User Directions

${recentUserDirections(messages).map((line) => `- ${line}`).join("\n") || "- None identified."}

## Critical Context

${critical.map((message) => `- ${excerpt(message.content, 260)}`).join("\n")}

## Do Not Reopen These Branches

${discarded.map((item) => `- ${item.branch}: ${item.reason}`).join("\n")}

## Current Risks

${riskLines.map((line) => `- ${line}`).join("\n")}

## Next Action

${nextAction(messages)}

## Asks

${askLines.map((line) => `- ${line}`).join("\n")}

## Operating Instruction

Be optimistic but corrective. If the project drifts, restore the product spine: compress decisions, direction, and thinking for handoff into a new chat/session/project.
`;
}

function runCompression(inputs, flags) {
  const files = walkInputs(inputs);
  if (!files.length) throw new Error("No .md, .txt, or .json transcript files found.");
  const messages = files.flatMap(parseFile).map((message, index) => ({ ...message, index }));
  const outDir = path.resolve(flags.out);
  const title = flags.title || titleFromInputs(inputs);
  const metadata = sourceMetadata(messages, files);
  const reasoning = renderReasoning({ title, messages, metadata });
  const handoff = renderAgentHandoff({ title, messages, metadata });

  ensureDir(outDir);
  write(path.join(outDir, "reasoning.md"), reasoning);
  write(path.join(outDir, "agent-handoff.md"), handoff);
  write(path.join(outDir, "source-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  write(path.join(outDir, "prompts", "compression-prompt.md"), compressionPrompt());
  write(path.join(outDir, "variants", "generic.md"), genericSummary(messages, metadata));
  write(path.join(outDir, "manifest.loop"), manifestForRun(title, metadata));
  console.log(`Compressed ${metadata.message_count} messages from ${files.length} file${files.length === 1 ? "" : "s"} into ${path.relative(process.cwd(), outDir)}`);
  return { outDir, title, metadata };
}

function compressCommand(argv) {
  const { positional, flags } = parseArgs(argv);
  if (!positional.length || !flags.out) throw new Error("compress requires <input...> and --out <run-dir>");
  runCompression(positional, flags);
}

function titleFromInputs(inputs) {
  const first = path.basename(inputs[0]).replace(/\.[^.]+$/, "");
  return first ? `LoopThing: ${first}` : "LoopThing Reasoning Artifact";
}

function sectionCount(markdown) {
  return (markdown.match(/^## /gm) || []).length;
}

function scoreRun(runDir) {
  const reasoningFile = path.join(runDir, "reasoning.md");
  const metadataFile = path.join(runDir, "source-metadata.json");
  if (!fs.existsSync(reasoningFile)) throw new Error(`Missing ${reasoningFile}`);
  const reasoning = fs.readFileSync(reasoningFile, "utf8");
  const metadata = fs.existsSync(metadataFile) ? JSON.parse(fs.readFileSync(metadataFile, "utf8")) : null;
  const score = [
    ["Required sections", sectionCount(reasoning) >= 10],
    ["Critical messages present", /## Critical messages[\s\S]*- "/.test(reasoning)],
    ["Framing diffs present", /## Framing diffs[\s\S]*\| From \| To \|/.test(reasoning)],
    ["Discarded branches present", /## Discarded branches[\s\S]*Rejected because/.test(reasoning)],
    ["Risks present", /## Where the explanation might be wrong[\s\S]*- /.test(reasoning)],
    ["Agent handoff present", fs.existsSync(path.join(runDir, "agent-handoff.md"))],
    ["Metadata present", Boolean(metadata)]
  ];
  const passed = score.filter(([, ok]) => ok).length;
  const scoreRecord = {
    created: new Date().toISOString(),
    checks_passed: passed,
    checks_total: score.length,
    checks: Object.fromEntries(score.map(([name, ok]) => [name, ok]))
  };
  const output = `# Compression Score

${score.map(([name, ok]) => `- ${ok ? "[x]" : "[ ]"} ${name}`).join("\n")}

## Result

${passed}/${score.length} checks passed.

## Recipient Test

Ask a recipient to read reasoning.md for five minutes, then answer:

- What was the participant trying to decide?
- What changed during the conversation?
- What was rejected and why?
- What survived criticism?
- What should happen next?
`;
  write(path.join(runDir, "compression-score.md"), output);
  fs.appendFileSync(path.join(runDir, "scores.jsonl"), `${JSON.stringify(scoreRecord)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), path.join(runDir, "compression-score.md"))} (${passed}/${score.length})`);
  return scoreRecord;
}

function scoreCommand(argv) {
  const { positional } = parseArgs(argv);
  const runDir = path.resolve(positional[0] || ".");
  scoreRun(runDir);
}

function compareCommand(argv) {
  const { positional } = parseArgs(argv);
  if (positional.length < 2) throw new Error("compare requires at least two markdown files");
  const rows = positional.map((file) => {
    const full = path.resolve(file);
    const text = fs.readFileSync(full, "utf8");
    return {
      file,
      bytes: Buffer.byteLength(text),
      sections: sectionCount(text),
      critical: (text.match(/critical/gi) || []).length,
      discarded: (text.match(/discard|kill|reject/gi) || []).length
    };
  });
  console.log("| File | Bytes | Sections | Critical refs | Discard refs |");
  console.log("| --- | ---: | ---: | ---: | ---: |");
  for (const row of rows) {
    console.log(`| ${escapeCell(row.file)} | ${row.bytes} | ${row.sections} | ${row.critical} | ${row.discarded} |`);
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function sealRun(runDir, outPath) {
  const outFile = path.resolve(outPath || `${path.basename(runDir)}.loopthing`);
  if (!fs.existsSync(path.join(runDir, "reasoning.md"))) throw new Error("seal requires a run directory with reasoning.md");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "loopthing-seal-"));
  write(path.join(temp, "mimetype"), MIME);
  copyDir(runDir, temp);
  fs.rmSync(outFile, { force: true });
  let result = spawnSync("zip", ["-X", "-0", outFile, "mimetype"], { cwd: temp, stdio: "ignore" });
  if (result.status !== 0) throw new Error("zip command failed while writing mimetype");
  result = spawnSync("zip", ["-X", "-r", outFile, "."], { cwd: temp, stdio: "ignore" });
  if (result.status !== 0) throw new Error("zip command failed while sealing archive");
  fs.rmSync(temp, { recursive: true, force: true });
  console.log(`Sealed ${path.relative(process.cwd(), outFile)}`);
  return outFile;
}

function sealCommand(argv) {
  const { positional, flags } = parseArgs(argv);
  const runDir = path.resolve(positional[0] || ".");
  sealRun(runDir, flags.out);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "loopthing";
}

function createCommand(argv) {
  const { positional, flags } = parseArgs(argv);
  if (!positional.length || !flags.out) throw new Error("create requires <input...> and --out <name.loopthing>");
  const outFile = flags.out.endsWith(".loopthing") ? flags.out : `${flags.out}.loopthing`;
  const runDir = path.resolve(flags["run-dir"] || path.join("tmp", `${slugify(path.basename(outFile, ".loopthing"))}-run`));
  const compression = runCompression(positional, { ...flags, out: runDir });
  scoreRun(compression.outDir);
  sealRun(compression.outDir, outFile);
  console.log(`Done. Open ${outFile} or inspect ${path.relative(process.cwd(), compression.outDir)}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (!command || command === "help" || command === "--help") usage();
    else if (command === "create") createCommand(rest);
    else if (command === "compress") compressCommand(rest);
    else if (command === "score") scoreCommand(rest);
    else if (command === "compare") compareCommand(rest);
    else if (command === "seal") sealCommand(rest);
    else throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`loopthing: ${error.message}`);
    process.exit(1);
  }
}

main();
