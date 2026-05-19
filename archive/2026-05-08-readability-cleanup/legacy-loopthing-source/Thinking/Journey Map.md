# Journey Map

This is the public lineage map for the current product direction.

## Flow

```text
Raw chat mess
  -> generic summaries lose the moves
  -> reasoning compression
  -> source shape and topic metadata
  -> killed: archive-only file format
  -> agent-handoff.md
  -> sealed yourproject.loopthing
```

## Steps

### 1. Raw Chat Mess

People accumulate long AI sessions that contain decisions, false starts, and useful turns.

Why it matters: the gold exists, but it is buried.

### 2. Generic Summary Fails

A normal summary is easier to read, but it often removes the decisions and killed paths that make the work reusable.

Why it matters: clean is not the same as useful.

### 3. Reasoning Compression

LoopThing extracts intent, critical messages, framing diffs, discarded branches, risks, asks, and next action.

Why it matters: the handoff preserves structure, not transcript volume.

### 4. Source Shape

The artifact shows what kind of source material it compressed: chats, docs, explainers, loops, prompts, and code.

Why it matters: recipients can trust the handoff faster.

### 5. Killed Archive-Only Branch

The project rejected "store everything and call it a file format."

Why it lost: storage without compression does not help the next session continue.

### 6. Agent Handoff

The current product writes `agent-handoff.md` on every run.

Why it wins: it has a simple test. Paste it into a fresh session and see whether the session starts warm.
