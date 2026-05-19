# Loop 03: Regenerated Product Shape

## Pinned Direction After Attack

LoopThing is a **compression test harness** before it is a file format product.

The v1 product should prove whether messy AI conversations can be compressed into useful reasoning handoffs. If the compression is weak, every downstream surface is dead weight.

## Smallest Product

```text
loopthing compress ./transcripts --mode=handoff --out ./runs/run-001
```

Output:

```text
runs/run-001/
  reasoning.md
  source-metadata.json
  scorecard.md
  variants/
    generic-summary.md
    loopthing-structured.md
    dual-render-handoff.md
  source/
    transcript-001.md
```

## Product Promise

The user gives LoopThing messy AI sessions. LoopThing returns the irreducible reasoning artifact:

- what the participant was really trying to decide
- the problem as it ended up framed
- the messages that moved the work forward
- the major framing diffs
- the branches that were killed and why
- the narrow claim that survived
- what might still be wrong
- the committed decisions
- the next action
- the asks for the recipient

## Core UX

The CLI should feel like a lab instrument, not a publishing tool:

```text
loopthing compress ~/Chats/product/*.md --mode=handoff
loopthing score ./runs/run-001 --recipient=cofounder
loopthing compare ./runs/run-001/variants
loopthing seal ./runs/run-001
```

## What Gets Deferred

- beautiful viewer
- hosted collaboration
- browser extension
- generalized file spec
- canonical artifact library
- non-developer app

## What Must Be True

For the product direction to survive:

1. Creators recognize the artifact as faithful.
2. Recipients can answer key comprehension questions in under five minutes.
3. The structured LoopThing prompt beats a generic summary.
4. At least some users can name a real person they want to send it to.
5. The artifact changes the next conversation by avoiding re-litigation.

## Strongest Current Position

Build the compression harness, not the platform.

The semantic decision layer remains the north star, but the next product step is brutally concrete: prove that LoopThing can find the gold in 20 real chats.
