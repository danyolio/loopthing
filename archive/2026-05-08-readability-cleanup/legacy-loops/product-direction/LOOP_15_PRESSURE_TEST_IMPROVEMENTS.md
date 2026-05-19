# Loop 15: Pressure Test And Handoff Improvement

## Prompt

Pressure-test whether LoopThing is really about compression: decisions, direction, and thinking for handoff into new chats, sessions, projects, and agent loops. Then improve the product.

## Critique

The repo had too many documents and the product idea was getting buried under its own evidence. The strongest claim was not "rich file format" or "viewer." The strongest claim was:

LoopThing compresses reasoning so the next person or agent can continue from the real state of the work.

The current CLI produced `reasoning.md`, but it did not produce the most obvious product artifact: a paste-ready handoff for the next AI session.

## Regeneration

Every run now writes `agent-handoff.md`.

It includes:

- product spine
- source shape
- recent user directions
- critical context
- killed branches not to reopen
- risks
- next action
- asks
- operating instruction for the next agent

## Killed Branch

### Summary-Only Compression

Killed because it can describe the work but does not reliably help the next session continue it.

## Pinned Direction

LoopThing should be optimized around handoff quality. The test is simple: paste `agent-handoff.md` into a fresh AI session. Does the new session behave like it inherited the work?

## Next Loop

Add real importers and score agent continuation quality against generic summaries.

