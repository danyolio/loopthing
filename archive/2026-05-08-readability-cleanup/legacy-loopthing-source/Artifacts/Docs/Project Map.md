# Project Map

This repo was getting noisy because it contained the product, demo, strategy, generated artifacts, and product loops at the same level.

Use this map.

## Product

`bin/loopthing.mjs`

The actual CLI. Start here if you want to understand what LoopThing does.

## Usage Docs

`docs/CLI_USAGE.md`

How to run the CLI. Normal users should use `create`; the other commands are debugging steps.

## Product Definition

`docs/PUBLIC_COPY.md`

The public copy source of truth for hosted demos.

`docs/PRODUCT_SPINE.md`

The plain-English spine: compress decisions, direction, and thinking for handoff.

## Demo

`index.html`

Static demo viewer.

`loopthing.loopthing`

Example sealed container.

`loopthing-source/`

Unpacked source files used to build the example container. This is noisy by nature because it demonstrates that a `.loopthing` can carry prompts, explainers, screenshots, docs, code, and generated artifacts.

## Loops

`loops/product-direction/`

The product-loop decision history: what directions were tried, killed, regenerated, and pinned.

`loops/company/`

The Ralph workbench for areas like product, business, design, finance, marketing, website, and life design.

Run:

```bash
npm run loop:list
```

## Tests

`test/`

Fixtures and smoke tests for the CLI.

Run:

```bash
npm run test:product
```

## Generated Outputs

`tmp/`

Local generated runs and sealed `.loopthing` outputs. Ignored by git.
