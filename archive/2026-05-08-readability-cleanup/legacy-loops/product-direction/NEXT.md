# Next Moves

## 1. Week 1: Build The Manual Compression Run

Use 20 real conversations:

- 10 from Daniel
- 10 from cofounder or collaborator
- mixed contexts: coding, strategy, writing, product decisions

For each conversation, generate three variants:

- generic prompt
- structured loopthing prompt
- dual render: self version + handoff version

This gates everything else.

## 2. Week 2: Score Handoff, Not Aesthetics

For each artifact, ask a recipient:

- What was the participant trying to decide?
- What options were rejected and why?
- What claim survived criticism?
- What should happen next?
- What are the real risks?

If the recipient cannot answer these in under five minutes, the compression failed.

## 3. Week 3: Build The Thin CLI Only After Signal

Do not build these yet:

- format spec
- hosted app
- multi-tenant storage
- polished viewer
- browser extension
- canonical library

They become useful only after compression quality is proven.

If the test works, build:

```text
loopthing compress <input> --mode=handoff
loopthing compare <artifact-a> <artifact-b>
loopthing seal <folder>
```

The CLI should produce plain files first. A `.loopthing` container can be the seal step, not the first primitive.

## 4. Week 4: Publish Proof, Not Promise

Publish anonymized before/after examples, the failure modes, and the winning schema.

## 5. Rename Later

Keep `.loopthing` as the extension for now. Defer product naming until there is evidence the wedge is real.

## 6. Run Company Area Loops

Use the new Ralph workspace:

```bash
node loops/company/scripts/ralph/loopthing-ralph.mjs list
node loops/company/scripts/ralph/loopthing-ralph.mjs next design
node loops/company/scripts/ralph/loopthing-ralph.mjs run design 1
```

Next highest-value loops:

- `design-003`: collect concrete Refero references and extract screenshot-backed rules.
- `product-003`: build the scoring harness properly.
- `marketing-002`: write the private compression challenge invite.
- `finance-002`: build the simple revenue model.

## 7. Product V0 Exists

Use the new CLI:

```bash
node bin/loopthing.mjs create test/fixtures/founder-chat.md --out tmp/founder-wedge.loopthing --title "Founder Wedge Stress Test"
```

The next product loop should stop being "can we make the artifact?" and become "does this beat generic summary with real recipients?"

## 8. Current Ralph Queue

- Business: run the 20-conversation handoff test.
- Design: pull concrete Refero references and update `DESIGN.md`.
- Website: build the brand landing page.
- Product: test real ChatGPT/Claude/Codex exports and improve extraction.

## 9. Next Product Quality Loop

Add real export fixtures:

- ChatGPT export JSON
- Claude markdown/text export
- Codex session transcript

Then compare LoopThing output against generic summary using the five-minute recipient test.

## 10. Importer Loop

The product now handles a Codex-project style fixture. Next, add real export fixtures from:

- ChatGPT conversation export JSON
- Claude copied/exported markdown
- Codex session transcript

Each fixture should assert source shape, recent user directions, critical messages, discarded branches, and next action.

## 11. Agent Handoff Loop

Every run now writes `agent-handoff.md`. The next quality test is not whether the file looks nice; it is whether a fresh AI session can continue the project better after reading it than after reading a generic summary.

Test:

```bash
node bin/loopthing.mjs create test/fixtures/codex-project-chat.md --out tmp/current-chat.loopthing --run-dir tmp/current-chat-run --title "Current Codex Project Chat"
```

Then paste `tmp/current-chat-run/agent-handoff.md` into a fresh session and ask it to propose the next product loop. Compare against the generic baseline in `tmp/current-chat-run/variants/generic.md`.
