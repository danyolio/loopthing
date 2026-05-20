# LoopThing

LoopThing turns your local Codex and Claude Code history into a handoff artifact for the next chat, agent, collaborator, or future self.

It is an exportable `.loopthing` container plus a local CLI that scans structured AI session logs, imports exact `user` / `assistant` turns where available, and extracts the load-bearing shape of a project: intent, problem, key user messages, decision shifts, discarded branches, risks, decisions, and the next action.

## Why It Exists

Have you ever:

- gotten an AI-generated doc from someone and wished you knew what prompts, pivots, and rejected ideas led there?
- seen a strong AI-built prototype and wondered how the person actually made it?
- written "summarize this chat" to share your AI project, only to get something that missed the gold?

AI work now happens across local Codex sessions, Claude Code projects, long pasted chats, notes, prototypes, screenshots, and docs. The useful context is usually in the turns: the moment the framing changed, the branch that died, the reason a decision stuck.

LoopThing finds those local histories, lets you opt selected conversations into a run, and turns that mess into something sendable.

The test is simple: can someone who was not in the conversation read the artifact in under five minutes and land where the creator landed?

## The Current Product

The actual product is a local CLI that can run on a project folder or scan local AI histories first:

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"

node bin/loopthing.mjs sessions scan
node bin/loopthing.mjs claude scan "pricing decision customer research"
```

That command creates:

- `demo/current-run/START_HERE.md`: the reading order.
- `demo/current-run/brief.md`: a concise, friend-sendable summary.
- `demo/current-run/agent-guide.md`: instructions for AI agents on source confidence, read order, and role ambiguity.
- `demo/current-run/agent-handoff.md`: paste-ready context for a new AI session.
- `demo/current-run/reasoning.md`: the full compressed reasoning artifact.
- `demo/current-run/source-audit.md`: a human-readable receipt of every source file included.
- `demo/current-run/source-metadata.json`: message counts, source shape, topic tags, and file hashes.
- `demo/current-run/compression-score.md`: structural and readability smoke checks.
- `demo/loopthing-clean.loopthing`: a sealed portable container with MIME marker `application/vnd.loopthing+zip`.

The renderer builds a project model before writing Markdown, so it tries to produce a readable project-specific handoff instead of chopped transcript snippets. The short brief is deliberately separate from the deeper reasoning artifact: one is for a friend or collaborator, the other is for audit and continuation.

The latest checked-in demo was regenerated from the cleaned repo and compresses 17 messages across 9 source files. Its structural score is 14/14. That score is a shape check, not a claim that the reasoning is perfect; the recipient test is still the real bar.

## Structured Chat Sources

This is the clutch path: prefer structured local AI history over copied transcript text whenever possible.

For Codex work, LoopThing can use the structured local session log instead of guessing roles from pasted text:

```bash
node bin/loopthing.mjs sessions scan
node bin/loopthing.mjs sessions inspect <session-id>
node bin/loopthing.mjs create-session <session-id> \
  --out selected-session.loopthing
```

Codex session imports preserve exact `user` / `assistant` roles from the rollout JSONL and skip synthetic environment-context messages. Pasted transcripts still work, but they are the fallback path because role boundaries can be ambiguous.

Claude Code conversations can also be passed directly as JSONL inputs:

```bash
node bin/loopthing.mjs create \
  ~/.claude/projects/<project>/<session>.jsonl \
  --out claude-session.loopthing \
  --title "Claude Session Handoff"
```

Claude Code imports preserve exact `user` / `assistant` roles, skip local command wrappers, and ignore tool/thinking blocks so the artifact is based on the actual conversation instead of terminal noise.

LoopThing can also scan your local Claude Code history for related conversations before you opt them into a run:

```bash
node bin/loopthing.mjs claude scan "pricing decision customer research"
node bin/loopthing.mjs claude scan --like ./chat-paste.md
node bin/loopthing.mjs claude inspect ~/.claude/projects/<project>/<session>.jsonl
```

The scan walks `~/.claude/projects` by default, scores conversations against the query or `--like` file, and prints matching JSONL paths. It does not automatically include every match in the artifact; you still choose which paths to pass into `create`. Subagent conversations are skipped by default because they are often noisy, but can be included with `--include-subagents`.

Mixed runs are supported. You can combine pasted ChatGPT text, Codex rollout JSONL, Claude Code JSONL, and project docs in one command when a decision was spread across multiple tools or dates. `source-audit.md` gives a readable receipt of the files included, while `source-metadata.json` records where messages came from, including `provider_counts` and `role_quality`, so a recipient can see which roles were exact and which were inferred. `agent-guide.md` tells future AI agents to trust exact-role Codex / Claude Code logs before inferred pasted transcript text, and to avoid treating assistant offers inside a paste as user intent.

## Quality Guardrails

`npm run test:product` now covers the product path end to end:

- fixture compression
- one-command create, score, compare, and seal
- structured Codex session scan, inspect, normalize, compress, and create
- Claude Code JSONL import with exact roles and tool-noise filtering
- Claude Code local-history scanning by query or similarity to a source file
- mixed source runs where recent structured chat beats stale source-doc summaries
- dictated / voice-style problem statements that must be synthesized into a clean decision question
- sendable briefs and agent guides for every run
- a full self-run on this repo
- regressions that keep the checked-in demo focused on LoopThing's own project evolution
- repeated-run checks so regenerated artifacts do not accumulate stale score records

This matters because an earlier deterministic pass could score green while producing a semantically wrong handoff. The checked-in demo is now the LoopThing of LoopThing: it compresses how this project moved from a broad artifact/viewer idea into a handoff-first CLI product.

## Project Map

```text
START_HERE.md     human front door
README.md         concept and current usage
index.html        static public demo page
bin/              LoopThing CLI product
docs/             short current docs
source/           current curated chat/context used by the demo run
demo/             latest generated output, including brief.md and agent-guide.md
test/             fixtures and product smoke test
archive/          old demos, screenshots, source folders, and prior loops
```

Everything historical is preserved in `archive/2026-05-08-readability-cleanup/`.

## Read Next

Start here:

- [START_HERE.md](START_HERE.md)
- [docs/01_PRODUCT.md](docs/01_PRODUCT.md)
- [docs/02_RUN_LOOPTHING.md](docs/02_RUN_LOOPTHING.md)
- [docs/03_PUBLIC_DEMO.md](docs/03_PUBLIC_DEMO.md)
- [docs/05_ARCHIVE_MAP.md](docs/05_ARCHIVE_MAP.md)
- [demo/current-run/START_HERE.md](demo/current-run/START_HERE.md)

## Validate

```bash
npm run test:product
```
