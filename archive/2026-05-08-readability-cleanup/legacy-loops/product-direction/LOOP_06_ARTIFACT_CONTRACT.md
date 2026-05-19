# Loop 06: Artifact Contract

## Question

What is the irreducible artifact LoopThing should produce?

## Branches

### Rich Container

**Thesis:** The `.loopthing` should contain screenshots, slides, diagrams, code, and generated explainers.

**Critique:** Richness can hide weak compression. If the reasoning artifact fails, the container becomes packaging theater.

**Verdict:** Support layer, not core contract.

### Graph Of Thought

**Thesis:** The core artifact should be a DAG of prompts, branches, kills, and revisions.

**Critique:** Graphs are visually seductive but can overfit the demo. Handoff readers need the decision, not graph exploration mechanics.

**Verdict:** Killed as the core contract.

### Reasoning Markdown

**Thesis:** The core artifact should be one structured markdown file that captures intent, problem, critical messages, framing diffs, discarded branches, surviving claim, risks, outcome, next action, asks, and meta.

**Critique:** Plain markdown may feel too simple for a file-format company.

**Regenerated:** That simplicity is a strength. A file format earns complexity only after the one-page reasoning artifact works.

**Verdict:** Pinned.

## Pinned Contract

`reasoning.md` is the product nucleus.

Required sections:

- Intent
- Problem
- Critical messages
- Framing diffs
- Discarded branches
- What survives criticism
- Where the explanation might be wrong
- Outcome
- Next action
- Asks
- Meta

Optional supporting files:

- `source-metadata.json`
- `scorecard.md`
- `variants/`
- sealed `.loopthing`

## Why This Wins

It can be generated, read, scored, compared, and improved without a viewer. It also maps directly to the latest stress-test prompt.
