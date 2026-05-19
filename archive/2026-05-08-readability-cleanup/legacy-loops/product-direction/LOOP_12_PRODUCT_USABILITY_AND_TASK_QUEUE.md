# Loop 12: Product Usability And Task Queue

## Prompt

User pushback: "Do I really need all of these commands?" Also continue Ralph-looping tasks.

## Critique

The first product slice worked but exposed a real product smell: the happy path required four commands. That is acceptable for debugging, not for explaining the product.

## Regeneration

Add `loopthing create` as the normal path:

```bash
node bin/loopthing.mjs create ./transcripts --out my-project.loopthing --title "My project"
```

It compresses, scores, and seals in one command. `compress`, `score`, `compare`, and `seal` remain advanced/debug commands.

## Additional Ralph Tasks Completed

- Marketing: wrote private compression challenge invite.
- Finance: wrote revenue model CSV and notes.
- Life design: wrote support boundaries.
- Business: wrote five-minute handoff test protocol, but kept story open until real conversations are tested.
- Design: wrote visual reference board, but kept story open until concrete Refero screenshots/references are collected.

## Killed Branch

### Four-Command Happy Path

Killed because it makes the product feel like internal plumbing. Normal users need one command; advanced users can inspect the pipeline.

## Next Loop

Run real data through `loopthing create` and fix the compression quality, especially discarded-branch extraction and risk detection.

