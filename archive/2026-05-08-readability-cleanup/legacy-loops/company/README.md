# LoopThing Company Ralph Workspace

This is the operating workspace for Ralph-looping LoopThing as a company.

It follows the useful parts of `snarktank/ralph`: small stories in `prd.json`, append-only progress logs, one story per loop, and a prompt that gives each fresh agent enough context to continue without carrying the whole conversation.

## Areas

- `business`: positioning, ICP, pricing, packaging, wedge
- `finance`: MRR targets, unit economics, solo-founder constraints
- `marketing`: private compression challenge, proof posts, launch loops
- `design`: brand trust system, Refero-style `DESIGN.md`, website taste
- `website`: landing page, demo narrative, conversion pages
- `product`: CLI, compression harness, viewer, `.loopthing` seal step
- `life-design`: solo operating model, surfing-compatible cadence, hiring gates

## Run A Loop

```bash
node loops/company/scripts/ralph/loopthing-ralph.mjs list
node loops/company/scripts/ralph/loopthing-ralph.mjs next business
node loops/company/scripts/ralph/loopthing-ralph.mjs run design 1
node loops/company/scripts/ralph/loopthing-ralph.mjs pass design design-001 "DESIGN.md drafted"
```

By default `run` writes a prompt to the area's `next-prompt.md`. If you want it to call an agent command, set `LOOPTHING_AGENT_CMD`:

```bash
LOOPTHING_AGENT_CMD="codex exec" node loops/company/scripts/ralph/loopthing-ralph.mjs run business 1
```

The runner intentionally does not mark stories complete automatically. Read the output, run the checks, then mark `pass` or `fail` with a reason.

