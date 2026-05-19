# LoopThing

LoopThing compresses messy AI work into a handoff artifact for the next chat, agent, collaborator, or future self.

It is an exportable `.loopthing` container plus a local CLI that extracts the load-bearing shape of a project: intent, problem, critical messages, framing shifts, discarded branches, risks, decisions, and the next action.

## Why It Exists

Have you ever:

- gotten an AI-generated doc from someone and wished you knew what prompts, pivots, and rejected ideas led there?
- seen a strong AI-built prototype and wondered how the person actually made it?
- written "summarize this chat" to share your AI project, only to get something that missed the gold?

AI work now happens across long chats, Codex sessions, notes, prototypes, screenshots, and docs. The useful context is usually in the turns: the moment the framing changed, the branch that died, the reason a decision stuck.

LoopThing turns that mess into something sendable.

The test is simple: can someone who was not in the conversation read the artifact in under five minutes and land where the creator landed?

## The Current Product

The actual product is a local CLI:

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"
```

That command creates:

- `demo/current-run/START_HERE.md`: the reading order.
- `demo/current-run/agent-handoff.md`: paste-ready context for a new AI session.
- `demo/current-run/reasoning.md`: the full compressed reasoning artifact.
- `demo/current-run/source-metadata.json`: message counts, source shape, topic tags, and file hashes.
- `demo/current-run/compression-score.md`: structural and readability smoke checks.
- `demo/loopthing-clean.loopthing`: a sealed portable container with MIME marker `application/vnd.loopthing+zip`.

The renderer builds a project model before writing Markdown, so it tries to produce a readable project-specific handoff instead of chopped transcript snippets.

The latest checked-in demo was regenerated from the cleaned repo and compresses 17 messages across 9 source files. Its structural score is 13/13. That score is a shape check, not a claim that the reasoning is perfect; the recipient test is still the real bar.

## Structured Chat Sources

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
node bin/loopthing.mjs claude scan "Future Allied NDIS psych students"
node bin/loopthing.mjs claude scan --like ./chat-paste.md
node bin/loopthing.mjs claude inspect ~/.claude/projects/<project>/<session>.jsonl
```

The scan walks `~/.claude/projects` by default, scores conversations against the query or `--like` file, and prints matching JSONL paths. It does not automatically include every match in the artifact; you still choose which paths to pass into `create`. Subagent conversations are skipped by default because they are often noisy, but can be included with `--include-subagents`.

Mixed runs are supported. You can combine pasted ChatGPT text, Codex rollout JSONL, Claude Code JSONL, and project docs in one command when a decision was spread across multiple tools or dates. `source-metadata.json` records where messages came from, including `provider_counts` and `role_quality`, so a recipient can see which roles were exact and which were inferred.

## Quality Guardrails

`npm run test:product` now covers the product path end to end:

- fixture compression
- one-command create, score, compare, and seal
- structured Codex session scan, inspect, normalize, compress, and create
- Claude Code JSONL import with exact roles and tool-noise filtering
- Claude Code local-history scanning by query or similarity to a source file
- mixed source runs where recent structured chat beats stale source-doc summaries
- dictated / voice-style problem statements that must be synthesized into a clean decision question
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
demo/             latest generated output
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
