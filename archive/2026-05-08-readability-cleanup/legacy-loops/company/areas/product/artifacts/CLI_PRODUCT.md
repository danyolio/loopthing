# LoopThing CLI Product

## What Exists Now

LoopThing has a dependency-free local CLI:

```bash
node bin/loopthing.mjs create <file-or-dir...> --out yourproject.loopthing --title "Project title"
```

This is the happy path. It compresses, scores, and seals in one command.

Advanced/debug commands:

```bash
node bin/loopthing.mjs compress <file-or-dir...> --out <run-dir> --title "Project title"
node bin/loopthing.mjs score <run-dir>
node bin/loopthing.mjs compare <file-a> <file-b>
node bin/loopthing.mjs seal <run-dir> --out yourproject.loopthing
```

## What `compress` Produces

- `reasoning.md`: compressed reasoning artifact
- `agent-handoff.md`: paste-ready context for a new chat/session/agent
- `source-metadata.json`: message counts, role counts, topic tags, source checksums
- `prompts/compression-prompt.md`: the structured LoopThing compression prompt
- `variants/generic.md`: baseline generic summary
- `manifest.loop`: run manifest
- `compression-score.md`: local quality checklist
- `scores.jsonl`: score history for repeated runs

## Why This Counts As Product

It accepts real transcript files, extracts the load-bearing reasoning structure, and produces the first LoopThing artifact contract. It is deterministic and local-first, so it is safe for private chats and useful for compression testing before any hosted product exists.

## Known Limits

- The v0 compressor is heuristic, not model-powered.
- ChatGPT/Claude/Codex JSON parsing is best-effort.
- Compression still needs human review.
- The next product loop should add real ChatGPT/Claude/Codex export fixtures and compare output against recipient comprehension scores.

## Latest Quality Loop

The compressor now prefers explicit markdown sections for:

- intent
- problem
- discarded branches
- risks
- asks
- next action

This made project-folder compression cleaner: killed paths now come through as named branches with reasons instead of random keyword snippets.

## Codex Project Loop

The compressor now tracks source shape:

- chat transcript
- prompt
- thinking
- generated explainer
- Ralph loop
- company loop
- docs
- metadata

When real chat transcripts are present, critical-message selection reserves slots for user directions. This keeps the living project conversation visible instead of letting long generated docs dominate the artifact.

## Agent Handoff Loop

Every run now writes `agent-handoff.md`. This is the most direct product test: paste it into a fresh chat or agent session and see whether the new session can continue from the real state of the project without reading the transcript.
