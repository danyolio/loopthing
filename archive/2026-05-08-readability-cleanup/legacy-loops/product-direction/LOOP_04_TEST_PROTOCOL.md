# Loop 04: Compression Test Protocol

## Goal

Test whether LoopThing can produce useful reasoning handoffs from real AI conversations.

## Corpus

20 conversations:

- 10 from Daniel
- 10 from a cofounder or collaborator
- mix of coding, strategy, writing, and product decision work
- include both successful and messy sessions

## Variants Per Conversation

Generate three artifacts:

1. `generic-summary.md`
   - baseline "summarize this chat" prompt
2. `loopthing-structured.md`
   - strict loopthing prompt with intent, problem, critical messages, framing diffs, discarded branches, risks, outcome, next action
3. `dual-render-handoff.md`
   - one version for creator retrieval, one version for recipient handoff

## Creator Score

The creator scores each artifact 1-5:

- Faithfulness: did it preserve what actually happened?
- Gold capture: did it find the messages or shifts that mattered?
- Compression: did it cut the right material?
- Usefulness: would I use this instead of re-reading the transcript?
- Sendability: would I send this to a real person?

## Recipient Score

The recipient gets only the artifact, not the transcript. After five minutes, ask:

- What was the participant trying to decide?
- What problem did they end up with?
- What options were rejected?
- Why were they rejected?
- What claim survived?
- What is the next action?
- What risks remain?

Pass if the recipient gets at least 5 of 7 right without explanation from the creator.

## Kill Criteria

Kill or rethink the wedge if:

- generic summaries perform within 10% of structured LoopThing artifacts
- creators do not recognize the artifact as faithful
- recipients cannot recover the decision path
- nobody has a real recipient for the handoff
- compression takes longer to fix than rereading the transcript

## Pass Criteria

Continue if:

- structured artifacts beat generic summaries clearly
- at least 12 of 20 artifacts are creator-rated 4+
- recipients pass comprehension on at least 10 of 20 artifacts
- at least 5 artifacts are actually sent or would clearly be sent
- repeated failure modes are specific enough to improve the prompt or schema

## Output

After the test, produce:

```text
compression-test/
  README.md
  aggregate-results.csv
  failure-modes.md
  winning-schema.md
  killed-assumptions.md
  next-product-decision.md
```

## Decision After Test

If it passes: build the thin CLI.

If it partially passes: narrow to the context where it works, such as product strategy or coding architecture decisions.

If it fails: stop building infrastructure and debug compression quality.
