# Actual Product CLI

LoopThing now has a real local product slice.

For normal use:

```bash
node bin/loopthing.mjs create <transcript-file-or-folder> --out yourproject.loopthing --title "Project title"
```

That one command compresses, scores, and seals.

Advanced/debug commands:

```bash
node bin/loopthing.mjs compress <transcript-file-or-folder> --out <run-dir> --title "Project title"
node bin/loopthing.mjs score <run-dir>
node bin/loopthing.mjs compare <file-a> <file-b>
node bin/loopthing.mjs seal <run-dir> --out yourproject.loopthing
```

## What It Produces

- `reasoning.md`: the compressed reasoning artifact
- `agent-handoff.md`: paste-ready context for a new chat/session/agent
- `source-metadata.json`: message counts, role counts, topic tags, source hashes
- `prompts/compression-prompt.md`: the compression prompt contract
- `variants/generic.md`: baseline generic summary
- `compression-score.md`: local artifact quality checks
- `scores.jsonl`: score history for repeated runs
- `yourproject.loopthing`: sealed portable container

## Why This Matters

This crosses the line from demo to product. LoopThing can now accept source transcript files and generate the product nucleus instead of only showing a hand-built example.

The next loop is quality: improve scoring, test real exports, and prove the artifact beats generic summary for recipient handoff.
