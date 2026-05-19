# Compression Test Protocol

## Goal

Test whether LoopThing can produce useful reasoning handoffs from real AI conversations.

## Corpus

20 conversations:

- 10 from Daniel
- 10 from a cofounder or collaborator
- mixed contexts: coding, strategy, writing, product decisions

## Variants

Each conversation gets three artifacts:

- generic summary
- structured LoopThing compression
- dual render for creator plus recipient

## Creator Score

Score each artifact 1-5 for:

- faithfulness
- gold capture
- compression
- usefulness
- sendability

## Recipient Score

The recipient reads only the artifact for five minutes, then answers:

- What was the participant trying to decide?
- What options were rejected?
- Why were they rejected?
- What claim survived?
- What should happen next?
- What risks remain?

## Pass Criteria

Continue only if structured LoopThing artifacts clearly beat generic summaries, creators recognize them as faithful, and recipients can recover the decision path.

## Product Decision

If it passes, build the thin CLI. If it fails, debug compression quality before touching viewer, SaaS, browser extension, or format spec work.
