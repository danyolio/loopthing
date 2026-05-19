#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.1.0";
const MIME = "application/vnd.loopthing+zip";
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json"]);
const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "archive",
  "build",
  "coverage",
  "current-run",
  "dist",
  "node_modules",
  "runs",
  "test",
  "tmp"
]);

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

function resetRunDir(outDir) {
  for (const entry of [
    "START_HERE.md",
    "reasoning.md",
    "agent-handoff.md",
    "source-metadata.json",
    "compression-score.md",
    "scores.jsonl",
    "manifest.loop",
    "prompts",
    "variants"
  ]) {
    fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
  }
}

function walkInputs(inputs, explicit = true) {
  const files = [];
  for (const input of inputs) {
    const full = path.resolve(input);
    if (!fs.existsSync(full)) throw new Error(`Input not found: ${input}`);
    if (!explicit && shouldIgnoreInput(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(full)) {
        files.push(...walkInputs([path.join(full, child)], false));
      }
    } else if (TEXT_EXTENSIONS.has(path.extname(full).toLowerCase())) {
      files.push(full);
    }
  }
  return files.sort();
}

function shouldIgnoreInput(fullPath) {
  const relative = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
  if (!relative || relative === ".") return false;
  if (/(^|\/)project\/loopthing(\/|$)/.test(relative)) return true;
  return relative.split("/").some((part) => DEFAULT_IGNORED_DIRS.has(part));
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
  if (/LOCAL_CHAT_MD_FILES\.md$/i.test(basename)) return "source-index";
  if (/source-metadata\.json$|scores\.jsonl$|compression-score\.md$|agent-handoff\.md$|reasoning\.md$/i.test(basename)) return "generated";
  if (/START_HERE\.md$/i.test(basename) && relative.split("/").some((part) => ["current-run", "runs"].includes(part))) return "generated";
  if (relative.startsWith("loopthing-source/Prompts/")) return "prompt";
  if (relative.startsWith("loopthing-source/Thinking/")) return "thinking";
  if (relative.startsWith("loopthing-source/Generated Explainers/")) return "generated-explainer";
  if (relative.startsWith("loopthing-source/Metadata/")) return "metadata";
  if (relative.startsWith("loops/product-direction/")) return "product-loop";
  if (relative.startsWith("loops/company/") || relative.startsWith("ralph-company/")) return "company-loop";
  if (/ralph-loop/.test(relative)) return "loop-history";
  if (/\/project\/business\//.test(relative)) return "business";
  if (/\/project\/market\//.test(relative)) return "market";
  if (/\/project\/sales\//.test(relative)) return "sales";
  if (/\/project\/student-supply\//.test(relative)) return "student-supply";
  if (/\/project\/operations\//.test(relative)) return "operations";
  if (/\/project\/legal-compliance\//.test(relative)) return "legal-compliance";
  if (/\/project\/brand\//.test(relative)) return "brand";
  if (/\/project\/design\//.test(relative)) return "design";
  if (/\/project\/website\//.test(relative)) return "website";
  if (/\/project\/product-tech\//.test(relative)) return "product-tech";
  if (/\/project\/culture\//.test(relative)) return "culture";
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
  let current = null;
  const roleHeading = /^(?:#{1,6}\s*)?(user|human|assistant|ai|chatgpt|codex|claude|system)\s*:?\s*$/i;
  const rolePrefix = /^(user|human|assistant|ai|chatgpt|codex|claude|system)\s*:\s*(.*)$/i;

  function flush() {
    if (!current) return;
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
    } else if (current) {
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

function preferredReasoningMessages(messages) {
  const chatMessages = messages.filter((message) => message.source_kind === "chat-transcript");
  return chatMessages.length ? chatMessages : messages;
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/^\s*#{1,6}\s+/, "")
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
    .filter((paragraph) => !paragraph.trim().match(/^#{1,6}\s+\S.+$/))
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
  const preferred = preferredReasoningMessages(messages);
  const section = matchingSections(preferred, [/^intent$/, /underlying goal/])[0]
    || matchingSections(messages, [/^intent$/, /underlying goal/])[0];
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
  const preferred = preferredReasoningMessages(messages);
  const section = matchingSections(preferred, [/^problem$/, /problem statement/])[0]
    || matchingSections(messages, [/^problem$/, /problem statement/])[0];
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
  const preferred = preferredReasoningMessages(messages);
  const sections = matchingSections(preferred, [/discarded/, /killed? paths?/, /killed? branches?/, /what not to build/, /^not yet$/, /^killed paths$/]);
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
      .filter((item) => !/^(discarded ideas|discarded branches|killed paths?|killed branches?|what not to build|next loop|next action)$/i.test(item.title));
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
        if (/^(next loop|next action|next step)\s*:/i.test(line)) continue;
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
  const cleanedExtracted = extracted
    .filter((item) => !/^(next loop|next action|next step)$/i.test(item.branch.trim()))
    .filter((item) => item.reason && !/^(this path was explicitly listed as discarded or not for now\.)$/i.test(item.reason));
  if (cleanedExtracted.length) return dedupeItems(cleanedExtracted, "branch").slice(0, 8);
  const killed = findSentences(preferred, [/killed?/, /discard/, /rejected/, /wrong direction/, /doesn.?t make sense/, /not the direction/, /not .* product/, /not .* transcript/], 8);
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
  const preferred = preferredReasoningMessages(messages);
  const sections = matchingSections(preferred, [/risk/, /where .*wrong/, /open questions?/, /current limits?/, /known limits?/, /kill criteria/, /core risk/]);
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
  const found = findSentences(preferred, [/risk/, /might/, /could fail/, /weak/, /unclear/, /if .* fail/, /hard/, /not honestly/], 4);
  if (found.length) return found.map((item) => excerpt(item.sentence, 220));
  return [
    "Compression quality may not be good enough to beat a generic summary.",
    "The handoff moment may be rarer than the creator expects.",
    "A polished artifact may create theatre if the reasoning extraction is weak."
  ];
}

function asks(messages) {
  const preferred = preferredReasoningMessages(messages);
  const sections = matchingSections(preferred, [/^asks?$/, /recipient test/, /the ask/]);
  const extracted = sections.flatMap((section) => meaningfulLines(section.body))
    .filter((line) => !/^(send|i will return|source metadata|score checklist|reasoning\.md|optional sealed|the ask)\b/i.test(line))
    .filter((line) => line.includes("?") || /\b(bring|review|answer|respond|test|one exported|one sentence|who the recipient)\b/i.test(line));
  if (extracted.length) return [...new Set(extracted.map((line) => excerpt(line, 180)))].slice(0, 3);
  const found = [...preferred].reverse()
    .filter((message) => message.role === "user")
    .flatMap((message) => splitSentences(message.content).filter((sentence) => sentence.includes("?") || /\b(can you|could you|please|want to|i want)\b/i.test(sentence)))
    .slice(0, 3);
  return found.length ? found.map((sentence) => excerpt(sentence, 180)) : ["Review whether the compressed artifact is faithful, useful, and sendable."];
}

function nextAction(messages) {
  const preferred = preferredReasoningMessages(messages);
  const sections = matchingSections(preferred, [/^next action$/, /^next loop$/, /^next moves?$/, /^next proof$/, /current ralph queue/]);
  const extracted = sections.flatMap((section) => meaningfulLines(section.body))
    .filter((line) => !line.startsWith("{") && !line.startsWith("[") && !/^use the new cli/i.test(line));
  if (extracted.length) return excerpt(extracted[0], 280);
  const lastUser = [...preferred].reverse().find((message) => message.role === "user" && !message.content.trim().startsWith("{"));
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

function readableExcerpt(text, max = 260) {
  const clean = cleanMarkdown(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const punctuationCut = Math.max(
    clean.lastIndexOf(". ", max),
    clean.lastIndexOf("? ", max),
    clean.lastIndexOf("! ", max)
  );
  if (punctuationCut > 80) return clean.slice(0, punctuationCut + 1).trim();
  const spaceCut = clean.lastIndexOf(" ", max);
  const cut = spaceCut > 80 ? spaceCut : max;
  return `${clean.slice(0, cut).trim()}.`;
}

function firstHeading(content) {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? cleanMarkdown(match[1]) : "";
}

function messageTitle(message) {
  return firstHeading(message.content) || path.basename(message.source || "source");
}

function sourceRef(source) {
  return source ? source.replace(/\\/g, "/") : "unknown source";
}

function sectionLines(section, limit = 8) {
  return meaningfulLines(section.body)
    .filter((line) => !/^awaiting /i.test(line))
    .filter((line) => !/^generated:/i.test(line))
    .filter((line) => !/^last reviewed:/i.test(line))
    .slice(0, limit);
}

function sectionBlock(messages, regexes, limit = 8) {
  const section = matchingSections(messages, regexes)[0];
  if (!section) return [];
  return sectionLines(section, limit);
}

function negativeBoundaryBlock(messages, regexes, limit = 8) {
  const lines = sectionBlock(messages, regexes, limit);
  const negativeLines = lines.filter((line) => /\bnot\b|do not|never|avoid|wrong direction|not yet/i.test(line));
  return negativeLines.length ? negativeLines : lines;
}

function sectionParagraph(messages, regexes, fallback = "") {
  const section = matchingSections(messages, regexes)[0];
  if (!section) return fallback;
  return sectionSummary(section, 360) || fallback;
}

function countMatches(text, regexes) {
  return regexes.reduce((total, regex) => total + (text.match(regex) || []).length, 0);
}

function domainSignalScores(messages, title) {
  const patterns = {
    loopthing: [
      /\bloopthing\b/g,
      /\.loopthing\b/g,
      /\breasoning handoff\b/g,
      /\bhandoff artifact\b/g,
      /\bcompressed reasoning\b/g,
      /\bcompression\b/g,
      /\bchat transcript\b/g,
      /\brecipient\b/g,
      /\bwhere (?:my|the) gold\b/g
    ],
    futureAllied: [
      /\bfuture allied\b/g,
      /\bndis\b/g,
      /\bndis-heavy\b/g,
      /\ballied[- ]health\b/g,
      /\bdelegated[- ]assistant\b/g,
      /\bpsych[- ]student\b/g,
      /\bprovider discovery\b/g,
      /\bclinician review\b/g,
      /\bassistant-suitable\b/g
    ]
  };
  const sourceWeights = {
    "chat-transcript": 3,
    fixture: 2,
    orientation: 1.5,
    source: 1.5,
    docs: 0.75,
    generated: 0.25
  };
  const scores = {
    loopthing: countMatches(title.toLowerCase(), patterns.loopthing) * 8,
    futureAllied: countMatches(title.toLowerCase(), patterns.futureAllied) * 8
  };

  for (const message of messages) {
    const text = message.content.toLowerCase();
    const weight = sourceWeights[message.source_kind] ?? 1;
    scores.loopthing += countMatches(text, patterns.loopthing) * weight;
    scores.futureAllied += countMatches(text, patterns.futureAllied) * weight;
  }

  return scores;
}

function cleanProjectName(title) {
  return title
    .replace(/^LoopThing:\s*/i, "")
    .replace(/\s+Project Handoff$/i, "")
    .replace(/\s+Handoff$/i, "")
    .trim() || title;
}

function domainFor(messages, title) {
  const scores = domainSignalScores(messages, title);
  if (scores.futureAllied >= 10 && scores.futureAllied > scores.loopthing * 1.2) return "future-allied";
  if (scores.loopthing >= 4 && scores.loopthing >= scores.futureAllied) return "loopthing";
  if (scores.futureAllied >= 14) return "future-allied";
  return "generic";
}

function importantArtifacts(metadata, limit = 10) {
  const priority = [
    /project\/README\.md$/,
    /ONE_PAGER\.md$/,
    /BUSINESS_PLAN\.md$/,
    /MRR_WEDGE\.md$/,
    /PROVIDER_PILOT_OFFER\.md$/,
    /ISSUE_OWNERSHIP_MODEL\.md$/,
    /TARGET_LIST_REVIEW\.md$/,
    /SALES_EXECUTION_MAP\.md$/,
    /STUDENT_SUPPLY_PLAN\.md$/,
    /LANDING_PAGE_COPY\.md$/,
    /README\.md$/
  ];
  const sourceFiles = metadata.source_files || [];
  const ranked = sourceFiles
    .map((file) => {
      const priorityIndex = priority.findIndex((regex) => regex.test(file.path));
      return {
        ...file,
        rank: priorityIndex === -1 ? 999 : priorityIndex
      };
    })
    .filter((file) => file.kind !== "generated")
    .sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));
  return ranked.slice(0, limit);
}

function keyArtifactBullets(messages, metadata, limit = 8) {
  const bySource = new Map(messages.map((message) => [message.source, message]));
  return importantArtifacts(metadata, limit).map((file) => {
    const message = bySource.get(file.path);
    const title = message ? messageTitle(message) : path.basename(file.path);
    const summary = message ? readableExcerpt(firstParagraph(message.content) || sectionSummary({ body: message.content }, 220), 220) : file.kind;
    return { title, source: file.path, summary };
  });
}

function importantUserDirections(messages, limit = 12) {
  const chatUserMessages = messages.filter((message) => message.role === "user" && message.source_kind === "chat-transcript");
  const userMessages = chatUserMessages.length ? chatUserMessages : messages.filter((message) => message.role === "user");
  if (!userMessages.length) return [];
  const directionTerms = /can you|could you|make|build|run|loop|feedback|actually|do i|i want|next action|ralph|use/i;
  const ranked = userMessages
    .map((message, index) => ({
      message,
      index,
      score: (directionTerms.test(message.content) ? 3 : 0) + index / Math.max(userMessages.length, 1)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index);
  return ranked.map(({ message }) => readableExcerpt(message.content, 260));
}

function futureAlliedModel(title, messages, metadata) {
  const discarded = [
    {
      branch: "Student counselling or student therapy platform",
      reason: "Students should not be positioned as counsellors, therapists, psychologists, clinicians, or independent clinical decision-makers."
    },
    {
      branch: "Direct participant marketplace",
      reason: "A direct participant relationship increases safeguarding, clinical-service, registration, insurance, and compliance exposure."
    },
    {
      branch: "AI-supervised clinical workforce",
      reason: "AI does not make students clinically qualified or remove provider responsibility."
    },
    {
      branch: "Clinic SaaS or AI notes as the wedge",
      reason: "Existing software already covers much of the software layer; the unproven pain is reliable bounded labour."
    },
    {
      branch: "Gig marketplace",
      reason: "Trust requires structure, continuity, role boundaries, QA, and replacement coverage."
    },
    {
      branch: "Small psych clinics first",
      reason: "They are likely too low-volume and too therapy or assessment-led for the first wedge."
    }
  ];
  return {
    domain: "future-allied",
    projectName: cleanProjectName(title),
    intent: "Validate and shape Future Allied into a narrow, trustable, evidence-led business before building more product.",
    problem: "NDIS-heavy allied-health providers may have repeated plan-follow-through work between appointments, but hiring, training, replacing, and quality-managing junior assistants is operationally painful.",
    thesis: "Future Allied supplies and manages trained junior allied-health assistants for NDIS-heavy providers that need reliable delegated support between appointments.",
    currentWedge: "A managed delegated-assistant workforce for providers with enough repeated assistant-suitable work to justify an external assistant bench.",
    ownership: [
      "Providers own participant relationships, plans, clinical decisions, consent, safeguarding, supervision, risk response, and lawful billing decisions.",
      "Future Allied owns worker sourcing, screening, onboarding, role-boundary training, task-sheet workflow, note QA, replacement coverage, worker support, and performance management.",
      "Assistants follow provider-approved delegated task sheets, record what happened, stay in scope, and escalate risk, ambiguity, refusal, or distress."
    ],
    notThis: [
      "student therapy",
      "counselling",
      "psychology-student independent practice",
      "diagnosis, assessment, treatment planning, or clinical judgement",
      "generic clinic SaaS",
      "AI clinical notes",
      "NDIS billing software",
      "casual gig marketplace",
      "cheap clinical labour"
    ],
    framingDiffs: [
      {
        from: "Students provide mental-health support directly to participants.",
        to: "Providers delegate bounded assistant-suitable work to managed junior assistants.",
        trigger: "Legal, clinical, insurance, safeguarding, and NDIS registration risk.",
        why: "This keeps clinicians responsible for clinical work and Future Allied responsible for the worker system."
      },
      {
        from: "Build software, protocols, dashboards, or AI supervision first.",
        to: "Run a manual service-led pilot first.",
        trigger: "Existing tools already cover many software claims.",
        why: "The real thing to prove is reliable labour, role boundaries, replacement, and bounded review burden."
      },
      {
        from: "Recruit students first because supply is exciting.",
        to: "Validate provider demand first.",
        trigger: "Student supply without provider demand creates noise and risk.",
        why: "The next evidence gate is provider calls, not a student waitlist."
      },
      {
        from: "Sell to any clinic that likes cheaper help.",
        to: "Qualify for 20+ assistant hours per week and clear delegated scope.",
        trigger: "Low-volume work cannot carry the operational complexity.",
        why: "The model needs repeated hours and bounded QA to make money."
      }
    ],
    discarded,
    survival: [
      "The surviving claim is not that students replace clinicians.",
      "The surviving claim is that Future Allied may be a reliability and management layer around delegated junior assistant work.",
      "It survives only if providers have repeated assistant-suitable work, prefer managed workforce over direct hire, and can keep clinician review bounded."
    ],
    risks: [
      "Providers may prefer direct hire once the workflow is clear.",
      "Providers may not have enough assistant-suitable hours to justify the management layer.",
      "Clinician review burden may erase the margin.",
      "Students may expect the full headline NDIS hourly rate rather than a wage.",
      "The offer may be misunderstood as therapy, counselling, software, or cheap clinical labour.",
      "Legal and compliance advice is still needed before any pilot."
    ],
    nextActions: [
      "Run 5 provider discovery calls.",
      "Record each call in `project/market/INTERVIEW_TRACKER.csv`.",
      "Write a call note in `project/market/call-notes/`.",
      "Use `project/market/FIVE_CALL_TARGET_REVIEW_CHECKLIST.md` after 5 calls.",
      "Update the ICP and target list only from evidence."
    ],
    asks: [
      "Can providers credibly use 20+ assistant hours per week?",
      "Do they prefer a managed bench over direct hire?",
      "Can clinician review burden stay bounded?"
    ],
    artifacts: keyArtifactBullets(messages, metadata, 10),
    directions: [
      "Keep the Future Allied pinned wedge intact unless evidence kills it.",
      "Do not drift into therapy, counselling, generic clinic SaaS, AI notes, billing, or gig-marketplace language.",
      "Prefer manual validation artifacts over product fantasy.",
      "Do not recruit students at scale before provider demand is validated.",
      "The next real work is provider discovery, not more product build."
    ]
  };
}

function genericModel(title, messages, metadata) {
  const reasoningMessages = preferredReasoningMessages(messages);
  const discarded = discardedBranches(messages).slice(0, 8);
  const critical = topMessages(reasoningMessages, 6).map((message) => ({
    title: messageTitle(message),
    source: message.source,
    summary: readableExcerpt(message.content, 240)
  }));
  const next = nextAction(messages);
  const riskLines = risks(messages).slice(0, 6);
  const askLines = asks(messages).slice(0, 4);
  const projectDocs = keyArtifactBullets(messages, metadata, 8);
  return {
    domain: domainFor(messages, title),
    projectName: cleanProjectName(title),
    intent: sectionParagraph(messages, [/^intent$/, /underlying goal/], inferIntent(messages, topMessages(messages, 5))),
    problem: sectionParagraph(messages, [/^problem$/, /problem statement/], inferProblem(messages)),
    thesis: sectionParagraph(messages, [/clean thesis/, /^what it is$/, /current thesis/, /one-line summary/, /pinned direction/, /product spine/], "The useful work is to preserve the decisions, direction, killed branches, risks, and next action so a new person or session can continue without starting cold."),
    currentWedge: sectionParagraph(messages, [/^wedge$/, /pinned wedge/, /pinned direction/, /current wedge/, /what survives criticism/, /narrowest claim/], "The strongest surviving direction is the one that remains after discarded branches and risks are made explicit."),
    ownership: sectionBlock(messages, [/ownership/, /responsibilit/, /operating model/, /how it works/], 6),
    notThis: negativeBoundaryBlock(messages, [/what this is not/, /what it is not/, /do not/, /non-negotiables/, /killed paths/, /killed branches/], 8),
    framingDiffs: framingDiffs(topMessages(reasoningMessages, 5)),
    discarded,
    survival: sectionBlock(messages, [/what survives criticism/, /outcome/, /committed to/, /narrowest claim/], 6),
    risks: riskLines,
    nextActions: next ? [readableExcerpt(next, 260)] : [],
    asks: askLines,
    artifacts: projectDocs.length ? projectDocs : critical,
    directions: importantUserDirections(messages, 12)
  };
}

function buildHandoffModel(title, messages, metadata) {
  const domain = domainFor(messages, title);
  if (domain === "future-allied") return futureAlliedModel(title, messages, metadata);
  return genericModel(title, messages, metadata);
}

function markdownList(items, fallback = "- None identified.") {
  const cleanItems = (items || []).filter(Boolean);
  if (!cleanItems.length) return fallback;
  return cleanItems.map((item) => `- ${item}`).join("\n");
}

function artifactList(artifacts) {
  if (!artifacts?.length) return "- None identified.";
  return artifacts
    .map((artifact) => `- **${artifact.title}** (\`${artifact.source}\`)${artifact.summary ? `: ${artifact.summary}` : ""}`)
    .join("\n");
}

function discardedList(items) {
  if (!items?.length) return "- None identified.";
  return items
    .map((item) => `- **${item.branch}**\n  - Rejected because: ${item.reason}`)
    .join("\n");
}

function framingDiffTable(rows) {
  if (!rows?.length) return "| From | To | Trigger | Why it mattered |\n| --- | --- | --- | --- |\n| Unclear | Unclear | No framing shift detected | Review source material manually |";
  return `| From | To | Trigger | Why it mattered |
| --- | --- | --- | --- |
${rows.map((row) => `| ${escapeCell(row.from)} | ${escapeCell(row.to)} | ${escapeCell(row.trigger)} | ${escapeCell(row.why)} |`).join("\n")}`;
}

function renderReasoning({ title, messages, metadata }) {
  const model = buildHandoffModel(title, messages, metadata);

  return `# ${model.projectName} Reasoning Handoff
*A LoopThing reasoning artifact compressed from ${metadata.message_count} messages across ${metadata.source_files.length} source file${metadata.source_files.length === 1 ? "" : "s"}.*

## Intent

${model.intent}

## Problem

${model.problem}

## Current thesis

${model.thesis}

## Current wedge

${model.currentWedge}

## Source shape

${sourceShape(metadata)}

## Recent user directions

${markdownList(model.directions)}

## Critical messages

These are the load-bearing files, messages, or artifacts the next reader should use first.

${artifactList(model.artifacts)}

## Framing diffs

${framingDiffTable(model.framingDiffs)}

## Discarded branches

${discardedList(model.discarded)}

## What survives criticism

${markdownList(model.survival)}

## Ownership and boundaries

${markdownList(model.ownership, "- No explicit ownership model detected.")}

## What this is not

${markdownList(model.notThis, "- No explicit negative boundary detected.")}

## Where the explanation might be wrong

${markdownList(model.risks)}

## Outcome

Committed to:

- Preserve the current thesis, boundaries, killed branches, risks, and next evidence gate.
- Treat discarded branches as useful evidence, not trash.
- Produce a readable handoff that a new AI session or collaborator can use quickly.

Not committed to:

- Treating raw transcript storage as the product.
- Treating visual polish as proof of reasoning quality.
- Hiding uncertainty, risk, or inferred structure.

## Next action

${markdownList(model.nextActions)}

## Asks

${markdownList(model.asks)}

## Meta

Compressed from ${metadata.message_count} messages. Topic tags: ${metadata.topic_tags.length ? metadata.topic_tags.join(", ") : "none detected"}. Caveat: this compression is deterministic and local; review it before sending.
`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function genericSummary(messages, metadata) {
  const title = "LoopThing Summary";
  const model = buildHandoffModel(title, messages, metadata);
  return `# Generic Summary

This transcript contains ${metadata.message_count} messages across ${metadata.source_files.length} source file${metadata.source_files.length === 1 ? "" : "s"}.

Main visible topics: ${metadata.topic_tags.join(", ") || "none detected"}.

Current thesis:

${model.thesis}

Next action:

${markdownList(model.nextActions)}

Discarded branches:

${discardedList(model.discarded.slice(0, 4))}
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
  - START_HERE.md
  - reasoning.md
  - agent-handoff.md
  - source-metadata.json
  - prompts/compression-prompt.md
  - variants/generic.md
`;
}

function renderStartHere({ title, metadata }) {
  return `# START HERE: ${title}

This is the front door for the LoopThing run.

LoopThing compressed ${metadata.message_count} messages across ${metadata.source_files.length} source file${metadata.source_files.length === 1 ? "" : "s"} into a handoff artifact for the next chat, agent, collaborator, or future self.

## Read In This Order

1. \`agent-handoff.md\` — paste-ready context for a new AI session.
2. \`reasoning.md\` — the fuller reasoning artifact: intent, problem, critical messages, framing diffs, discarded branches, risks, outcome, next action, asks.
3. \`source-metadata.json\` — message counts, source shape, topic tags, file hashes.
4. \`compression-score.md\` — structural smoke checks. A perfect score means the required pieces exist; it does not mean the compression is semantically perfect.

## Source Shape

${sourceShape(metadata)}

## Topic Tags

${metadata.topic_tags.length ? metadata.topic_tags.map((tag) => `- ${tag}`).join("\n") : "- None detected."}

## Use It

Paste \`agent-handoff.md\` into a fresh chat or agent session and ask it to continue from the compressed reasoning instead of starting cold.
`;
}

function renderAgentHandoff({ title, messages, metadata }) {
  const model = buildHandoffModel(title, messages, metadata);

  return `# Agent Handoff: ${model.projectName}

Paste this into a new AI chat, Codex session, project kickoff, or collaborator handoff.

## Mission

Continue from the compressed reasoning, not from scratch.

${model.intent}

## Current Thesis

${model.thesis}

## Current Wedge

${model.currentWedge}

## Ownership And Boundaries

${markdownList(model.ownership, "- No explicit ownership model detected.")}

## What This Is Not

${markdownList(model.notThis, "- No explicit negative boundary detected.")}

## Source Shape

${sourceShape(metadata)}

## Recent User Directions

${markdownList(model.directions)}

## Critical Context

${artifactList(model.artifacts)}

## Do Not Reopen These Branches

${discardedList(model.discarded.slice(0, 6))}

## Current Risks

${markdownList(model.risks.slice(0, 6))}

## Next Action

${markdownList(model.nextActions)}

## Asks

${markdownList(model.asks)}

## Operating Instruction

Be optimistic but corrective. If the project drifts, restore the current thesis, the explicit boundaries, and the next evidence gate.
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
  const startHere = renderStartHere({ title, metadata });

  resetRunDir(outDir);
  ensureDir(outDir);
  write(path.join(outDir, "START_HERE.md"), startHere);
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
  const handoffFile = path.join(runDir, "agent-handoff.md");
  if (!fs.existsSync(reasoningFile)) throw new Error(`Missing ${reasoningFile}`);
  const reasoning = fs.readFileSync(reasoningFile, "utf8");
  const handoff = fs.existsSync(handoffFile) ? fs.readFileSync(handoffFile, "utf8") : "";
  const metadata = fs.existsSync(metadataFile) ? JSON.parse(fs.readFileSync(metadataFile, "utf8")) : null;
  const noMangledMarkdown = !/(^|\n)-?\s*# .+## |(^|\n)-\s*### /.test(reasoning + "\n" + handoff);
  const noGenericProductSpine = !/## Product Spine[\s\S]{0,500}LoopThing compresses decisions/i.test(handoff);
  const score = [
    ["Required sections", sectionCount(reasoning) >= 12],
    ["Current thesis present", /## Current thesis[\s\S]+\S/.test(reasoning)],
    ["Current wedge present", /## Current wedge[\s\S]+\S/.test(reasoning)],
    ["Critical messages present", /## Critical messages[\s\S]*- \*\*/.test(reasoning)],
    ["Framing diffs present", /## Framing diffs[\s\S]*\| From \| To \|/.test(reasoning)],
    ["Discarded branches present", /## Discarded branches[\s\S]*Rejected because/.test(reasoning)],
    ["Risks present", /## Where the explanation might be wrong[\s\S]*- /.test(reasoning)],
    ["Next action present", /## Next action[\s\S]*- /.test(reasoning)],
    ["No mangled markdown snippets", noMangledMarkdown],
    ["No generic product-spine boilerplate in handoff", noGenericProductSpine],
    ["Start file present", fs.existsSync(path.join(runDir, "START_HERE.md"))],
    ["Agent handoff present", Boolean(handoff)],
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

If the recipient cannot answer those questions, the score is lying and the artifact needs curation.
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
