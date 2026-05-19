# Loop 09: 30-Day Plan

## Sealed Direction

LoopThing v0 is a **local compression harness for AI reasoning handoff**.

The bigger category can remain "semantic decision layer," but the next 30 days should prove one narrow thing:

```text
Can LoopThing reliably find the gold in messy AI chats and hand it to another person?
```

## Week 1: Corpus And Prompt

- Collect 20 real conversations.
- Normalize them into plain transcript files.
- Create three compression variants: generic, structured, dual-render.
- Produce `reasoning.md`, `source-metadata.json`, and `scorecard.md` for each.

## Week 2: Handoff Test

- Put artifacts in front of real recipients.
- Run the five-minute comprehension test.
- Track creator faithfulness and recipient comprehension.
- Identify failure modes.

## Week 3: Thin CLI

Build only if Week 2 shows signal:

```text
loopthing compress
loopthing score
loopthing compare
loopthing seal
```

No viewer polish. No hosted app. No spec.

## Week 4: Public Proof

- Publish the anonymized results.
- Write the thesis post with examples.
- Share the open-source harness.
- Decide whether to rename before broader launch.

## Kill Criteria

Stop or pivot if:

- structured artifacts do not beat generic summaries
- recipients cannot recover the decision path
- creators do not want to send artifacts to real people
- the artifact requires more cleanup than rereading the transcript

## Final Product Direction

Build the harness, run the test, let the results decide whether LoopThing deserves to become a file format company.
