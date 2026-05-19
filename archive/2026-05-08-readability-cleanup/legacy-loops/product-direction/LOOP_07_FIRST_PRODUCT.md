# Loop 07: First Product Surface

## Question

What should the first shippable product be?

## Branches

### Viewer

**Thesis:** Build the beautiful viewer first because it makes the concept tangible.

**Critique:** The viewer already proved the demo can feel good. It does not prove the product works.

**Verdict:** Killed as first product.

### Browser Extension

**Thesis:** Capture chats from ChatGPT, Claude, Cursor, and Codex directly.

**Critique:** High integration cost before proof. Also creates privacy and platform-maintenance drag.

**Verdict:** Killed for now.

### Hosted Web App

**Thesis:** Upload chats, get a LoopThing.

**Critique:** Easier for non-developers but introduces auth, storage, privacy, and product polish too early.

**Verdict:** Killed until compression passes.

### Local CLI Harness

**Thesis:** A local CLI accepts transcript files, runs compression variants, and emits artifacts plus scorecards.

**Critique:** Narrow and developer-heavy.

**Regenerated:** Good. The first users are technical founders/builders, and the CLI is a lab instrument for proving the wedge.

**Verdict:** Pinned.

## Pinned Product

```text
loopthing compress ./transcripts --mode=handoff --out ./runs/run-001
loopthing score ./runs/run-001
loopthing compare ./runs/run-001/variants
loopthing seal ./runs/run-001
```

## Why This Wins

It is the least product needed to test the core claim. It forces LoopThing to compete with generic summaries before investing in surfaces.
