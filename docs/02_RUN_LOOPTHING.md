# Run LoopThing

## One Command

Run LoopThing on the current project folder:

```bash
node bin/loopthing.mjs create . \
  --out demo/loopthing-clean.loopthing \
  --run-dir demo/current-run \
  --title "LoopThing Clean Project Handoff"
```

The project-level run ignores `archive/`, `tmp/`, `runs/`, nested generated `loopthing/` output, generated `current-run/` output, and `test/` fixtures. The curated current source material lives in `source/current-project-chat.md`.

## What Comes Out

```text
demo/
  current-run/
    START_HERE.md
    agent-handoff.md
    reasoning.md
    source-metadata.json
    compression-score.md
    scores.jsonl
    manifest.loop
    prompts/compression-prompt.md
    variants/generic.md
  loopthing-clean.loopthing
```

## How To Use The Output

Read `demo/current-run/START_HERE.md` first.

Paste `demo/current-run/agent-handoff.md` into a fresh chat or agent session when you want the next session to inherit the work.

Read `demo/current-run/reasoning.md` when you want the fuller artifact.

## Score Meaning

`compression-score.md` is a structural and readability smoke test. It checks that required pieces exist and catches obvious jank:

- required sections
- current thesis
- current wedge
- critical messages or artifacts
- framing diffs
- discarded branches
- risks
- next action
- mangled Markdown snippets
- generic boilerplate in the handoff
- start file
- agent handoff
- metadata

A perfect score does not mean the reasoning is perfect. It means the run produced the expected artifact shape and avoided the worst rendering failures.
