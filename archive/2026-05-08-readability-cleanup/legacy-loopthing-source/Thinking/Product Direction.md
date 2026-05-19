# Product Direction

The strongest direction is **compression-first handoff**.

LoopThing should not start as a viewer, format spec, memory system, or rich artifact builder. It should start as a compression engine that turns messy AI conversations into a reasoning handoff someone else can understand in under five minutes.

## Pinned Claim

LoopThing is a compressed reasoning artifact for multiplayer AI work.

## Why This Wins

The behavior already exists: people copy-paste old chats into new chats because they know there is gold in there but cannot locate it. The wedge is not storage. It is compression quality.

The first product test is simple:

```text
Can a recipient who was not in the conversation read the artifact in under five minutes and land where the creator landed?
```

## What To Build First

```text
loopthing compress ./transcripts/*.md --mode=handoff --out ./loopthing-test/
```

Output:

- `reasoning.md`
- `source-metadata.json`
- `compression-score.md`
- variants for generic, structured, and dual-render prompts

The `.loopthing` container should be the seal step after the compression works.

## What Not To Build Yet

- format spec
- hosted SaaS
- polished viewer
- browser extension
- canonical library
- multi-tenant storage

Those are useful only after the compression test passes.

## Killed Directions

- Memory-but-better: labs can ship this with better integration.
- Viewer-first: beautiful presentation can hide weak compression.
- Format-first: a spec is not valuable until the artifact is useful.
- Repo explainer: a repo is output, not the thinking process.
- RL data play: possible later, weak as the initial wedge.

## Next Action

Run the compression test on 20 real chats across coding, strategy, writing, and product decisions. Score whether the recipient can recover intent, rejected options, surviving claim, risks, and next action in under five minutes.
