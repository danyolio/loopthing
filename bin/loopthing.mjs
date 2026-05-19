#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.1.0";
const MIME = "application/vnd.loopthing+zip";
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".jsonl"]);
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
  loopthing create-session <codex-session-id-or-jsonl...> --out <name.loopthing> [--title <title>] [--run-dir <run-dir>]
  loopthing compress-session <codex-session-id-or-jsonl...> --out <run-dir> [--title <title>]
  loopthing sessions scan [--cwd <path>] [--all] [--limit <n>] [--codex-home <dir>]
  loopthing sessions inspect <codex-session-id-or-jsonl> [--codex-home <dir>]
  loopthing sessions normalize <codex-session-id-or-jsonl...> --out <messages.jsonl> [--codex-home <dir>]
  loopthing score <run-dir>
  loopthing compare <file-a> <file-b> [...file-c]
  loopthing seal <run-dir> --out <name.loopthing>

Examples:
  loopthing create ./transcripts --out pricing-decision.loopthing --title "Pricing decision"
  loopthing sessions scan
  loopthing sessions inspect 019e3fbd
  loopthing create-session 019e3fbd --out repo-decision.loopthing
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
  if (/^rollout-.*\.jsonl$/i.test(basename)) return "chat-transcript";
  if (/(^|\/)\.claude\/projects\//.test(file.replace(/\\/g, "/"))) return "chat-transcript";
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
      source_kind: "chat-transcript",
      provider: value.provider,
      role_confidence: value.role_confidence,
      created_at: value.created_at,
      conversation_id: value.conversation_id,
      message_id: value.message_id
    });
    return messages;
  }

  for (const child of Object.values(value)) collectJsonMessages(child, source, messages);
  return messages;
}

function textOfClaudeContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        const type = part.type || "";
        if (type && !["text", "input_text", "output_text"].includes(type)) return "";
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    const type = content.type || "";
    if (type && !["text", "input_text", "output_text"].includes(type)) return "";
    if (typeof content.text === "string") return content.text;
    if (typeof content.content === "string") return content.content;
  }
  return "";
}

function isClaudeNoiseMessage(content) {
  const compact = content.trim();
  return /^<local-command-(?:caveat|stdout|stderr)>/.test(compact)
    || /^<task-notification>/.test(compact)
    || /^<command-(?:message|name)>/.test(compact)
    || /^Base directory for this skill:/.test(compact)
    || /^\{"status":"error","message":"TTS failed/.test(compact)
    || /^toolu_[a-zA-Z0-9_-]+$/.test(compact);
}

function claudeMessagesFromRows(rows, source) {
  const hasClaudeShape = rows.some((row) => (
    row
    && typeof row === "object"
    && typeof row.sessionId === "string"
    && row.message
    && ["user", "assistant"].includes(row.type)
  ));
  if (!hasClaudeShape) return [];

  const messages = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (!["user", "assistant"].includes(row.type)) continue;
    const role = normalizeRole(String(row.message?.role || row.type || ""));
    if (!["user", "assistant"].includes(role)) continue;
    const content = textOfClaudeContent(row.message?.content ?? row.content).trim();
    if (!content || isClaudeNoiseMessage(content)) continue;
    messages.push({
      role,
      content,
      source,
      source_kind: "chat-transcript",
      provider: "claude-code",
      role_confidence: "exact",
      created_at: row.timestamp || null,
      conversation_id: row.sessionId || null,
      message_id: row.uuid || row.message?.id || null
    });
  }
  return messages;
}

function collectJsonlMessages(raw, source) {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (!rows.length) return [];

  const codexMessages = codexMessagesFromRows(rows, source);
  if (codexMessages.length) return codexMessages;

  const claudeMessages = claudeMessagesFromRows(rows, source);
  if (claudeMessages.length) return claudeMessages;

  const normalizedMessages = [];
  for (const row of rows) collectJsonMessages(row, source, normalizedMessages);
  return normalizedMessages;
}

function codexMessagesFromRows(rows, source) {
  const messages = [];
  for (const row of rows) {
    const payload = row?.payload;
    if (row?.type !== "response_item" || payload?.type !== "message") continue;
    const role = normalizeRole(String(payload.role || ""));
    if (!["user", "assistant"].includes(role)) continue;
    const content = textOfContent(payload.content).trim();
    if (!content) continue;
    if (role === "user" && isCodexContextOnly(content)) continue;
    messages.push({
      role,
      content,
      source,
      source_kind: "chat-transcript",
      provider: "codex",
      role_confidence: "exact",
      created_at: row.timestamp || null
    });
  }
  return messages;
}

function isCodexContextOnly(content) {
  const compact = content.trim();
  return /^<environment_context>[\s\S]*<\/environment_context>$/.test(compact)
    || /^<user_info>[\s\S]*<\/user_info>$/.test(compact);
}

function normalizeRole(role) {
  const lowered = role.toLowerCase();
  if (["human", "user", "participant", "me"].includes(lowered)) return "user";
  if (["assistant", "ai", "chatgpt", "codex", "claude", "system"].includes(lowered)) return lowered === "system" ? "system" : "assistant";
  return lowered;
}

function looksLikeTimestampMarker(line) {
  return /^(?:\d{1,2}\s+[A-Z][a-z]{2,8}|\d{1,2}:\d{2})$/.test(line.trim());
}

function paragraphBoundsBefore(lines, endIndex) {
  let end = endIndex;
  while (end >= 0 && !lines[end].trim()) end -= 1;
  if (end < 0) return null;
  let start = end;
  while (start > 0 && lines[start - 1].trim()) start -= 1;
  return { start, end };
}

function looksLikeUserContinuation(block) {
  return /^(?:ok,?$|mission:|how:|don[’']t |i bought|•|[-*]\s|also |the biggest question|source:|original idea:|but the real question|my goal|version [abc]:)/i.test(block)
    || (block.length < 180 && /\?$/.test(block));
}

function userStartBeforeTimestamp(lines, markerIndex, firstMarker) {
  if (firstMarker) return 0;
  const bounds = paragraphBoundsBefore(lines, markerIndex - 1);
  if (!bounds) return markerIndex;
  let { start } = bounds;
  let capturedChars = lines.slice(bounds.start, bounds.end + 1).join("\n").length;
  let probe = start - 1;
  while (probe > 0 && capturedChars < 1400) {
    const prior = paragraphBoundsBefore(lines, probe);
    if (!prior) break;
    const block = lines.slice(prior.start, prior.end + 1).join("\n").trim();
    if (!looksLikeUserContinuation(block)) break;
    start = prior.start;
    capturedChars += block.length;
    probe = prior.start - 1;
  }
  return start;
}

function parseTimestampedTranscript(raw, source, sourceKind) {
  const lines = raw.split(/\r?\n/);
  const markers = lines
    .map((line, index) => (looksLikeTimestampMarker(line) ? index : -1))
    .filter((index) => index >= 0);
  if (markers.length < 2) return [];

  const userStarts = markers.map((marker, index) => userStartBeforeTimestamp(lines, marker, index === 0));
  const messages = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const userStart = userStarts[index];
    const userText = lines.slice(userStart, marker).join("\n").trim();
    if (userText) messages.push({ role: "user", content: userText, source, source_kind: sourceKind });

    const assistantStart = marker + 1;
    const nextUserStart = userStarts[index + 1] ?? lines.length;
    const assistantText = lines.slice(assistantStart, nextUserStart).join("\n").trim();
    if (assistantText) messages.push({ role: "assistant", content: assistantText, source, source_kind: sourceKind });
  }

  return messages.length >= 4 ? messages : [];
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
  if (chunks.length) return chunks;
  const timestampedMessages = parseTimestampedTranscript(raw, source, sourceKind);
  if (timestampedMessages.length) return timestampedMessages;
  return [{ role: "user", content: raw.trim(), source, source_kind: sourceKind }];
}

function parseFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const source = path.relative(process.cwd(), file);
  const sourceKind = classifySource(file);
  if (path.extname(file).toLowerCase() === ".jsonl") {
    const jsonlMessages = collectJsonlMessages(raw, source);
    if (jsonlMessages.length) return jsonlMessages;
  }
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
    "next", "build", "ship", "commit", "plan", "strategy", "why",
    "takeaway", "conclusion", "strongest", "cleanest", "recommend",
    "pricing", "regulatory", "requirements", "target", "role"
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

function assistantConclusionScore(message, index, total) {
  const text = message.content.toLowerCase();
  let score = scoreMessage(message, index, total);
  if (/\b(mcp|crustdata|crust data|npx|api token|check current location|fetched:|searched the web)\b/i.test(message.content)) score -= 12;
  if (message.role === "assistant") score += 4;
  if (/\b(the honest summary|what this means|what this tells you|the takeaway|the actual matrix|what i'd suggest|what i'd actually|recommend|strongest|cleanest|highest-value|next action)\b/i.test(message.content)) score += 10;
  if (/\b(should|target|lead with|start with|pick|verify|test|call|discovery|pricing|guarantee|regulatory|role lane|qualification|worker role)\b/i.test(message.content)) score += 6;
  score += (index / Math.max(total, 1)) * 18;
  return score;
}

function criticalMessages(messages, count = 8) {
  const candidates = messages.filter((message) => message.content.trim().length > 20);
  const ranked = candidates
    .map((message, index) => ({
      ...message,
      globalIndex: messages.indexOf(message),
      score: assistantConclusionScore(message, index, candidates.length)
    }))
    .sort((a, b) => b.score - a.score);
  const selected = [];
  for (const message of ranked) {
    const tooSimilar = selected.some((existing) => existing.role === message.role && excerpt(existing.content, 100) === excerpt(message.content, 100));
    if (tooSimilar) continue;
    selected.push(message);
    if (selected.length >= count) break;
  }
  return selected.sort((a, b) => a.globalIndex - b.globalIndex);
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

function recentMessages(messages, fraction = 0.35) {
  const start = Math.max(0, Math.floor(messages.length * (1 - fraction)));
  return messages.slice(start);
}

function sentenceNoise(sentence) {
  return /^(let me|good question|fair|right|on it|stop\.|wait\.|want me|can you|do you|if you want|i apologise|i'm not going to|i can't|what i can and can't|what i should have said earlier)\b/i.test(sentence)
    || /\b(mcp|crustdata|crust data|claude settings|npx|api token|tooling|target list|linkedin data api)\b/i.test(sentence)
    || /^Fetched:|^Searched |^Crustdata |^Check current location/i.test(sentence);
}

function sentenceCandidates(messages, regexes, limit = 6, options = {}) {
  const found = [];
  const recentStart = Math.max(0, Math.floor(messages.length * 0.65));
  const pool = options.recentFirst
    ? [...messages.slice(recentStart).reverse(), ...messages.slice(0, recentStart).reverse()]
    : messages;
  for (const message of pool) {
    if (options.role && message.role !== options.role) continue;
    for (const sentence of splitSentences(message.content)) {
      const clean = cleanMarkdown(sentence).replace(/\s+/g, " ").trim();
      if (clean.length < 24) continue;
      if (!options.includeNoise && sentenceNoise(clean)) continue;
      if (options.noQuestions && clean.endsWith("?")) continue;
      if (regexes.some((regex) => regex.test(clean))) {
        found.push({
          sentence: readableExcerpt(clean, options.max || 260),
          source: message.source,
          role: message.role,
          index: message.index ?? messages.indexOf(message)
        });
      }
    }
  }
  const seen = new Set();
  return found.filter((item) => {
    const key = item.sentence.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function lineCandidates(messages, regexes, limit = 6, options = {}) {
  const recentStart = Math.max(0, Math.floor(messages.length * 0.65));
  const pool = options.recentFirst
    ? [...messages.slice(recentStart).reverse(), ...messages.slice(0, recentStart).reverse()]
    : messages;
  const found = [];
  for (const message of pool) {
    if (options.role && message.role !== options.role) continue;
    for (const rawLine of message.content.split(/\r?\n/)) {
      const clean = cleanMarkdown(rawLine).replace(/\s+/g, " ").trim();
      if (clean.length < (options.min || 20)) continue;
      if (clean.length > (options.maxLine || 360)) continue;
      if (!options.includeNoise && sentenceNoise(clean)) continue;
      if (options.noQuestions && clean.endsWith("?")) continue;
      if (regexes.some((regex) => regex.test(clean))) {
        found.push({
          line: readableExcerpt(clean, options.max || 260),
          source: message.source,
          role: message.role,
          index: message.index ?? messages.indexOf(message)
        });
      }
    }
  }
  const seen = new Set();
  return found.filter((item) => {
    const key = item.line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function transcriptThesis(messages) {
  const preferred = preferredReasoningMessages(messages);
  const lines = lineCandidates(preferred, [
    /\b(you're running|business shape|mission framing|underlying model|bridge organisation|workforce bridge|flat placement fee|train-and-place|recruiter|placement service)\b/i
  ], 3, { role: "assistant", recentFirst: true, max: 300, noQuestions: true });
  if (lines.length) return lines.map((item) => item.line).join(" ");
  const candidates = sentenceCandidates(preferred, [
    /\b(you're running|the business shape|the mission framing|the actual business|bridge organisation|workforce bridge|train-and-place|handoff cli|compressed reasoning)\b/i
  ], 3, { role: "assistant", recentFirst: true, max: 300, noQuestions: true });
  if (candidates.length) return candidates.map((item) => item.sentence).join(" ");
  const sections = matchingSections(preferred, [/clean thesis/, /^what it is$/, /current thesis/, /one-line summary/, /pinned direction/, /product spine/]).reverse();
  const fallbackSections = sections.length ? sections : matchingSections(messages, [/clean thesis/, /^what it is$/, /current thesis/, /one-line summary/, /pinned direction/, /product spine/]).reverse();
  if (fallbackSections[0]) return sectionSummary(fallbackSections[0], 360);
  return "The useful work is to preserve the decisions, direction, killed branches, risks, and next action so a new person or session can continue without starting cold.";
}

function transcriptWedge(messages) {
  const preferred = preferredReasoningMessages(messages);
  const lines = lineCandidates(preferred, [
    /\b(strongest economic wedge|highest-value lane|picking one lane|primary lane|lead with|best entry|cleanest entry)\b/i,
    /\b(largest market|bottom of the funnel|niche premium lane|not a year-1 wedge)\b/i
  ], 4, { role: "assistant", recentFirst: true, max: 280, noQuestions: true });
  if (lines.length) return lines.map((item) => item.line).join(" ");
  const candidates = sentenceCandidates(preferred, [
    /\b(strongest economic wedge|highest-value lane|primary lane|lead with|start with|entry point|uniquely suited|best fit|wedge)\b/i
  ], 3, { role: "assistant", recentFirst: true, max: 300, noQuestions: true });
  if (candidates.length) return candidates.map((item) => item.sentence).join(" ");
  const sections = matchingSections(preferred, [/^wedge$/, /pinned wedge/, /pinned direction/, /current wedge/, /what survives criticism/, /narrowest claim/]).reverse();
  const fallbackSections = sections.length ? sections : matchingSections(messages, [/^wedge$/, /pinned wedge/, /pinned direction/, /current wedge/, /what survives criticism/, /narrowest claim/]).reverse();
  if (fallbackSections[0]) return sectionSummary(fallbackSections[0], 360);
  return "The strongest surviving direction is the one that remains after discarded branches and risks are made explicit.";
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
  const providerCounts = messages.reduce((acc, message) => {
    const provider = message.provider || "file";
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});
  const roleQuality = messages.reduce((acc, message) => {
    const quality = message.role_confidence || (message.source_kind === "chat-transcript" ? "inferred" : "source");
    acc[quality] = (acc[quality] || 0) + 1;
    return acc;
  }, {});
  return {
    format: "loopthing/source-metadata-v0.1",
    created: new Date().toISOString(),
    message_count: messages.length,
    role_counts: roleCounts,
    source_kind_counts: sourceKindCounts,
    provider_counts: providerCounts,
    role_quality: roleQuality,
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
  const recentQuestion = sentenceCandidates(preferred, [
    /\b(real question|biggest question|stuck|where .* fit|which role|what role|how many|what should|what's the gap|is .* suited)\b/i
  ], 2, { role: "user", recentFirst: true, max: 260 }).map((item) => item.sentence);
  if (recentQuestion.length) return recentQuestion.join(" ");
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
  const boundaryBranches = lineCandidates(preferred, [
    /\b(not a student role|not the right role|first-year .*doesn't meet|graduate role|not your primary lane|not a high-volume|year-3 expansion|not therapy|not clinicians|insufficient qualification)\b/i
  ], 8, { role: "assistant", recentFirst: true, max: 240, noQuestions: true })
    .map((item) => item.line)
    .filter(isBoundaryCandidate)
    .map((line) => boundaryBranch(line));
  if (boundaryBranches.length) return dedupeItems(boundaryBranches, "branch").slice(0, 8);
  const killed = sentenceCandidates(preferred, [/killed?/, /discard/, /rejected/, /wrong direction/, /doesn.?t make sense/, /not the direction/, /not .* product/, /not .* transcript/, /not .* role/, /insufficient qualification/, /out of scope/], 8, { role: "assistant", recentFirst: true, max: 180 });
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

function boundaryBranch(line) {
  const quotedNotRunning = line.match(/not running an?\s+"([^"]+)"/i);
  if (quotedNotRunning) return { branch: quotedNotRunning[1], reason: line };
  const notPrimary = line.match(/^(.*?)(?:is|was)\s+(?:not|probably not)\s+(?:your|the)\s+primary\b/i);
  if (notPrimary) return { branch: `${boundarySubject(notPrimary[1])} as the primary wedge`, reason: line };
  if (/\bbottom of the funnel|lowest revenue|lower-priority\b/i.test(line)) return { branch: `${boundarySubject(line)} as the primary wedge`, reason: line };
  const notYearOne = line.match(/^(.*?)(?:not a year-?1|not a year-?one|year-3 expansion)/i);
  if (notYearOne) return { branch: `${boundarySubject(notYearOne[1])} as the year-one wedge`, reason: line };
  const graduateRole = line.match(/(?:^|[.;:]\s*)([^.;:]+?)\s+is\s+a\s+graduate role/i);
  if (graduateRole) return { branch: `${boundarySubject(graduateRole[1])} as an early-student role`, reason: line };
  if (/\binsufficient qualification|insufficient qualification\/experience|doesn[’']?t meet|does not meet\b/i.test(line)) {
    const branch = /\bfirst-year\b/i.test(line) ? "First-year candidates as qualified candidates" : `${boundarySubject(line)} as an early-student role`;
    return { branch, reason: line };
  }
  return {
    branch: boundarySubject(line),
    reason: "The conversation treated this as a boundary or lower-priority path, not the current wedge."
  };
}

function boundarySubject(raw) {
  let text = cleanMarkdown(raw).replace(/\s+/g, " ").trim();
  text = text.replace(/^[^A-Za-z0-9]+/, "");
  text = text.replace(/^(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+[—-]\s*/i, "");
  text = text.replace(/^the honest read:\s*/i, "");
  text = text.split(/[.;]/)[0].trim();
  text = text.replace(/\s*\([^)]*\)\s*$/g, "");
  text = text.replace(/\s+is\s+(?:a|an|the)?\s.*$/i, "");
  text = text.replace(/\s+as\s+.*$/i, "");
  return excerpt(text || raw, 140);
}

function isBoundaryCandidate(line) {
  const positiveCapability = /\b(can legitimately work|will hire|eligible|fits|meets .*pathway|can pathway|can do|real role|legitimate role)\b/i.test(line);
  const strongBoundary = /\b(not (?:your|the) primary|not a high-volume|not a year|year-3 expansion|insufficient|doesn[’']?t meet|does not meet|can't|cannot|not a student role|not the right role|graduate role|bottom of the funnel|lowest revenue|lower-priority)\b/i.test(line);
  return !positiveCapability || strongBoundary;
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
  const riskLines = lineCandidates(preferred, [
    /\b(verify .*current|pricing tolerance is unknown|supervision question is critical|published .* ceiling|discovery calls .* test|changes every july|before quoting|not a guaranteed rate|supervision .* bottleneck)\b/i
  ], 5, { role: "assistant", recentFirst: true, max: 240, noQuestions: true }).map((item) => item.line);
  if (riskLines.length) return riskLines;
  const found = sentenceCandidates(preferred, [/risk/, /might/, /could fail/, /weak/, /unclear/, /if .* fail/, /hard/, /not honestly/, /pricing tolerance/, /verify/, /changes every july/, /supervision .* bottleneck/, /regulatory/], 4, { role: "assistant", recentFirst: true, max: 220 });
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
  const nextLines = lineCandidates(preferred, [
    /^(?:one|two|three)\s+[—:-]\s+(?:verify|pick|modify|ask|run|start)\b/i,
    /^(?:first|next)\s+5\s+calls\b/i
  ], 3, { role: "assistant", recentFirst: true, max: 320, maxLine: 640, noQuestions: true });
  if (nextLines.length) return nextLines.map((item) => item.line).join(" ");
  const assistantNext = sentenceCandidates(preferred, [
    /\b(next action|before the discovery calls|what to do with this|first 5 calls|next 5 calls|start with|pick a primary lane|verify|ask each provider|run .* calls|target)\b/i
  ], 2, { role: "assistant", recentFirst: true, max: 280 });
  if (assistantNext.length) return assistantNext.map((item) => item.sentence).join(" ");
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
  const patterns = [
    /\bloopthing\b/g,
    /\.loopthing\b/g,
    /\breasoning handoff\b/g,
    /\bhandoff artifact\b/g,
    /\bcompressed reasoning\b/g,
    /\bcompression\b/g,
    /\bchat transcript\b/g,
    /\brecipient\b/g,
    /\bwhere (?:my|the) gold\b/g
  ];
  const sourceWeights = {
    "chat-transcript": 3,
    fixture: 2,
    orientation: 1.5,
    source: 1.5,
    docs: 0.75,
    generated: 0.25
  };
  let score = countMatches(title.toLowerCase(), patterns) * 8;

  for (const message of messages) {
    const text = message.content.toLowerCase();
    const weight = sourceWeights[message.source_kind] ?? 1;
    score += countMatches(text, patterns) * weight;
  }

  return score;
}

function cleanProjectName(title) {
  return title
    .replace(/^LoopThing:\s*/i, "")
    .replace(/\s+Project Handoff$/i, "")
    .replace(/\s+Handoff$/i, "")
    .trim() || title;
}

function domainFor(messages, title) {
  return domainSignalScores(messages, title) >= 4 ? "loopthing" : "generic";
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

function criticalMessageBullets(messages, limit = 8) {
  return criticalMessages(messages, limit).map((message) => ({
    title: `${message.role} · ${messageTitle(message)}`,
    source: message.source,
    summary: readableExcerpt(message.content, 300)
  }));
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

function genericModel(title, messages, metadata) {
  const reasoningMessages = preferredReasoningMessages(messages);
  const discarded = discardedBranches(messages).slice(0, 8);
  const critical = criticalMessages(reasoningMessages, 8).map((message) => ({
    title: messageTitle(message),
    source: message.source,
    summary: readableExcerpt(message.content, 300)
  }));
  const next = nextAction(messages);
  const riskLines = risks(messages).slice(0, 6);
  const askLines = asks(messages).slice(0, 4);
  const projectDocs = keyArtifactBullets(messages, metadata, 8);
  const chatHeavy = (metadata.source_kind_counts?.["chat-transcript"] || 0) > (metadata.message_count * 0.5);
  const outcome = outcomeModel(messages);
  return {
    domain: domainFor(messages, title),
    projectName: cleanProjectName(title),
    intent: sectionParagraph(messages, [/^intent$/, /underlying goal/], inferIntent(messages, topMessages(messages, 5))),
    problem: sectionParagraph(messages, [/^problem$/, /problem statement/], inferProblem(messages)),
    thesis: transcriptThesis(messages),
    currentWedge: transcriptWedge(messages),
    ownership: sectionBlock(messages, [/ownership/, /responsibilit/, /operating model/, /how it works/], 6),
    notThis: boundariesFromTranscript(messages, outcome),
    framingDiffs: framingDiffs(topMessages(reasoningMessages, 5)),
    discarded,
    survival: survivalClaims(messages, outcome),
    risks: riskLines,
    nextActions: next ? [readableExcerpt(next, 260)] : [],
    asks: askLines,
    artifacts: chatHeavy ? criticalMessageBullets(reasoningMessages, 8) : (projectDocs.length ? projectDocs : critical),
    directions: importantUserDirections(messages, 12),
    outcome
  };
}

function survivalClaims(messages, outcome) {
  const explicit = sectionBlock(messages, [/what survives criticism/, /outcome/, /committed to/, /narrowest claim/], 6);
  if (explicit.length) return explicit;
  const lines = lineCandidates(messages, [
    /\b(highest-value lane|strongest economic wedge|unit economics are the strongest|largest market|legitimate entry point|mission framing holds|wedge is genuinely real|value-add isn't just placement)\b/i
  ], 6, { role: "assistant", recentFirst: true, max: 240, noQuestions: true }).map((item) => item.line);
  if (lines.length) return lines;
  const candidates = sentenceCandidates(messages, [
    /\b(strongest|cleanest|highest-value|fits|legitimate|real role|real wedge|mission .* holds|value-add|differentiator|works|survives)\b/i
  ], 5, { role: "assistant", recentFirst: true, max: 240 }).map((item) => item.sentence);
  return candidates.length ? candidates : outcome.committed.slice(0, 5);
}

function boundariesFromTranscript(messages, outcome) {
  const explicit = negativeBoundaryBlock(messages, [/what this is not/, /what it is not/, /do not/, /non-negotiables/, /killed paths/, /killed branches/], 8);
  if (explicit.length) return explicit;
  return outcome.notCommitted.slice(0, 6);
}

function outcomeModel(messages) {
  const committed = lineCandidates(messages, [
    /\b(strongest economic wedge|highest-value lane|unit economics are the strongest|if you're picking one lane|largest market|value-add isn't just placement|mission framing holds|wedge is genuinely real|pick a primary lane|business shape changes|current direction|run .* test|compression-first handoff)\b/i
  ], 7, { recentFirst: true, max: 240, noQuestions: true }).map((item) => item.line);
  const committedFallback = sentenceCandidates(messages, [
    /\b(strongest economic wedge|highest-value lane|unit economics are the strongest|if you're picking one lane|value-add isn't just placement|mission .* holds|wedge .* real|current direction|run .* test|compression-first handoff)\b/i
  ], 4, { recentFirst: true, max: 240, noQuestions: true }).map((item) => item.sentence);
  const notCommitted = lineCandidates(messages, [
    /\b(not a student role|not the right role|insufficient qualification|not your primary lane|not a high-volume|year-3 expansion|first-year .*doesn't meet|can't walk into|not therapy|not clinicians|not the primary lane)\b/i
  ], 7, { role: "assistant", recentFirst: true, max: 240, noQuestions: true }).map((item) => item.line).filter(isBoundaryCandidate);
  const notCommittedFallback = sentenceCandidates(messages, [
    /\b(not a student role|not the right role|insufficient qualification|not your primary lane|not a high-volume|year-3 expansion|first-year .*doesn't meet|can't walk into|not therapy|not clinicians|not the primary lane)\b/i
  ], 4, { role: "assistant", recentFirst: true, max: 240, noQuestions: true }).map((item) => item.sentence).filter(isBoundaryCandidate);
  const explicitNotCommitted = negativeBoundaryBlock(messages, [/what this is not/, /what it is not/, /do not/, /non-negotiables/, /killed paths/, /killed branches/], 7);
  const evidence = lineCandidates(messages, [
    /\b(line item|worker pay|employer all-in cost|placement fee|gross spread|mandatory minimums|qualification expectations|supervision|pricing tolerance|verify .*price|award rate|all-in cost)\b/i
  ], 6, { role: "assistant", recentFirst: true, max: 240, noQuestions: true }).map((item) => item.line);

  return {
    committed: committed.length ? committed : (committedFallback.length ? committedFallback : ["No specific commitment inferred; review Critical messages before using this handoff."]),
    notCommitted: notCommitted.length ? notCommitted : (notCommittedFallback.length ? notCommittedFallback : (explicitNotCommitted.length ? explicitNotCommitted : ["No specific rejected commitment inferred."])),
    evidence
  };
}

function buildHandoffModel(title, messages, metadata) {
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

${markdownList(model.outcome.committed)}

Not committed to:

${markdownList(model.outcome.notCommitted)}

Evidence to check:

${markdownList(model.outcome.evidence, "- No specific evidence bullets inferred.")}

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

## Outcome

Committed to:

${markdownList(model.outcome.committed.slice(0, 5))}

Not committed to:

${markdownList(model.outcome.notCommitted.slice(0, 5))}

## Next Action

${markdownList(model.nextActions)}

## Asks

${markdownList(model.asks)}

## Operating Instruction

Be optimistic but corrective. If the project drifts, restore the current thesis, the explicit boundaries, and the next evidence gate.
`;
}

function codexHome(flags = {}) {
  return path.resolve(flags["codex-home"] || process.env.CODEX_HOME || path.join(os.homedir(), ".codex"));
}

function walkJsonlFiles(dir, maxDepth = 8, depth = 0) {
  if (!fs.existsSync(dir) || depth > maxDepth) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonlFiles(full, maxDepth, depth + 1));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(full);
  }
  return files;
}

function loadCodexSessionIndex(home) {
  const indexFile = path.join(home, "session_index.jsonl");
  const index = new Map();
  if (!fs.existsSync(indexFile)) return index;
  for (const line of fs.readFileSync(indexFile, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.id) index.set(row.id, row);
    } catch {
      // Ignore corrupt index rows. Rollout files remain the source of truth.
    }
  }
  return index;
}

function jsonRowsFromFile(file) {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function codexIdFromPath(file) {
  const match = path.basename(file).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
  return match?.[1] || path.basename(file, ".jsonl");
}

function parseCodexSessionFile(file, index = new Map()) {
  const rows = jsonRowsFromFile(file);
  const source = path.relative(process.cwd(), file);
  const sessionMeta = rows.find((row) => row.type === "session_meta")?.payload || {};
  const id = sessionMeta.id || codexIdFromPath(file);
  const messages = codexMessagesFromRows(rows, source).map((message, messageIndex) => ({
    ...message,
    conversation_id: id,
    message_id: `${id}:${messageIndex}`
  }));
  const stat = fs.statSync(file);
  const timestamps = rows.map((row) => row.timestamp).filter(Boolean).sort();
  const firstUser = messages.find((message) => message.role === "user");
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const roleCounts = messages.reduce((acc, message) => {
    acc[message.role] = (acc[message.role] || 0) + 1;
    return acc;
  }, {});
  const indexed = index.get(id) || {};
  return {
    id,
    provider: "codex",
    file,
    title: indexed.thread_name || excerpt(firstUser?.content || path.basename(file, ".jsonl"), 90),
    cwd: sessionMeta.cwd || "",
    created_at: timestamps[0] || stat.birthtime.toISOString(),
    updated_at: indexed.updated_at || timestamps[timestamps.length - 1] || stat.mtime.toISOString(),
    first_user: firstUser?.content || "",
    last_user: lastUser?.content || "",
    message_count: messages.length,
    role_counts: roleCounts,
    role_quality: messages.length ? "exact structured roles" : "no chat messages found",
    messages
  };
}

function listCodexSessions(flags = {}) {
  const home = codexHome(flags);
  const index = loadCodexSessionIndex(home);
  const files = [
    ...walkJsonlFiles(path.join(home, "sessions")),
    ...walkJsonlFiles(path.join(home, "archived_sessions"), 2)
  ];
  const summaries = [];
  for (const file of files) {
    try {
      const session = parseCodexSessionFile(file, index);
      if (session.message_count) summaries.push(session);
    } catch {
      // Ignore non-rollout or malformed JSONL files.
    }
  }
  const cwdFilter = flags.cwd ? path.resolve(String(flags.cwd)) : process.cwd();
  const filtered = flags.all ? summaries : summaries.filter((session) => session.cwd === cwdFilter);
  return filtered.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function resolveCodexSessionRefs(refs, flags = {}) {
  if (!refs.length) throw new Error("Expected at least one Codex session id or JSONL path");
  const home = codexHome(flags);
  const index = loadCodexSessionIndex(home);
  const scanned = listCodexSessions({ ...flags, all: true });
  return refs.map((ref) => {
    const direct = path.resolve(ref);
    if (fs.existsSync(direct)) return parseCodexSessionFile(direct, index);
    const matches = scanned.filter((session) => session.id.startsWith(ref) || path.basename(session.file).includes(ref));
    if (!matches.length) throw new Error(`No Codex session matched: ${ref}`);
    if (matches.length > 1) throw new Error(`Ambiguous Codex session id "${ref}" matched ${matches.length} sessions; use a longer id`);
    return matches[0];
  });
}

function printSessionRows(sessions, flags = {}) {
  const limit = Number(flags.limit || 20);
  const selected = sessions.slice(0, limit);
  console.log(`Found ${sessions.length} Codex session${sessions.length === 1 ? "" : "s"}${flags.all ? "" : " for this workspace"}`);
  console.log("");
  console.log("| ID | Updated | Messages | Roles | Title |");
  console.log("| --- | --- | ---: | --- | --- |");
  for (const session of selected) {
    const roles = Object.entries(session.role_counts).map(([role, count]) => `${role}:${count}`).join(", ");
    console.log(`| ${escapeCell(session.id.slice(0, 8))} | ${escapeCell(String(session.updated_at).slice(0, 19))} | ${session.message_count} | ${escapeCell(roles)} | ${escapeCell(session.title)} |`);
  }
  if (sessions.length > selected.length) console.log(`\nShowing ${selected.length}. Re-run with --limit ${sessions.length} to see all.`);
}

function normalizedRowsForSessions(sessions) {
  return sessions.flatMap((session) => session.messages.map((message, index) => ({
    provider: "codex",
    conversation_id: session.id,
    message_id: message.message_id || `${session.id}:${index}`,
    role: message.role,
    role_confidence: message.role_confidence || "exact",
    created_at: message.created_at,
    source: message.source,
    content: message.content
  })));
}

function sessionsCommand(argv) {
  const [subcommand, ...rest] = argv;
  const { positional, flags } = parseArgs(rest);
  if (!subcommand || subcommand === "scan") {
    printSessionRows(listCodexSessions(flags), flags);
    return;
  }
  if (subcommand === "inspect") {
    const session = resolveCodexSessionRefs(positional, flags)[0];
    console.log(`# Codex Session ${session.id}`);
    console.log("");
    console.log("Provider: Codex");
    console.log(`Path: ${session.file}`);
    console.log(`CWD: ${session.cwd || "(unknown)"}`);
    console.log(`Title: ${session.title}`);
    console.log(`Messages: ${session.message_count}`);
    console.log(`Roles: ${Object.entries(session.role_counts).map(([role, count]) => `${role}:${count}`).join(", ")}`);
    console.log(`Role quality: ${session.role_quality}`);
    console.log("");
    console.log(`First user: ${excerpt(session.first_user, 260) || "(none)"}`);
    console.log(`Latest user: ${excerpt(session.last_user, 260) || "(none)"}`);
    return;
  }
  if (subcommand === "normalize") {
    if (!flags.out) throw new Error("sessions normalize requires --out <messages.jsonl>");
    const sessions = resolveCodexSessionRefs(positional, flags);
    const normalized = normalizedRowsForSessions(sessions);
    write(path.resolve(flags.out), `${normalized.map((row) => JSON.stringify(row)).join("\n")}\n`);
    console.log(`Wrote ${normalized.length} normalized messages to ${path.relative(process.cwd(), path.resolve(flags.out))}`);
    return;
  }
  throw new Error(`Unknown sessions subcommand: ${subcommand}`);
}

function runSessionCompression(refs, flags) {
  const sessions = resolveCodexSessionRefs(refs, flags);
  const files = sessions.map((session) => session.file);
  const messages = sessions.flatMap((session) => session.messages).map((message, index) => ({ ...message, index }));
  if (!messages.length) throw new Error("Selected sessions did not contain user/assistant messages.");
  const title = flags.title || (sessions.length === 1 ? sessionTitle(sessions[0]) : "Selected Codex Sessions");
  return writeCompressionRun({
    messages,
    files,
    flags: { ...flags, title },
    sourceLabel: `${sessions.length} Codex session${sessions.length === 1 ? "" : "s"}`
  });
}

function sessionTitle(session) {
  return session.title ? `Codex Session: ${session.title}` : `Codex Session: ${session.id.slice(0, 8)}`;
}

function compressSessionCommand(argv) {
  const { positional, flags } = parseArgs(argv);
  if (!positional.length || !flags.out) throw new Error("compress-session requires <session-id-or-jsonl...> and --out <run-dir>");
  runSessionCompression(positional, flags);
}

function createSessionCommand(argv) {
  const { positional, flags } = parseArgs(argv);
  if (!positional.length || !flags.out) throw new Error("create-session requires <session-id-or-jsonl...> and --out <name.loopthing>");
  const outFile = flags.out.endsWith(".loopthing") ? flags.out : `${flags.out}.loopthing`;
  const runDir = path.resolve(flags["run-dir"] || path.join("tmp", `${slugify(path.basename(outFile, ".loopthing"))}-run`));
  const compression = runSessionCompression(positional, { ...flags, out: runDir });
  scoreRun(compression.outDir);
  sealRun(compression.outDir, outFile);
  console.log(`Done. Open ${outFile} or inspect ${path.relative(process.cwd(), compression.outDir)}`);
}

function writeCompressionRun({ messages, files, flags, sourceLabel }) {
  const outDir = path.resolve(flags.out);
  const title = flags.title || titleFromInputs(files);
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
  console.log(`Compressed ${metadata.message_count} messages from ${sourceLabel || `${files.length} file${files.length === 1 ? "" : "s"}`} into ${path.relative(process.cwd(), outDir)}`);
  return { outDir, title, metadata };
}

function runCompression(inputs, flags) {
  const files = walkInputs(inputs);
  if (!files.length) throw new Error("No .md, .txt, .json, or .jsonl transcript files found.");
  const messages = files.flatMap(parseFile).map((message, index) => ({ ...message, index }));
  return writeCompressionRun({ messages, files, flags });
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
  const noGenericOutcomeBoilerplate = !/## Outcome[\s\S]{0,600}Preserve the current thesis, boundaries, killed branches, risks, and next evidence gate/i.test(reasoning + "\n" + handoff);
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
    ["No generic handoff boilerplate", noGenericProductSpine && noGenericOutcomeBoilerplate],
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
    else if (command === "create-session") createSessionCommand(rest);
    else if (command === "compress-session") compressSessionCommand(rest);
    else if (command === "sessions") sessionsCommand(rest);
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
