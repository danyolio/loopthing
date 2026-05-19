# LoopThing CLI Usage

You do not need to run four commands for the normal path.

Use `create` when you want the product to do the whole loop:

```bash
node bin/loopthing.mjs create ./transcripts --out my-project.loopthing --title "My project"
```

That one command:

1. Reads `.md`, `.txt`, and `.json` transcript files.
2. Creates a local run folder under `tmp/`.
3. Writes the compressed reasoning artifact.
4. Scores the artifact with the current local checklist.
5. Seals the run into a portable `.loopthing` container.

The local score is a smoke test. It checks that required outputs exist; it does not prove the compressed story is semantically consistent or ready for public copy.

## Quick Start

From this repo:

```bash
node bin/loopthing.mjs create test/fixtures/founder-chat.md --out tmp/founder-wedge.loopthing --title "Founder wedge stress test"
```

Inspect the generated run:

```bash
ls tmp/founder-wedge-run
cat tmp/founder-wedge-run/reasoning.md
cat tmp/founder-wedge-run/source-metadata.json
cat tmp/founder-wedge-run/compression-score.md
```

## Run LoopThing On This Repo

This is the current project-folder command:

```bash
node bin/loopthing.mjs create README.md PROMPT.md loops loopthing-source/Metadata loopthing-source/Prompts loopthing-source/Thinking "loopthing-source/Generated Explainers" docs/PUBLIC_COPY.md docs/CLI_USAGE.md docs/PRODUCT_SPINE.md docs/PROJECT_MAP.md docs/PRESSURE_TEST.md docs/IMPROVEMENT_BACKLOG.md test/fixtures/codex-project-chat.md --out tmp/loopthing-folder.loopthing --run-dir tmp/loopthing-folder-run --title "LoopThing Project Folder + Current Chat"
```

Then inspect:

```bash
open tmp/loopthing-folder-run/reasoning.md
open tmp/loopthing-folder-run/agent-handoff.md
open tmp/loopthing-folder-run/source-metadata.json
```

The key file is `agent-handoff.md`. Paste it into a fresh ChatGPT/Codex/Claude session to see whether the new session inherits the project state.

## Output Files

The run folder contains:

- `reasoning.md`: the compressed reasoning artifact
- `agent-handoff.md`: paste-ready context for a new chat/session/agent
- `source-metadata.json`: message counts, role counts, topic tags, source hashes
- `prompts/compression-prompt.md`: the compression contract
- `variants/generic.md`: baseline generic summary
- `compression-score.md`: local quality checklist
- `scores.jsonl`: score history

The final `.loopthing` file is the portable container you share.

## Advanced Commands

Use these when you want to inspect or debug each step:

```bash
node bin/loopthing.mjs compress ./transcripts --out tmp/run-001 --title "My project"
node bin/loopthing.mjs score tmp/run-001
node bin/loopthing.mjs compare tmp/run-001/reasoning.md tmp/run-001/variants/generic.md
node bin/loopthing.mjs seal tmp/run-001 --out my-project.loopthing
```

## Current Limits

This is v0. It is local and deterministic. It can parse simple markdown/text transcripts and some JSON chat exports, but creator review still matters. The next product loop is to improve importers and run real recipient comprehension tests.
