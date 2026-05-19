# Loop 11: Build The Actual Product V0

## Prompt

Use Ralph Loop to build the LoopThing product, not just the demo. Start with the highest-priority product story: a local transcript compression harness.

## Story

`product-002`: Build transcript compression harness.

Acceptance:

- Implement `loopthing compress` input/output skeleton.
- Write test fixtures for one transcript.
- Produce `reasoning.md` and `source-metadata.json`.

## Built

- `bin/loopthing.mjs`
- `package.json`
- `test/fixtures/founder-chat.md`
- `test/product-smoke.mjs`
- `loops/company/areas/product/artifacts/CLI_PRODUCT.md`

## Commands

```bash
node bin/loopthing.mjs compress test/fixtures/founder-chat.md --out tmp/product-smoke --title "Founder Wedge Stress Test"
node bin/loopthing.mjs score tmp/product-smoke
node bin/loopthing.mjs compare tmp/product-smoke/reasoning.md tmp/product-smoke/variants/generic.md
node bin/loopthing.mjs seal tmp/product-smoke --out tmp/product-smoke.loopthing
```

## Critique

This is not yet the final product because the compressor is deterministic and heuristic. But it crosses the important line: LoopThing now accepts input transcripts and produces the product nucleus instead of only presenting a hand-built artifact.

## Next Loop

Build the scoring harness properly:

- recipient test template
- creator faithfulness rubric
- pass/fail gate against generic summaries

The first scoring harness now exists, including `scores.jsonl`. The next loop should replace the heuristic checks with real creator/recipient scoring from the 20-chat test.
