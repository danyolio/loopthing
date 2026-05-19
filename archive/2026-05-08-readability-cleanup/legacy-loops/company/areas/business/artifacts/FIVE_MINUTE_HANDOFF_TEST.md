# Five-Minute Handoff Test

## Goal

Validate whether a LoopThing artifact helps someone who was not in the conversation land where the creator landed in under five minutes.

This is the core business test. If this fails, the product is a nice compression demo, not a wedge.

## Participants

Run 20 conversations:

- 10 from Daniel
- 10 from a collaborator or cofounder
- mix of product, strategy, writing, code, and business decisions

For each conversation, test with one recipient who was not in the original conversation.

## Variants

For each transcript, create:

1. Generic summary
2. LoopThing `reasoning.md`
3. Optional dual render: creator version plus recipient version

## Recipient Protocol

Give the recipient exactly five minutes with the artifact. Do not let them read the raw transcript.

Ask:

- What was the creator trying to decide?
- What changed during the conversation?
- What was rejected and why?
- What claim survived criticism?
- What should happen next?
- What risks remain?

## Scoring

Score each answer from 0-2:

- 0: missed or invented
- 1: partially correct
- 2: correct and specific

Max score: 12.

Pass threshold:

- LoopThing average score >= 9
- LoopThing beats generic summary by at least 25%
- At least 60% of recipients say they would rather receive the LoopThing than the raw chat

## Business Decision

If the test passes, build importers and improve the CLI.

If the test fails, do not build more UI. Improve the compression schema or kill the wedge.

